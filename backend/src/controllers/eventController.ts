import { Response, NextFunction } from 'express'
import { AppError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/auth'
import prisma from '../lib/prisma'

export const getEvents = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50))
    const skip = (page - 1) * limit

    const where = {
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
      },
    })

    if (!event) {
      throw new AppError('Event not found', 404)
    }

    // Authorization: creator or assigned user
    const isAssigned = event.role_assignments.some(ra => ra.user_id === req.user!.id)
    if (event.created_by !== req.user!.id && !isAssigned && req.user!.org_role !== 'admin') {
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
          parent_tour_id,
          tags: tags || [],
          program_agenda: program_agenda || null,
          rider_details: rider_details || null,
          event_teams: event_teams || null,
          created_by: req.user!.id,
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

    // Verify ownership
    const existing = await prisma.event.findUnique({ where: { id } })
    if (!existing) {
      throw new AppError('Event not found', 404)
    }
    if (existing.created_by !== req.user!.id && req.user!.org_role !== 'admin') {
      throw new AppError('Not authorized to modify this event', 403)
    }

    // Whitelist allowed fields
    const {
      type, title, description, date_start, date_end, timezone,
      location_name, address, est_attendance, phase, status,
      venue_id, parent_tour_id, tags, program_agenda, rider_details,
      event_teams, flow_service_id,
    } = req.body

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
    if (existing.created_by !== req.user!.id && req.user!.org_role !== 'admin') {
      throw new AppError('Not authorized to delete this event', 403)
    }

    await prisma.event.delete({ where: { id } })

    res.status(204).send()
  } catch (error) {
    next(error)
  }
}
