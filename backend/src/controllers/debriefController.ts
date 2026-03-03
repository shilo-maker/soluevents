import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth'
import prisma from '../lib/prisma'
import { getQuestionsForEvent } from '../constants/debriefQuestions'
import { getWorkspaceMemberRole } from '../services/workspaceService'
import { notify } from '../lib/notify'

const VALID_STATUSES = ['draft', 'sent', 'closed'] as const

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ['sent', 'closed'],
  sent: ['closed'],
  closed: [],
}

/** Check if the user can manage this event's debrief */
async function canManageDebrief(userId: string, orgRole: string | undefined, event: { created_by: string; workspace_id: string | null }): Promise<boolean> {
  if (event.created_by === userId) return true
  if (orgRole === 'admin') return true
  if (event.workspace_id) {
    const wsRole = await getWorkspaceMemberRole(event.workspace_id, userId)
    if (wsRole === 'admin' || wsRole === 'planner') return true
  }
  return false
}

/**
 * Load debrief with its parent event in a single query.
 * Verifies debrief exists and belongs to the given eventId.
 */
async function loadDebriefWithEvent(debriefId: string, eventId: string) {
  const debrief = await prisma.eventDebrief.findUnique({
    where: { id: debriefId },
    include: {
      event: {
        select: {
          id: true, title: true, created_by: true, workspace_id: true,
          event_teams: true, program_agenda: true,
          role_assignments: { select: { user_id: true } },
        },
      },
    },
  })
  if (!debrief || debrief.event_id !== eventId) return null
  return debrief
}

/** Check if user is an event participant using pre-fetched event data */
async function isEventParticipant(
  userId: string,
  eventId: string,
  event: { created_by: string; event_teams: any; program_agenda: any },
): Promise<boolean> {
  if (event.created_by === userId) return true

  // Check role_assignments (requires DB query — not in event select for all callers)
  const ra = await prisma.roleAssignment.findFirst({
    where: { event_id: eventId, user_id: userId },
    select: { id: true },
  })
  if (ra) return true

  // Check event_teams membership
  if (event.event_teams && Array.isArray(event.event_teams)) {
    for (const team of event.event_teams as any[]) {
      if (team.members && Array.isArray(team.members)) {
        for (const member of team.members) {
          if (member.is_user && member.contact_id === userId) return true
        }
      }
    }
  }

  // Check program_agenda
  if (event.program_agenda && typeof event.program_agenda === 'object') {
    const agenda = event.program_agenda as any
    for (const section of ['pre_event', 'program', 'post_event']) {
      const items = agenda[section]
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item.person_id === userId || item.leader_id === userId) return true
        }
      }
    }
  }

  return false
}

/** Collect all involved user IDs from an event */
function collectInvolvedUserIds(event: {
  role_assignments: { user_id: string }[]
  event_teams: any
  program_agenda: any
}): Set<string> {
  const userIds = new Set<string>()

  for (const ra of event.role_assignments) {
    userIds.add(ra.user_id)
  }

  if (event.event_teams && Array.isArray(event.event_teams)) {
    for (const team of event.event_teams as any[]) {
      if (team.members && Array.isArray(team.members)) {
        for (const member of team.members) {
          if (member.is_user && member.contact_id) {
            userIds.add(member.contact_id)
          }
        }
      }
    }
  }

  if (event.program_agenda && typeof event.program_agenda === 'object') {
    const agenda = event.program_agenda as any
    for (const section of ['pre_event', 'program', 'post_event']) {
      const items = agenda[section]
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item.person_id) userIds.add(item.person_id)
          if (item.leader_id) userIds.add(item.leader_id)
        }
      }
    }
  }

  return userIds
}

