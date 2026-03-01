import { Response, NextFunction } from 'express'
import { randomBytes } from 'crypto'
import { AppError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/auth'
import prisma from '../lib/prisma'
import { createPointsSlides } from '../lib/createPointsSlides'
import * as songService from '../services/songService'
import * as flowServiceService from '../services/flowServiceService'
import * as setlistService from '../services/setlistService'
import * as workspaceService from '../services/workspaceService'

// ── Songs ──────────────────────────────────────────────────────

export const searchSongs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { q, workspace_id, limit } = req.query
    const songs = await songService.searchSongs(
      (q as string) || '',
      workspace_id as string | undefined,
      limit ? Math.min(parseInt(limit as string, 10), 100) : undefined
    )
    res.json(songs)
  } catch (error) {
    next(error)
  }
}

export const getSong = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const song = await songService.getSongById(id)
    if (!song) {
      throw new AppError('Song not found', 404)
    }
    res.json(song)
  } catch (error) {
    next(error)
  }
}

// ── FlowServices ───────────────────────────────────────────────

export const getServices = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { workspace_id, limit } = req.query
    const services = await flowServiceService.getFlowServices(
      workspace_id as string | undefined,
      limit ? Math.min(parseInt(limit as string, 10), 100) : undefined
    )
    res.json(services)
  } catch (error) {
    next(error)
  }
}

export const getService = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const service = await flowServiceService.getFlowServiceById(id)
    if (!service) {
      throw new AppError('FlowService not found', 404)
    }
    res.json(service)
  } catch (error) {
    next(error)
  }
}

export const createService = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { title, workspace_id, date, time, location, leader_id } = req.body

    // Resolve workspace: use provided ID, or fall back to user's first workspace
    let resolvedWorkspaceId = workspace_id
    if (!resolvedWorkspaceId) {
      const workspaces = await workspaceService.getUserWorkspaces(req.user!.id)
      if (workspaces.length === 0) {
        throw new AppError('No workspace found. You must belong to a workspace to create a service.', 400)
      }
      resolvedWorkspaceId = workspaces[0].id
    }

    // Verify user has access to workspace
    const isMember = await workspaceService.checkWorkspaceMembership(
      resolvedWorkspaceId,
      req.user!.id
    )
    if (!isMember) {
      throw new AppError('Not a member of this workspace', 403)
    }

    const service = await flowServiceService.createFlowService({
      title,
      workspaceId: resolvedWorkspaceId,
      date,
      time,
      location,
      leaderId: leader_id,
      createdById: req.user!.id,
    })

    res.status(201).json(service)
  } catch (error) {
    next(error)
  }
}

export const getServiceByCode = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { code } = req.params

    // Validate code format (4-10 alphanumeric chars, case-insensitive)
    if (!/^[A-Za-z0-9]{4,10}$/.test(code)) {
      throw new AppError('Invalid service code format', 400)
    }

    const service = await flowServiceService.getFlowServiceByCode(code.toUpperCase())
    if (!service) {
      throw new AppError('FlowService not found', 404)
    }
    res.json(service)
  } catch (error) {
    next(error)
  }
}

// ── Setlists ───────────────────────────────────────────────────

export const getSetlists = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { limit } = req.query
    const setlists = await setlistService.getSetlists(
      limit ? Math.min(parseInt(limit as string, 10), 100) : undefined
    )
    res.json(setlists)
  } catch (error) {
    next(error)
  }
}

export const getSetlist = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const setlist = await setlistService.getSetlistById(id)
    if (!setlist) {
      throw new AppError('Setlist not found', 404)
    }

    // Authorization: must be the setlist creator or an admin
    if (setlist.createdById !== req.user!.id && req.user!.org_role !== 'admin') {
      throw new AppError('Not authorized to view this setlist', 403)
    }

    const items = Array.isArray(setlist.items) ? setlist.items : []
    res.json({
      id: setlist.id,
      name: setlist.name,
      shareCode: setlist.shareCode,
      itemCount: items.length,
    })
  } catch (error) {
    next(error)
  }
}

// ── Workspaces ─────────────────────────────────────────────────

export const getWorkspaces = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const workspaces = await workspaceService.getUserWorkspaces(req.user!.id)
    res.json(workspaces)
  } catch (error) {
    next(error)
  }
}

// ── Link Event ↔ FlowService ──────────────────────────────────

