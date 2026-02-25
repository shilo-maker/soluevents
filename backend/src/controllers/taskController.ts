import { Response, NextFunction } from 'express'
import { AppError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/auth'
import prisma from '../lib/prisma'

export const getTasks = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { assignee, event_id, tour_id, status } = req.query
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50))
    const skip = (page - 1) * limit

    const where: Record<string, any> = {}

    if (assignee === 'me') {
      where.assignee_id = req.user!.id
    } else if (assignee) {
      where.assignee_id = String(assignee)
    }

    if (event_id) where.event_id = String(event_id)
    if (tour_id) where.tour_id = String(tour_id)
    if (status) where.status = String(status)

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          assignee: {
            select: { id: true, name: true, email: true },
          },
          creator: {
            select: { id: true, name: true, email: true },
          },
          event: {
            select: { id: true, title: true },
          },
          tour: {
            select: { id: true, title: true },
          },
          subtasks: {
            select: { id: true, title: true, status: true, priority: true },
          },
        },
        orderBy: [{ priority: 'desc' }, { due_at: 'asc' }],
        take: limit,
        skip,
      }),
      prisma.task.count({ where }),
    ])

    res.json({
      data: tasks,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    next(error)
  }
}

export const getTask = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
        event: {
          select: { id: true, title: true },
        },
        tour: {
          select: { id: true, title: true },
        },
        subtasks: true,
        parent_task: true,
      },
    })

    if (!task) {
      throw new AppError('Task not found', 404)
    }

    // Comments use polymorphic entity_type/entity_id — query separately
    const comments = await prisma.comment.findMany({
      where: { entity_type: 'task', entity_id: id },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { created_at: 'asc' },
    })

    res.json({ ...task, comments })
  } catch (error) {
    next(error)
  }
}

export const createTask = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      title, description, priority, status, due_at,
      event_id, tour_id, assignee_id, parent_task_id, link,
    } = req.body

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority: priority || 'normal',
        status: status || 'not_started',
        due_at: due_at ? new Date(due_at) : null,
        link,
        event_id,
        tour_id,
        assignee_id,
        creator_id: req.user!.id,
        parent_task_id,
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    res.status(201).json(task)
  } catch (error) {
    next(error)
  }
}

export const updateTask = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params

    // Verify existence
    const existing = await prisma.task.findUnique({ where: { id } })
    if (!existing) {
      throw new AppError('Task not found', 404)
    }

    // Authorization: creator, assignee, or admin
    if (
      existing.creator_id !== req.user!.id &&
      existing.assignee_id !== req.user!.id &&
      req.user!.org_role !== 'admin'
    ) {
      throw new AppError('Not authorized to modify this task', 403)
    }

    // Whitelist allowed fields
    const { title, description, priority, status, due_at, assignee_id, link } = req.body

    const updateData: Record<string, any> = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (priority !== undefined) updateData.priority = priority
    if (status !== undefined) updateData.status = status
    if (due_at !== undefined) updateData.due_at = due_at ? new Date(due_at) : null
    if (assignee_id !== undefined) updateData.assignee_id = assignee_id
    if (link !== undefined) updateData.link = link

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    res.json(task)
  } catch (error) {
    next(error)
  }
}

export const deleteTask = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params

    const existing = await prisma.task.findUnique({ where: { id } })
    if (!existing) {
      throw new AppError('Task not found', 404)
    }

    if (existing.creator_id !== req.user!.id && req.user!.org_role !== 'admin') {
      throw new AppError('Not authorized to delete this task', 403)
    }

    await prisma.task.delete({ where: { id } })

    res.status(204).send()
  } catch (error) {
    next(error)
  }
}
