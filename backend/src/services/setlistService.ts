import prisma from '../lib/prisma'

export async function getSetlists(limit = 50) {
  return prisma.setlist.findMany({
    where: {
      isTemporary: false,
    },
    select: {
      id: true,
      name: true,
      items: true,
      usageCount: true,
      shareCode: true,
      flowServiceId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

export async function getSetlistById(id: string) {
  return prisma.setlist.findUnique({
    where: { id },
    include: {
      flowService: {
        select: {
          id: true,
          title: true,
          date: true,
          workspaceId: true,
        },
      },
    },
  })
}

export async function createSetlist(data: {
  name: string
  items?: any
  createdById: string
  flowServiceId?: string
}) {
  return prisma.setlist.create({
    data: {
      name: data.name,
      items: data.items || [],
      createdById: data.createdById,
      flowServiceId: data.flowServiceId,
      isTemporary: false,
    },
  })
}