export const linkEventToService = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const { flow_service_id, setlist_id, workspace_id } = req.body

    const event = await prisma.event.findUnique({
      where: { id },
      select: { id: true, created_by: true, workspace_id: true },
    })
    if (!event) {
      throw new AppError('Event not found', 404)
    }

    // Authorization: must own the event, be workspace admin/planner, or org admin
    let canLink = event.created_by === req.user!.id || req.user!.org_role === 'admin'
    if (!canLink && event.workspace_id) {
      const wsRole = await workspaceService.getWorkspaceMemberRole(event.workspace_id, req.user!.id)
      canLink = wsRole === 'admin' || wsRole === 'planner'
    }
    if (!canLink) {
      throw new AppError('Not authorized to link this event', 403)
    }

    // Verify workspace membership if provided
    if (workspace_id) {
      const isMember = await workspaceService.checkWorkspaceMembership(workspace_id, req.user!.id)
      if (!isMember) {
        throw new AppError('Not a member of this workspace', 403)
      }
    }

    const updateData: Record<string, any> = {}
    if (flow_service_id !== undefined) updateData.flow_service_id = flow_service_id
    if (setlist_id !== undefined) updateData.setlist_id = setlist_id
    if (workspace_id !== undefined) updateData.workspace_id = workspace_id

    const updated = await prisma.event.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    res.json(updated)
  } catch (error) {
    next(error)
  }
}

// ── Hebrew Bible Book Names ──────────────────────────────────

const BIBLE_BOOK_HE: Record<string, string> = {
  'Genesis': 'בראשית', 'Exodus': 'שמות', 'Leviticus': 'ויקרא',
  'Numbers': 'במדבר', 'Deuteronomy': 'דברים', 'Joshua': 'יהושע',
  'Judges': 'שופטים', 'Ruth': 'רות', '1 Samuel': 'שמואל א׳',
  '2 Samuel': 'שמואל ב׳', '1 Kings': 'מלכים א׳', '2 Kings': 'מלכים ב׳',
  '1 Chronicles': 'דברי הימים א׳', '2 Chronicles': 'דברי הימים ב׳',
  'Ezra': 'עזרא', 'Nehemiah': 'נחמיה', 'Esther': 'אסתר', 'Job': 'איוב',
  'Psalms': 'תהילים', 'Proverbs': 'משלי', 'Ecclesiastes': 'קהלת',
  'Song of Solomon': 'שיר השירים', 'Isaiah': 'ישעיהו', 'Jeremiah': 'ירמיהו',
  'Lamentations': 'איכה', 'Ezekiel': 'יחזקאל', 'Daniel': 'דניאל',
  'Hosea': 'הושע', 'Joel': 'יואל', 'Amos': 'עמוס', 'Obadiah': 'עובדיה',
  'Jonah': 'יונה', 'Micah': 'מיכה', 'Nahum': 'נחום', 'Habakkuk': 'חבקוק',
  'Zephaniah': 'צפניה', 'Haggai': 'חגי', 'Zechariah': 'זכריה', 'Malachi': 'מלאכי',
  'Matthew': 'מתי', 'Mark': 'מרקוס', 'Luke': 'לוקס', 'John': 'יוחנן',
  'Acts': 'מעשי השליחים', 'Romans': 'רומים', '1 Corinthians': 'קורינתים א׳',
  '2 Corinthians': 'קורינתים ב׳', 'Galatians': 'גלטים', 'Ephesians': 'אפסים',
  'Philippians': 'פיליפים', 'Colossians': 'קולוסים',
  '1 Thessalonians': 'תסלוניקים א׳', '2 Thessalonians': 'תסלוניקים ב׳',
  '1 Timothy': 'טימותיאוס א׳', '2 Timothy': 'טימותיאוס ב׳', 'Titus': 'טיטוס',
  'Philemon': 'פילמון', 'Hebrews': 'עברים', 'James': 'יעקב',
  '1 Peter': 'פטרוס א׳', '2 Peter': 'פטרוס ב׳', '1 John': 'יוחנן א׳',
  '2 John': 'יוחנן ב׳', '3 John': 'יוחנן ג׳', 'Jude': 'יהודה',
  'Revelation': 'התגלות',
}

