import { Router, Response, NextFunction } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import prisma from '../lib/prisma'
import { getVapidPublicKey } from '../lib/webPush'

const router = Router()

router.use(authenticate)

// GET /api/push/vapid-key — return public VAPID key for frontend subscription
router.get('/vapid-key', (_req: AuthRequest, res: Response) => {
  const key = getVapidPublicKey()
  if (!key) {
    return res.status(503).json({ error: 'Push notifications not configured' })
  }
  res.json({ publicKey: key })
})

// POST /api/push/subscribe — save push subscription
router.post('/subscribe', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { endpoint, keys } = req.body

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Invalid push subscription' })
    }

    // Upsert: if endpoint already exists, update keys (user may have re-subscribed)
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        user_id: req.user!.id,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      create: {
        user_id: req.user!.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    })

    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

// DELETE /api/push/unsubscribe — remove subscription by endpoint
router.delete('/unsubscribe', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { endpoint } = req.body

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' })
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint, user_id: req.user!.id },
    })

    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

export default router
