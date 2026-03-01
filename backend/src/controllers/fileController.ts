import { Response, NextFunction } from 'express'
import path from 'path'
import fs from 'fs/promises'
import { AppError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/auth'
import prisma from '../lib/prisma'
import { getWorkspaceMemberRole } from '../services/workspaceService'

const VALID_CATEGORIES = ['rider', 'flyer', 'schedule', 'contract', 'media', 'other'] as const
const MAX_EVENT_STORAGE = 2 * 1024 * 1024  // 2MB per event
const MAX_USER_STORAGE = 5 * 1024 * 1024   // 5MB per user

const UPLOADER_SELECT = { id: true, name: true, email: true } as const
const EVENT_ACCESS_SELECT = {
  id: true,
  created_by: true,
  workspace_id: true,
  event_teams: true,
  role_assignments: { select: { user_id: true } },
} as const

/** Pure authorization logic — no DB calls */
function computeAccess(event: { created_by: string; workspace_id: string | null; event_teams: any; role_assignments: { user_id: string }[] }, userId: string, orgRole: string, wsRole: string | null): { authorized: boolean; canEdit: boolean } {
  const isCreator = event.created_by === userId
  const isAdmin = orgRole === 'admin'
  const hasRoleAssignment = event.role_assignments.some(ra => ra.user_id === userId)

  let canEdit = isCreator || isAdmin || hasRoleAssignment
  let authorized = canEdit

  if (wsRole) {
    authorized = true
    if (wsRole === 'admin' || wsRole === 'planner') canEdit = true
  }

  if (!authorized && Array.isArray(event.event_teams)) {
    for (const team of event.event_teams as any[]) {
      for (const m of (team.members || [])) {
        if (m.is_user && m.contact_id === userId) {
          authorized = true
          break
        }
      }
      if (authorized) break
    }
  }

  return { authorized, canEdit }
}

/** Fetch event + compute access. Used by createFile (needs separate file query anyway). */
async function checkEventAccess(eventId: string, userId: string, orgRole: string): Promise<{ authorized: boolean; canEdit: boolean }> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: EVENT_ACCESS_SELECT,
  })
  if (!event) throw new AppError('Event not found', 404)

  const wsRole = event.workspace_id ? await getWorkspaceMemberRole(event.workspace_id, userId) : null
  return computeAccess(event, userId, orgRole, wsRole)
}

const UPLOADS_ROOT = path.resolve(__dirname, '../../uploads')

/** Resolve a stored file URL to an absolute path, rejecting path traversal. */
function safeFilePath(url: string): string {
  // Strip leading slash so path.resolve doesn't treat it as drive root on Windows
  const cleaned = url.replace(/^\/+/, '')
  const resolved = path.resolve(__dirname, '../..', cleaned)
  if (!resolved.startsWith(UPLOADS_ROOT + path.sep) && resolved !== UPLOADS_ROOT) {
    throw new AppError('Invalid file path', 400)
  }
  return resolved
}

async function tryUnlink(filePath: string): Promise<void> {
  try { await fs.unlink(filePath) } catch { /* ignore ENOENT */ }
}

export const getEventFiles = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params

    // Single query: event + files
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        ...EVENT_ACCESS_SELECT,
        files: {
          include: { uploader: { select: UPLOADER_SELECT } },
          orderBy: { created_at: 'desc' as const },
        },
      },
    })
    if (!event) throw new AppError('Event not found', 404)

    const wsRole = event.workspace_id ? await getWorkspaceMemberRole(event.workspace_id, req.user!.id) : null
    const { authorized } = computeAccess(event, req.user!.id, req.user!.org_role, wsRole)
    if (!authorized) throw new AppError('Not authorized', 403)

    res.json(event.files)
  } catch (error) {
    next(error)
  }
}