/** Convert "Genesis 1:1-3" → "בראשית א׳:א׳-ג׳" */
function hebrewBibleRef(ref: string): string | undefined {
  if (!ref) return undefined
  // Match "Book Chapter:VerseStart-VerseEnd" pattern
  const match = ref.match(/^(.+?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/)
  if (!match) {
    // Just a book name
    return BIBLE_BOOK_HE[ref.trim()]
  }
  const heName = BIBLE_BOOK_HE[match[1]]
  if (!heName) return undefined
  // Keep numeric chapter:verse format (Hebrew readers understand Arabic numerals)
  let result = `${heName} ${match[2]}`
  if (match[3]) {
    result += `:${match[3]}`
    if (match[4]) result += `-${match[4]}`
  }
  return result
}

function addHebrewRef(bibleRef: any): any {
  if (!bibleRef || bibleRef.hebrewReference) return bibleRef
  const ref = bibleRef.reference
  if (!ref) return bibleRef
  const heRef = hebrewBibleRef(ref)
  if (heRef) return { ...bibleRef, hebrewReference: heRef }
  return bibleRef
}

// ── Generate SoluCast Setlist ─────────────────────────────────

function generateShareCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const bytes = randomBytes(10)
  let code = ''
  for (let i = 0; i < 10; i++) {
    code += chars[bytes[i] % 36]
  }
  return code
}

