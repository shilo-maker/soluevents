import prisma from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'
import crypto from 'crypto'

export async function getUserWorkspaces(userId: string) {
  return prisma.workspace.findMany({
    where: {
      members: {
        some: { userId },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      workspaceType: true,
      createdAt: true,
      members: {
        where: { userId },
        select: { role: true },
      },
    },
    orderBy: { name: 'asc' },
  })
}

export async function getWorkspaceById(id: string) {
  return prisma.workspace.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, email: true, username: true, name: true },
          },
        },
      },
    },
  })
}

export async function checkWorkspaceMembership(workspaceId: string, userId: string) {
  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
  })
  return !!member
}

export async function getWorkspaceMemberRole(workspaceId: string, userId: string) {
  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
    select: { role: true },
  })
  return member?.role ?? null
}

function generateSlug(name: string): string {
  let base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!base) {
    base = 'workspace'
  }
  return `${base}-${crypto.randomBytes(4).toString('hex')}`
}

export async function createPersonalWorkspace(userId: string, userName: string) {
  return prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: {
        name: `${userName}'s Workspace`,
        slug: generateSlug(`${userName}-personal`),
        workspaceType: 'personal',
        createdById: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })

    await tx.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId,
        role: 'admin',
        joinedAt: new Date(),
      },
    })

    await tx.user.update({
      where: { id: userId },
      data: {
        activeWorkspaceId: workspace.id,
        defaultWorkspaceId: workspace.id,
      },
    })

    return workspace
  })
}

export async function switchActiveWorkspace(userId: string, workspaceId: string) {
  return prisma.$transaction(async (tx) => {
    const member = await tx.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    })
    if (!member) {
      throw new AppError('Not a member of this workspace', 403)
    }

    const workspace = await tx.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, slug: true, workspaceType: true },
    })
    if (!workspace) {
      throw new AppError('Workspace not found', 404)
    }

    await tx.user.update({
      where: { id: userId },
      data: { activeWorkspaceId: workspaceId },
    })

    return workspace
  })
}

export async function createOrganizationWorkspace(userId: string, name: string) {
  return prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: {
        name,
        slug: generateSlug(name),
        workspaceType: 'organization',
        createdById: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })

    await tx.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId,
        role: 'admin',
        joinedAt: new Date(),
      },
    })

    return workspace
  })
}

export async function updateWorkspace(id: string, name: string) {
  return prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.findUnique({ where: { id } })
    if (!workspace) throw new AppError('Workspace not found', 404)
    if (workspace.workspaceType === 'personal') {
      throw new AppError('Cannot rename a personal workspace', 400)
    }
    return tx.workspace.update({
      where: { id },
      data: { name, slug: generateSlug(name), updatedAt: new Date() },
    })
  })
}

export async function getWorkspaceMembers(workspaceId: string) {
  return prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: {
        select: { id: true, email: true, username: true, name: true, avatar_url: true },
      },
    },
    orderBy: { joinedAt: 'asc' },
  })
}

export async function updateMemberRole(workspaceId: string, userId: string, newRole: string) {
  return prisma.$transaction(async (tx) => {
    const member = await tx.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    })
    if (!member) throw new AppError('Member not found', 404)

    // If demoting from admin, ensure at least one admin remains
    if (member.role === 'admin' && newRole !== 'admin') {
      const adminCount = await tx.workspaceMember.count({
        where: { workspaceId, role: 'admin' },
      })
      if (adminCount <= 1) {
        throw new AppError('Cannot demote the last admin', 400)
      }
    }

    return tx.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId } },
      data: { role: newRole as any },
    })
  })
}

export async function removeMember(workspaceId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const member = await tx.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    })
    if (!member) throw new AppError('Member not found', 404)

    // Block removing the last admin
    if (member.role === 'admin') {
      const adminCount = await tx.workspaceMember.count({
        where: { workspaceId, role: 'admin' },
      })
      if (adminCount <= 1) {
        throw new AppError('Cannot remove the last admin', 400)
      }
    }

    await tx.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId } },
    })

    // Reset removed user's activeWorkspaceId if it pointed to this workspace
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { activeWorkspaceId: true, defaultWorkspaceId: true },
    })
    if (user?.activeWorkspaceId === workspaceId) {
      await tx.user.update({
        where: { id: userId },
        data: { activeWorkspaceId: user.defaultWorkspaceId },
      })
    }
  })
}

