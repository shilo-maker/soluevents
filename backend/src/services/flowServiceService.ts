import prisma from '../lib/prisma'
import { Prisma } from '@prisma/client'

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
  code?: string
}) {
  const code = data.code || Math.random().toString(36).substring(2, 10).toUpperCase()

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

/**
 * Look up a SoluFlow service code in `flow_services`, falling back to
 * the SoluFlow `services` table (shared DB) to verify the code exists.
 *
 * When called with a `userId`, auto-creates a mirror FlowService record
 * using the authenticated user's workspace (frontend linking flow).
 * Songs are managed by the unified SoluPresenter backend and synced via webhooks.
 *
 * When called without a `userId` (webhook path), only returns an existing
 * FlowService — never auto-creates.
 */
export async function findOrCreateFlowServiceByCode(
  code: string,
  userId?: string
) {
  const upperCode = code.toUpperCase()

  // 1. Try flow_services first (fast path)
  const existing = await getFlowServiceByCode(upperCode)
  if (existing) return existing

  // 2. Without a userId we can't auto-create — return null
  if (!userId) return null

  // 3. Frontend path: verify the code exists in SoluFlow's services table
  let soluflowTitle: string | null = null
  let soluflowDate: Date | null = null
  let soluflowTime: string | null = null
  let soluflowLocation: string | null = null
  let soluflowCode: string | null = null

  try {
    const rows = await prisma.$queryRaw<any[]>(
      Prisma.sql`
        SELECT s.title, s.code, s.date, s.time::text AS time, s.location
        FROM services s
        WHERE UPPER(s.code) = ${upperCode}
        LIMIT 1
      `
    )
    if (rows && rows.length > 0) {
      soluflowTitle = rows[0].title
      soluflowCode = rows[0].code
      soluflowDate = rows[0].date ? new Date(rows[0].date) : null
      soluflowTime = rows[0].time || null
      soluflowLocation = rows[0].location || null
    }
  } catch (err: any) {
    console.warn(
      '[FlowService bridge] services table query failed:',
      err?.message || err
    )
  }

  if (!soluflowCode) return null

  // 4. Resolve the user's active workspace
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeWorkspaceId: true, defaultWorkspaceId: true },
  })
  const workspaceId = user?.activeWorkspaceId || user?.defaultWorkspaceId
  if (!workspaceId) return null

  // 5. Auto-create FlowService mirror
  try {
    await prisma.flowService.create({
      data: {
        title: soluflowTitle || 'Untitled Service',
        code: soluflowCode,
        workspaceId,
        date: soluflowDate,
        time: soluflowTime,
        location: soluflowLocation,
        createdById: userId,
      },
    })
  } catch (err: any) {
    // P2002 = unique constraint violation (concurrent request created it first)
    if (err?.code !== 'P2002') {
      console.error('[FlowService bridge] Create failed:', err?.message || err)
      return null
    }
  }

  // Return the record (either we created it or the concurrent request did)
  return getFlowServiceByCode(soluflowCode.toUpperCase())
}
