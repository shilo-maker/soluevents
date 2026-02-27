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
import { sendEmail } from '../services/emailService'
import { buildWorkspaceInviteEmailHtml } from '../services/workspaceInviteEmailTemplate'
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

export const VALID_ROLES = ['admin', 'planner', 'leader', 'member']

export const getWorkspaceDetails = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const role = await getWorkspaceMemberRole(id, req.user!.id)
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403)
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true, workspaceType: true },
    })
    if (!workspace) throw new AppError('Workspace not found', 404)

    const members = await getWorkspaceMembers(id)

    res.json({ workspace, members, role })
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

// ── Member Invite (direct email) endpoints ──────────────────────────

export const searchUserByEmail = async (
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

    const email = (req.query.email as string || '').trim().toLowerCase()
    if (!email) {
      return res.json({ found: false })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, username: true, avatar_url: true },
    })

    if (!user) {
      return res.json({ found: false })
    }

    const alreadyMember = await checkWorkspaceMembership(id, user.id)

    const existingInvite = await prisma.workspaceMemberInvite.findUnique({
      where: { workspace_id_invited_email: { workspace_id: id, invited_email: email } },
    })
    const alreadyInvited = !!existingInvite && existingInvite.status === 'pending'

    res.json({ found: true, user, alreadyMember, alreadyInvited })
  } catch (error) {
    next(error)
  }
}

export const sendMemberInvite = async (
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

    const { email, role: inviteRole } = req.body
    if (!email || typeof email !== 'string') {
      throw new AppError('Email is required', 400)
    }
    const normalizedEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new AppError('Invalid email format', 400)
    }

    if (!inviteRole || !VALID_ROLES.includes(inviteRole)) {
      throw new AppError(`Role must be one of: ${VALID_ROLES.join(', ')}`, 400)
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id },
      select: { id: true, name: true, workspaceType: true },
    })
    if (!workspace) throw new AppError('Workspace not found', 404)
    if (workspace.workspaceType === 'personal') {
      throw new AppError('Cannot invite to a personal workspace', 400)
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, name: true, email: true },
    })

    // Check if already a member
    if (targetUser) {
      const isMember = await checkWorkspaceMembership(id, targetUser.id)
      if (isMember) {
        throw new AppError('User is already a member of this workspace', 400)
      }
    }

    // Check for existing pending invite
    const existing = await prisma.workspaceMemberInvite.findUnique({
      where: { workspace_id_invited_email: { workspace_id: id, invited_email: normalizedEmail } },
    })
    if (existing && existing.status === 'pending') {
      throw new AppError('An invite has already been sent to this email', 400)
    }

    // Delete old declined/confirmed invite if exists (to allow re-invite)
    if (existing) {
      await prisma.workspaceMemberInvite.delete({ where: { id: existing.id } })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const invite = await prisma.workspaceMemberInvite.create({
      data: {
        workspace_id: id,
        invited_email: normalizedEmail,
        invited_user_id: targetUser?.id ?? null,
        role: inviteRole,
        token,
        invited_by_id: req.user!.id,
        expires_at: expiresAt,
      },
      include: {
        invitedBy: { select: { id: true, name: true, email: true } },
        invitedUser: { select: { id: true, name: true, email: true, avatar_url: true } },
      },
    })

    // Send email (use invitedBy from the include above instead of a redundant query)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    const baseUrl = `${frontendUrl}/workspace/member-invite/${token}`
    const recipientName = targetUser?.name || normalizedEmail.split('@')[0]

    const html = buildWorkspaceInviteEmailHtml({
      recipientName,
      workspaceName: workspace.name,
      role: inviteRole,
      inviterName: invite.invitedBy.name || invite.invitedBy.email || 'A team member',
      acceptUrl: `${baseUrl}?action=accept`,
      declineUrl: `${baseUrl}?action=decline`,
    })

    try {
      await sendEmail(
        { to: normalizedEmail, subject: `You're invited to join ${workspace.name} on SoluPlan`, html },
        req.user!.id
      )
    } catch (emailError: any) {
      console.error('Email send failed:', emailError)
      // Delete the invite if email fails
      try {
        await prisma.workspaceMemberInvite.delete({ where: { id: invite.id } })
      } catch (deleteError) {
        console.error('Failed to clean up invite after email failure:', deleteError)
      }
      throw new AppError('Failed to send invitation email. Check your SMTP settings.', 500)
    }

    // Create in-app notification for existing users (non-blocking)
    if (targetUser) {
      try {
        await prisma.notification.create({
          data: {
            user_id: targetUser.id,
            type: 'workspace_invite',
            payload: {
              invite_id: invite.id,
              token: invite.token,
              workspace_id: id,
              workspace_name: workspace.name,
              role: inviteRole,
              invited_by_name: invite.invitedBy.name || invite.invitedBy.email || 'Someone',
            },
          },
        })
      } catch (notifError) {
        console.error('Failed to create invite notification:', notifError)
      }
    }

    res.status(201).json({
      id: invite.id,
      invited_email: invite.invited_email,
      role: invite.role,
      status: invite.status,
      expires_at: invite.expires_at,
      created_at: invite.created_at,
      invitedUser: invite.invitedUser,
      invitedBy: invite.invitedBy,
    })
  } catch (error) {
    next(error)
  }
}

