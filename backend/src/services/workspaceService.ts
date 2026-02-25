import prisma from '../lib/prisma'

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
