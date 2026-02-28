import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, X, GripVertical, Loader2, Save, Link2, Unlink, Music, RefreshCw, Plus, ExternalLink, Monitor, Copy, Check } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useEvent, useUpdateEvent, useFlowService, useFlowServiceByCode, useSetlist } from '@/hooks/useEvents'
import api from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'
import ContactAutocomplete from '@/components/ContactAutocomplete'
import PersonHoverCard from '@/components/PersonHoverCard'
import SongAutocomplete from '@/components/SongAutocomplete'
import BibleRefPicker from '@/components/BibleRefPicker'
import type { FlowServiceSong } from '@/types'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface PreEventItem {
  item: string
  offset_minutes: number
  notes: string
}

interface PrayerPoint {
  subtitle: string
  subtitle_translation: string
  description: string
  description_translation: string
  bible_ref: string
}

interface ProgramItem {
  offset_minutes: number
  title: string
  type: string
  person: string
  person_id: string
  person_is_user: boolean
  key: string
  bpm: string
  soluflow_song_id?: string
  speaker: string
  speaker_id: string
  speaker_is_user: boolean
  topic: string
  points: string
  prayer_leader: string
  prayer_leader_id: string
  prayer_leader_is_user: boolean
  facilitator: string
  facilitator_id: string
  facilitator_is_user: boolean
  has_ministry_team: boolean
  // Prayer presentation fields (SoluCast-compatible)
  title_translation?: string
  same_verse_for_all?: boolean
  shared_bible_ref?: string
  prayer_points?: PrayerPoint[]
}

interface PostEventItem {
  item: string
  offset_minutes: number
  notes: string
}

const defaultPreEventSchedule: PreEventItem[] = [
  { item: 'Arrival', offset_minutes: -135, notes: '' },
  { item: 'Soundcheck', offset_minutes: -120, notes: '' },
  { item: 'Break', offset_minutes: -60, notes: '' },
  { item: 'Pre-Service Prayer Time', offset_minutes: -20, notes: '' },
]

const defaultProgramSchedule: ProgramItem[] = [
  { offset_minutes: 0, title: 'Opening', type: 'other', person: '', person_id: '', person_is_user: false, key: '', bpm: '', speaker: '', speaker_id: '', speaker_is_user: false, topic: '', points: '', prayer_leader: '', prayer_leader_id: '', prayer_leader_is_user: false, facilitator: '', facilitator_id: '', facilitator_is_user: false, has_ministry_team: false },
  { offset_minutes: 5, title: 'Song 1', type: 'song', person: '', person_id: '', person_is_user: false, key: '', bpm: '', speaker: '', speaker_id: '', speaker_is_user: false, topic: '', points: '', prayer_leader: '', prayer_leader_id: '', prayer_leader_is_user: false, facilitator: '', facilitator_id: '', facilitator_is_user: false, has_ministry_team: false },
  { offset_minutes: 11, title: 'Song 2', type: 'song', person: '', person_id: '', person_is_user: false, key: '', bpm: '', speaker: '', speaker_id: '', speaker_is_user: false, topic: '', points: '', prayer_leader: '', prayer_leader_id: '', prayer_leader_is_user: false, facilitator: '', facilitator_id: '', facilitator_is_user: false, has_ministry_team: false },
  { offset_minutes: 17, title: 'Song 3', type: 'song', person: '', person_id: '', person_is_user: false, key: '', bpm: '', speaker: '', speaker_id: '', speaker_is_user: false, topic: '', points: '', prayer_leader: '', prayer_leader_id: '', prayer_leader_is_user: false, facilitator: '', facilitator_id: '', facilitator_is_user: false, has_ministry_team: false },
  { offset_minutes: undefined as any, title: 'Prayer Time', type: 'prayer', person: '', person_id: '', person_is_user: false, key: '', bpm: '', speaker: '', speaker_id: '', speaker_is_user: false, topic: '', points: '', prayer_leader: '', prayer_leader_id: '', prayer_leader_is_user: false, facilitator: '', facilitator_id: '', facilitator_is_user: false, has_ministry_team: false },
  { offset_minutes: 90, title: 'Closing', type: 'other', person: '', person_id: '', person_is_user: false, key: '', bpm: '', speaker: '', speaker_id: '', speaker_is_user: false, topic: '', points: '', prayer_leader: '', prayer_leader_id: '', prayer_leader_is_user: false, facilitator: '', facilitator_id: '', facilitator_is_user: false, has_ministry_team: false },
]

const defaultPostEventSchedule: PostEventItem[] = [
  { item: 'Tear Down', offset_minutes: 105, notes: '' },
  { item: 'Drive Home', offset_minutes: 130, notes: '' },
]

const SortableRow = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <tr ref={setNodeRef} style={style} className="border-b border-gray-100">
      <td className="py-2 px-3 w-8">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
      </td>
      {children}
    </tr>
  )
}

interface LinkState {
  serviceId: string | null
  serviceTitle: string | null
  songCount: number
  input: string
  loading: boolean
  error: string
}

