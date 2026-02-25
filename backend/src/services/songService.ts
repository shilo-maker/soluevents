import prisma from '../lib/prisma'

export async function searchSongs(query: string, workspaceId?: string, limit = 50) {
  const where: any = {}

  if (query) {
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { author: { contains: query, mode: 'insensitive' } },
      { authors: { contains: query, mode: 'insensitive' } },
    ]
  }

  if (workspaceId) {
    where.workspaceId = workspaceId
  }

  return prisma.song.findMany({
    where,
    select: {
      id: true,
      title: true,
      author: true,
      authors: true,
      originalLanguage: true,
      musicalKey: true,
      bpm: true,
      timeSignature: true,
      songCode: true,
      isPublic: true,
      workspaceId: true,
      createdAt: true,
    },
    orderBy: { title: 'asc' },
    take: limit,
  })
}

export async function getSongById(id: string) {
  return prisma.song.findUnique({
    where: { id },
    include: {
      creator: {
        select: { id: true, email: true, username: true, name: true },
      },
      songTags: {
        include: {
          tag: { select: { id: true, name: true, color: true } },
        },
      },
    },
  })
}

export async function getSongsByWorkspace(workspaceId: string) {
  return prisma.song.findMany({
    where: { workspaceId },
    select: {
      id: true,
      title: true,
      author: true,
      authors: true,
      originalLanguage: true,
      musicalKey: true,
      bpm: true,
      songCode: true,
      createdAt: true,
    },
    orderBy: { title: 'asc' },
  })
}