/** GET /api/events/:eventId/debrief */
export const getDebrief = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params
    const userId = req.user!.id

    // Fetch debrief first — only fetch event if no debrief (for suggested questions)
    const debrief = await prisma.eventDebrief.findFirst({
      where: { event_id: eventId },
      orderBy: { created_at: 'desc' },
    })

    if (!debrief) {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, event_teams: true },
      })
      if (!event) {
        return res.status(404).json({ status: 'error', message: 'Event not found' })
      }
      const suggestedQuestions = getQuestionsForEvent(event.event_teams as any[] | null)
      return res.json({ status: 'ok', data: null, suggestedQuestions })
    }

    // Parallel: count responses + get user's own response
    const [responseCount, userResponse] = await Promise.all([
      prisma.debriefResponse.count({ where: { debrief_id: debrief.id } }),
      prisma.debriefResponse.findUnique({
        where: { debrief_id_user_id: { debrief_id: debrief.id, user_id: userId } },
      }),
    ])

    return res.json({
      status: 'ok',
      data: {
        ...debrief,
        response_count: responseCount,
        user_has_responded: !!userResponse,
        user_response: userResponse,
      },
    })
  } catch (error) {
    next(error)
  }
}

/** POST /api/events/:eventId/debrief */
export const createDebrief = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params
    const { questions } = req.body
    const userId = req.user!.id

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, event_teams: true, created_by: true, workspace_id: true },
    })
    if (!event) {
      return res.status(404).json({ status: 'error', message: 'Event not found' })
    }

    if (!(await canManageDebrief(userId, req.user!.org_role, event))) {
      return res.status(403).json({ status: 'error', message: 'Not authorized to create debrief for this event' })
    }

    const existing = await prisma.eventDebrief.findFirst({
      where: { event_id: eventId },
    })
    if (existing) {
      return res.status(409).json({ status: 'error', message: 'A debrief already exists for this event' })
    }

    const finalQuestions = questions || getQuestionsForEvent(event.event_teams as any[] | null)

    const debrief = await prisma.eventDebrief.create({
      data: {
        event_id: eventId,
        questions: finalQuestions as any,
        created_by: userId,
        status: 'draft',
      },
    })

    return res.status(201).json({ status: 'ok', data: debrief })
  } catch (error: any) {
    // P2002 = unique constraint violation (race condition: concurrent create)
    if (error?.code === 'P2002') {
      return res.status(409).json({ status: 'error', message: 'A debrief already exists for this event' })
    }
    next(error)
  }
}

/** PUT /api/events/:eventId/debrief/:debriefId */
export const updateDebrief = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { eventId, debriefId } = req.params
    const { questions, status } = req.body
    const userId = req.user!.id

    // Single query: debrief + event
    const loaded = await loadDebriefWithEvent(debriefId, eventId)
    if (!loaded) {
      return res.status(404).json({ status: 'error', message: 'Debrief not found for this event' })
    }

    if (!(await canManageDebrief(userId, req.user!.org_role, loaded.event))) {
      return res.status(403).json({ status: 'error', message: 'Not authorized to update this debrief' })
    }

    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      })
    }

    if (status !== undefined && status !== loaded.status) {
      const allowed = ALLOWED_TRANSITIONS[loaded.status] || []
      if (!allowed.includes(status)) {
        return res.status(400).json({
          status: 'error',
          message: `Cannot transition from '${loaded.status}' to '${status}'. Allowed: ${allowed.join(', ') || 'none'}`,
        })
      }
    }

    const data: any = {}
    if (questions !== undefined) data.questions = questions
    if (status !== undefined) {
      data.status = status
      if (status === 'sent') {
        data.sent_at = new Date()
        data.closed_at = null
      }
      if (status === 'closed') {
        data.closed_at = new Date()
      }
    }

    const debrief = await prisma.eventDebrief.update({
      where: { id: debriefId },
      data,
    })

    return res.json({ status: 'ok', data: debrief })
  } catch (error) {
    next(error)
  }
}

