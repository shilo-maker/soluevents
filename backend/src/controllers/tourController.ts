import { Response, NextFunction } from 'express'
import { AppError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/auth'
import prisma from '../lib/prisma'
import { checkWorkspaceMembership } from '../services/workspaceService'

export const getTours = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50))
    const skip = (page - 1) * limit

    let activeWsId = req.user!.activeWorkspaceId
    if (activeWsId) {
      const isMember = await checkWorkspaceMembership(activeWsId, req.user!.id)
      if (!isMember) activeWsId = null
    }

    // Filter child_events by workspace to prevent cross-workspace data leaks
    const childEventsWhere = activeWsId
      ? { OR: [{ workspace_id: activeWsId }, { workspace_id: null }] }
      : undefined

    // Filter tours: user must be director, a role user, or have child events in their workspace
    const tourWhere: Record<string, any> = {
      OR: [
        { director_user_id: req.user!.id },
        { logistics_user_id: req.user!.id },
        { comms_user_id: req.user!.id },
        { media_user_id: req.user!.id },
        { hospitality_user_id: req.user!.id },
        ...(activeWsId
          ? [{ child_events: { some: { workspace_id: activeWsId } } }]
          : []),
      ],
    }
    // Org admins see all tours
    if (req.user!.org_role === 'admin') {
      delete tourWhere.OR
    }

    const [tours, total] = await Promise.all([
      prisma.tour.findMany({
        where: tourWhere,
        include: {
          director: {
            select: { id: true, name: true, email: true },
          },
          logistics: {
            select: { id: true, name: true, email: true },
          },
          tour_days: {
            orderBy: { date: 'asc' },
            select: { id: true, date: true, city: true, venue_name: true },
          },
          child_events: {
            where: childEventsWhere,
            select: { id: true, title: true, date_start: true, status: true },
          },
        },
        orderBy: { start_date: 'desc' },
        take: limit,
        skip,
      }),
      prisma.tour.count({ where: tourWhere }),
    ])

    res.json({
      data: tours,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    next(error)
  }
}

export const getTour = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params

    let activeWsId = req.user!.activeWorkspaceId
    if (activeWsId) {
      const isMember = await checkWorkspaceMembership(activeWsId, req.user!.id)
      if (!isMember) activeWsId = null
    }
    const childEventsWhere = activeWsId
      ? { OR: [{ workspace_id: activeWsId }, { workspace_id: null }] }
      : undefined

    const tour = await prisma.tour.findUnique({
      where: { id },
      include: {
        director: {
          select: { id: true, name: true, email: true },
        },
        logistics: {
          select: { id: true, name: true, email: true },
        },
        comms: {
          select: { id: true, name: true, email: true },
        },
        media: {
          select: { id: true, name: true, email: true },
        },
        hospitality: {
          select: { id: true, name: true, email: true },
        },
        tour_days: {
          orderBy: { date: 'asc' },
          include: {
            devotional: {
              select: { id: true, name: true },
            },
            linked_event: {
              select: { id: true, title: true, date_start: true },
            },
          },
        },
        child_events: {
          where: childEventsWhere,
          select: { id: true, title: true, date_start: true, status: true },
        },
        tasks: {
          include: {
            assignee: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { due_at: 'asc' },
        },
        files: {
          select: { id: true, filename: true, url: true, created_at: true },
        },
      },
    })

    if (!tour) {
      throw new AppError('Tour not found', 404)
    }

    // Authorization: director, any role user, workspace member via child events, or admin
    let authorized = tour.director_user_id === req.user!.id || req.user!.org_role === 'admin'
    if (!authorized) {
      const roleUsers = [
        tour.logistics_user_id, tour.comms_user_id,
        tour.media_user_id, tour.hospitality_user_id,
      ]
      authorized = roleUsers.includes(req.user!.id)
    }
    if (!authorized && activeWsId) {
      // Check if tour has any child events in the user's workspace
      const hasWsEvent = await prisma.event.findFirst({
        where: { parent_tour_id: tour.id, workspace_id: activeWsId },
        select: { id: true },
      })
      authorized = !!hasWsEvent
    }
    if (!authorized) {
      throw new AppError('Not authorized to view this tour', 403)
    }

    res.json(tour)
  } catch (error) {
    next(error)
  }
}

