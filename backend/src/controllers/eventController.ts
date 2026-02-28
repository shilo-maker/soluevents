import { Response, NextFunction } from 'express'
import crypto from 'crypto'
import { AppError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/auth'
import prisma from '../lib/prisma'
import { checkWorkspaceMembership, getWorkspaceMemberRole } from '../services/workspaceService'
import { emitEventUpdate } from '../lib/emitEvent'
import { notify } from '../lib/notify'

/** Returns the user's best team member status across all teams (confirmed > pending > declined), or null. */
function getUserTeamMemberStatus(eventTeams: any, userId: string): 'pending' | 'confirmed' | 'declined' | null {
  if (!Array.isArray(eventTeams)) return null
  let best: 'pending' | 'confirmed' | 'declined' | null = null
  for (const team of eventTeams) {
    for (const m of (team.members || [])) {
      if (!m.is_user || m.contact_id !== userId) continue
      const s = m.status
      if (s === 'confirmed') return 'confirmed' // best possible — return immediately
      if (s === 'pending') best = 'pending'
      else if (!best) best = s || 'confirmed' // pre-feature members without status treated as confirmed
    }
  }
  return best
}

export const getEvents = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50))
    const skip = (page - 1) * limit

    let activeWsId = req.user!.activeWorkspaceId

    // Validate membership — stale activeWorkspaceId can reference a workspace the user was removed from
    if (activeWsId) {
      const isMember = await checkWorkspaceMembership(activeWsId, req.user!.id)
      if (!isMember) {
        activeWsId = null
      }
    }

    // Find events where the user is a non-declined team member
    // Uses jsonb_path_exists which leverages the GIN index on event_teams
    const teamEventRows = await prisma.$queryRaw<{ id: string; workspace_id: string | null }[]>`
      SELECT e.id, e.workspace_id FROM events e
      WHERE e.event_teams IS NOT NULL
        AND e.status != 'archived'
        AND jsonb_path_exists(
          e.event_teams,
          '$[*].members[*] ? (@.is_user == true && @.contact_id == $uid && (@.status == "pending" || @.status == "confirmed" || !exists(@.status)))',
          jsonb_build_object('uid', ${req.user!.id}::text)
        )
    `

    // Filter team events: only show in the event's own workspace or the user's personal workspace
    let teamEventIds: string[] = []
    if (teamEventRows.length > 0) {
      if (!activeWsId) {
        // No active workspace — show all team events
        teamEventIds = teamEventRows.map(r => r.id)
      } else {
        const activeWs = await prisma.workspace.findUnique({ where: { id: activeWsId }, select: { workspaceType: true } })
        if (activeWs?.workspaceType === 'personal') {
          // Personal workspace — show all team events
          teamEventIds = teamEventRows.map(r => r.id)
        } else {
          // Organization workspace — only show team events that belong to this workspace
          teamEventIds = teamEventRows.filter(r => r.workspace_id === activeWsId).map(r => r.id)
        }
      }
    }

    const where = activeWsId
      ? {
          status: { not: 'archived' as const },
          OR: [
            { workspace_id: activeWsId },
            // Include pre-workspace events the user owns or is assigned to
            { workspace_id: null, created_by: req.user!.id },
            { workspace_id: null, role_assignments: { some: { user_id: req.user!.id } } },
            // Team member events (filtered by workspace rules above)
            ...(teamEventIds.length > 0 ? [{ id: { in: teamEventIds } }] : []),
          ],
        }
      : {
          status: { not: 'archived' as const },
          OR: [
            { created_by: req.user!.id },
            { role_assignments: { some: { user_id: req.user!.id } } },
            // Team member events (no workspace filter when no active workspace)
            ...(teamEventIds.length > 0 ? [{ id: { in: teamEventIds } }] : []),
          ],
        }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          creator: {
            select: { id: true, name: true, email: true },
          },
          role_assignments: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
        orderBy: { date_start: 'asc' },
        take: limit,
        skip,
      }),
      prisma.event.count({ where }),
    ])

    // Compute can_edit per event: creator, org admin, role assignment, or workspace admin/planner
    const userId = req.user!.id
    const isAdmin = req.user!.org_role === 'admin'
    const wsRole = activeWsId ? await getWorkspaceMemberRole(activeWsId, userId) : null
    const isWsEditor = wsRole === 'admin' || wsRole === 'planner'

    res.json({
      data: events.map(e => ({
        ...e,
        team_member_status: getUserTeamMemberStatus(e.event_teams, userId),
        can_edit: e.created_by === userId || isAdmin || isWsEditor || e.role_assignments.some((ra: any) => ra.user_id === userId),
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    next(error)
  }
}

export const getEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        role_assignments: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        tasks: {
          include: {
            assignee: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        files: true,
        invitations: {
          select: {
            id: true,
            email: true,
            name: true,
            status: true,
            roles_summary: true,
            sent_at: true,
            responded_at: true,
            user_id: true,
            contact_id: true,
          },
        },
      },
    })

    if (!event) {
      throw new AppError('Event not found', 404)
    }

    // Authorization + edit permission
    const userId = req.user!.id
    const isCreator = event.created_by === userId
    const isAdmin = req.user!.org_role === 'admin'
    const hasRoleAssignment = event.role_assignments.some(ra => ra.user_id === userId)
    const teamStatus = getUserTeamMemberStatus(event.event_teams, userId)

    // can_edit: creator, org admin, role assignment, or workspace admin/planner
    let canEdit = isCreator || isAdmin || hasRoleAssignment
    let authorized = canEdit

    if (event.workspace_id) {
      const wsRole = await getWorkspaceMemberRole(event.workspace_id, userId)
      if (wsRole) authorized = true  // any workspace member can view
      if (!canEdit && (wsRole === 'admin' || wsRole === 'planner')) canEdit = true
    }

    if (!authorized) {
      // Only pending or confirmed team members can view — declined users are blocked
      authorized = teamStatus === 'pending' || teamStatus === 'confirmed'
    }
    if (!authorized) {
      throw new AppError('Not authorized to view this event', 403)
    }

    res.json({ ...event, team_member_status: teamStatus, can_edit: canEdit })
  } catch (error) {
    next(error)
  }
}