/** POST /api/events/:eventId/debrief/:debriefId/send */
export const sendDebrief = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { eventId, debriefId } = req.params
    const userId = req.user!.id

    // Single query: debrief + event (with role_assignments for notifications)
    const loaded = await loadDebriefWithEvent(debriefId, eventId)
    if (!loaded) {
      return res.status(404).json({ status: 'error', message: 'Debrief not found for this event' })
    }

    // Auth check first to avoid leaking status info
    if (!(await canManageDebrief(userId, req.user!.org_role, loaded.event))) {
      return res.status(403).json({ status: 'error', message: 'Not authorized to send this debrief' })
    }

    if (loaded.status !== 'draft') {
      return res.status(400).json({
        status: 'error',
        message: `Debrief is already '${loaded.status}'. Only draft debriefs can be sent.`,
      })
    }

    const involvedUserIds = collectInvolvedUserIds(loaded.event)

    const debrief = await prisma.eventDebrief.update({
      where: { id: debriefId },
      data: { status: 'sent', sent_at: new Date() },
      select: { id: true, status: true, sent_at: true },
    })

    await Promise.allSettled(
      Array.from(involvedUserIds).map(uid =>
        notify(uid, 'debrief_request', {
          event_id: eventId,
          debrief_id: debriefId,
          event_title: loaded.event.title,
        }).catch(err => console.error(`Failed to send debrief notification to ${uid}:`, err))
      )
    )

    return res.json({ status: 'ok', data: debrief, notified_count: involvedUserIds.size })
  } catch (error) {
    next(error)
  }
}

/** GET /api/events/:eventId/debrief/:debriefId/responses */
export const getResponses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { eventId, debriefId } = req.params
    const userId = req.user!.id

    // Single query: debrief + event
    const loaded = await loadDebriefWithEvent(debriefId, eventId)
    if (!loaded) {
      return res.status(404).json({ status: 'error', message: 'Debrief not found for this event' })
    }

    if (!(await canManageDebrief(userId, req.user!.org_role, loaded.event))) {
      return res.status(403).json({ status: 'error', message: 'Not authorized to view debrief responses' })
    }

    const responses = await prisma.debriefResponse.findMany({
      where: { debrief_id: debriefId },
      include: {
        user: {
          select: { id: true, name: true, name_he: true, name_en: true, username: true, email: true, avatar_url: true },
        },
      },
      orderBy: { submitted_at: 'asc' },
    })

    return res.json({ status: 'ok', data: responses })
  } catch (error) {
    next(error)
  }
}

/** POST /api/events/:eventId/debrief/:debriefId/respond */
export const submitResponse = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { eventId, debriefId } = req.params
    const { answers } = req.body
    const userId = req.user!.id

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Non-empty answers array is required' })
    }

    // Single query: debrief + event (avoids separate verifyOwnership + event fetch)
    const loaded = await loadDebriefWithEvent(debriefId, eventId)
    if (!loaded) {
      return res.status(404).json({ status: 'error', message: 'Debrief not found for this event' })
    }

    if (loaded.status !== 'sent') {
      return res.status(400).json({ status: 'error', message: 'Debrief is not accepting responses' })
    }

    // Authorize: manager or participant (uses pre-fetched event data)
    const isManager = await canManageDebrief(userId, req.user!.org_role, loaded.event)
    if (!isManager) {
      const isParticipant = await isEventParticipant(userId, eventId, loaded.event)
      if (!isParticipant) {
        return res.status(403).json({ status: 'error', message: 'Not authorized to respond to this debrief' })
      }
    }

    const response = await prisma.debriefResponse.upsert({
      where: { debrief_id_user_id: { debrief_id: debriefId, user_id: userId } },
      update: { answers: answers as any, submitted_at: new Date() },
      create: {
        debrief_id: debriefId,
        user_id: userId,
        answers: answers as any,
      },
    })

    return res.json({ status: 'ok', data: response })
  } catch (error) {
    next(error)
  }
}

export { collectInvolvedUserIds }
