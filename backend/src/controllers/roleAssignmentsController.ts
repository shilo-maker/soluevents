import { Response, NextFunction } from 'express'
import { AppError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/auth'
import prisma from '../lib/prisma'

export const getRoleAssignments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { event_id, tour_id } = req.query

    const where: Record<string, any> = {}
    if (event_id) where.event_id = String(event_id)
    if (tour_id) where.tour_id = String(tour_id)

    const assignments = await prisma.roleAssignment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
            org_role: true,
          },
        },
      },
    })

    res.json(assignments)
  } catch (error) {
    next(error)
  }
}

export const createRoleAssignment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { event_id, tour_id, user_id, role, scope } = req.body

    // Authorization: must own the event/tour
    if (event_id) {
      const event = await prisma.event.findUnique({ where: { id: event_id } })
      if (!event) throw new AppError('Event not found', 404)
      if (event.created_by !== req.user!.id && req.user!.org_role !== 'admin') {
        throw new AppError('Not authorized to assign roles on this event', 403)
      }
    }
    if (tour_id) {
      const tour = await prisma.tour.findUnique({ where: { id: tour_id } })
      if (!tour) throw new AppError('Tour not found', 404)
      if (tour.director_user_id !== req.user!.id && req.user!.org_role !== 'admin') {
        throw new AppError('Not authorized to assign roles on this tour', 403)
      }
    }

    // Check if assignment already exists
    const existing = await prisma.roleAssignment.findFirst({
      where: {
        event_id: event_id || null,
        tour_id: tour_id || null,
        user_id,
        role,
      },
    })

    if (existing) {
      throw new AppError('This user already has this role assigned', 409)
    }

    const assignment = await prisma.roleAssignment.create({
      data: {
        event_id: event_id || undefined,
        tour_id: tour_id || undefined,
        user_id,
        role,
        scope,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
            org_role: true,
          },
        },
      },
    })

    res.status(201).json(assignment)
  } catch (error) {
    next(error)
  }
}

export const deleteRoleAssignment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params

    const assignment = await prisma.roleAssignment.findUnique({ where: { id } })
    if (!assignment) {
      throw new AppError('Role assignment not found', 404)
    }

    // Authorization: must own the parent event/tour
    if (assignment.event_id) {
      const event = await prisma.event.findUnique({ where: { id: assignment.event_id } })
      if (event?.created_by !== req.user!.id && req.user!.org_role !== 'admin') {
        throw new AppError('Not authorized to remove this role', 403)
      }
    }
    if (assignment.tour_id) {
      const tour = await prisma.tour.findUnique({ where: { id: assignment.tour_id } })
      if (tour?.director_user_id !== req.user!.id && req.user!.org_role !== 'admin') {
        throw new AppError('Not authorized to remove this role', 403)
      }
    }

    await prisma.roleAssignment.delete({ where: { id } })

    res.status(204).send()
  } catch (error) {
    next(error)
  }
}
