import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { AuthRequest } from '../middleware/auth'
import { AppError } from '../middleware/errorHandler'
import { Prisma } from '@prisma/client'
import prisma from '../lib/prisma'
import { sendEmail } from '../services/emailService'
import { buildInvitationEmailHtml, RoleSummary } from '../services/invitationEmailTemplate'
import { getWorkspaceMemberRole } from '../services/workspaceService'

interface ExtractedPerson {
  email: string
  name: string
  user_id?: string
  contact_id?: string
  is_user: boolean
  roles: RoleSummary[]
}

function formatDate(date: Date, timeZone?: string): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone })
}

function formatTime(date: Date, timeZone?: string): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone })
}

/**
 * Extract all unique people from event_teams and program_agenda, deduped by email.
 */
async function extractPeople(event: any): Promise<{ people: ExtractedPerson[]; skippedNames: string[] }> {
  const byEmail = new Map<string, ExtractedPerson>()
  const skippedNames: string[] = []
  const userIdsToLookup = new Set<string>()
  const contactIdsToLookup = new Set<string>()

  // Collect IDs that need email lookup from program_schedule
  if (event.program_agenda?.program_schedule) {
    for (const item of event.program_agenda.program_schedule as any[]) {
      const fields = [
        { id: item.person_id, is_user: item.person_is_user },
        { id: item.speaker_id, is_user: item.speaker_is_user },
        { id: item.prayer_leader_id, is_user: item.prayer_leader_is_user },
        { id: item.facilitator_id, is_user: item.facilitator_is_user },
      ]
      for (const f of fields) {
        if (!f.id) continue
        if (f.is_user) userIdsToLookup.add(f.id)
        else contactIdsToLookup.add(f.id)
      }
    }
  }

  // Collect IDs from rider_details production team
  if (event.rider_details?.production_team) {
    const pt = event.rider_details.production_team as any
    for (const member of [pt.soundman, pt.projection, pt.host]) {
      const id = member?.user_id || member?.contact_id
      if (!id) continue
      if (member.is_user) userIdsToLookup.add(id)
      else contactIdsToLookup.add(id)
    }
  }

  // Also collect IDs from event_teams members that may lack inline email
  if (event.event_teams && Array.isArray(event.event_teams)) {
    for (const team of event.event_teams as any[]) {
      for (const member of team.members || []) {
        if (!member.contact_id || member.email) continue
        if (member.is_user) userIdsToLookup.add(member.contact_id)
        else contactIdsToLookup.add(member.contact_id)
      }
    }
  }

  // Batch load users and contacts
  const [users, contacts] = await Promise.all([
    userIdsToLookup.size > 0
      ? prisma.user.findMany({ where: { id: { in: [...userIdsToLookup] } }, select: { id: true, email: true, name: true } })
      : [],
    contactIdsToLookup.size > 0
      ? prisma.contact.findMany({ where: { id: { in: [...contactIdsToLookup] } }, select: { id: true, email: true, name: true } })
      : [],
  ])
  const usersMap = new Map(users.map((u) => [u.id, u]))
  const contactsMap = new Map(contacts.map((c) => [c.id, c]))

  const addPerson = (email: string, name: string, role: RoleSummary, ids: { user_id?: string; contact_id?: string; is_user: boolean }) => {
    const key = email.toLowerCase().trim()
    const existing = byEmail.get(key)
    if (existing) {
      existing.roles.push(role)
      // Prefer user-linked records over contact-only
      if (ids.user_id && !existing.user_id) {
        existing.user_id = ids.user_id
        existing.is_user = true
      }
      if (ids.contact_id && !existing.contact_id) {
        existing.contact_id = ids.contact_id
      }
    } else {
      byEmail.set(key, { email: key, name, user_id: ids.user_id, contact_id: ids.contact_id, is_user: ids.is_user, roles: [role] })
    }
  }

  // 1. Extract from event_teams
  if (event.event_teams && Array.isArray(event.event_teams)) {
    for (const team of event.event_teams as any[]) {
      for (const member of team.members || []) {
        if (!member.name?.trim()) continue
        let email = member.email
        if (!email && member.contact_id) {
          if (member.is_user) email = usersMap.get(member.contact_id)?.email
          else email = contactsMap.get(member.contact_id)?.email
        }
        if (!email) {
          skippedNames.push(member.name)
          continue
        }
        addPerson(email, member.name, { source: 'team', team_name: team.name, role: member.role }, {
          user_id: member.is_user ? member.contact_id : undefined,
          contact_id: member.is_user ? undefined : member.contact_id,
          is_user: !!member.is_user,
        })
      }
    }
  }

  // 2. Extract from program_agenda.program_schedule
  if (event.program_agenda?.program_schedule) {
    for (const item of event.program_agenda.program_schedule as any[]) {
      const itemTitle = item.title || 'Untitled'
      const personFields = [
        { name: item.person, id: item.person_id, is_user: item.person_is_user, label: `Song Leader - ${itemTitle}` },
        { name: item.speaker, id: item.speaker_id, is_user: item.speaker_is_user, label: `Speaker - ${itemTitle}` },
        { name: item.prayer_leader, id: item.prayer_leader_id, is_user: item.prayer_leader_is_user, label: `Prayer Leader - ${itemTitle}` },
        { name: item.facilitator, id: item.facilitator_id, is_user: item.facilitator_is_user, label: `Facilitator - ${itemTitle}` },
      ]
      for (const pf of personFields) {
        if (!pf.name?.trim()) continue
        if (!pf.id) {
          if (!skippedNames.includes(pf.name)) skippedNames.push(pf.name)
          continue
        }
        let email: string | undefined | null
        if (pf.is_user) email = usersMap.get(pf.id)?.email
        else email = contactsMap.get(pf.id)?.email
        if (!email) {
          if (!skippedNames.includes(pf.name)) skippedNames.push(pf.name)
          continue
        }
        addPerson(email, pf.name, { source: 'schedule', role: pf.label }, {
          user_id: pf.is_user ? pf.id : undefined,
          contact_id: pf.is_user ? undefined : pf.id,
          is_user: !!pf.is_user,
        })
      }
    }
  }

  // 3. Extract from rider_details.production_team
  if (event.rider_details?.production_team) {
    const pt = event.rider_details.production_team as any
    const riderRoles = [
      { member: pt.soundman, roleName: 'Soundman' },
      { member: pt.projection, roleName: 'Projection' },
      { member: pt.host, roleName: 'Host' },
    ]
    for (const { member, roleName } of riderRoles) {
      if (!member?.person?.trim()) continue
      const id = member.user_id || member.contact_id
      if (!id) {
        if (!skippedNames.includes(member.person)) skippedNames.push(member.person)
        continue
      }
      const isUser = !!member.is_user
      const email = isUser ? usersMap.get(id)?.email : contactsMap.get(id)?.email
      if (!email) {
        if (!skippedNames.includes(member.person)) skippedNames.push(member.person)
        continue
      }
      addPerson(email, member.person, { source: 'team', team_name: 'Production', role: roleName }, {
        user_id: isUser ? id : undefined,
        contact_id: isUser ? undefined : id,
        is_user: isUser,
      })
    }
  }

  return { people: Array.from(byEmail.values()), skippedNames }
}

