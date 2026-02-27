import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth'
import prisma from '../lib/prisma'

export const listNotifications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { user_id: req.user!.id },
      orderBy: { created_at: 'desc' },
      take: 30,
    })
    res.json(notifications)
  } catch (error) {
    next(error)
  }
}

export const getUnreadCount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const [unread, total] = await Promise.all([
      prisma.notification.count({ where: { user_id: req.user!.id, read_at: null } }),
      prisma.notification.count({ where: { user_id: req.user!.id } }),
    ])
    res.json({ count: unread, total })
  } catch (error) {
    next(error)
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const markAsRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({ message: 'Invalid notification ID' })
    }
    await prisma.notification.updateMany({
      where: { id, user_id: req.user!.id },
      data: { read_at: new Date() },
    })
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
}

export const markAllAsRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    await prisma.notification.updateMany({
      where: { user_id: req.user!.id, read_at: null },
      data: { read_at: new Date() },
    })
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
}

export const deleteOne = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({ message: 'Invalid notification ID' })
    }
    await prisma.notification.deleteMany({
      where: { id, user_id: req.user!.id },
    })
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
}

export const clearAll = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    await prisma.notification.deleteMany({
      where: { user_id: req.user!.id },
    })
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
}
