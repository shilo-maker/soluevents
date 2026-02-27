import { Response, NextFunction } from 'express'
import { AppError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/auth'
import prisma from '../lib/prisma'
import { checkWorkspaceMembership, getWorkspaceMemberRole } from '../services/workspaceService'

export const getRoleAssignments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { event_id, tour_id } = req.query

    // Require at least one filter to prevent returning all assignments globally
    if (!event_id && !tour_id) {
      throw new AppError('event_id or tour_id query parameter is required', 400)
    }

    const where: Record<string, any> = {}

    // Verify workspace access on the parent event/tour
    if (event_id) {
      const event = await prisma.event.findUnique({
        where: { id: String(event_id) },
        select: { workspace_id: true, created_by: true },
      })
      if (!event) throw new AppError('Event not found', 404)
      let hasAccess = event.created_by === req.user!.id || req.user!.org_role === 'admin'
      if (!hasAccess && event.workspace_id) {
        hasAccess = await checkWorkspaceMembership(event.workspace_id, req.user!.id)
      }
      if (!hasAccess) throw new AppError('Not authorized to view role assignments for this event', 403)
      where.event_id = String(event_id)
    }
    if (tour_id) {
      const tour = await prisma.tour.findUnique({
        where: { id: String(tour_id) },
        select: { director_user_id: true },
      })
      if (!tour) throw new AppError('Tour not found', 404)
      if (tour.director_user_id !== req.user!.id && req.user!.org_role !== 'admin') {
        throw new AppError('Not authorized to view role assignments for this tour', 403)
      }
      where.tour_id = String(tour_id)
    }

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

    // Require at least one parent entity
    if (!event_id && !tour_id) {
      throw new AppError('event_id or tour_id is required', 400)
    }

    // Authorization: must own the event/tour, be workspace admin/planner, or org admin
    if (event_id) {
      const event = await prisma.event.findUnique({
        where: { id: event_id },
        select: { created_by: true, workspace_id: true },
      })
      if (!event) throw new AppError('Event not found', 404)
      let canAssign = event.created_by === req.user!.id || req.user!.org_role === 'admin'
      if (!canAssign && event.workspace_id) {
        const wsRole = await getWorkspaceMemberRole(event.workspace_id, req.user!.id)
        canAssign = wsRole === 'admin' || wsRole === 'planner'
      }
      if (!canAssign) throw new AppError('Not authorized to assign roles on this event', 403)
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

    // Authorization: must own the parent event/tour, be workspace admin/planner, or org admin
    let canRemove = req.user!.org_role === 'admin'
    if (!canRemove && assignment.event_id) {
      const event = await prisma.event.findUnique({
        where: { id: assignment.event_id },
        select: { created_by: true, workspace_id: true },
      })
      canRemove = event?.created_by === req.user!.id
      if (!canRemove && event?.workspace_id) {
        const wsRole = await getWorkspaceMemberRole(event.workspace_id, req.user!.id)
        canRemove = wsRole === 'admin' || wsRole === 'planner'
      }
    }
    if (!canRemove && assignment.tour_id) {
      const tour = await prisma.tour.findUnique({ where: { id: assignment.tour_id } })
      canRemove = tour?.director_user_id === req.user!.id
    }
    if (!canRemove) {
      throw new AppError('Not authorized to remove this role', 403)
    }

    await prisma.roleAssignment.delete({ where: { id } })

    res.status(204).send()
  } catch (error) {
    next(error)
  }
}
