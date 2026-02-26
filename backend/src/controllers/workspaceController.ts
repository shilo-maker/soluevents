import { Response, NextFunction } from 'express'
import { AppError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/auth'
import {
  getUserWorkspaces,
  switchActiveWorkspace,
  createOrganizationWorkspace,
  getWorkspaceMemberRole,
  checkWorkspaceMembership,
  updateWorkspace,
  getWorkspaceMembers,
  updateMemberRole,
  removeMember,
  deleteWorkspace,
  getWorkspaceInvitations,
  revokeInvitation,
} from '../services/workspaceService'
import prisma from '../lib/prisma'
import crypto from 'crypto'

export const listWorkspaces = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const workspaces = await getUserWorkspaces(req.user!.id)
    const activeId = req.user!.activeWorkspaceId

    const result = workspaces.map((ws) => ({
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      workspaceType: ws.workspaceType,
      role: ws.members[0]?.role ?? 'member',
      is_active: activeId ? ws.id === activeId : false,
    }))

    // Correct stale activeId — if it doesn't match any workspace the user is in
    const activeIdIsValid = activeId && result.some((ws) => ws.id === activeId)

    if ((!activeId || !activeIdIsValid) && result.length > 0) {
      result.forEach((ws) => { ws.is_active = false })
      result[0].is_active = true
      try {
        await switchActiveWorkspace(req.user!.id, result[0].id)
      } catch (err) {
        console.error('Failed to auto-activate workspace:', err)
      }
    }

    res.json(result)
  } catch (error) {
    next(error)
  }
}

export const createWorkspace = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name } = req.body
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new AppError('Workspace name is required', 400)
    }
    if (name.trim().length > 100) {
      throw new AppError('Workspace name must be 100 characters or less', 400)
    }

    const workspace = await createOrganizationWorkspace(req.user!.id, name.trim())

    res.status(201).json({
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      workspaceType: workspace.workspaceType,
      role: 'admin',
      is_active: false,
    })
  } catch (error) {
    next(error)
  }
}

export const switchWorkspace = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const workspace = await switchActiveWorkspace(req.user!.id, id)
    // Include role for consistent API contract
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId: req.user!.id } },
      select: { role: true },
    })
    res.json({ ...workspace, role: member?.role ?? 'member', is_active: true })
  } catch (error) {
    next(error)
  }
}

export const generateInvite = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params

    // Only admins/planners of org workspaces can invite
    const workspace = await prisma.workspace.findUnique({
      where: { id },
      select: { id: true, workspaceType: true },
    })

    if (!workspace) {
      throw new AppError('Workspace not found', 404)
    }

    if (workspace.workspaceType === 'personal') {
      throw new AppError('Cannot invite to a personal workspace', 400)
    }

    const role = await getWorkspaceMemberRole(id, req.user!.id)
    if (!role || !['admin', 'planner'].includes(role)) {
      throw new AppError('Only admins and planners can generate invites', 403)
    }

    const token = crypto.randomBytes(24).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7-day expiry

    const invitation = await prisma.workspaceInvitation.create({
      data: {
        workspaceId: id,
        token,
        createdById: req.user!.id,
        expiresAt,
        maxUses: 50,
        usageCount: 0,
      },
    })

    res.status(201).json({
      token: invitation.token,
      expiresAt: invitation.expiresAt,
    })
  } catch (error) {
    next(error)
  }
}

