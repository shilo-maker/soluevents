import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { AppError } from './errorHandler'
import prisma from '../lib/prisma'

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    org_role: string
    activeWorkspaceId: string | null
  }
}

export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401)
    }

    const token = authHeader.substring(7)

    // Try SoluPlan JWT_SECRET first, then fall back to SOLUCAST_JWT_SECRET
    let decoded: any
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] })
    } catch (err) {
      if (process.env.SOLUCAST_JWT_SECRET) {
        decoded = jwt.verify(token, process.env.SOLUCAST_JWT_SECRET, { algorithms: ['HS256'] })
      } else {
        throw err
      }
    }

    // Accept both SoluPlan tokens ({ id }) and SoluCast tokens ({ userId })
    const userId = decoded.id || decoded.userId
    if (!userId) {
      throw new AppError('Invalid token payload', 401)
    }

    // Look up user from DB for fresh data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        org_role: true,
        isActive: true,
        activeWorkspaceId: true,
      },
    })

    if (!user || user.isActive === false) {
      throw new AppError('User not found or inactive', 401)
    }

    req.user = {
      id: user.id,
      email: user.email,
      org_role: user.org_role || 'member',
      activeWorkspaceId: user.activeWorkspaceId ?? null,
    }
    next()
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid token', 401))
    }
    next(error)
  }
}

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401))
    }

    if (!roles.includes(req.user.org_role)) {
      return next(
        new AppError('Not authorized to access this resource', 403)
      )
    }

    next()
  }
}
