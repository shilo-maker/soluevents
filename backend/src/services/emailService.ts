import nodemailer from 'nodemailer'
import prisma from '../lib/prisma'
import { decrypt } from '../lib/encryption'

// ── Global (env-based) transporter ──────────────────────────────────

let globalTransporter: nodemailer.Transporter | null = null

function getGlobalTransporter(): nodemailer.Transporter {
  if (!globalTransporter) {
    const host = process.env.SMTP_HOST
    const port = parseInt(process.env.SMTP_PORT || '587', 10)
    const secure = process.env.SMTP_SECURE === 'true'
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS

    if (!host || !user || !pass) {
      throw new Error('SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in environment.')
    }

    globalTransporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } })
  }
  return globalTransporter
}

// ── Per-user transporter cache ──────────────────────────────────────

interface CachedTransporter {
  transporter: nodemailer.Transporter
  from: string
  createdAt: number
}

const CACHE_TTL = 10 * 60 * 1000 // 10 minutes
const transporterCache = new Map<string, CachedTransporter>()

/**
 * Create a nodemailer transporter from explicit SMTP config.
 * Used by testEmailSettings and the cache builder.
 */
export function createTransporter(config: {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
}): nodemailer.Transporter {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  })
}

async function getUserTransporter(
  userId: string
): Promise<{ transporter: nodemailer.Transporter; from: string }> {
  // Check cache
  const cached = transporterCache.get(userId)
  if (cached && Date.now() - cached.createdAt < CACHE_TTL) {
    return { transporter: cached.transporter, from: cached.from }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { smtp_host: true, smtp_port: true, smtp_secure: true, smtp_user: true, smtp_pass: true, email_from: true },
  })

  if (!user || !user.smtp_host || !user.smtp_user || !user.smtp_pass) {
    throw new Error('Email not configured. Go to User Settings → Email Settings to set up SMTP.')
  }

  let password: string
  try {
    password = decrypt(user.smtp_pass)
  } catch {
    throw new Error('Failed to decrypt SMTP password. Please re-enter it in User Settings → Email Settings.')
  }
  const transporter = createTransporter({
    host: user.smtp_host,
    port: user.smtp_port || 587,
    secure: user.smtp_secure,
    user: user.smtp_user,
    pass: password,
  })

  const from = user.email_from || `SoluPlan <${user.smtp_user}>`

  transporterCache.set(userId, { transporter, from, createdAt: Date.now() })

  return { transporter, from }
}

/**
 * Invalidate the cached transporter for a user (call after SMTP settings change).
 */
export function clearUserTransporterCache(userId: string): void {
  transporterCache.delete(userId)
}

// Periodically evict expired cache entries to prevent unbounded growth
setInterval(() => {
  const now = Date.now()
  for (const [key, cached] of transporterCache) {
    if (now - cached.createdAt >= CACHE_TTL) {
      transporterCache.delete(key)
    }
  }
}, CACHE_TTL).unref()

// ── Public API ──────────────────────────────────────────────────────

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail(options: SendEmailOptions, userId?: string): Promise<void> {
  if (userId) {
    const { transporter, from } = await getUserTransporter(userId)
    await transporter.sendMail({ from, to: options.to, subject: options.subject, html: options.html })
  } else {
    const from = process.env.EMAIL_FROM || 'SoluPlan <noreply@soluplan.app>'
    const transport = getGlobalTransporter()
    await transport.sendMail({ from, to: options.to, subject: options.subject, html: options.html })
  }
}