export async function deleteWorkspace(id: string) {
  return prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.findUnique({ where: { id } })
    if (!workspace) throw new AppError('Workspace not found', 404)
    if (workspace.workspaceType === 'personal') {
      throw new AppError('Cannot delete a personal workspace', 400)
    }

    // Block if FlowService records exist (non-nullable FK, SoluFlow-owned data)
    const flowServiceCount = await tx.flowService.count({ where: { workspaceId: id } })
    if (flowServiceCount > 0) {
      throw new AppError('Disconnect SoluFlow services first', 400)
    }

    // Delete SongWorkspace records
    await tx.songWorkspace.deleteMany({ where: { workspaceId: id } })

    // Null out Song.workspaceId
    await tx.song.updateMany({ where: { workspaceId: id }, data: { workspaceId: null } })

    // Null out Event.workspace_id (soft FK)
    await tx.event.updateMany({ where: { workspace_id: id }, data: { workspace_id: null } })

    // Delete notifications tied to this workspace (JSON payload filtering)
    await tx.notification.deleteMany({
      where: {
        type: 'workspace_invite',
        payload: {
          path: ['workspace_id'],
          equals: id,
        },
      },
    })

    // Delete invitations
    await tx.workspaceMemberInvite.deleteMany({ where: { workspace_id: id } })
    await tx.workspaceInvitation.deleteMany({ where: { workspaceId: id } })

    // Save member userIds, then delete members
    const members = await tx.workspaceMember.findMany({
      where: { workspaceId: id },
      select: { userId: true },
    })
    const memberUserIds = members.map((m) => m.userId)

    await tx.workspaceMember.deleteMany({ where: { workspaceId: id } })

    // Reset affected users' activeWorkspaceId to their defaultWorkspaceId
    for (const uid of memberUserIds) {
      const user = await tx.user.findUnique({
        where: { id: uid },
        select: { activeWorkspaceId: true, defaultWorkspaceId: true },
      })
      if (user?.activeWorkspaceId === id) {
        await tx.user.update({
          where: { id: uid },
          data: { activeWorkspaceId: user.defaultWorkspaceId },
        })
      }
    }

    // Delete the workspace
    await tx.workspace.delete({ where: { id } })
  })
}

export async function getWorkspaceInvitations(workspaceId: string) {
  return prisma.workspaceInvitation.findMany({
    where: {
      workspaceId,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function revokeInvitation(invitationId: string, workspaceId: string) {
  const invitation = await prisma.workspaceInvitation.findUnique({
    where: { id: invitationId },
  })
  if (!invitation || invitation.workspaceId !== workspaceId) {
    throw new AppError('Invitation not found', 404)
  }
  await prisma.workspaceInvitation.delete({ where: { id: invitationId } })
}

export async function ensurePersonalWorkspace(userId: string, userName: string) {
  return prisma.$transaction(async (tx) => {
    // Check if user is already a member of any personal workspace
    // (checks membership, not createdById — SoluFlow/SoluCast may create workspaces
    // without setting createdById, leading to duplicates if we only check createdById)
    const existing = await tx.workspace.findFirst({
      where: {
        workspaceType: 'personal',
        members: {
          some: { userId },
        },
      },
      select: { id: true, name: true, slug: true, workspaceType: true },
    })

    if (existing) {
      // Verify user is still a member (could have been removed manually)
      const isMember = await tx.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: existing.id, userId } },
      })
      if (!isMember) {
        await tx.workspaceMember.create({
          data: { workspaceId: existing.id, userId, role: 'admin', joinedAt: new Date() },
        })
      }

      // Ensure activeWorkspaceId is set if missing
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { activeWorkspaceId: true, defaultWorkspaceId: true },
      })
      if (!user?.activeWorkspaceId || !user?.defaultWorkspaceId) {
        await tx.user.update({
          where: { id: userId },
          data: {
            ...(!user?.activeWorkspaceId ? { activeWorkspaceId: existing.id } : {}),
            ...(!user?.defaultWorkspaceId ? { defaultWorkspaceId: existing.id } : {}),
          },
        })
      }
      return existing
    }

    // Create within the same transaction to prevent race conditions
    const workspace = await tx.workspace.create({
      data: {
        name: `${userName}'s Workspace`,
        slug: generateSlug(`${userName}-personal`),
        workspaceType: 'personal',
        createdById: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })

    await tx.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId,
        role: 'admin',
        joinedAt: new Date(),
      },
    })

    await tx.user.update({
      where: { id: userId },
      data: {
        activeWorkspaceId: workspace.id,
        defaultWorkspaceId: workspace.id,
      },
    })

    return workspace
  }, { isolationLevel: 'Serializable' })
}