export const acceptInvite = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.params

    const invitation = await prisma.workspaceInvitation.findUnique({
      where: { token },
      include: {
        workspace: {
          select: { id: true, name: true, slug: true, workspaceType: true },
        },
      },
    })

    if (!invitation) {
      throw new AppError('Invalid invite link', 404)
    }

    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      throw new AppError('Invite link has expired', 410)
    }

    if (invitation.maxUses && invitation.usageCount !== null && invitation.usageCount >= invitation.maxUses) {
      throw new AppError('Invite link has reached maximum uses', 410)
    }

    // All checks and mutations inside Serializable transaction to prevent races
    const alreadyMember = await prisma.$transaction(async (tx) => {
      // Check membership inside transaction
      const existingMember = await tx.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId: req.user!.id } },
      })

      if (existingMember) {
        // Already a member — just switch to this workspace
        await tx.user.update({
          where: { id: req.user!.id },
          data: { activeWorkspaceId: invitation.workspaceId },
        })
        return true
      }

      // Re-check usageCount and expiresAt inside transaction to prevent race
      const fresh = await tx.workspaceInvitation.findUnique({
        where: { id: invitation.id },
        select: { usageCount: true, maxUses: true, expiresAt: true },
      })
      if (fresh?.expiresAt && fresh.expiresAt < new Date()) {
        throw new AppError('Invite link has expired', 410)
      }
      if (fresh?.maxUses && (fresh.usageCount ?? 0) >= fresh.maxUses) {
        throw new AppError('Invite link has reached maximum uses', 410)
      }

      await tx.workspaceMember.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId: req.user!.id,
          role: 'member',
          joinedAt: new Date(),
        },
      })

      await tx.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { usageCount: { increment: 1 } },
      })

      await tx.user.update({
        where: { id: req.user!.id },
        data: { activeWorkspaceId: invitation.workspaceId },
      })

      return false
    }, { isolationLevel: 'Serializable' })

    res.json({ workspace: invitation.workspace, alreadyMember })
  } catch (error) {
    next(error)
  }
}

const VALID_ROLES = ['admin', 'planner', 'leader', 'member']

export const getWorkspaceDetails = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const role = await getWorkspaceMemberRole(id, req.user!.id)
    if (role !== 'admin') {
      throw new AppError('Admin access required', 403)
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true, workspaceType: true },
    })
    if (!workspace) throw new AppError('Workspace not found', 404)

    const members = await getWorkspaceMembers(id)

    res.json({ workspace, members })
  } catch (error) {
    next(error)
  }
}

export const updateWorkspaceHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const role = await getWorkspaceMemberRole(id, req.user!.id)
    if (role !== 'admin') {
      throw new AppError('Admin access required', 403)
    }

    const { name } = req.body
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new AppError('Workspace name is required', 400)
    }
    if (name.trim().length > 100) {
      throw new AppError('Workspace name must be 100 characters or less', 400)
    }

    const workspace = await updateWorkspace(id, name.trim())
    res.json({ id: workspace.id, name: workspace.name, slug: workspace.slug })
  } catch (error) {
    next(error)
  }
}

export const deleteWorkspaceHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const role = await getWorkspaceMemberRole(id, req.user!.id)
    if (role !== 'admin') {
      throw new AppError('Admin access required', 403)
    }

    await deleteWorkspace(id)
    res.status(200).json({ message: 'Workspace deleted' })
  } catch (error) {
    next(error)
  }
}

export const updateMemberRoleHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id, userId } = req.params
    const role = await getWorkspaceMemberRole(id, req.user!.id)
    if (role !== 'admin') {
      throw new AppError('Admin access required', 403)
    }

    const { role: newRole } = req.body
    if (!newRole || !VALID_ROLES.includes(newRole)) {
      throw new AppError(`Role must be one of: ${VALID_ROLES.join(', ')}`, 400)
    }

    const member = await updateMemberRole(id, userId, newRole)
    res.json(member)
  } catch (error) {
    next(error)
  }
}

export const removeMemberHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id, userId } = req.params
    const role = await getWorkspaceMemberRole(id, req.user!.id)
    if (role !== 'admin') {
      throw new AppError('Admin access required', 403)
    }

    await removeMember(id, userId)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}

export const listInvitationsHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const role = await getWorkspaceMemberRole(id, req.user!.id)
    if (role !== 'admin') {
      throw new AppError('Admin access required', 403)
    }

    const invitations = await getWorkspaceInvitations(id)
    res.json(invitations)
  } catch (error) {
    next(error)
  }
}

export const revokeInvitationHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id, inviteId } = req.params
    const role = await getWorkspaceMemberRole(id, req.user!.id)
    if (role !== 'admin') {
      throw new AppError('Admin access required', 403)
    }

    await revokeInvitation(inviteId, id)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}
