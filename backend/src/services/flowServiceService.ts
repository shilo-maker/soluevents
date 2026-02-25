import prisma from '../lib/prisma'

export async function getFlowServices(workspaceId?: string, limit = 50) {
  const where: any = {}
  if (workspaceId) {
    where.workspaceId = workspaceId
  }
  where.isArchived = false

  return prisma.flowService.findMany({
    where,
    select: {
      id: true,
      title: true,
      date: true,
      time: true,
      location: true,
      code: true,
      isPublic: true,
      workspaceId: true,
      createdAt: true,
      leader: {
        select: { id: true, email: true, username: true, name: true },
      },
    },
    orderBy: { date: 'desc' },
    take: limit,
  })
}

export async function getFlowServiceById(id: string) {
  return prisma.flowService.findUnique({
    where: { id },
    include: {
      leader: {
        select: { id: true, email: true, username: true, name: true },
      },
      creator: {
        select: { id: true, email: true, username: true, name: true },
      },
      songs: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          position: true,
          segmentType: true,
          segmentTitle: true,
          transposition: true,
          song: {
            select: {
              id: true,
              title: true,
              author: true,
              musicalKey: true,
              bpm: true,
            },
          },
        },
      },
    },
  })
}

export async function getFlowServiceByCode(code: string) {
  return prisma.flowService.findUnique({
    where: { code },
    select: {
      id: true,
      title: true,
      code: true,
      isPublic: true,
      workspaceId: true,
      leader: {
        select: { id: true, name: true },
      },
      songs: {
        orderBy: { position: 'asc' },
        where: { segmentType: 'song' },
        select: {
          id: true,
          position: true,
          segmentTitle: true,
          transposition: true,
          song: {
            select: {
              id: true,
              title: true,
              author: true,
              musicalKey: true,
              bpm: true,
            },
          },
        },
      },
    },
  })
}

export async function createFlowService(data: {
  title: string
  workspaceId: string
  date?: string
  time?: string
  location?: string
  leaderId?: string
  createdById: string
}) {
  // Generate a unique code
  const code = Math.random().toString(36).substring(2, 10).toUpperCase()

  return prisma.flowService.create({
    data: {
      title: data.title,
      workspaceId: data.workspaceId,
      date: data.date ? new Date(data.date) : null,
      time: data.time,
      location: data.location,
      leaderId: data.leaderId,
      createdById: data.createdById,
      code,
    },
    include: {
      leader: {
        select: { id: true, email: true, username: true, name: true },
      },
    },
  })
}