export const createEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      type, title, description, date_start, date_end, timezone,
      location_name, address, est_attendance, phase, status,
      venue_id, parent_tour_id, tags, program_agenda, rider_details,
      event_teams,
    } = req.body

    // Validate workspace membership before stamping workspace_id
    let wsId = req.user!.activeWorkspaceId || null
    if (wsId) {
      const isMember = await checkWorkspaceMembership(wsId, req.user!.id)
      if (!isMember) wsId = null
    }

    // Validate parent_tour_id if provided — user must have access to the tour
    if (parent_tour_id) {
      const tour = await prisma.tour.findUnique({
        where: { id: parent_tour_id },
        select: { director_user_id: true, logistics_user_id: true, comms_user_id: true, media_user_id: true, hospitality_user_id: true },
      })
      if (!tour) throw new AppError('Tour not found', 404)
      const tourUsers = [tour.director_user_id, tour.logistics_user_id, tour.comms_user_id, tour.media_user_id, tour.hospitality_user_id]
      if (!tourUsers.includes(req.user!.id) && req.user!.org_role !== 'admin') {
        throw new AppError('Not authorized to link events to this tour', 403)
      }
    }

    // Enrich event_teams before creation: assign member_ids, set pending/confirmed statuses
    let enrichedTeams: any[] | null = null
    const pendingInvites: { contact_id: string; member_id: string; team_name: string; team_role: string }[] = []

    if (event_teams && Array.isArray(event_teams)) {
      enrichedTeams = event_teams.map((team: any) => ({
        ...team,
        members: (team.members || []).map((m: any) => {
          if (!m.is_user || !m.contact_id) return m
          const memberId = crypto.randomUUID()
          if (m.contact_id === req.user!.id) {
            return { ...m, member_id: memberId, status: 'confirmed' }
          }
          pendingInvites.push({
            contact_id: m.contact_id,
            member_id: memberId,
            team_name: team.name || '',
            team_role: m.role || '',
          })
          return { ...m, member_id: memberId, status: 'pending' }
        }),
      }))
    }

    const event = await prisma.$transaction(async (tx) => {
      const created = await tx.event.create({
        data: {
          type,
          title,
          description,
          date_start: new Date(date_start),
          date_end: new Date(date_end),
          timezone: timezone || 'America/New_York',
          location_name,
          address,
          est_attendance,
          phase: phase || 'concept',
          status: status || 'planned',
          venue_id: venue_id || null,
          parent_tour_id: parent_tour_id || null,
          tags: tags || [],
          program_agenda: program_agenda || null,
          rider_details: rider_details || null,
          event_teams: enrichedTeams || event_teams || null,
          created_by: req.user!.id,
          workspace_id: wsId,
        },
        include: {
          creator: {
            select: { id: true, name: true, email: true },
          },
        },
      })

      // Auto-assign event_manager role to creator
      await tx.roleAssignment.create({
        data: {
          event_id: created.id,
          user_id: req.user!.id,
          role: 'event_manager',
          scope: 'event',
        },
      })

      // Create default tasks for worship events
      if (type === 'worship') {
        const eventStartDate = new Date(date_start)

        const users = await tx.user.findMany({
          where: {
            OR: [
              { name: { in: ['Levi', 'Rebekah', 'Shilo'] } },
              { username: { in: ['Levi', 'Rebekah', 'Shilo'] } },
            ],
          },
          select: { id: true, name: true, username: true },
        })

        const findUser = (n: string) => users.find(u => u.name === n || u.username === n)
        const leviUser = findUser('Levi')
        const rebekahUser = findUser('Rebekah')
        const shiloUser = findUser('Shilo')

        const defaultTasks = [
          { title: 'Make Flyer', assignee_id: leviUser?.id, days_before: 18 },
          { title: 'Publish Flyer', assignee_id: rebekahUser?.id, days_before: 14 },
          { title: 'Choose Setlist', assignee_id: shiloUser?.id, days_before: 7 },
          { title: 'Set Projection', assignee_id: rebekahUser?.id, days_before: 4 },
          { title: 'Send Technical Rider', assignee_id: rebekahUser?.id, days_before: 4 },
        ]

        await Promise.all(
          defaultTasks.map(task => {
            const dueDate = new Date(eventStartDate)
            dueDate.setDate(dueDate.getDate() - task.days_before)
            return tx.task.create({
              data: {
                title: task.title,
                priority: 'normal',
                status: 'not_started',
                due_at: dueDate,
                event_id: created.id,
                assignee_id: task.assignee_id,
                creator_id: req.user!.id,
              },
            })
          })
        )
      }

      return created
    })

    // Create notifications for pending team invites (after transaction)
    if (pendingInvites.length > 0) {
      const inviterName = event.creator?.name || req.user!.email
      Promise.all(
        pendingInvites.map((m) =>
          notify(m.contact_id, 'event_team_invite', {
            event_id: event.id,
            event_title: event.title,
            member_id: m.member_id,
            team_name: m.team_name,
            team_role: m.team_role,
            invited_by_name: inviterName,
          }).catch(() => {})
        )
      ).catch(() => {})
    }

    res.status(201).json(event)
  } catch (error) {
    next(error)
  }
}