/**
 * POST /api/invitations/events/:eventId/send
 * Send invitation emails to all people in the event.
 */
export const sendInvitations = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params
    const event = await prisma.event.findUnique({ where: { id: eventId } })

    if (!event) throw new AppError('Event not found', 404)

    // Authorization: creator, org admin, or workspace admin/planner
    let canSend = event.created_by === req.user!.id || req.user!.org_role === 'admin'
    if (!canSend && event.workspace_id) {
      const wsRole = await getWorkspaceMemberRole(event.workspace_id, req.user!.id)
      canSend = wsRole === 'admin' || wsRole === 'planner'
    }
    if (!canSend) throw new AppError('Not authorized', 403)

    // Early-out: check email config is available before iterating
    const sendingUser = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { smtp_host: true, smtp_user: true, smtp_pass: true },
    })
    if (!sendingUser?.smtp_host || !sendingUser?.smtp_user || !sendingUser?.smtp_pass) {
      if (!process.env.SMTP_HOST) {
        throw new AppError('Email not configured. Go to User Settings → Email Settings to set up SMTP.', 400)
      }
    }

    const { people, skippedNames } = await extractPeople(event)
    const appUrl = process.env.APP_URL || 'http://localhost:5173'
    const eventDate = new Date(event.date_start)

    let sent = 0
    let alreadyResponded = 0
    const errors: string[] = []

    for (const person of people) {
      // Check if an invitation already exists with a response
      const existing = await prisma.eventInvitation.findUnique({
        where: { event_id_email: { event_id: eventId, email: person.email } },
        select: { status: true },
      })

      // If already confirmed/declined, just update roles silently — don't reset status or send email
      if (existing && existing.status !== 'pending') {
        await prisma.eventInvitation.update({
          where: { event_id_email: { event_id: eventId, email: person.email } },
          data: {
            name: person.name,
            roles_summary: person.roles as unknown as Prisma.JsonArray,
            user_id: person.user_id || null,
            contact_id: person.contact_id || null,
          },
        })
        alreadyResponded++
        continue
      }

      const token = crypto.randomBytes(24).toString('hex')
      const confirmUrl = `${appUrl}/invitation/${token}?action=confirm`
      const declineUrl = `${appUrl}/invitation/${token}?action=decline`

      const html = buildInvitationEmailHtml({
        recipientName: person.name,
        eventTitle: event.title,
        eventDate: formatDate(eventDate, event.timezone || undefined),
        eventTime: formatTime(eventDate, event.timezone || undefined),
        eventLocation: event.location_name || null,
        roles: person.roles,
        confirmUrl,
        declineUrl,
      })

      try {
        await sendEmail({
          to: person.email,
          subject: `Invitation: ${event.title}`,
          html,
        }, req.user!.id)

        // Only upsert after email succeeds — prevents invalidating old tokens on failure
        await prisma.eventInvitation.upsert({
          where: { event_id_email: { event_id: eventId, email: person.email } },
          create: {
            event_id: eventId,
            email: person.email,
            name: person.name,
            token,
            status: 'pending',
            roles_summary: person.roles as unknown as Prisma.JsonArray,
            user_id: person.user_id || null,
            contact_id: person.contact_id || null,
          },
          update: {
            name: person.name,
            token,
            status: 'pending',
            roles_summary: person.roles as unknown as Prisma.JsonArray,
            user_id: person.user_id || null,
            contact_id: person.contact_id || null,
            sent_at: new Date(),
            responded_at: null,
          },
        })
        sent++
      } catch (err: any) {
        errors.push(`Failed to email ${person.name} (${person.email}): ${err.message}`)
      }
    }

    res.json({ sent, skipped: skippedNames.length, skippedNames, alreadyResponded, errors })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/invitations/events/:eventId
 * Get all invitations for an event.
 */
