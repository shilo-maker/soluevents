import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import { AppError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/auth'
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt'
import prisma from '../lib/prisma'
import { createPersonalWorkspace, ensurePersonalWorkspace } from '../services/workspaceService'

const BCRYPT_ROUNDS = 12

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, password } = req.body

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (existingUser) {
      throw new AppError('Email already registered', 409)
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS)

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        name,
        org_role: 'member',
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

    // Create personal workspace for new user (uses ensurePersonalWorkspace for idempotency)
    let workspaceId: string | null = null
    try {
      const workspace = await ensurePersonalWorkspace(user.id, name)
      workspaceId = workspace.id
    } catch (err) {
      console.error('Failed to create personal workspace during register:', err)
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      org_role: user.org_role || 'member',
    }
    const access_token = generateAccessToken(tokenPayload)
    const refresh_token = generateRefreshToken(tokenPayload)

    res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        org_role: user.org_role || 'member',
        avatar_url: user.avatar_url,
        is_active: user.isActive ?? true,
        activeWorkspaceId: workspaceId,
      },
      access_token,
      refresh_token,
    })
  } catch (error) {
    next(error)
  }
}

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })
    if (!user) {
      throw new AppError('Invalid credentials', 401)
    }

    if (user.isActive === false) {
      throw new AppError('Account is inactive', 401)
    }

    if (!user.password) {
      throw new AppError('Account uses social login, password not set', 401)
    }

    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401)
    }

    // Ensure personal workspace exists (migration path for existing users)
    // Non-blocking: login succeeds even if workspace bootstrap fails
    const userName = user.name || user.username || user.email.split('@')[0]
    let activeWorkspaceId = user.activeWorkspaceId
    try {
      const workspace = await ensurePersonalWorkspace(user.id, userName)
      // ensurePersonalWorkspace sets activeWorkspaceId if it was missing
      activeWorkspaceId = activeWorkspaceId ?? workspace.id
    } catch (err) {
      console.error('Failed to ensure personal workspace during login:', err)
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      org_role: user.org_role || 'member',
    }
    const access_token = generateAccessToken(tokenPayload)
    const refresh_token = generateRefreshToken(tokenPayload)

    res.json({
      user: {
        id: user.id,
        name: userName,
        email: user.email,
        org_role: user.org_role || 'member',
        avatar_url: user.avatar_url,
        is_active: user.isActive ?? true,
        activeWorkspaceId: activeWorkspaceId ?? null,
      },
      access_token,
      refresh_token,
    })
  } catch (error) {
    next(error)
  }
}

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refresh_token } = req.body

    const decoded = verifyRefreshToken(refresh_token)

    const userId = decoded.id || decoded.userId
    if (!userId) {
      throw new AppError('Invalid refresh token', 401)
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        org_role: true,
        isActive: true,
      },
    })

    if (!user || user.isActive === false) {
      throw new AppError('Invalid refresh token', 401)
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      org_role: user.org_role || 'member',
    }
    const access_token = generateAccessToken(tokenPayload)

    res.json({ access_token })
  } catch (error) {
    next(error)
  }
}

export const me = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        org_role: true,
        avatar_url: true,
        phone: true,
        isActive: true,
        username: true,
        solucastRole: true,
        preferences: true,
        activeWorkspaceId: true,
        defaultWorkspaceId: true,
      },
    })

    if (!user) {
      throw new AppError('User not found', 404)
    }

    // Fetch active workspace details if set, clean up stale reference
    let activeWorkspace = null
    let resolvedActiveWsId = user.activeWorkspaceId
    if (user.activeWorkspaceId) {
      activeWorkspace = await prisma.workspace.findUnique({
        where: { id: user.activeWorkspaceId },
        select: { id: true, name: true, slug: true, workspaceType: true },
      })
      if (!activeWorkspace) {
        // Stale reference — workspace was deleted. Fall back to default or clear.
        resolvedActiveWsId = user.defaultWorkspaceId ?? null
        if (resolvedActiveWsId) {
          // Verify the user is still a member of the fallback workspace
          const fallbackMember = await prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId: resolvedActiveWsId, userId: user.id } },
          })
          if (fallbackMember) {
            activeWorkspace = await prisma.workspace.findUnique({
              where: { id: resolvedActiveWsId },
              select: { id: true, name: true, slug: true, workspaceType: true },
            })
          }
          if (!activeWorkspace) {
            // Default workspace stale or user not a member — clear everything
            resolvedActiveWsId = null
          }
        }
        await prisma.user.update({
          where: { id: user.id },
          data: {
            activeWorkspaceId: resolvedActiveWsId,
            ...(!activeWorkspace && user.defaultWorkspaceId ? { defaultWorkspaceId: null } : {}),
          },
        })
      }
    }

    res.json({
      id: user.id,
      name: user.name || user.username || user.email.split('@')[0],
      email: user.email,
      org_role: user.org_role || 'member',
      avatar_url: user.avatar_url,
      phone: user.phone,
      is_active: user.isActive ?? true,
      role: user.solucastRole,
      preferences: user.preferences,
      activeWorkspaceId: resolvedActiveWsId,
      defaultWorkspaceId: activeWorkspace ? (user.defaultWorkspaceId ?? resolvedActiveWsId) : null,
      activeWorkspace,
    })
  } catch (error) {
    next(error)
  }
}
