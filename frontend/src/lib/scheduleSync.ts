import type { FlowServiceSong } from '@/types'

function transposeKey(key: string, semitones: number): string {
  if (!key || !semitones) return key
  const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const flatToSharp: Record<string, string> = { 'Db': 'C#', 'Eb': 'D#', 'Fb': 'E', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#', 'Cb': 'B' }
  const isMinor = key.endsWith('m')
  const root = isMinor ? key.slice(0, -1) : key
  const normalized = flatToSharp[root] || root
  const idx = keys.indexOf(normalized)
  if (idx === -1) return key
  const newIdx = ((idx + semitones) % 12 + 12) % 12
  return keys[newIdx] + (isMinor ? 'm' : '')
}

/**
 * Merges SoluFlow songs into an existing program schedule.
 * Replaces all song-type items while preserving non-song items.
 */
export function buildMergedSchedule(
  currentSchedule: any[],
  flowSongs: FlowServiceSong[]
): any[] {
  if (currentSchedule.length < 2) return currentSchedule

  const opening = currentSchedule[0]
  const closing = currentSchedule[currentSchedule.length - 1]

  // Record manually-added items (no soluflow_song_id) with their relative position
  const manualPositions: { item: any; afterFlowIndex: number }[] = []
  let flowCount = 0
  for (const item of currentSchedule.slice(1, -1)) {
    if (item.soluflow_song_id) {
      flowCount++
    } else {
      manualPositions.push({ item, afterFlowIndex: flowCount })
    }
  }

  // Build a map of existing flow items by soluflow_song_id to preserve manual edits
  const existingFlowMap = new Map<string, any>()
  for (const item of currentSchedule) {
    if (item.soluflow_song_id) {
      existingFlowMap.set(item.soluflow_song_id, item)
    }
  }

  const flowItems = flowSongs.map((fs) => {
    const flowItemId = fs.id
    // Backward compat: existing events may have soluflow_song_id = song.id (old format)
    const existing = (flowItemId ? existingFlowMap.get(flowItemId) : null)
      || (fs.song?.id ? existingFlowMap.get(fs.song.id) : null)

    if (fs.segmentType === 'prayer') {
      let prayerData: any = {}
      try { if (fs.segmentContent) prayerData = JSON.parse(fs.segmentContent) } catch {}
      return {
        offset_minutes: existing?.offset_minutes ?? undefined,
        type: 'prayer',
        title: fs.segmentTitle || prayerData.title || 'Prayer',
        title_translation: prayerData.title_translation,
        same_verse_for_all: prayerData.same_verse_for_all,
        shared_bible_ref: prayerData.shared_bible_ref,
        prayer_points: prayerData.prayer_points,
        soluflow_song_id: flowItemId || undefined,
        prayer_leader: existing?.prayer_leader || '', prayer_leader_id: existing?.prayer_leader_id || '', prayer_leader_is_user: existing?.prayer_leader_is_user || false,
        person: existing?.person || '', person_id: existing?.person_id || '', person_is_user: existing?.person_is_user || false,
        speaker: existing?.speaker || '', speaker_id: existing?.speaker_id || '', speaker_is_user: existing?.speaker_is_user || false,
        topic: existing?.topic || '', points: existing?.points || '',
        facilitator: existing?.facilitator || '', facilitator_id: existing?.facilitator_id || '', facilitator_is_user: existing?.facilitator_is_user || false,
        has_ministry_team: existing?.has_ministry_team || false,
      }
    }

    return {
      offset_minutes: existing?.offset_minutes ?? undefined,
      title: fs.song?.title || fs.segmentTitle || 'Untitled',
      type: 'song',
      person: existing?.person || '', person_id: existing?.person_id || '', person_is_user: existing?.person_is_user || false,
      key: fs.song?.musicalKey ? transposeKey(fs.song.musicalKey, fs.transposition || 0) : '',
      bpm: fs.song?.bpm?.toString() || '',
      soluflow_song_id: flowItemId || undefined,
      speaker: existing?.speaker || '', speaker_id: existing?.speaker_id || '', speaker_is_user: existing?.speaker_is_user || false,
      topic: existing?.topic || '', points: existing?.points || '',
      prayer_leader: existing?.prayer_leader || '', prayer_leader_id: existing?.prayer_leader_id || '', prayer_leader_is_user: existing?.prayer_leader_is_user || false,
      facilitator: existing?.facilitator || '', facilitator_id: existing?.facilitator_id || '', facilitator_is_user: existing?.facilitator_is_user || false,
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
 * Checks if the SoluFlow songs have changed compared to the saved schedule.
 * Returns true if the songs differ (different count, different IDs, or different keys).
 */
export function hasSetlistChanged(
  savedSchedule: any[] | undefined,
  flowSongs: FlowServiceSong[]
): boolean {
  if (!savedSchedule) return flowSongs.length > 0

  const savedFlowItems = savedSchedule.filter((item: any) => item.soluflow_song_id)

  if (savedFlowItems.length !== flowSongs.length) return true

  for (let i = 0; i < flowSongs.length; i++) {
    const fs = flowSongs[i]
    const saved = savedFlowItems[i]
    if (!saved) return true
    if (saved.soluflow_song_id !== fs.id) return true
    // Check type changes (e.g. song became prayer or vice versa)
    const expectedType = fs.segmentType === 'prayer' ? 'prayer' : 'song'
    if (saved.type !== expectedType) return true
    // Check title changes
    const expectedTitle = fs.segmentType === 'prayer'
      ? (fs.segmentTitle || 'Prayer')
      : (fs.song?.title || fs.segmentTitle || 'Untitled')
    if (saved.title !== expectedTitle) return true
    // Check key changes for songs
    if (expectedType === 'song') {
      const liveKey = fs.song?.musicalKey ? transposeKey(fs.song.musicalKey, fs.transposition || 0) : ''
      if (saved.key !== liveKey) return true
    }
  }

  return false
}
