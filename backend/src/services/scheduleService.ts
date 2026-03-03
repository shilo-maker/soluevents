import prisma from '../lib/prisma'

interface ProgramItem {
  type: string
  title?: string
  offset_minutes?: number
  person?: string
  person_id?: string
  person_is_user?: boolean
  key?: string
  bpm?: string
  soluflow_song_id?: string
  speaker?: string
  speaker_id?: string
  speaker_is_user?: boolean
  topic?: string
  points?: string
  prayer_leader?: string
  prayer_leader_id?: string
  prayer_leader_is_user?: boolean
  facilitator?: string
  facilitator_id?: string
  facilitator_is_user?: boolean
  has_ministry_team?: boolean
  [key: string]: any
}

interface FlowSong {
  id?: string
  songId: string | null
  songTitle: string | null
  songMusicalKey: string | null
  songBpm: number | null
  position: number
  segmentType: string
  segmentTitle: string | null
  segmentContent: string | null
  transposition: number
}

function transposeKey(key: string, semitones: number): string {
  if (!key || !semitones) return key
  const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const flatToSharp: Record<string, string> = {
    'Db': 'C#', 'Eb': 'D#', 'Fb': 'E', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#', 'Cb': 'B',
  }
  const isMinor = key.endsWith('m')
  const root = isMinor ? key.slice(0, -1) : key
  const normalized = flatToSharp[root] || root
  const idx = keys.indexOf(normalized)
  if (idx === -1) return key
  const newIdx = ((idx + semitones) % 12 + 12) % 12
  return keys[newIdx] + (isMinor ? 'm' : '')
}

/**
 * Server-side port of the frontend buildMergedSchedule logic.
 * Merges SoluFlow songs into the existing program schedule,
 * preserving non-song items at their relative positions and
 * retaining manually entered data for songs that still exist.
 */
function buildMergedSchedule(
  currentSchedule: ProgramItem[],
  flowSongs: FlowSong[]
): ProgramItem[] {
  if (currentSchedule.length < 2) return currentSchedule

  const opening = currentSchedule[0]
  const closing = currentSchedule[currentSchedule.length - 1]

  // Record manually-added items (no soluflow_song_id) with their relative position
  // (how many flow items appeared before them)
  const manualPositions: { item: ProgramItem; afterFlowIndex: number }[] = []
  let flowCount = 0
  for (const item of currentSchedule.slice(1, -1)) {
    if (item.soluflow_song_id) {
      flowCount++
    } else {
      manualPositions.push({ item, afterFlowIndex: flowCount })
    }
  }

  // Build a map of existing flow items by soluflow_song_id to preserve manual edits
  const existingFlowMap = new Map<string, ProgramItem>()
  for (const item of currentSchedule) {
    if (item.soluflow_song_id) {
      existingFlowMap.set(item.soluflow_song_id, item)
    }
  }

  const flowItems: ProgramItem[] = flowSongs.map((fs) => {
    const flowItemId = fs.id || fs.songId
    // Backward compat: existing events may have soluflow_song_id = songId (old format)
    const existing = (flowItemId ? existingFlowMap.get(flowItemId) : null)
      || (fs.songId ? existingFlowMap.get(fs.songId) : null)

    if (fs.segmentType === 'prayer') {
      let prayerData: any = {}
      try { if (fs.segmentContent) prayerData = JSON.parse(fs.segmentContent) } catch {}
      return {
        offset_minutes: existing?.offset_minutes,
        type: 'prayer',
        title: fs.segmentTitle || prayerData.title || 'Prayer',
        title_translation: prayerData.title_translation,
        same_verse_for_all: prayerData.same_verse_for_all,
        shared_bible_ref: prayerData.shared_bible_ref,
        prayer_points: prayerData.prayer_points,
        soluflow_song_id: flowItemId || undefined,
        prayer_leader: existing?.prayer_leader || '',
        prayer_leader_id: existing?.prayer_leader_id || '',
        prayer_leader_is_user: existing?.prayer_leader_is_user || false,
        person: existing?.person || '',
        person_id: existing?.person_id || '',
        person_is_user: existing?.person_is_user || false,
        speaker: existing?.speaker || '',
        speaker_id: existing?.speaker_id || '',
        speaker_is_user: existing?.speaker_is_user || false,
        topic: existing?.topic || '',
        points: existing?.points || '',
        facilitator: existing?.facilitator || '',
        facilitator_id: existing?.facilitator_id || '',
        facilitator_is_user: existing?.facilitator_is_user || false,
        has_ministry_team: existing?.has_ministry_team || false,
      }
    }

    return {
      offset_minutes: existing?.offset_minutes,
      title: fs.songTitle || fs.segmentTitle || 'Untitled',
      type: 'song',
      person: existing?.person || '',
      person_id: existing?.person_id || '',
      person_is_user: existing?.person_is_user || false,
      key: fs.songMusicalKey ? transposeKey(fs.songMusicalKey, fs.transposition || 0) : '',
      bpm: fs.songBpm?.toString() || '',
      soluflow_song_id: flowItemId || undefined,
      speaker: existing?.speaker || '',
      speaker_id: existing?.speaker_id || '',
      speaker_is_user: existing?.speaker_is_user || false,
      topic: existing?.topic || '',
      points: existing?.points || '',
      prayer_leader: existing?.prayer_leader || '',
      prayer_leader_id: existing?.prayer_leader_id || '',
      prayer_leader_is_user: existing?.prayer_leader_is_user || false,
      facilitator: existing?.facilitator || '',
      facilitator_id: existing?.facilitator_id || '',
      facilitator_is_user: existing?.facilitator_is_user || false,
      has_ministry_team: existing?.has_ministry_team || false,
    }
  })

  // Re-insert manually-added items at their original relative positions
  const middleItems = [...flowItems]
  let insertionOffset = 0
  for (const { item, afterFlowIndex } of manualPositions) {
    const pos = Math.min(afterFlowIndex, middleItems.length) + insertionOffset
    middleItems.splice(pos, 0, item)
    insertionOffset++
  }

  return [opening, ...middleItems, closing]
}

/**
 * Update an event's program_agenda with a new merged schedule,
 * then regenerate the SoluCast setlist.
 */
export async function syncEventSchedule(eventId: string, flowSongs: FlowSong[]) {
  const event = await prisma.event.findUnique({ where: { id: eventId } })
  if (!event) return

  const agenda = event.program_agenda as any
  const currentSchedule = agenda?.program_schedule as ProgramItem[] | undefined
  if (!currentSchedule || currentSchedule.length < 2) return

  const mergedSchedule = buildMergedSchedule(currentSchedule, flowSongs)

  await prisma.event.update({
    where: { id: eventId },
    data: {
      program_agenda: {
        ...agenda,
        program_schedule: mergedSchedule,
      },
    },
  })
}
