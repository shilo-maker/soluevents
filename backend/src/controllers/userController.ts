import { Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import { AppError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/auth'
import prisma from '../lib/prisma'

const BCRYPT_ROUNDS = 12

export const getUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50))
    const skip = (page - 1) * limit

    const activeWsId = req.user!.activeWorkspaceId
    const where: Record<string, any> = { isActive: true }

    // Scope to workspace members when user has an active workspace
    if (activeWsId) {
      where.workspaceMemberships = { some: { workspaceId: activeWsId } }
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          name_he: true,
          name_en: true,
          username: true,
          email: true,
          org_role: true,
          avatar_url: true,
          isActive: true,
        },
        orderBy: { email: 'asc' },
        take: limit,
        skip,
      }),
      prisma.user.count({ where }),
    ])

    res.json({
      data: users.map(u => ({
        id: u.id,
        name: u.name || u.username || u.email.split('@')[0],
        name_he: u.name_he,
        name_en: u.name_en,
        email: u.email,
        org_role: u.org_role || 'member',
        avatar_url: u.avatar_url,
        is_active: u.isActive,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    next(error)
  }
}

export const getUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        name_he: true,
        name_en: true,
        username: true,
        email: true,
        org_role: true,
        avatar_url: true,
        isActive: true,
      },
    })

    if (!user) {
      throw new AppError('User not found', 404)
    }

    res.json({
      id: user.id,
      name: user.name || user.username || user.email.split('@')[0],
      name_he: user.name_he,
      name_en: user.name_en,
      email: user.email,
      org_role: user.org_role || 'member',
      avatar_url: user.avatar_url,
      is_active: user.isActive,
    })
  } catch (error) {
    next(error)
  }
}

export const createUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, password, org_role } = req.body

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (existingUser) {
      throw new AppError('User with this email already exists', 409)
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS)

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        org_role: org_role || 'member',
        isActive: true,
        username: name,
      },
      select: {
        id: true,
        name: true,
        email: true,
        org_role: true,
        avatar_url: true,
        isActive: true,
      },
    })

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      org_role: user.org_role || 'member',
      avatar_url: user.avatar_url,
      is_active: user.isActive,
    })
  } catch (error) {
    next(error)
  }
}

export const updateUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params

    // Authorization: self or admin
    if (id !== req.user!.id && req.user!.org_role !== 'admin') {
      throw new AppError('Not authorized to modify this user', 403)
    }

    const { name, name_he, name_en, email, password, org_role, is_active, avatar_url } = req.body

    const updateData: Record<string, any> = {}
    if (name !== undefined) updateData.name = name
    if (name_he !== undefined) updateData.name_he = name_he
    if (name_en !== undefined) updateData.name_en = name_en
    if (email !== undefined) updateData.email = email.toLowerCase().trim()
    if (is_active !== undefined) updateData.isActive = is_active
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url

    // Only admin can change org_role
    if (org_role !== undefined) {
      if (req.user!.org_role !== 'admin') {
        throw new AppError('Only admins can change roles', 403)
      }
      updateData.org_role = org_role
    }

    if (password) {
      updateData.password = await bcrypt.hash(password, BCRYPT_ROUNDS)
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        name_he: true,
        name_en: true,
        username: true,
        email: true,
        org_role: true,
        avatar_url: true,
        isActive: true,
      },
    })

    res.json({
      id: user.id,
      name: user.name || user.username || user.email.split('@')[0],
      name_he: user.name_he,
      name_en: user.name_en,
      email: user.email,
      org_role: user.org_role || 'member',
      avatar_url: user.avatar_url,
      is_active: user.isActive,
    })
  } catch (error) {
    next(error)
  }
}

export const deleteUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params

    // Authorization: self or admin
    if (id !== req.user!.id && req.user!.org_role !== 'admin') {
      throw new AppError('Not authorized to deactivate this user', 403)
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    })

    res.status(204).send()
  } catch (error) {
    next(error)
  }
}