export default function EditSchedulePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: event, isLoading } = useEvent(id!)
  const updateEvent = useUpdateEvent()
  const accessToken = useAuthStore((s) => s.accessToken)

  const [preEventSchedule, setPreEventSchedule] = useState<PreEventItem[]>([])
  const [programSchedule, setProgramSchedule] = useState<ProgramItem[]>([])
  const [hasPostEvent, setHasPostEvent] = useState(false)
  const [postEventSchedule, setPostEventSchedule] = useState<PostEventItem[]>([])
  const [eventTime, setEventTime] = useState('19:00')
  const [error, setError] = useState('')

  const [showSoluFlow, setShowSoluFlow] = useState(false)
  const [soluFlowMode, setSoluFlowMode] = useState<'choose' | 'link'>('choose')
  const [link, setLink] = useState<LinkState>({
    serviceId: null, serviceTitle: null, songCount: 0,
    input: '', loading: false, error: '',
  })

  const [editingPreEventItem, setEditingPreEventItem] = useState<number | null>(null)
  const [editingProgramItem, setEditingProgramItem] = useState<number | null>(null)
  const [editingPostEventItem, setEditingPostEventItem] = useState<number | null>(null)

  // SoluCast state
  const [generatingSolucast, setGeneratingSolucast] = useState(false)
  const [solucastError, setSolucastError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [codeCopied, setCodeCopied] = useState(false)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { data: linkedSetlist } = useSetlist(event?.setlist_id)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Extract code from SoluFlow URL or raw code
  const extractCode = (input: string): string | null => {
    const trimmed = input.trim()
    // Match URLs like soluflow.app/guest/ABCD or soluflow.app/service/code/ABCD
    const urlMatch = trimmed.match(/(?:code\/|guest\/)([A-Za-z0-9]+)/)
    if (urlMatch) return urlMatch[1]
    // If it looks like a raw code (4-8 alphanumeric chars), use directly
    if (/^[A-Za-z0-9]{4,10}$/.test(trimmed)) return trimmed
    return null
  }

  // Fetch linked service data via React Query (cached, deduped)
  const { data: linkedService, refetch: refetchService } = useFlowService(link.serviceId)
  const fetchByCode = useFlowServiceByCode()

  // Memoize SortableContext ID arrays to prevent drag context re-initialization
  const preEventIds = useMemo(() => preEventSchedule.map((_, i) => `pre-${i}`), [preEventSchedule])
  const programIds = useMemo(() => programSchedule.map((_, i) => `program-${i}`), [programSchedule])
  const postEventIds = useMemo(() => postEventSchedule.map((_, i) => `post-${i}`), [postEventSchedule])

  // Build program items from SoluFlow songs, merging between Opening and Closing
  const transposeKey = useCallback((key: string, semitones: number): string => {
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
  }, [])

  const buildMergedSchedule = useCallback((
    currentSchedule: ProgramItem[],
    flowSongs: FlowServiceSong[]
  ): ProgramItem[] => {
    if (currentSchedule.length < 2) return currentSchedule

    const opening = currentSchedule[0]
    const closing = currentSchedule[currentSchedule.length - 1]

    // Record non-song items with their relative position (how many songs appeared before them)
    const nonSongPositions: { item: ProgramItem; afterSongIndex: number }[] = []
    let songCount = 0
    for (const item of currentSchedule.slice(1, -1)) {
      if (item.type === 'song') {
        songCount++
      } else {
        nonSongPositions.push({ item, afterSongIndex: songCount })
      }
    }

    // Build a map of existing songs by soluflow_song_id to preserve manual edits
    const existingSongMap = new Map<string, ProgramItem>()
    for (const item of currentSchedule) {
      if (item.type === 'song' && item.soluflow_song_id) {
        existingSongMap.set(item.soluflow_song_id, item)
      }
    }

    const songItems: ProgramItem[] = flowSongs.map((fs) => {
      const songId = fs.song?.id
      const existing = songId ? existingSongMap.get(songId) : null

      return {
        offset_minutes: existing?.offset_minutes ?? (undefined as any),
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
  }, [transposeKey])

  // Handle linking a SoluFlow service
  const handleLink = async () => {
    const code = extractCode(link.input)
    if (!code) {
      setLink(prev => ({ ...prev, error: 'Invalid SoluFlow link or code' }))
      return
    }

    setLink(prev => ({ ...prev, loading: true, error: '' }))
    try {
      const service = await fetchByCode.mutateAsync(code)

      setLink(prev => ({
        ...prev,
        serviceId: service.id,
        serviceTitle: service.title,
        songCount: service.songs?.length || 0,
        input: '',
        loading: false,
      }))
      setSoluFlowMode('choose')

      // Rebuild program schedule with SoluFlow songs
      const merged = buildMergedSchedule(programSchedule, service.songs || [])
      setProgramSchedule(merged)
    } catch (err: any) {
      setLink(prev => ({
        ...prev,
        loading: false,
        error: err.response?.status === 404
          ? 'Service not found. Check the code and try again.'
          : err.response?.data?.message || 'Failed to fetch service',
      }))
    }
  }

  // Handle unlinking — songs remain in schedule but no longer live-synced
  const handleUnlink = () => {
    setLink(prev => ({ ...prev, serviceId: null, serviceTitle: null, songCount: 0 }))
    setSoluFlowMode('choose')
  }

  // Refresh songs from SoluFlow (when already linked)
  const handleRefresh = async () => {
    if (!link.serviceId) return
    setLink(prev => ({ ...prev, loading: true, error: '' }))
    try {
      const { data: service } = await refetchService()
      if (service?.songs) {
        setLink(prev => ({ ...prev, songCount: service.songs.length, loading: false }))
        setProgramSchedule(buildMergedSchedule(programSchedule, service.songs))
      } else {
        setLink(prev => ({ ...prev, loading: false }))
      }
    } catch {
      setLink(prev => ({ ...prev, loading: false, error: 'Failed to refresh songs' }))
    }
  }

  // Open SoluFlow in a new tab with event data pre-filled
  const handleCreateInSoluFlow = () => {
    if (!event) return
    const dateStart = new Date(event.date_start)
    const params = new URLSearchParams({
      title: event.title || '',
      date: dateStart.toISOString().split('T')[0],
      time: dateStart.toTimeString().slice(0, 5),
      location: event.location_name || '',
      return_url: window.location.href,
      token: accessToken || '',
    })
    window.open(`https://soluflow.app/create-for-soluplan?${params}`, '_self')
  }

  // Parse raw program schedule items into full ProgramItem shape
  const parseProgramItems = (items: any[]): ProgramItem[] =>
    items.map((item: any) => ({
      ...item,
      type: item.type || 'other',
      key: item.key || '', bpm: item.bpm || '',
      soluflow_song_id: item.soluflow_song_id || undefined,
      person: item.person || '', person_id: item.person_id || '', person_is_user: item.person_is_user || false,
      speaker: item.speaker || '', speaker_id: item.speaker_id || '', speaker_is_user: item.speaker_is_user || false,
      topic: item.topic || '', points: item.points || '',
      prayer_leader: item.prayer_leader || '', prayer_leader_id: item.prayer_leader_id || '', prayer_leader_is_user: item.prayer_leader_is_user || false,
      facilitator: item.facilitator || '', facilitator_id: item.facilitator_id || '', facilitator_is_user: item.facilitator_is_user || false,
      has_ministry_team: item.has_ministry_team || false,
      title_translation: item.title_translation || '',
      same_verse_for_all: item.same_verse_for_all || false,
      shared_bible_ref: item.shared_bible_ref || '',
      prayer_points: item.prayer_points || [],
    }))

  // Load event data into local state
  useEffect(() => {
    if (!event) return

    const eventDate = new Date(event.date_start)
    setEventTime(`${String(eventDate.getHours()).padStart(2, '0')}:${String(eventDate.getMinutes()).padStart(2, '0')}`)

    if (event.program_agenda) {
      setPreEventSchedule(
        event.program_agenda.pre_event_schedule?.map((item: any) => ({
          ...item, notes: item.notes || '',
        })) || defaultPreEventSchedule
      )

      const parsed = (event.program_agenda.program_schedule?.length ?? 0) > 0
        ? parseProgramItems(event.program_agenda.program_schedule!)
        : defaultProgramSchedule
      setProgramSchedule(parsed)

      setHasPostEvent(event.program_agenda.has_post_event_schedule || false)
      setPostEventSchedule(
        (event.program_agenda.post_event_schedule?.length ?? 0) > 0
          ? event.program_agenda.post_event_schedule!.map((item: any) => ({
              ...item, notes: item.notes || '',
            }))
          : defaultPostEventSchedule
      )

      // Initialize linked state from event
      if (event.flow_service_id) {
        setShowSoluFlow(true)
        setLink(prev => ({ ...prev, serviceId: event.flow_service_id! }))
      }
    } else {
      setPreEventSchedule(defaultPreEventSchedule)
      setProgramSchedule(defaultProgramSchedule)
      setHasPostEvent(false)
      setPostEventSchedule(defaultPostEventSchedule)
    }
  }, [event])

  // When linked service data arrives from React Query, merge songs into schedule
  useEffect(() => {
    if (!linkedService) return

    setLink(prev => ({
      ...prev,
      serviceTitle: linkedService.title,
      songCount: linkedService.songs?.length || 0,
    }))

    if (linkedService.songs?.length > 0) {
      setProgramSchedule(prev => buildMergedSchedule(prev, linkedService.songs))
    }
  }, [linkedService]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-link from ?code= URL param (returned from SoluFlow deep link)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const codeParam = urlParams.get('code')
    if (codeParam && !link.serviceId) {
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
      // Enable SoluFlow section and trigger link
      setShowSoluFlow(true)
      setLink(prev => ({ ...prev, loading: true, error: '' }))
      fetchByCode.mutateAsync(codeParam)
        .then((service: any) => {
          setLink(prev => ({
            ...prev,
            serviceId: service.id,
            serviceTitle: service.title,
            songCount: service.songs?.length || 0,
            loading: false,
          }))
          setSoluFlowMode('choose')
          if (service.songs?.length > 0) {
            setProgramSchedule(prev => buildMergedSchedule(prev, service.songs))
          }
        })
        .catch((err: any) => {
          setLink(prev => ({
            ...prev,
            loading: false,
            error: err.response?.status === 404
              ? 'Service not found. Check the code and try again.'
              : err.response?.data?.message || 'Failed to link service',
          }))
        })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const calculateTime = useCallback((offsetMinutes: number) => {
    if (!eventTime) return ''
    const [hours, minutes] = eventTime.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes + offsetMinutes
    const newHours = Math.floor(totalMinutes / 60) % 24
    const newMinutes = totalMinutes % 60
    return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`
  }, [eventTime])

  // Extract details for a program item as JSX with hover cards
  const getItemDetails = useCallback((item: ProgramItem): React.ReactNode[] => {
    const parts: React.ReactNode[] = []
    if (item.type === 'song') {
      if (item.person) parts.push(<PersonHoverCard key="person" name={item.person} contactId={item.person_id} isUser={item.person_is_user} />)
      if (item.key) parts.push(<span key="key">Key: {item.key}</span>)
      if (item.bpm) parts.push(<span key="bpm">BPM: {item.bpm}</span>)
    } else if (item.type === 'share') {
      if (item.speaker) parts.push(<span key="speaker">Speaker: <PersonHoverCard name={item.speaker} contactId={item.speaker_id} isUser={item.speaker_is_user} /></span>)
      if (item.topic) parts.push(<span key="topic">Topic: {item.topic}</span>)
    } else if (item.type === 'prayer') {
      if (item.prayer_leader) parts.push(<span key="leader">Leader: <PersonHoverCard name={item.prayer_leader} contactId={item.prayer_leader_id} isUser={item.prayer_leader_is_user} /></span>)
      if (item.topic) parts.push(<span key="topic">Topic: {item.topic}</span>)
    } else if (item.type === 'ministry') {
      if (item.facilitator) parts.push(<span key="facilitator">Facilitator: <PersonHoverCard name={item.facilitator} contactId={item.facilitator_id} isUser={item.facilitator_is_user} /></span>)
      if (item.has_ministry_team) parts.push(<span key="ministry">Ministry Team</span>)
    }
    return parts
  }, [])

  const getNextPreEventTime = () => {
    if (preEventSchedule.length === 0) return -120
    return preEventSchedule[preEventSchedule.length - 1].offset_minutes - 30
  }

  const getNextProgramTime = () => {
    if (programSchedule.length === 0) return 0
    return programSchedule[programSchedule.length - 1].offset_minutes + 10
  }

  const getNextPostEventTime = () => {
    if (postEventSchedule.length === 0) return 105
    return postEventSchedule[postEventSchedule.length - 1].offset_minutes + 30
  }

  const handlePreEventDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (over && active.id !== over.id) {
      const oldIndex = preEventSchedule.findIndex((_, i) => `pre-${i}` === active.id)
      const newIndex = preEventSchedule.findIndex((_, i) => `pre-${i}` === over.id)
      const newSchedule = arrayMove(preEventSchedule, oldIndex, newIndex)
      newSchedule[newIndex] = { ...newSchedule[newIndex], offset_minutes: null as any }
      setPreEventSchedule(newSchedule)
    }
  }

  const handleProgramDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (over && active.id !== over.id) {
      const oldIndex = programSchedule.findIndex((_, i) => `program-${i}` === active.id)
      const newIndex = programSchedule.findIndex((_, i) => `program-${i}` === over.id)
      const newSchedule = arrayMove(programSchedule, oldIndex, newIndex)
      newSchedule[newIndex] = { ...newSchedule[newIndex], offset_minutes: null as any }
      setProgramSchedule(newSchedule)
    }
  }

  const handlePostEventDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (over && active.id !== over.id) {
      const oldIndex = postEventSchedule.findIndex((_, i) => `post-${i}` === active.id)
      const newIndex = postEventSchedule.findIndex((_, i) => `post-${i}` === over.id)
      const newSchedule = arrayMove(postEventSchedule, oldIndex, newIndex)
      newSchedule[newIndex] = { ...newSchedule[newIndex], offset_minutes: null as any }
      setPostEventSchedule(newSchedule)
    }
  }

  // SoluCast handlers
  const handleGenerateSolucast = async () => {
    if (!event || generatingSolucast) return
    setGeneratingSolucast(true)
    setSolucastError(null)
    try {
      await api.post(`/integration/events/${event.id}/generate-solucast`)
      queryClient.invalidateQueries({ queryKey: ['events', 'detail', id] })
      queryClient.invalidateQueries({ queryKey: ['setlists'] })
    } catch (error: any) {
      setSolucastError(error.response?.data?.message || 'Failed to generate SoluCast setlist.')
    } finally {
      setGeneratingSolucast(false)
    }
  }

  const handleSyncSolucast = async () => {
    if (!event || syncing) return
    setSyncing(true)
    setSyncMessage(null)
    setSolucastError(null)
    try {
      await api.post(`/integration/events/${event.id}/generate-solucast`)
      queryClient.invalidateQueries({ queryKey: ['events', 'detail', id] })
      queryClient.invalidateQueries({ queryKey: ['setlists'] })
      setSyncMessage('Synced successfully')
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
      syncTimerRef.current = setTimeout(() => setSyncMessage(null), 3000)
    } catch (error: any) {
      setSolucastError(error.response?.data?.message || 'Failed to sync SoluCast setlist.')
    } finally {
      setSyncing(false)
    }
  }

  const handleUnlinkSolucast = async () => {
    if (!event) return
    try {
      await api.post(`/integration/events/${event.id}/link-service`, { setlist_id: null })
      queryClient.invalidateQueries({ queryKey: ['events', 'detail', id] })
      setSyncMessage(null)
    } catch (error: any) {
      setSolucastError(error.response?.data?.message || 'Failed to unlink SoluCast.')
    }
  }

  const copyShareCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCodeCopied(true)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCodeCopied(false), 2000)
    } catch {
      // Clipboard API unavailable
    }
  }

  // Cleanup SoluCast timers on unmount
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    }
  }, [])

  const handleSave = async () => {
    setError('')
    try {
      await updateEvent.mutateAsync({
        id: id!,
        data: {
          program_agenda: {
            pre_event_schedule: preEventSchedule,
            program_schedule: programSchedule,
            has_post_event_schedule: hasPostEvent,
            post_event_schedule: postEventSchedule,
          },
          flow_service_id: link.serviceId || null,
        } as any,
      })

      // Auto-sync SoluCast setlist if SoluFlow is linked (fire-and-forget)
      if (link.serviceId) {
        api.post(`/integration/events/${id}/generate-solucast`).catch(() => {})
      }

      navigate(`/events/${id}`)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save schedule')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="card text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Event not found</h3>
        <Link to="/events" className="text-primary-600 hover:text-primary-700">← Back to Events</Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/events/${id}`} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Event Schedule</h1>
            <p className="text-sm text-gray-500">{event.title}</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={updateEvent.isPending}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4 mr-2 inline" />
          {updateEvent.isPending ? 'Saving...' : 'Save Schedule'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Pre-Event Schedule */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pre-Event Schedule</h3>
        <div className="overflow-x-auto">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePreEventDragEnd}>
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="w-8"></th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700 w-24">Time</th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Item</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <SortableContext items={preEventIds} strategy={verticalListSortingStrategy}>
                <tbody>
                  {preEventSchedule.map((item, index) => (
                    <SortableRow key={`pre-${index}`} id={`pre-${index}`}>
                      <td className="py-2 px-3 w-24">
                        <input
                          type="time"
                          value={item.offset_minutes != null ? calculateTime(item.offset_minutes) : ''}
                          onChange={(e) => {
                            if (!e.target.value) return
                            const [h, m] = e.target.value.split(':').map(Number)
                            const [eh, em] = eventTime.split(':').map(Number)
                            const offset = (h * 60 + m) - (eh * 60 + em)
                            const updated = [...preEventSchedule]
                            updated[index].offset_minutes = offset
                            setPreEventSchedule(updated)
                          }}
                          className="input text-sm w-full min-w-0"
                          placeholder="--:--"
                        />
                      </td>
                      <td className="py-2 px-3">
                        {editingPreEventItem === index ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={item.item}
                              onChange={(e) => {
                                const updated = [...preEventSchedule]
                                updated[index].item = e.target.value
                                setPreEventSchedule(updated)
                              }}
                              className="input text-sm"
                              placeholder="e.g. Arrival, Soundcheck"
                              autoFocus
                            />
                            <input
                              type="text"
                              value={item.notes}
                              onChange={(e) => {
                                const updated = [...preEventSchedule]
                                updated[index].notes = e.target.value
                                setPreEventSchedule(updated)
                              }}
                              className="input text-sm"
                              placeholder="Notes (optional)"
                            />
                            <button type="button" onClick={() => setEditingPreEventItem(null)} className="text-xs text-teal-600 hover:text-teal-800 font-semibold">Done</button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingPreEventItem(index)}
                            className="text-left w-full py-2 px-3 text-sm text-gray-900 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                          >
                            <div className="font-semibold">{item.item || 'Click to edit'}</div>
                            {item.notes && <div className="text-xs text-gray-600 mt-1">{item.notes}</div>}
                          </button>
                        )}
                      </td>
                      <td className="py-2 px-3 align-top">
                        <button
                          type="button"
                          onClick={() => {
                            setPreEventSchedule(preEventSchedule.filter((_, i) => i !== index))
                            if (editingPreEventItem === index) setEditingPreEventItem(null)
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Remove"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </SortableRow>
                  ))}
                </tbody>
              </SortableContext>
            </table>
          </DndContext>
          <button
            type="button"
            onClick={() => setPreEventSchedule([...preEventSchedule, { item: '', offset_minutes: getNextPreEventTime(), notes: '' }])}
            className="btn-secondary mt-3"
          >
            + Add Pre-Event Item
          </button>
        </div>
      </div>

      {/* SoluFlow Setlist Toggle */}
      <div className="card">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showSoluFlow}
            onChange={(e) => setShowSoluFlow(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          <Music className="w-5 h-5 text-blue-500" />
          <span className="text-lg font-semibold text-gray-900">SoluFlow Setlist</span>
          {link.serviceId && !showSoluFlow && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
              <Link2 className="w-3 h-3" />
              Linked
            </span>
          )}
        </label>

        {showSoluFlow && (
          <div className="mt-4">
            {link.serviceId ? (
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Link2 className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">
                      Linked to:{' '}
                      {linkedService?.code ? (
                        <a
                          href={`https://soluflow.app/service/code/${linkedService.code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {link.serviceTitle || 'SoluFlow Service'}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        link.serviceTitle || 'SoluFlow Service'
                      )}
                    </p>
                    <p className="text-xs text-blue-700">{link.songCount} song{link.songCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRefresh}
                    disabled={link.loading}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
                    title="Refresh songs from SoluFlow"
                  >
                    <RefreshCw className={`w-4 h-4 ${link.loading ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={handleUnlink}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    Unlink
                  </button>
                </div>
              </div>
            ) : soluFlowMode === 'choose' ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Link an existing SoluFlow setlist or create a new one for this event.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSoluFlowMode('link')}
                    className="flex-1 flex items-center justify-center gap-2 p-3 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm font-medium text-gray-700"
                  >
                    <Link2 className="w-4 h-4" />
                    Link Existing
                  </button>
                  <button
                    onClick={handleCreateInSoluFlow}
                    className="flex-1 flex items-center justify-center gap-2 p-3 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm font-medium text-gray-700"
                  >
                    <Plus className="w-4 h-4" />
                    Create New
                  </button>
                </div>
              </div>
            ) : soluFlowMode === 'link' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Paste a SoluFlow link or service code to import songs.
                  </p>
                  <button
                    onClick={() => setSoluFlowMode('choose')}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Back
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={link.input}
                    onChange={(e) => setLink(prev => ({ ...prev, input: e.target.value, error: '' }))}
                    placeholder="e.g. soluflow.app/guest/ABCD or ABCD"
                    className="input text-sm flex-1"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleLink() }}
                  />
                  <button
                    onClick={handleLink}
                    disabled={link.loading || !link.input.trim()}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {link.loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-1.5 inline" />Linking...</>
                    ) : (
                      <><Link2 className="w-4 h-4 mr-1.5 inline" />Link</>
                    )}
                  </button>
                </div>
              </div>
            ) : null}

            {link.error && (
              <p className="text-sm text-red-600 mt-2">{link.error}</p>
            )}
          </div>
        )}
      </div>

      {/* Program Schedule */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Program Schedule</h3>
        <div className="overflow-x-auto">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleProgramDragEnd}>
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="w-8"></th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700 w-24">Time</th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Item</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <SortableContext items={programIds} strategy={verticalListSortingStrategy}>
                <tbody>
                  {programSchedule.map((item, index) => {
                    return (
                      <SortableRow key={`program-${index}`} id={`program-${index}`}>
                        <td className="py-2 px-3 w-24">
                          <input
                            type="time"
                            value={item.offset_minutes != null ? calculateTime(item.offset_minutes) : ''}
                            onChange={(e) => {
                              if (!e.target.value) return
                              const [h, m] = e.target.value.split(':').map(Number)
                              const [eh, em] = eventTime.split(':').map(Number)
                              const offset = (h * 60 + m) - (eh * 60 + em)
                              const updated = [...programSchedule]
                              updated[index].offset_minutes = offset
                              setProgramSchedule(updated)
                            }}
                            className="input text-sm w-full min-w-0"
                            placeholder="--:--"
                          />
                        </td>
                        <td className="py-2 px-3">
                          {editingProgramItem === index ? (
                            <div className="space-y-3">
                              <div className="flex gap-2">
                                <select
                                  value={item.type}
                                  onChange={(e) => {
                                    const updated = [...programSchedule]
                                    updated[index].type = e.target.value
                                    setProgramSchedule(updated)
                                  }}
                                  className="input text-sm w-32"
                                >
                                  <option value="song">Song</option>
                                  <option value="share">Share</option>
                                  <option value="prayer">Prayer</option>
                                  <option value="ministry">Ministry Time</option>
                                  <option value="other">Other</option>
                                </select>
                                <div className="flex-1">
                                  {item.type === 'song' ? (
                                    <SongAutocomplete
                                      value={item.title}
                                      soluflowSongId={item.soluflow_song_id ? Number(item.soluflow_song_id) : undefined}
                                      onChange={(title, song) => {
                                        const updated = [...programSchedule]
                                        updated[index].title = title
                                        if (song) {
                                          updated[index].soluflow_song_id = String(song.id)
                                          updated[index].key = song.key || updated[index].key
                                          updated[index].bpm = song.bpm?.toString() || updated[index].bpm
                                        } else {
                                          updated[index].soluflow_song_id = undefined
                                        }
                                        setProgramSchedule(updated)
                                      }}
                                      placeholder="Search SoluFlow songs..."
                                      className="input text-sm"
                                    />
                                  ) : item.type === 'prayer' ? (
                                    <ContactAutocomplete
                                      value={item.prayer_leader}
                                      contactId={item.prayer_leader_id}
                                      isUser={item.prayer_leader_is_user}
                                      freeTextOnly
                                      onChange={(name, contactId, isUser) => {
                                        const updated = [...programSchedule]
                                        updated[index].prayer_leader = name
                                        updated[index].prayer_leader_id = contactId || ''
                                        updated[index].prayer_leader_is_user = isUser || false
                                        setProgramSchedule(updated)
                                      }}
                                      placeholder="Prayer leader"
                                      className="input text-sm"
                                    />
                                  ) : (
                                    <input
                                      type="text"
                                      value={item.title}
                                      onChange={(e) => {
                                        const updated = [...programSchedule]
                                        updated[index].title = e.target.value
                                        setProgramSchedule(updated)
                                      }}
                                      className="input text-sm"
                                      placeholder="e.g. Opening, Closing"
                                      autoFocus
                                    />
                                  )}
                                </div>
                              </div>

                              {/* Song fields */}
                              {item.type === 'song' && (
                                <div className="flex gap-2">
                                  <div className="flex-1">
                                    <ContactAutocomplete
                                      value={item.person || ''}
                                      contactId={item.person_id || undefined}
                                      isUser={item.person_is_user}
                                      freeTextOnly
                                      onChange={(name, contactId, isUser) => {
                                        const updated = [...programSchedule]
                                        updated[index].person = name
                                        updated[index].person_id = contactId || ''
                                        updated[index].person_is_user = isUser || false
                                        setProgramSchedule(updated)
                                      }}
                                      placeholder="Leader"
                                      className="input text-sm"
                                    />
                                  </div>
                                  <input
                                    type="text"
                                    value={item.key || ''}
                                    onChange={(e) => {
                                      const updated = [...programSchedule]
                                      updated[index].key = e.target.value
                                      setProgramSchedule(updated)
                                    }}
                                    className="input text-sm w-20"
                                    placeholder="Key"
                                  />
                                  <input
                                    type="text"
                                    value={item.bpm || ''}
                                    onChange={(e) => {
                                      const updated = [...programSchedule]
                                      updated[index].bpm = e.target.value
                                      setProgramSchedule(updated)
                                    }}
                                    className="input text-sm w-20"
                                    placeholder="BPM"
                                  />
                                </div>
                              )}

                              {/* Share fields */}
                              {item.type === 'share' && (
                                <div className="space-y-2">
                                  <div className="flex gap-2">
                                    <div className="flex-1">
                                      <ContactAutocomplete
                                        value={item.speaker}
                                        contactId={item.speaker_id}
                                        isUser={item.speaker_is_user}
                                        freeTextOnly
                                        onChange={(name, contactId, isUser) => {
                                          const updated = [...programSchedule]
                                          updated[index].speaker = name
                                          updated[index].speaker_id = contactId || ''
                                          updated[index].speaker_is_user = isUser || false
                                          setProgramSchedule(updated)
                                        }}
                                        placeholder="Speaker"
                                        className="input text-sm"
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <input
                                        type="text"
                                        value={item.topic}
                                        onChange={(e) => {
                                          const updated = [...programSchedule]
                                          updated[index].topic = e.target.value
                                          setProgramSchedule(updated)
                                        }}
                                        className="input text-sm"
                                        placeholder="Topic"
                                      />
                                    </div>
                                  </div>
                                  <textarea
                                    value={item.points}
                                    onChange={(e) => {
                                      const updated = [...programSchedule]
                                      updated[index].points = e.target.value
                                      setProgramSchedule(updated)
                                    }}
                                    className="input text-sm"
                                    placeholder="Key points or notes..."
                                    rows={2}
                                  />
                                </div>
                              )}

                              {/* Prayer fields */}
                              {item.type === 'prayer' && (
                                <div className="space-y-3">
                                  {/* Prayer title + translation side by side */}
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={item.title}
                                      onChange={(e) => {
                                        const updated = [...programSchedule]
                                        updated[index].title = e.target.value
                                        setProgramSchedule(updated)
                                      }}
                                      className="input text-sm flex-1"
                                      placeholder="Prayer title"
                                    />
                                    <input
                                      type="text"
                                      value={item.title_translation || ''}
                                      onChange={(e) => {
                                        const updated = [...programSchedule]
                                        updated[index].title_translation = e.target.value
                                        setProgramSchedule(updated)
                                      }}
                                      className="input text-sm flex-1"
                                      placeholder="Title translation"
                                    />
                                  </div>

                                  {/* Same verse for all toggle */}
                                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={item.same_verse_for_all || false}
                                      onChange={(e) => {
                                        const updated = [...programSchedule]
                                        updated[index].same_verse_for_all = e.target.checked
                                        if (!e.target.checked) updated[index].shared_bible_ref = ''
                                        setProgramSchedule(updated)
                                      }}
                                      className="w-4 h-4 rounded border-gray-300"
                                    />
                                    Use same verse for all points
                                  </label>

                                  {/* Shared bible ref (when same verse for all) */}
                                  {item.same_verse_for_all && (
                                    <BibleRefPicker
                                      value={item.shared_bible_ref}
                                      onChange={(formatted) => {
                                        const updated = [...programSchedule]
                                        updated[index].shared_bible_ref = formatted
                                        setProgramSchedule(updated)
                                      }}
                                    />
                                  )}

                                  {/* Prayer points */}
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-semibold text-gray-500 uppercase">Prayer Points</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = [...programSchedule]
                                          const pts = updated[index].prayer_points || []
                                          updated[index].prayer_points = [...pts, { subtitle: '', subtitle_translation: '', description: '', description_translation: '', bible_ref: '' }]
                                          setProgramSchedule(updated)
                                        }}
                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                      >
                                        + Add Point
                                      </button>
                                    </div>

                                    {(item.prayer_points || []).map((pt, ptIdx) => (
                                      <div key={ptIdx} className="border border-gray-200 rounded-lg p-2 space-y-1.5 bg-gray-50">
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs font-medium text-gray-400 w-5">{ptIdx + 1}</span>
                                          <input
                                            type="text"
                                            value={pt.subtitle}
                                            onChange={(e) => {
                                              const updated = [...programSchedule]
                                              updated[index].prayer_points![ptIdx].subtitle = e.target.value
                                              setProgramSchedule(updated)
                                            }}
                                            className="input text-sm flex-1"
                                            placeholder="Point title"
                                          />
                                          <input
                                            type="text"
                                            value={pt.subtitle_translation}
                                            onChange={(e) => {
                                              const updated = [...programSchedule]
                                              updated[index].prayer_points![ptIdx].subtitle_translation = e.target.value
                                              setProgramSchedule(updated)
                                            }}
                                            className="input text-sm flex-1"
                                            placeholder="Point title translation"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updated = [...programSchedule]
                                              updated[index].prayer_points = updated[index].prayer_points!.filter((_, i) => i !== ptIdx)
                                              setProgramSchedule(updated)
                                            }}
                                            className="text-red-400 hover:text-red-600 p-1"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </div>
                                        <div className="flex gap-2">
                                          <textarea
                                            value={pt.description}
                                            onChange={(e) => {
                                              const updated = [...programSchedule]
                                              updated[index].prayer_points![ptIdx].description = e.target.value
                                              setProgramSchedule(updated)
                                            }}
                                            className="input text-sm flex-1"
                                            placeholder="Description"
                                            rows={1}
                                          />
                                          <textarea
                                            value={pt.description_translation || ''}
                                            onChange={(e) => {
                                              const updated = [...programSchedule]
                                              updated[index].prayer_points![ptIdx].description_translation = e.target.value
                                              setProgramSchedule(updated)
                                            }}
                                            className="input text-sm flex-1"
                                            placeholder="Description translation"
                                            rows={1}
                                          />
                                        </div>
                                        {!item.same_verse_for_all && (
                                          <BibleRefPicker
                                            value={pt.bible_ref}
                                            onChange={(formatted) => {
                                              const updated = [...programSchedule]
                                              updated[index].prayer_points![ptIdx].bible_ref = formatted
                                              setProgramSchedule(updated)
                                            }}
                                          />
                                        )}
                                      </div>
                                    ))}

                                    {(!item.prayer_points || item.prayer_points.length === 0) && (
                                      <p className="text-xs text-gray-400 italic">No points added yet</p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Ministry Time fields */}
                              {item.type === 'ministry' && (
                                <div className="flex gap-2 items-center">
                                  <div className="flex-1">
                                    <ContactAutocomplete
                                      value={item.facilitator}
                                      contactId={item.facilitator_id}
                                      isUser={item.facilitator_is_user}
                                      freeTextOnly
                                      onChange={(name, contactId, isUser) => {
                                        const updated = [...programSchedule]
                                        updated[index].facilitator = name
                                        updated[index].facilitator_id = contactId || ''
                                        updated[index].facilitator_is_user = isUser || false
                                        setProgramSchedule(updated)
                                      }}
                                      placeholder="Facilitator"
                                      className="input text-sm"
                                    />
                                  </div>
                                  <label className="flex items-center cursor-pointer whitespace-nowrap">
                                    <input
                                      type="checkbox"
                                      checked={item.has_ministry_team}
                                      onChange={(e) => {
                                        const updated = [...programSchedule]
                                        updated[index].has_ministry_team = e.target.checked
                                        setProgramSchedule(updated)
                                      }}
                                      className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                                    />
                                    <span className="ml-1.5 text-xs font-medium text-gray-700">Ministry Team</span>
                                  </label>
                                </div>
                              )}

                              <button type="button" onClick={() => setEditingProgramItem(null)} className="text-xs text-teal-600 hover:text-teal-800 font-semibold">Done</button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditingProgramItem(index)}
                              className="text-left w-full py-2 px-3 text-sm text-gray-900 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                            >
                              <div className="font-semibold">{item.title || 'Click to edit'}</div>
                              {getItemDetails(item).length > 0 && (
                                <div className="text-xs text-gray-600 mt-1 flex flex-wrap items-center gap-x-1">
                                  {getItemDetails(item).map((el, i) => (
                                    <span key={i} className="inline-flex items-center">
                                      {i > 0 && <span className="mx-1">•</span>}
                                      {el}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </button>
                          )}
                        </td>
                        <td className="py-2 px-3 align-top">
                          <button
                            type="button"
                            onClick={() => {
                              setProgramSchedule(programSchedule.filter((_, i) => i !== index))
                              if (editingProgramItem === index) setEditingProgramItem(null)
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Remove"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </SortableRow>
                    )
                  })}
                </tbody>
              </SortableContext>
            </table>
          </DndContext>
          <button
            type="button"
            onClick={() => setProgramSchedule([...programSchedule, { offset_minutes: getNextProgramTime(), title: '', type: 'other', person: '', person_id: '', person_is_user: false, key: '', bpm: '', soluflow_song_id: undefined, speaker: '', speaker_id: '', speaker_is_user: false, topic: '', points: '', prayer_leader: '', prayer_leader_id: '', prayer_leader_is_user: false, facilitator: '', facilitator_id: '', facilitator_is_user: false, has_ministry_team: false }])}
            className="btn-secondary mt-3"
          >
            + Add Program Item
          </button>
        </div>
      </div>

      {/* SoluCast Presentation */}
      {programSchedule.some(item => item.type === 'song') && (
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor className="w-5 h-5 text-teal-500" />
              <h3 className="text-lg font-semibold text-gray-900">SoluCast Presentation</h3>
            </div>
            {!event?.setlist_id && (
              <button
                onClick={handleGenerateSolucast}
                disabled={generatingSolucast}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition-colors disabled:opacity-50"
              >
                {generatingSolucast ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Monitor className="w-3.5 h-3.5" />
                )}
                Generate SoluCast
              </button>
            )}
          </div>

          {event?.setlist_id && linkedSetlist && (
            <div className="mt-3 p-3 bg-teal-50 border border-teal-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-teal-700" />
                  <span className="text-sm font-semibold text-teal-900">SoluCast Linked</span>
                  <span className="text-xs text-teal-700">({linkedSetlist.itemCount} items)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleSyncSolucast}
                    disabled={syncing}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-teal-100 text-teal-700 hover:bg-teal-200 transition-colors disabled:opacity-50"
                    title="Sync setlist with current schedule"
                  >
                    {syncing ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    Sync
                  </button>
                  <button
                    onClick={handleUnlinkSolucast}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors"
                    title="Unlink SoluCast setlist"
                  >
                    <Unlink className="w-3 h-3" />
                    Unlink
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-600">Share code:</span>
                <code className="px-2 py-0.5 bg-white rounded border border-teal-200 text-sm font-mono font-bold text-teal-800 tracking-wider">
                  {linkedSetlist.shareCode}
                </code>
                <button
                  onClick={() => copyShareCode(linkedSetlist.shareCode)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-teal-700 hover:text-teal-800 hover:bg-teal-100 rounded transition-colors"
                >
                  {codeCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {codeCopied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <a
                href={`https://solucast.app/open/${linkedSetlist.shareCode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-teal-700 hover:text-teal-800 hover:underline"
              >
                Open in SoluCast
                <ExternalLink className="w-3 h-3" />
              </a>
              {syncMessage && (
                <div className="mt-2 text-xs text-green-700 font-medium">{syncMessage}</div>
              )}
            </div>
          )}

          {!event?.setlist_id && !generatingSolucast && (
            <p className="mt-2 text-sm text-gray-500">Generate a SoluCast setlist to broadcast songs during the event.</p>
          )}

          {solucastError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{solucastError}</p>
            </div>
          )}
        </div>
      )}

      {/* Post-Event Schedule */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Post-Event Schedule</h3>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={hasPostEvent}
              onChange={(e) => setHasPostEvent(e.target.checked)}
              className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
            />
            <span className="ml-2 text-sm font-semibold text-gray-700">Include Post-Event Schedule</span>
          </label>
        </div>

        {hasPostEvent && (
          <div className="overflow-x-auto">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePostEventDragEnd}>
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="w-8"></th>
                    <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700 w-24">Time</th>
                    <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Item</th>
                    <th className="w-20"></th>
                  </tr>
                </thead>
                <SortableContext items={postEventIds} strategy={verticalListSortingStrategy}>
                  <tbody>
                    {postEventSchedule.map((item, index) => (
                      <SortableRow key={`post-${index}`} id={`post-${index}`}>
                        <td className="py-2 px-3 w-24">
                          <input
                            type="time"
                            value={item.offset_minutes != null ? calculateTime(item.offset_minutes) : ''}
                            onChange={(e) => {
                              if (!e.target.value) return
                              const [h, m] = e.target.value.split(':').map(Number)
                              const [eh, em] = eventTime.split(':').map(Number)
                              const offset = (h * 60 + m) - (eh * 60 + em)
                              const updated = [...postEventSchedule]
                              updated[index].offset_minutes = offset
                              setPostEventSchedule(updated)
                            }}
                            className="input text-sm w-full min-w-0"
                            placeholder="--:--"
                          />
                        </td>
                        <td className="py-2 px-3">
                          {editingPostEventItem === index ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={item.item}
                                onChange={(e) => {
                                  const updated = [...postEventSchedule]
                                  updated[index].item = e.target.value
                                  setPostEventSchedule(updated)
                                }}
                                className="input text-sm"
                                placeholder="e.g. Tear Down, Drive Home"
                                autoFocus
                              />
                              <input
                                type="text"
                                value={item.notes}
                                onChange={(e) => {
                                  const updated = [...postEventSchedule]
                                  updated[index].notes = e.target.value
                                  setPostEventSchedule(updated)
                                }}
                                className="input text-sm"
                                placeholder="Notes (optional)"
                              />
                              <button type="button" onClick={() => setEditingPostEventItem(null)} className="text-xs text-teal-600 hover:text-teal-800 font-semibold">Done</button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditingPostEventItem(index)}
                              className="text-left w-full py-2 px-3 text-sm text-gray-900 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                            >
                              <div className="font-semibold">{item.item || 'Click to edit'}</div>
                              {item.notes && <div className="text-xs text-gray-600 mt-1">{item.notes}</div>}
                            </button>
                          )}
                        </td>
                        <td className="py-2 px-3 align-top">
                          <button
                            type="button"
                            onClick={() => {
                              setPostEventSchedule(postEventSchedule.filter((_, i) => i !== index))
                              if (editingPostEventItem === index) setEditingPostEventItem(null)
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Remove"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </SortableRow>
                    ))}
                  </tbody>
                </SortableContext>
              </table>
            </DndContext>
            <button
              type="button"
              onClick={() => setPostEventSchedule([...postEventSchedule, { item: '', offset_minutes: getNextPostEventTime(), notes: '' }])}
              className="btn-secondary mt-3"
            >
              + Add Post-Event Item
            </button>
          </div>
        )}
      </div>

      {/* Bottom Save */}
      <div className="flex justify-end gap-3">
        <Link to={`/events/${id}`} className="btn-secondary">Cancel</Link>
        <button
          onClick={handleSave}
          disabled={updateEvent.isPending}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4 mr-2 inline" />
          {updateEvent.isPending ? 'Saving...' : 'Save Schedule'}
        </button>
      </div>
    </div>
  )
}