export const getEventInvitations = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params
    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, created_by: true, workspace_id: true } })

    if (!event) throw new AppError('Event not found', 404)
    let canView = event.created_by === req.user!.id || req.user!.org_role === 'admin'
    if (!canView && event.workspace_id) {
      const wsRole = await getWorkspaceMemberRole(event.workspace_id, req.user!.id)
      canView = wsRole === 'admin' || wsRole === 'planner'
    }
    if (!canView) throw new AppError('Not authorized', 403)

    const invitations = await prisma.eventInvitation.findMany({
      where: { event_id: eventId },
      select: { id: true, email: true, name: true, status: true, roles_summary: true, sent_at: true, responded_at: true },
      orderBy: { name: 'asc' },
    })

    res.json(invitations)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/invitations/:token
 * Public: get invitation details by token (for the response page).
 */
export const getInvitationByToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params
    if (!/^[a-f0-9]{48}$/.test(token)) throw new AppError('Invalid token', 400)

    const invitation = await prisma.eventInvitation.findUnique({
      where: { token },
      include: {
        event: {
          select: { id: true, title: true, date_start: true, date_end: true, location_name: true, timezone: true },
        },
      },
    })

    if (!invitation) throw new AppError('Invitation not found', 404)

    res.json({
      id: invitation.id,
      name: invitation.name,
      email: invitation.email,
      status: invitation.status,
      roles_summary: invitation.roles_summary,
      responded_at: invitation.responded_at,
      event: invitation.event,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/invitations/:token/respond
 * Public: confirm or decline an invitation.
 */
export const submitInvitationResponse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params
    if (!/^[a-f0-9]{48}$/.test(token)) throw new AppError('Invalid token', 400)
    const { status } = req.body

    if (!status || !['confirmed', 'declined'].includes(status)) {
      throw new AppError('Invalid status. Must be "confirmed" or "declined".', 400)
    }

    const invitation = await prisma.eventInvitation.findUnique({ where: { token } })
    if (!invitation) throw new AppError('Invitation not found', 404)

    const updated = await prisma.eventInvitation.update({
      where: { token },
      data: { status, responded_at: new Date() },
    })

    res.json({ id: updated.id, status: updated.status, responded_at: updated.responded_at })
  } catch (err) {
    next(err)
  }
}
