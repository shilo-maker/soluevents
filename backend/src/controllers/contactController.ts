import { Response, NextFunction } from 'express'
import { AppError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/auth'
import prisma from '../lib/prisma'

export const getContacts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50))
    const skip = (page - 1) * limit

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        include: {
          creator: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { name: 'asc' },
        take: limit,
        skip,
      }),
      prisma.contact.count(),
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
