import { Response, NextFunction } from 'express'
import { AppError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/auth'
import prisma from '../lib/prisma'
import { checkWorkspaceMembership } from '../services/workspaceService'

export const getContacts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50))
    const skip = (page - 1) * limit

    // Scope contacts to those created by workspace members
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

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
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
      prisma.contact.count({ where }),
    ])

    res.json({
      data: contacts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    next(error)
  }
}

export const getContact = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params

    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (!contact) {
      throw new AppError('Contact not found', 404)
    }

    // Authorization: creator, org admin, or same-workspace member
    let authorized = contact.created_by === req.user!.id || req.user!.org_role === 'admin'
    if (!authorized) {
      const activeWsId = req.user!.activeWorkspaceId
      if (activeWsId) {
        const [isMember, creatorInWs] = await Promise.all([
          checkWorkspaceMembership(activeWsId, req.user!.id),
          checkWorkspaceMembership(activeWsId, contact.created_by),
        ])
        authorized = isMember && creatorInWs
      }
    }
    if (!authorized) {
      throw new AppError('Not authorized to view this contact', 403)
    }

    res.json(contact)
  } catch (error) {
    next(error)
  }
}

export const createContact = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, nickname, email, phone, role, notes } = req.body

    const contact = await prisma.contact.create({
      data: {
        name,
        nickname,
        email,
        phone,
        role,
        notes,
        created_by: req.user!.id,
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    res.status(201).json(contact)
  } catch (error) {
    next(error)
  }
}

export const updateContact = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params

    const existing = await prisma.contact.findUnique({ where: { id } })
    if (!existing) {
      throw new AppError('Contact not found', 404)
    }

    if (existing.created_by !== req.user!.id && req.user!.org_role !== 'admin') {
      throw new AppError('Not authorized to modify this contact', 403)
    }

    // Whitelist
    const { name, nickname, email, phone, role, notes } = req.body
    const updateData: Record<string, any> = {}
    if (name !== undefined) updateData.name = name
    if (nickname !== undefined) updateData.nickname = nickname
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (role !== undefined) updateData.role = role
    if (notes !== undefined) updateData.notes = notes

    const contact = await prisma.contact.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    res.json(contact)
  } catch (error) {
    next(error)
  }
}

export const deleteContact = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params

    const existing = await prisma.contact.findUnique({ where: { id } })
    if (!existing) {
      throw new AppError('Contact not found', 404)
    }

    if (existing.created_by !== req.user!.id && req.user!.org_role !== 'admin') {
      throw new AppError('Not authorized to delete this contact', 403)
    }

    await prisma.contact.delete({ where: { id } })

    res.status(204).send()
  } catch (error) {
    next(error)
  }
}
