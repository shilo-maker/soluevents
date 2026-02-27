import { Response, NextFunction } from 'express'
import { AppError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/auth'
import prisma from '../lib/prisma'
import { checkWorkspaceMembership } from '../services/workspaceService'

export const getVenues = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50))
    const skip = (page - 1) * limit

    // Scope venues to those created by workspace members
    let activeWsId = req.user!.activeWorkspaceId
    if (activeWsId) {
      const isMember = await checkWorkspaceMembership(activeWsId, req.user!.id)
      if (!isMember) activeWsId = null
    }

    const where: Record<string, any> = activeWsId
      ? {
          creator: {
            workspaceMemberships: {
              some: { workspaceId: activeWsId },
            },
          },
        }
      : { created_by: req.user!.id }

    const [venues, total] = await Promise.all([
      prisma.venue.findMany({
        where,
        include: {
          creator: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { name: 'asc' },
        take: limit,
        skip,
      }),
      prisma.venue.count({ where }),
    ])

    res.json({
      data: venues,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    next(error)
  }
}

export const getVenue = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params

    const venue = await prisma.venue.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (!venue) {
      throw new AppError('Venue not found', 404)
    }

    // Authorization: creator, org admin, or same-workspace member
    let authorized = venue.created_by === req.user!.id || req.user!.org_role === 'admin'
    if (!authorized) {
      const activeWsId = req.user!.activeWorkspaceId
      if (activeWsId) {
        const [isMember, creatorInWs] = await Promise.all([
          checkWorkspaceMembership(activeWsId, req.user!.id),
          checkWorkspaceMembership(activeWsId, venue.created_by),
        ])
        authorized = isMember && creatorInWs
      }
    }
    if (!authorized) {
      throw new AppError('Not authorized to view this venue', 403)
    }

    res.json(venue)
  } catch (error) {
    next(error)
  }
}

export const createVenue = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, address } = req.body

    const venue = await prisma.venue.create({
      data: {
        name,
        address,
        created_by: req.user!.id,
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    res.status(201).json(venue)
  } catch (error) {
    next(error)
  }
}

export const updateVenue = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params

    const existing = await prisma.venue.findUnique({ where: { id } })
    if (!existing) {
      throw new AppError('Venue not found', 404)
    }

    if (existing.created_by !== req.user!.id && req.user!.org_role !== 'admin') {
      throw new AppError('Not authorized to modify this venue', 403)
    }

    const { name, address } = req.body
    const updateData: Record<string, any> = {}
    if (name !== undefined) updateData.name = name
    if (address !== undefined) updateData.address = address

    const venue = await prisma.venue.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    res.json(venue)
  } catch (error) {
    next(error)
  }
}

export const deleteVenue = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params

    const existing = await prisma.venue.findUnique({ where: { id } })
    if (!existing) {
      throw new AppError('Venue not found', 404)
    }

    if (existing.created_by !== req.user!.id && req.user!.org_role !== 'admin') {
      throw new AppError('Not authorized to delete this venue', 403)
    }

    await prisma.venue.delete({ where: { id } })

    res.status(204).send()
  } catch (error) {
    next(error)
  }
}
