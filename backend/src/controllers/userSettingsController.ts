import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth'
import { AppError } from '../middleware/errorHandler'
import prisma from '../lib/prisma'
import { encrypt, decrypt } from '../lib/encryption'
import { createTransporter, clearUserTransporterCache } from '../services/emailService'

export const getUserEmailSettings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { smtp_host: true, smtp_port: true, smtp_secure: true, smtp_user: true, smtp_pass: true, email_from: true },
    })
    if (!user) throw new AppError('User not found', 404)

    res.json({
      smtp_host: user.smtp_host,
      smtp_port: user.smtp_port,
      smtp_secure: user.smtp_secure,
      smtp_user: user.smtp_user,
      has_password: !!user.smtp_pass,
      email_from: user.email_from,
    })
  } catch (error) {
    next(error)
  }
}

export const updateUserEmailSettings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, email_from } = req.body

    const data: Record<string, any> = {}

    if ('smtp_host' in req.body) data.smtp_host = smtp_host?.trim() || null
    if ('smtp_port' in req.body) data.smtp_port = smtp_port != null ? Number(smtp_port) : null
    if ('smtp_secure' in req.body) data.smtp_secure = !!smtp_secure
    if ('smtp_user' in req.body) data.smtp_user = smtp_user?.trim() || null
    if ('email_from' in req.body) data.email_from = email_from?.trim() || null

    // Password: non-empty string -> encrypt & store; explicit null/empty -> clear; omitted -> keep
    if ('smtp_pass' in req.body) {
      data.smtp_pass = smtp_pass ? encrypt(smtp_pass) : null
    }

    await prisma.user.update({ where: { id: req.user!.id }, data })

    clearUserTransporterCache(req.user!.id)

    res.json({ message: 'Email settings updated' })
  } catch (error) {
    next(error)
  }
}

export const testUserEmailSettings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { smtp_host: true, smtp_port: true, smtp_secure: true, smtp_user: true, smtp_pass: true, email_from: true, email: true },
    })
    if (!user) throw new AppError('User not found', 404)

    if (!user.smtp_host || !user.smtp_user || !user.smtp_pass) {
      throw new AppError('Email settings are incomplete. Please save SMTP host, user, and password first.', 400)
    }

    const password = decrypt(user.smtp_pass)
    const transporter = createTransporter({
      host: user.smtp_host,
      port: user.smtp_port || 587,
      secure: user.smtp_secure,
      user: user.smtp_user,
      pass: password,
    })

    const from = user.email_from || `SoluPlan <${user.smtp_user}>`

    await transporter.sendMail({
      from,
      to: user.email,
      subject: 'SoluPlan — Test Email',
      html: `<p>This is a test email from your SoluPlan email settings.</p><p>If you received this, your SMTP configuration is working correctly!</p>`,
    })

    res.json({ message: `Test email sent to ${user.email}` })
  } catch (error: any) {
    if (error instanceof AppError) return next(error)
    next(new AppError(`Email test failed: ${error.message}`, 400))
  }
}
