import { Response, NextFunction } from 'express'
import { AppError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/auth'
import prisma from '../lib/prisma'
import { checkWorkspaceMembership, getWorkspaceMemberRole } from '../services/workspaceService'

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

    const where = activeWsId
      ? {
          status: { not: 'archived' as const },
          OR: [
            { workspace_id: activeWsId },
            // Include pre-workspace events the user owns or is assigned to
            { workspace_id: null, created_by: req.user!.id },
            { workspace_id: null, role_assignments: { some: { user_id: req.user!.id } } },
          ],
        }
      : {
          status: { not: 'archived' as const },
          OR: [
            { created_by: req.user!.id },
            { role_assignments: { some: { user_id: req.user!.id } } },
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

    res.json({
      data: events,
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

    // Authorization: workspace member, creator, or assigned user
    let authorized = event.created_by === req.user!.id || req.user!.org_role === 'admin'
    if (!authorized) {
      authorized = event.role_assignments.some(ra => ra.user_id === req.user!.id)
    }
    if (!authorized && event.workspace_id) {
      authorized = await checkWorkspaceMembership(event.workspace_id, req.user!.id)
    }
    if (!authorized) {
      throw new AppError('Not authorized to view this event', 403)
    }

    res.json(event)
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
          event_teams: event_teams || null,
          created_by: req.user!.id,
          workspace_id: wsId,
        },
        include: {
          creator: {
            select: { id: true, name: true, email: true },
          },
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
    if (event_teams !== undefined) updateData.event_teams = event_teams
    if (flow_service_id !== undefined) updateData.flow_service_id = flow_service_id

    const event = await prisma.event.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    res.json(event)
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

    await prisma.event.delete({ where: { id } })

    res.status(204).send()
  } catch (error) {
    next(error)
  }
}