export const listMemberInvites = async (
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

    const invites = await prisma.workspaceMemberInvite.findMany({
      where: { workspace_id: id, status: 'pending' },
      include: {
        invitedUser: { select: { id: true, name: true, email: true, avatar_url: true } },
        invitedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { created_at: 'desc' },
    })

    res.json(invites)
  } catch (error) {
    next(error)
  }
}

export const revokeMemberInvite = async (
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

    const invite = await prisma.workspaceMemberInvite.findUnique({ where: { id: inviteId } })
    if (!invite || invite.workspace_id !== id) {
      throw new AppError('Invite not found', 404)
    }

    await prisma.workspaceMemberInvite.delete({ where: { id: inviteId } })

    // Clean up related notification (non-blocking)
    try {
      await prisma.notification.deleteMany({
        where: {
          type: 'workspace_invite',
          payload: {
            path: ['invite_id'],
            equals: inviteId,
          },
        },
      })
    } catch (err) {
      console.error('Failed to clean up notification for revoked invite:', err)
    }

    res.status(204).send()
  } catch (error) {
    next(error)
  }
}

export const getMemberInviteByToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.params

    const invite = await prisma.workspaceMemberInvite.findUnique({
      where: { token },
      include: {
        workspace: { select: { id: true, name: true, slug: true } },
        invitedBy: { select: { id: true, name: true, email: true } },
      },
    })

    if (!invite) {
      throw new AppError('Invalid invitation link', 404)
    }

    if (invite.status !== 'pending') {
      throw new AppError(`This invitation has already been ${invite.status}`, 410)
    }

    if (invite.expires_at < new Date()) {
      throw new AppError('This invitation has expired', 410)
    }

    // Verify the current user's email matches the invite
    if (req.user!.email.toLowerCase() !== invite.invited_email.toLowerCase()) {
      throw new AppError('This invitation was sent to a different email address', 403)
    }

    res.json({
      id: invite.id,
      workspace: invite.workspace,
      role: invite.role,
      invitedBy: invite.invitedBy,
      invited_email: invite.invited_email,
      expires_at: invite.expires_at,
    })
  } catch (error) {
    next(error)
  }
}

export const respondToMemberInvite = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.params
    const { action } = req.body

    if (!action || !['accept', 'decline'].includes(action)) {
      throw new AppError('Action must be "accept" or "decline"', 400)
    }

    const invite = await prisma.workspaceMemberInvite.findUnique({
      where: { token },
      include: {
        workspace: { select: { id: true, name: true, slug: true, workspaceType: true } },
      },
    })

    if (!invite) {
      throw new AppError('Invalid invitation link', 404)
    }

    if (invite.status !== 'pending') {
      throw new AppError(`This invitation has already been ${invite.status}`, 410)
    }

    if (invite.expires_at < new Date()) {
      throw new AppError('This invitation has expired', 410)
    }

    if (req.user!.email.toLowerCase() !== invite.invited_email.toLowerCase()) {
      throw new AppError('This invitation was sent to a different email address', 403)
    }

    if (action === 'decline') {
      // Atomic decline: only update if still pending (prevents race with concurrent accept)
      const updated = await prisma.workspaceMemberInvite.updateMany({
        where: { id: invite.id, status: 'pending' },
        data: { status: 'declined', responded_at: new Date() },
      })
      if (updated.count === 0) {
        throw new AppError('Invitation is no longer valid', 410)
      }
    } else {
      // Accept — use serializable transaction
      await prisma.$transaction(async (tx) => {
        // Re-check inside transaction
        const fresh = await tx.workspaceMemberInvite.findUnique({ where: { id: invite.id } })
        if (!fresh || fresh.status !== 'pending') {
          throw new AppError('Invitation is no longer valid', 410)
        }

        // Check if already a member
        const existing = await tx.workspaceMember.findUnique({
          where: { workspaceId_userId: { workspaceId: invite.workspace_id, userId: req.user!.id } },
        })

        if (!existing) {
          await tx.workspaceMember.create({
            data: {
              workspaceId: invite.workspace_id,
              userId: req.user!.id,
              role: invite.role,
              joinedAt: new Date(),
            },
          })
        }

        await tx.workspaceMemberInvite.update({
          where: { id: invite.id },
          data: { status: 'confirmed', responded_at: new Date() },
        })

        await tx.user.update({
          where: { id: req.user!.id },
          data: { activeWorkspaceId: invite.workspace_id },
        })
      }, { isolationLevel: 'Serializable' })
    }

    // Delete related notification since the invite has been acted on (non-blocking)
    try {
      await prisma.notification.deleteMany({
        where: {
          user_id: req.user!.id,
          type: 'workspace_invite',
          payload: { path: ['invite_id'], equals: invite.id },
        },
      })
    } catch (err) {
      console.error('Failed to delete invite notification:', err)
    }

    if (action === 'decline') {
      return res.json({ status: 'declined' })
    }

    res.json({ status: 'accepted', workspace: invite.workspace })
  } catch (error) {
    next(error)
  }
}

