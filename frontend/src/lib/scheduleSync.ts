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

  // Record non-song items with their relative position (how many songs appeared before them)
  const nonSongPositions: { item: any; afterSongIndex: number }[] = []
  let songCount = 0
  for (const item of currentSchedule.slice(1, -1)) {
    if (item.type === 'song') {
      songCount++
    } else {
      nonSongPositions.push({ item, afterSongIndex: songCount })
    }
  }

  // Build a map of existing songs by soluflow_song_id to preserve manual edits
  const existingSongMap = new Map<string, any>()
  for (const item of currentSchedule) {
    if (item.type === 'song' && item.soluflow_song_id) {
      existingSongMap.set(item.soluflow_song_id, item)
    }
  }

  const songItems = flowSongs.map((fs) => {
    const songId = fs.song?.id
    const existing = songId ? existingSongMap.get(songId) : null

    return {
      offset_minutes: existing?.offset_minutes ?? undefined,
      title: fs.song?.title || fs.segmentTitle || 'Untitled',
      type: 'song',
      person: existing?.person || '', person_id: existing?.person_id || '', person_is_user: existing?.person_is_user || false,
      key: fs.song?.musicalKey ? transposeKey(fs.song.musicalKey, fs.transposition || 0) : '',
      bpm: fs.song?.bpm?.toString() || '',
      soluflow_song_id: songId || undefined,
      speaker: existing?.speaker || '', speaker_id: existing?.speaker_id || '', speaker_is_user: existing?.speaker_is_user || false,
      topic: existing?.topic || '', points: existing?.points || '',
      prayer_leader: existing?.prayer_leader || '', prayer_leader_id: existing?.prayer_leader_id || '', prayer_leader_is_user: existing?.prayer_leader_is_user || false,
      facilitator: existing?.facilitator || '', facilitator_id: existing?.facilitator_id || '', facilitator_is_user: existing?.facilitator_is_user || false,
      has_ministry_team: existing?.has_ministry_team || false,
    }
  })

  // Re-insert non-song items at their original relative positions
  const middleItems = [...songItems]
  let insertionOffset = 0
  for (const { item, afterSongIndex } of nonSongPositions) {
    const pos = Math.min(afterSongIndex, middleItems.length) + insertionOffset
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

  const savedSongs = savedSchedule.filter((item: any) => item.type === 'song')

  if (savedSongs.length !== flowSongs.length) return true

  for (let i = 0; i < flowSongs.length; i++) {
    const fs = flowSongs[i]
    const saved = savedSongs[i]
    if (!saved) return true
    if (saved.soluflow_song_id !== fs.song?.id) return true
    const liveKey = fs.song?.musicalKey ? transposeKey(fs.song.musicalKey, fs.transposition || 0) : ''
    if (saved.key !== liveKey) return true
    if (saved.title !== (fs.song?.title || fs.segmentTitle || 'Untitled')) return true
  }

  return false
}
