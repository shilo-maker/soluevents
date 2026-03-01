import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { AppError } from '../middleware/errorHandler'
import prisma from '../lib/prisma'
import { generateSolucastInternal } from './integrationController'
import { syncEventSchedule } from '../services/scheduleService'

/**
 * Authenticate incoming webhook requests using the shared INTEGRATION_API_KEY.
 * Uses HMAC-based constant-time comparison to prevent timing attacks
 * (hashing normalizes buffer length, eliminating length-leak side channels).
 */
export const authenticateApiKey = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const apiKey = req.headers['x-api-key'] as string | undefined

    if (!apiKey) {
      throw new AppError('API key required. Provide X-API-Key header.', 401)
    }

    const validApiKey = process.env.INTEGRATION_API_KEY
    if (!validApiKey) {
      console.error('INTEGRATION_API_KEY not configured in environment')
      throw new AppError('Service temporarily unavailable', 503)
    }

    const hash = (s: string) =>
      crypto.createHmac('sha256', 'webhook-auth').update(s).digest()

    if (!crypto.timingSafeEqual(hash(apiKey), hash(validApiKey))) {
      throw new AppError('Invalid API key', 401)
    }

    next()
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/webhooks/soluflow-sync
 *
 * Called by SoluPresenter (fire-and-forget) whenever songs are added, removed,
 * reordered, or transposed in a SoluFlow service. The unified backend already
 * writes flow_service_songs to the shared DB, so this handler only needs to:
 *   1. Look up the FlowService by code
 *   2. Acquire an advisory lock to serialize concurrent calls
 *   3. Find linked events
 *   4. Read flow_service_songs from the shared DB
 *   5. Merge into event schedules and regenerate SoluCast setlists
 */
export const handleSoluflowSync = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { serviceCode } = req.body as { serviceCode: string }

    if (!serviceCode) {
      throw new AppError('serviceCode is required', 400)
    }

    // 1. Find the FlowService by code
    const flowService = await prisma.flowService.findUnique({
      where: { code: serviceCode.toUpperCase() },
      select: { id: true },
    })

    if (!flowService) {
      return res.json({ ok: true, eventsUpdated: 0, reason: 'no_flow_service' })
    }

    // 2. Acquire advisory lock and read data inside a short transaction.
    //    pg_advisory_xact_lock serializes concurrent webhooks for the same FlowService.
    const { linkedEvents, flowSongs } = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${flowService.id}))`

      const events = await tx.event.findMany({
        where: { flow_service_id: flowService.id },
        select: { id: true, created_by: true },
      })

      const fsSongs = await tx.flowServiceSong.findMany({
        where: { serviceId: flowService.id, segmentType: 'song' },
        orderBy: { position: 'asc' },
        include: {
          song: { select: { id: true, title: true, musicalKey: true, bpm: true } },
        },
      })

      return {
        linkedEvents: events,
        flowSongs: fsSongs.map((fs) => ({
          songId: fs.song?.id || null,
          songTitle: fs.song?.title || null,
          songMusicalKey: fs.song?.musicalKey || null,
          songBpm: fs.song?.bpm || null,
          position: fs.position,
          segmentType: fs.segmentType,
          segmentTitle: fs.segmentTitle,
          transposition: fs.transposition || 0,
        })),
      }
    }, { timeout: 15000 })

    if (linkedEvents.length === 0) {
      return res.json({ ok: true, eventsUpdated: 0 })
    }

    // 3. For each event: merge the schedule then regenerate SoluCast.
    //    Done outside the transaction so syncEventSchedule / generateSolucastInternal
    //    can use the global prisma client as they expect.
    let eventsUpdated = 0
    for (const event of linkedEvents) {
      try {
        if (flowSongs.length > 0) {
          await syncEventSchedule(event.id, flowSongs)
        }
        await generateSolucastInternal(event.id, event.created_by)
        eventsUpdated++
      } catch (err) {
        console.error(
          `[webhook] Failed to sync event ${event.id}:`,
          err instanceof Error ? err.message : err
        )
      }
    }

    console.log(`[webhook] soluflow-sync: ${serviceCode} → eventsUpdated: ${eventsUpdated}`)
    res.json({ ok: true, eventsUpdated })
  } catch (error) {
    next(error)
  }
}