export const generateSolucast = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params

    const event = await prisma.event.findUnique({ where: { id } })
    if (!event) {
      throw new AppError('Event not found', 404)
    }

    // Authorization: must own the event, be workspace admin/planner, or org admin
    let canGenerate = event.created_by === req.user!.id || req.user!.org_role === 'admin'
    if (!canGenerate && event.workspace_id) {
      const wsRole = await workspaceService.getWorkspaceMemberRole(event.workspace_id, req.user!.id)
      canGenerate = wsRole === 'admin' || wsRole === 'planner'
    }
    if (!canGenerate) {
      throw new AppError('Not authorized to generate SoluCast for this event', 403)
    }

    const agenda = event.program_agenda as any
    const schedule = agenda?.program_schedule as any[] | undefined
    if (!schedule || schedule.length === 0) {
      throw new AppError('Event has no program schedule', 400)
    }

    // Separate song IDs by type: numeric (legacy SoluFlow) vs UUID (SoluCast direct)
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const numericSongIds: number[] = []
    const uuidSongIds: string[] = []

    for (const item of schedule) {
      if (item.type !== 'song' || !item.soluflow_song_id) continue
      const rawId = item.soluflow_song_id
      if (UUID_RE.test(String(rawId))) {
        // Already a SoluCast Song UUID (from FlowService sync)
        uuidSongIds.push(String(rawId).toLowerCase())
      } else {
        const num = Number(rawId)
        if (!Number.isNaN(num)) numericSongIds.push(num)
      }
    }

    // Batch-fetch SongMappings for legacy numeric IDs
    const songMappings = numericSongIds.length > 0
      ? await prisma.songMapping.findMany({
          where: { soluflowId: { in: numericSongIds } },
        })
      : []
    const mappingBySoluflowId = new Map(
      songMappings.map((m) => [m.soluflowId, m.solupresenterId])
    )

    // Collect all SoluCast song UUIDs we need (from mappings + direct UUIDs)
    const allSolucastSongIds = [
      ...songMappings.map((m) => m.solupresenterId).filter((sid): sid is string => !!sid),
      ...uuidSongIds,
    ]
    const songs = allSolucastSongIds.length > 0
      ? await prisma.song.findMany({
          where: { id: { in: allSolucastSongIds } },
        })
      : []
    const songById = new Map(songs.map((s) => [s.id.toLowerCase(), s]))

    // Build setlist items in schedule order (use transaction for atomicity)
    const result = await prisma.$transaction(async (tx) => {
      // Clean up old Presentation records from previous generation
      if (event.setlist_id) {
        const oldSetlist = await tx.setlist.findUnique({
          where: { id: event.setlist_id },
          select: { items: true },
        })
        if (oldSetlist) {
          const oldPresIds = (oldSetlist.items as any[] || [])
            .filter((i: any) => i.type === 'presentation' && i.presentationData?.id)
            .map((i: any) => i.presentationData.id)
          if (oldPresIds.length > 0) {
            await tx.presentation.deleteMany({ where: { id: { in: oldPresIds } } })
          }
        }
      }

      const setlistItems: any[] = []
      let order = 0

      for (const item of schedule) {
        if (item.type === 'song' && item.soluflow_song_id) {
          const rawId = item.soluflow_song_id
          let solucastSongId: string | undefined

          if (UUID_RE.test(String(rawId))) {
            // Direct SoluCast UUID (from FlowService sync)
            solucastSongId = String(rawId).toLowerCase()
          } else {
            // Legacy numeric ID — resolve via SongMapping
            solucastSongId = mappingBySoluflowId.get(Number(rawId))?.toLowerCase() || undefined
          }

          if (!solucastSongId) continue
          const song = songById.get(solucastSongId)
          if (!song) continue

          // Use SoluCast's native setlist item format (UUID reference)
          setlistItems.push({ type: 'song', song: song.id, order: order++ })
        } else if (item.type === 'prayer' && item.prayer_points?.length > 0) {
          // Determine if bilingual (any translation text present)
          const hasTrans = !!item.title_translation ||
            item.prayer_points.some(
              (p: any) => p.subtitle_translation || p.description_translation
            )

          // Resolve shared_bible_ref: when same_verse_for_all is set, apply
          // the shared ref to all points that don't have their own
          const sharedBibleRef = item.same_verse_for_all && item.shared_bible_ref
            ? addHebrewRef(typeof item.shared_bible_ref === 'object'
                ? item.shared_bible_ref
                : { reference: item.shared_bible_ref })
            : undefined

          // Convert prayer_points (snake_case) to camelCase subtitles for createPointsSlides
          const subtitles = item.prayer_points.map((p: any) => {
            let bibleRef: any = undefined
            if (p.bible_ref && typeof p.bible_ref === 'object') {
              bibleRef = addHebrewRef(p.bible_ref)
            } else if (p.bible_ref && typeof p.bible_ref === 'string') {
              bibleRef = addHebrewRef({ reference: p.bible_ref })
            } else if (sharedBibleRef) {
              bibleRef = sharedBibleRef
            }
            return {
              subtitle: p.subtitle || '',
              subtitleTranslation: p.subtitle_translation,
              description: p.description || '',
              descriptionTranslation: p.description_translation,
              bibleRef,
            }
          })

          const slides = createPointsSlides({
            type: 'prayer',
            title: item.title || 'Prayer',
            titleTranslation: item.title_translation,
            generateTranslation: hasTrans,
            subtitles,
          })

          // Use camelCase subtitles for quickModeData (desktop expects camelCase)
          const quickModeData = {
            type: 'prayer',
            title: item.title || 'Prayer',
            titleTranslation: item.title_translation || '',
            subtitles,
            generateTranslation: hasTrans,
          }

          // Create Presentation record in shared DB
          const presentation = await tx.presentation.create({
            data: {
              title: (item.title || 'Prayer').slice(0, 255),
              slides: slides as any,
              createdById: req.user!.id,
              isPublic: false,
              canvasDimensions: { width: 1920, height: 1080 },
              backgroundSettings: { type: 'color', value: '#000000' },
              quickModeData,
            },
          })

          // Use SoluCast's expected key name: presentationData
          setlistItems.push({
            type: 'presentation',
            presentationData: {
              id: presentation.id,
              title: presentation.title,
              slides: presentation.slides,
              canvasDimensions: { width: 1920, height: 1080 },
              quickModeData,
            },
            order: order++,
          })
        }
        // Skip other types (opening, closing, share, ministry, other)
      }

      if (setlistItems.length === 0) {
        throw new AppError(
          'No songs or prayer items could be added. Make sure songs are mapped to SoluCast and prayer items have prayer points.',
          400
        )
      }

      const setlistName = `[Generated] ${event.title}`.slice(0, 255)

      // If event has a linked setlist, try to update; fall back to create if it was deleted
      let setlist
      if (event.setlist_id) {
        const existingSetlist = await tx.setlist.findUnique({
          where: { id: event.setlist_id },
          select: { id: true },
        })
        if (existingSetlist) {
          // Update items only — preserve existing shareCode and shareToken
          setlist = await tx.setlist.update({
            where: { id: event.setlist_id },
            data: {
              name: setlistName,
              items: setlistItems,
            },
          })
        }
      }

      if (!setlist) {
        // New setlist — generate unique share code (retry up to 5 times on collision)
        let shareCode = ''
        for (let i = 0; i < 5; i++) {
          shareCode = generateShareCode()
          const existing = await tx.setlist.findUnique({ where: { shareCode } })
          if (!existing) break
          if (i === 4) throw new AppError('Failed to generate unique share code', 500)
        }
        const shareToken = randomBytes(16).toString('hex')

        setlist = await tx.setlist.create({
          data: {
            name: setlistName,
            items: setlistItems,
            createdById: req.user!.id,
            isTemporary: false,
            shareCode,
            shareToken,
          },
        })

        // Link the setlist to the event
        await tx.event.update({
          where: { id: event.id },
          data: { setlist_id: setlist.id },
        })
      }

      return { setlist, setlistItems }
    }, { timeout: 30000 })

    const solucastUrl = process.env.SOLUCAST_APP_URL || 'https://solucast.app'

    res.status(201).json({
      setlistId: result.setlist.id,
      shareCode: result.setlist.shareCode,
      shareUrl: `${solucastUrl}/open/${result.setlist.shareCode}`,
      itemCount: result.setlistItems.length,
    })
  } catch (error) {
    next(error)
  }
}