export const createTour = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Authorization: must be a workspace admin/planner, or org admin
    let activeWsId = req.user!.activeWorkspaceId
    if (activeWsId) {
      const isMember = await checkWorkspaceMembership(activeWsId, req.user!.id)
      if (!isMember) activeWsId = null
    }
    if (req.user!.org_role !== 'admin' && !activeWsId) {
      throw new AppError('Active workspace required to create a tour', 400)
    }

    const {
      title, start_date, end_date, regions,
      director_user_id, logistics_user_id, comms_user_id,
      media_user_id, hospitality_user_id,
    } = req.body

    const tour = await prisma.tour.create({
      data: {
        title,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
        regions: regions || [],
        director_user_id,
        logistics_user_id,
        comms_user_id,
        media_user_id,
        hospitality_user_id,
      },
      include: {
        director: {
          select: { id: true, name: true, email: true },
        },
        logistics: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    res.status(201).json(tour)
  } catch (error) {
    next(error)
  }
}

export const updateTour = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params

    const existing = await prisma.tour.findUnique({ where: { id } })
    if (!existing) {
      throw new AppError('Tour not found', 404)
    }

    // Authorization: director or admin
    if (existing.director_user_id !== req.user!.id && req.user!.org_role !== 'admin') {
      throw new AppError('Not authorized to modify this tour', 403)
    }

    // Whitelist
    const {
      title, start_date, end_date, regions,
      director_user_id, logistics_user_id, comms_user_id,
      media_user_id, hospitality_user_id,
    } = req.body

    const updateData: Record<string, any> = {}
    if (title !== undefined) updateData.title = title
    if (start_date !== undefined) updateData.start_date = new Date(start_date)
    if (end_date !== undefined) updateData.end_date = new Date(end_date)
    if (regions !== undefined) updateData.regions = regions
    if (director_user_id !== undefined) updateData.director_user_id = director_user_id
    if (logistics_user_id !== undefined) updateData.logistics_user_id = logistics_user_id
    if (comms_user_id !== undefined) updateData.comms_user_id = comms_user_id
    if (media_user_id !== undefined) updateData.media_user_id = media_user_id
    if (hospitality_user_id !== undefined) updateData.hospitality_user_id = hospitality_user_id

    const tour = await prisma.tour.update({
      where: { id },
      data: updateData,
      include: {
        director: {
          select: { id: true, name: true, email: true },
        },
        logistics: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    res.json(tour)
  } catch (error) {
    next(error)
  }
}

export const deleteTour = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params

    const existing = await prisma.tour.findUnique({ where: { id } })
    if (!existing) {
      throw new AppError('Tour not found', 404)
    }

    if (existing.director_user_id !== req.user!.id && req.user!.org_role !== 'admin') {
      throw new AppError('Not authorized to delete this tour', 403)
    }

    // Collect task IDs that will be cascade-deleted so we can clean up their polymorphic comments
    const taskIds = (await prisma.task.findMany({
      where: { tour_id: id },
      select: { id: true },
    })).map((t) => t.id)

    await prisma.$transaction([
      // Delete comments on tasks that will cascade-delete
      ...(taskIds.length > 0 ? [prisma.comment.deleteMany({ where: { entity_type: 'task', entity_id: { in: taskIds } } })] : []),
      // Delete comments on the tour itself
      prisma.comment.deleteMany({ where: { entity_type: 'tour', entity_id: id } }),
      // Delete tour (cascades tasks, tour_days, etc.)
      prisma.tour.delete({ where: { id } }),
    ])

    res.status(204).send()
  } catch (error) {
    next(error)
  }
}
