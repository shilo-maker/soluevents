import { Response, NextFunction } from 'express'
import { AppError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/auth'
import prisma from '../lib/prisma'
import { checkWorkspaceMembership } from '../services/workspaceService'
import { emitEventUpdate } from '../lib/emitEvent'
import { notify } from '../lib/notify'

async function canAccessTaskComments(
  userId: string,
  orgRole: string,
  task: { assignee_id: string | null; creator_id: string; event_id: string | null; tour_id: string | null }
): Promise<boolean> {
  // Fast in-memory checks — zero queries
  if (task.assignee_id === userId) return true
  if (task.creator_id === userId) return true
  if (orgRole === 'admin') return true

  // Run event + tour checks in parallel
  const checks: Promise<boolean>[] = []
  if (task.event_id) checks.push(checkEventAccess(task.event_id, userId))
  if (task.tour_id) checks.push(checkTourAccess(task.tour_id, userId))
  if (checks.length === 0) return false

  const results = await Promise.all(checks)
  return results.some(Boolean)
}

async function checkEventAccess(eventId: string, userId: string): Promise<boolean> {
  // Single query: fetch event with role_assignments included
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      created_by: true,
      workspace_id: true,
      role_assignments: {
        where: { user_id: userId, role: 'event_manager' },
        select: { id: true },
        take: 1,
      },
    },
  })
  if (!event) return false
  if (event.created_by === userId) return true
  if (event.role_assignments.length > 0) return true

  if (event.workspace_id) {
    return checkWorkspaceMembership(event.workspace_id, userId)
  }
  return false
}

async function checkTourAccess(tourId: string, userId: string): Promise<boolean> {
  const tour = await prisma.tour.findUnique({
    where: { id: tourId },
    select: { director_user_id: true, logistics_user_id: true, comms_user_id: true, media_user_id: true, hospitality_user_id: true },
  })
  if (!tour) return false
  return [tour.director_user_id, tour.logistics_user_id, tour.comms_user_id, tour.media_user_id, tour.hospitality_user_id].includes(userId)
}

export const getComments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { taskId } = req.params

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { assignee_id: true, creator_id: true, event_id: true, tour_id: true },
    })
    if (!task) throw new AppError('Task not found', 404)

    const allowed = await canAccessTaskComments(req.user!.id, req.user!.org_role, task)
    if (!allowed) throw new AppError('Not authorized to view comments on this task', 403)

    const comments = await prisma.comment.findMany({
      where: { entity_type: 'task', entity_id: taskId },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
      orderBy: { created_at: 'asc' },
    })

    res.json(comments)
  } catch (error) {
    next(error)
  }
}

export const addComment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { taskId } = req.params
    const { body } = req.body

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        assignee_id: true,
        creator_id: true,
        event_id: true,
        tour_id: true,
        title: true,
        event: {
          select: {
            id: true,
            title: true,
            created_by: true,
            role_assignments: {
              where: { role: 'event_manager' },
              select: { user_id: true },
            },
          },
        },
      },
    })
    if (!task) throw new AppError('Task not found', 404)

    const allowed = await canAccessTaskComments(req.user!.id, req.user!.org_role, task)
    if (!allowed) throw new AppError('Not authorized to comment on this task', 403)

    const comment = await prisma.comment.create({
      data: {
        entity_type: 'task',
        entity_id: taskId,
        author_id: req.user!.id,
        body,
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    })

    // Fire-and-forget: notify relevant people about the comment
    const recipients = new Set<string>()
    if (task.assignee_id) recipients.add(task.assignee_id)
    recipients.add(task.creator_id)
    if (task.event) {
      recipients.add(task.event.created_by)
      for (const ra of task.event.role_assignments) {
        recipients.add(ra.user_id)
      }
    }
    recipients.delete(req.user!.id)

    if (recipients.size > 0) {
      const truncatedBody = body.length > 100 ? body.slice(0, 100) + '…' : body
      const payload = {
        task_id: taskId,
        task_title: task.title,
        ...(task.event ? { event_id: task.event.id, event_title: task.event.title } : {}),
        commenter_name: comment.author?.name || req.user!.email,
        comment_body: truncatedBody,
      }
      Promise.all(
        [...recipients].map((uid) => notify(uid, 'task_comment', payload))
      ).catch(() => {})
    }

    if (task.event_id) emitEventUpdate(task.event_id, 'comment:created', { taskId, commentId: comment.id })

    res.status(201).json(comment)
  } catch (error) {
    next(error)
  }
}

export const deleteComment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { taskId, commentId } = req.params

    // Fetch comment and task's event_id in parallel
    const [comment, task] = await Promise.all([
      prisma.comment.findUnique({ where: { id: commentId } }),
      prisma.task.findUnique({ where: { id: taskId }, select: { event_id: true } }),
    ])
    if (!comment || comment.entity_type !== 'task' || comment.entity_id !== taskId) {
      throw new AppError('Comment not found', 404)
    }

    const canDelete = comment.author_id === req.user!.id || req.user!.org_role === 'admin'
    if (!canDelete) throw new AppError('Not authorized to delete this comment', 403)

    await prisma.comment.delete({ where: { id: commentId } })

    if (task?.event_id) emitEventUpdate(task.event_id, 'comment:deleted', { taskId, commentId })

    res.status(204).send()
  } catch (error) {
    next(error)
  }
}