export const updateEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params

    // Verify ownership or workspace admin
    const existing = await prisma.event.findUnique({ where: { id } })
    if (!existing) {
      throw new AppError('Event not found', 404)
    }
    let canModify = existing.created_by === req.user!.id || req.user!.org_role === 'admin'
    if (!canModify && existing.workspace_id) {
      const wsRole = await getWorkspaceMemberRole(existing.workspace_id, req.user!.id)
      canModify = wsRole === 'admin' || wsRole === 'planner'
    }
    if (!canModify) {
      throw new AppError('Not authorized to modify this event', 403)
    }

    // Whitelist allowed fields
    const {
      type, title, description, date_start, date_end, timezone,
      location_name, address, est_attendance, phase, status,
      venue_id, parent_tour_id, tags, program_agenda, rider_details,
      event_teams, flow_service_id,
    } = req.body

    // Validate parent_tour_id if being updated — user must have access to the tour
    if (parent_tour_id) {
      const tour = await prisma.tour.findUnique({
        where: { id: parent_tour_id },
        select: { director_user_id: true, logistics_user_id: true, comms_user_id: true, media_user_id: true, hospitality_user_id: true },
      })
      if (!tour) throw new AppError('Tour not found', 404)
      const tourUsers = [tour.director_user_id, tour.logistics_user_id, tour.comms_user_id, tour.media_user_id, tour.hospitality_user_id]
      if (!tourUsers.includes(req.user!.id) && req.user!.org_role !== 'admin') {
        throw new AppError('Not authorized to link events to this tour', 403)
      }
    }

    const updateData: Record<string, any> = {}
    if (type !== undefined) updateData.type = type
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (date_start !== undefined) updateData.date_start = new Date(date_start)
    if (date_end !== undefined) updateData.date_end = new Date(date_end)
    if (timezone !== undefined) updateData.timezone = timezone
    if (location_name !== undefined) updateData.location_name = location_name
    if (address !== undefined) updateData.address = address
    if (est_attendance !== undefined) updateData.est_attendance = est_attendance
    if (phase !== undefined) updateData.phase = phase
    if (status !== undefined) updateData.status = status
    if (venue_id !== undefined) updateData.venue_id = venue_id || null
    if (parent_tour_id !== undefined) updateData.parent_tour_id = parent_tour_id
    if (tags !== undefined) updateData.tags = tags
    if (program_agenda !== undefined) updateData.program_agenda = program_agenda
    if (rider_details !== undefined) updateData.rider_details = rider_details
    if (flow_service_id !== undefined) updateData.flow_service_id = flow_service_id

    // Enrich event_teams: assign member_id, set pending status for new user members, create notifications
    if (event_teams !== undefined) {
      // Guard: null or non-array clears teams — skip enrichment but clean up notifications
      if (!Array.isArray(event_teams)) {
        updateData.event_teams = event_teams

        // Collect confirmed members from old teams who need removal notifications
        const oldTeamsForClear: any[] = Array.isArray(existing.event_teams) ? (existing.event_teams as any[]) : []
        const confirmedMembers = oldTeamsForClear
          .flatMap((t: any) => (t.members || []))
          .filter((m: any) => m.is_user && m.contact_id && m.status === 'confirmed')

        // Run cleanup, removal notifications, and event update in parallel
        const [, , event] = await Promise.all([
          // Clean up any pending team invite notifications for this event
          prisma.notification.deleteMany({
            where: { type: 'event_team_invite', payload: { path: ['event_id'], equals: id } },
          }).catch(() => {}),
          // Notify confirmed members they've been removed (teams are being cleared entirely)
          (async () => {
            if (confirmedMembers.length === 0) return
            const inviter = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { name: true, email: true } })
            const inviterName = inviter?.name || inviter?.email || req.user!.email
            await Promise.all(
              confirmedMembers.map((m: any) =>
                notify(m.contact_id, 'event_team_removed', {
                  event_id: id,
                  event_title: existing.title,
                  team_role: m.role || '',
                  removed_by_name: inviterName,
                }).catch(() => {})
              )
            )
          })(),
          prisma.event.update({
            where: { id },
            data: updateData,
            include: { creator: { select: { id: true, name: true, email: true } } },
          }),
        ])

        emitEventUpdate(id, 'event:updated')
        return res.json(event)
      }

      const oldTeams: any[] = Array.isArray(existing.event_teams) ? (existing.event_teams as any[]) : []

      // Build map of old member_id → full member data (handles same user in multiple teams correctly)
      const oldMemberById = new Map<string, any>()
      // Track pre-feature members: user contact_ids that exist in old teams WITHOUT a member_id
      // These are members added before the invitation feature was deployed
      const preFeatContactIds = new Set<string>()
      for (const team of oldTeams) {
        for (const m of team.members || []) {
          if (m.member_id) {
            oldMemberById.set(m.member_id, m)
          } else if (m.is_user && m.contact_id) {
            preFeatContactIds.add(m.contact_id)
          }
        }
      }

      const newMemberIds = new Set<string>()
      const newlyPendingMembers: { contact_id: string; member_id: string; team_name: string; team_role: string }[] = []

      const enrichedTeams = (event_teams as any[]).map((team: any) => ({
        ...team,
        members: (team.members || []).map((m: any) => {
          if (!m.is_user || !m.contact_id) {
            // Non-user contacts don't get invitations
            return m
          }

          // If slot has a member_id that exists in old data with same contact_id → preserve
          if (m.member_id && oldMemberById.has(m.member_id)) {
            const old = oldMemberById.get(m.member_id)
            if (old.contact_id === m.contact_id) {
              // Same person, same slot — always use DB status (prevents stale frontend reverting accepts)
              newMemberIds.add(m.member_id)
              return { ...m, status: old.status }
            }
            // Person changed in this slot — fall through to create new invite
          }

          // Auto-confirm if the saver is adding themselves
          if (m.contact_id === req.user!.id) {
            const memberId = crypto.randomUUID()
            newMemberIds.add(memberId)
            return { ...m, member_id: memberId, status: 'confirmed' }
          }

          // Pre-feature migration: member existed in old teams without member_id
          // Auto-confirm them rather than sending a surprise invitation
          if (preFeatContactIds.has(m.contact_id)) {
            const memberId = crypto.randomUUID()
            newMemberIds.add(memberId)
            return { ...m, member_id: memberId, status: 'confirmed' }
          }

          // New user member — assign member_id, set pending
          const memberId = crypto.randomUUID()
          newMemberIds.add(memberId)
          newlyPendingMembers.push({
            contact_id: m.contact_id,
            member_id: memberId,
            team_name: team.name || '',
            team_role: m.role || '',
          })
          return { ...m, member_id: memberId, status: 'pending' }
        }),
      }))

      updateData.event_teams = enrichedTeams

      // Compute removed members before the update (pure CPU, no DB)
      const removedMembers = oldMemberById.size > 0
        ? [...oldMemberById.entries()]
            .filter(([mid]) => !newMemberIds.has(mid))
            .map(([, m]) => m)
            .filter((m) => m.is_user && m.contact_id)
        : []

      // Determine if we need inviter name: only when there are actual new invites or actual removals
      const hasNewInvites = newlyPendingMembers.length > 0
      const hasRemovals = removedMembers.length > 0

      // Run event update and inviter name lookup in parallel (when name is needed)
      const [event, inviterName] = await Promise.all([
        prisma.event.update({
          where: { id },
          data: updateData,
          include: {
            creator: { select: { id: true, name: true, email: true } },
          },
        }),
        (hasNewInvites || hasRemovals)
          ? prisma.user.findUnique({ where: { id: req.user!.id }, select: { name: true, email: true } })
              .then((inviter) => inviter?.name || inviter?.email || req.user!.email)
          : Promise.resolve(undefined),
      ])

      // Create notifications for newly invited members + handle removed member slots in parallel
      const notificationOps: Promise<any>[] = []

      if (hasNewInvites) {
        notificationOps.push(
          Promise.all(
            newlyPendingMembers.map((m) =>
              notify(m.contact_id, 'event_team_invite', {
                event_id: id,
                event_title: event.title,
                member_id: m.member_id,
                team_name: m.team_name,
                team_role: m.team_role,
                invited_by_name: inviterName,
              }).catch(() => {})
            )
          )
        )
      }

      // Handle removed member slots
      if (hasRemovals) {
        notificationOps.push(
          Promise.all(
            removedMembers.map((m: any) => {
              if (m.status === 'pending') {
                // Delete the pending invite notification
                return prisma.notification.deleteMany({
                  where: {
                    user_id: m.contact_id,
                    type: 'event_team_invite',
                    payload: { path: ['member_id'], equals: m.member_id },
                  },
                }).catch(() => {})
              } else if (m.status === 'confirmed') {
                // Notify confirmed members that they've been removed
                return notify(m.contact_id, 'event_team_removed', {
                  event_id: id,
                  event_title: event.title,
                  team_role: m.role || '',
                  removed_by_name: inviterName,
                }).catch(() => {})
              }
              return Promise.resolve()
            })
          )
        )
      }

      if (notificationOps.length > 0) {
        await Promise.all(notificationOps)
      }

      emitEventUpdate(id, 'event:updated')
      return res.json(event)
    }

    const event = await prisma.event.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    emitEventUpdate(id, 'event:updated')
    res.json(event)
  } catch (error) {
    next(error)
  }
}