export const createFile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params
    const { canEdit } = await checkEventAccess(eventId, req.user!.id, req.user!.org_role)
    if (!canEdit) throw new AppError('Not authorized to add files', 403)

    const category = req.body.category || null
    if (category && !VALID_CATEGORIES.includes(category)) {
      throw new AppError('Invalid category', 400)
    }
    const notes = req.body.notes || null

    if (req.file) {
      // Upload flow — parallel quota checks
      const [eventUsage, userUsage] = await Promise.all([
        prisma.soluplanFile.aggregate({
          where: { event_id: eventId, file_type: 'upload', expired_at: null },
          _sum: { file_size: true },
        }),
        prisma.soluplanFile.aggregate({
          where: { uploader_id: req.user!.id, file_type: 'upload', expired_at: null },
          _sum: { file_size: true },
        }),
      ])

      if ((eventUsage._sum.file_size || 0) + req.file.size > MAX_EVENT_STORAGE) {
        await tryUnlink(req.file.path)
        throw new AppError('Event storage quota exceeded (2MB limit)', 413)
      }
      if ((userUsage._sum.file_size || 0) + req.file.size > MAX_USER_STORAGE) {
        await tryUnlink(req.file.path)
        throw new AppError('User storage quota exceeded (5MB limit)', 413)
      }

      // Move file to uploads/{eventId}/
      const destDir = path.join(__dirname, '../../uploads', eventId)
      await fs.mkdir(destDir, { recursive: true })
      const storedFilename = req.file.filename
      const destPath = path.join(destDir, storedFilename)
      await fs.rename(req.file.path, destPath)

      try {
        const file = await prisma.soluplanFile.create({
          data: {
            event_id: eventId,
            uploader_id: req.user!.id,
            filename: req.file.originalname,
            url: `/uploads/${eventId}/${storedFilename}`,
            file_type: 'upload',
            file_size: req.file.size,
            mime_type: req.file.mimetype,
            category,
            notes,
          },
          include: { uploader: { select: UPLOADER_SELECT } },
        })

        res.status(201).json(file)
      } catch (dbError) {
        await tryUnlink(destPath)
        throw dbError
      }
    } else {
      // Link flow
      const { url, filename } = req.body
      if (!url || !filename) {
        throw new AppError('URL and filename are required for links', 400)
      }

      try {
        const parsed = new URL(url)
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          throw new AppError('Only HTTP/HTTPS URLs are allowed', 400)
        }
      } catch (e) {
        if (e instanceof AppError) throw e
        throw new AppError('Invalid URL', 400)
      }

      const file = await prisma.soluplanFile.create({
        data: {
          event_id: eventId,
          uploader_id: req.user!.id,
          filename,
          url,
          file_type: 'link',
          file_size: 0,
          category,
          notes,
        },
        include: { uploader: { select: UPLOADER_SELECT } },
      })

      res.status(201).json(file)
    }
  } catch (error) {
    // Clean up temp file on any pre-rename error
    if (req.file) await tryUnlink(req.file.path)
    next(error)
  }
}

export const deleteFile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    // Single query: file + event access data
    const file = await prisma.soluplanFile.findUnique({
      where: { id },
      include: {
        event: { select: EVENT_ACCESS_SELECT },
      },
    })
    if (!file) throw new AppError('File not found', 404)

    if (file.event) {
      const wsRole = file.event.workspace_id ? await getWorkspaceMemberRole(file.event.workspace_id, req.user!.id) : null
      const { canEdit } = computeAccess(file.event, req.user!.id, req.user!.org_role, wsRole)
      const isUploader = file.uploader_id === req.user!.id
      if (!canEdit && !isUploader) throw new AppError('Not authorized to delete this file', 403)
    } else {
      // No event — only uploader or org admin can delete
      const isUploader = file.uploader_id === req.user!.id
      const isAdmin = req.user!.org_role === 'admin'
      if (!isUploader && !isAdmin) throw new AppError('Not authorized to delete this file', 403)
    }

    // Delete DB record first, then clean up disk (orphaned disk file is less harmful than dangling DB record)
    const fileUrl = file.url
    const fileType = file.file_type
    await prisma.soluplanFile.delete({ where: { id } })

    if (fileType === 'upload') {
      try {
        await tryUnlink(safeFilePath(fileUrl))
      } catch { /* path validation failed — skip disk cleanup */ }
    }

    res.status(204).send()
  } catch (error) {
    next(error)
  }
}

export const downloadFile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    // Single query: file + event access data
    const file = await prisma.soluplanFile.findUnique({
      where: { id },
      include: {
        event: { select: EVENT_ACCESS_SELECT },
      },
    })
    if (!file) throw new AppError('File not found', 404)

    // Authorization check
    if (file.event) {
      const wsRole = file.event.workspace_id ? await getWorkspaceMemberRole(file.event.workspace_id, req.user!.id) : null
      const { authorized } = computeAccess(file.event, req.user!.id, req.user!.org_role, wsRole)
      if (!authorized) throw new AppError('Not authorized', 403)
    } else {
      // No event — only uploader or org admin can download
      const isUploader = file.uploader_id === req.user!.id
      const isAdmin = req.user!.org_role === 'admin'
      if (!isUploader && !isAdmin) throw new AppError('Not authorized', 403)
    }

    if (file.expired_at) {
      throw new AppError('File has expired', 410)
    }

    if (file.file_type === 'link') {
      res.redirect(file.url)
      return
    }

    const filePath = safeFilePath(file.url)
    try {
      await fs.access(filePath)
    } catch {
      throw new AppError('File not found on disk', 404)
    }

    res.download(filePath, file.filename)
  } catch (error) {
    next(error)
  }
}

export const getUserStorage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const usage = await prisma.soluplanFile.aggregate({
      where: { uploader_id: req.user!.id, file_type: 'upload', expired_at: null },
      _sum: { file_size: true },
    })

    res.json({
      used: usage._sum.file_size || 0,
      limit: MAX_USER_STORAGE,
    })
  } catch (error) {
    next(error)
  }
}