export const respondToTeamInvite = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { eventId, memberId } = req.params
    const { action } = req.body

    if (!action || !['accept', 'decline'].includes(action)) {
      throw new AppError('action must be "accept" or "decline"', 400)
    }

    // Use a transaction with row-level lock to prevent lost updates on concurrent responses
    const result = await prisma.$transaction(async (tx) => {
      // SELECT ... FOR UPDATE locks the row until the transaction commits,
      // preventing two concurrent responses from overwriting each other's JSON changes
      const rows = await tx.$queryRaw<any[]>`SELECT * FROM events WHERE id = ${eventId}::uuid FOR UPDATE`
      const event = rows[0]
      if (!event) throw new AppError('Event not found', 404)

      const teams: any[] = Array.isArray(event.event_teams) ? (event.event_teams as any[]) : []
      let foundMember: any = null
      let foundTeamIdx = -1
      let foundMemberIdx = -1
      let foundTeamName = ''

      for (let ti = 0; ti < teams.length; ti++) {
        const members = teams[ti].members || []
        for (let mi = 0; mi < members.length; mi++) {
          if (members[mi].member_id === memberId) {
            foundMember = members[mi]
            foundTeamIdx = ti
            foundMemberIdx = mi
            foundTeamName = teams[ti].name || ''
            break
          }
        }
        if (foundMember) break
      }

      if (!foundMember) throw new AppError('Team member not found', 404)
      if (foundMember.contact_id !== req.user!.id) throw new AppError('Not authorized', 403)
      if (foundMember.status !== 'pending') throw new AppError('Invitation already responded to', 400)

      // Update the member status
      const newStatus = action === 'accept' ? 'confirmed' : 'declined'
      teams[foundTeamIdx].members[foundMemberIdx].status = newStatus

      await tx.event.update({
        where: { id: eventId },
        data: { event_teams: teams },
      })

      // Delete the related notification
      await tx.notification.deleteMany({
        where: {
          user_id: req.user!.id,
          type: 'event_team_invite',
          payload: { path: ['member_id'], equals: memberId },
        },
      })

      return {
        status: newStatus,
        createdBy: event.created_by,
        eventTitle: event.title,
        teamRole: foundMember.role || '',
        teamName: foundTeamName,
      }
    })

    // Notify event creator about the response (if responder is not the creator)
    if (result.createdBy !== req.user!.id) {
      const responder = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { name: true, email: true } })
      notify(result.createdBy, 'event_team_response', {
        event_id: eventId,
        event_title: result.eventTitle,
        member_name: responder?.name || responder?.email || req.user!.email,
        team_role: result.teamRole,
        team_name: result.teamName,
        action,
      }).catch(() => {})
    }
    emitEventUpdate(eventId, 'event:updated')

    res.json({ success: true, status: result.status })
  } catch (error) {
    next(error)
  }
}

export const deleteEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params

    const existing = await prisma.event.findUnique({ where: { id } })
    if (!existing) {
      throw new AppError('Event not found', 404)
    }
    let canDelete = existing.created_by === req.user!.id || req.user!.org_role === 'admin'
    if (!canDelete && existing.workspace_id) {
      const wsRole = await getWorkspaceMemberRole(existing.workspace_id, req.user!.id)
      canDelete = wsRole === 'admin'
    }
    if (!canDelete) {
      throw new AppError('Not authorized to delete this event', 403)
    }

    // Collect task IDs that will be cascade-deleted so we can clean up their polymorphic comments
    const taskIds = (await prisma.task.findMany({
      where: { event_id: id },
      select: { id: true },
    })).map((t) => t.id)

    await prisma.$transaction([
      // Delete comments on tasks that will cascade-delete
      ...(taskIds.length > 0 ? [prisma.comment.deleteMany({ where: { entity_type: 'task', entity_id: { in: taskIds } } })] : []),
      // Delete comments on the event itself
      prisma.comment.deleteMany({ where: { entity_type: 'event', entity_id: id } }),
      // Delete team notifications
      prisma.notification.deleteMany({
        where: {
          type: { in: ['event_team_invite', 'event_team_removed', 'event_team_response'] },
          payload: { path: ['event_id'], equals: id },
        },
      }),
      // Delete event (cascades tasks, role_assignments, etc.)
      prisma.event.delete({ where: { id } }),
    ])

    emitEventUpdate(id, 'event:deleted')
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}
