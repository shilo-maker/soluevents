import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { X, ArrowRight, ArrowLeft, Check, Save, GripVertical } from 'lucide-react'
import { useCreateEvent, useEvent, useUpdateEvent } from '@/hooks/useEvents'
import { useUsers } from '@/hooks/useUsers'
import { useContacts } from '@/hooks/useContacts'
import VenueAutocomplete from '@/components/VenueAutocomplete'
import { useUpdateVenue } from '@/hooks/useVenues'
import ContactAutocomplete from '@/components/ContactAutocomplete'
import PersonHoverCard from '@/components/PersonHoverCard'
import SongAutocomplete from '@/components/SongAutocomplete'
import type { EventType, EventPhase, EventStatus } from '@/types'
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

const DRAFT_KEY = 'event_wizard_draft'

interface PreEventItem {
  item: string
  offset_minutes: number
  notes?: string
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
}

interface PostEventItem {
  item: string
  offset_minutes: number
  notes?: string
}

interface WorshipMember {
  role: string
  person: string
  contact_id: string
  is_user: boolean
  user_id: string
  needs: string[]
  eDrums?: boolean
  eDrumsNeeds?: string[]
}

interface ProductionPerson {
  person: string
  contact: string
  contact_id: string
  is_user: boolean
  user_id: string
}

interface FormData {
  type: EventType
  title: string
  description: string
  event_date: string
  event_time: string
  location_name: string
  address: string
  venue_id: string
  est_attendance: string
  phase: EventPhase
  status: EventStatus
  tags: string
  pre_event_schedule: PreEventItem[]
  program_schedule: ProgramItem[]
  has_post_event_schedule: boolean
  post_event_schedule: PostEventItem[]
  worship_team: WorshipMember[]
  has_prayer_leader: boolean
  prayer_leader: {
    person: string
    user_id?: string
    is_user?: boolean
    topic: string
    description: string
  }
  production_team: {
    soundman: ProductionPerson
    projection: ProductionPerson
    host: ProductionPerson
  }
  contact_person: string
  contact_phone: string
  soundman_needed: boolean
  projection_needed: boolean
  special_requirements: string
}

export default function NewEventWizard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()

  const steps = [
    { id: 1, name: t('events.wizard.template'), description: t('events.wizard.templateDesc') },
    { id: 2, name: t('events.wizard.basics'), description: t('events.wizard.basicsDesc') },
    { id: 3, name: t('events.wizard.schedule'), description: t('events.wizard.scheduleDesc') },
    { id: 4, name: t('events.wizard.rider'), description: t('events.wizard.riderDesc') },
    { id: 5, name: t('events.wizard.review'), description: t('events.wizard.reviewDesc') },
  ]
  const isEditMode = !!id

  const createEvent = useCreateEvent()
  const updateEvent = useUpdateEvent()
  const updateVenue = useUpdateVenue()
  const { data: existingEvent, isLoading: eventLoading } = useEvent(id!, { enabled: isEditMode })
  const { data: users } = useUsers()
  const { data: contacts } = useContacts()

  const initialStep = isEditMode ? (parseInt(searchParams.get('step') || '2') || 2) : 1
  const [currentStep, setCurrentStep] = useState(initialStep)
  const [error, setError] = useState('')
  const [draftSaved, setDraftSaved] = useState(false)
  const [editingNeedsIndex, setEditingNeedsIndex] = useState<number | null>(null)
  const [editingProgramItem, setEditingProgramItem] = useState<number | null>(null)
  const [editingPreEventItem, setEditingPreEventItem] = useState<number | null>(null)
  const [editingPostEventItem, setEditingPostEventItem] = useState<number | null>(null)

  // Load initial form data from localStorage or use defaults
  const getInitialFormData = (): FormData => {
    const savedDraft = localStorage.getItem(DRAFT_KEY)
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft)
        // Ensure worship_team exists for backwards compatibility with old drafts
        if (!parsed.worship_team) {
          parsed.worship_team = [
            {
              role: t('roles.guitarVocals'),
              person: 'Shilo Ben Hod',
              contact_id: '',
              is_user: false,
              user_id: '',
              needs: [t('rider.defaults.connectedDI'), t('rider.defaults.micStand2XLR'), t('rider.defaults.guitarStand')]
            },
            {
              role: t('roles.keysVocals'),
              person: 'Levi Davis',
              contact_id: '',
              is_user: false,
              user_id: '',
              needs: [t('rider.defaults.keyboardStand'), t('rider.defaults.micStandXLR'), t('rider.defaults.fiveXLR'), t('rider.defaults.computerStand')]
            },
            {
              role: t('roles.drums'),
              person: 'Boris Shumsky',
              contact_id: '',
              is_user: false,
              user_id: '',
              needs: [t('rider.defaults.micdDrumSet')],
              eDrums: false,
              eDrumsNeeds: [t('rider.defaults.connectedSTDI'), t('rider.defaults.drumsChair')]
            },
            {
              role: t('roles.bass'),
              person: 'Vadym Sokolyk',
              contact_id: '',
              is_user: false,
              user_id: '',
              needs: [t('rider.defaults.connectedDI'), t('rider.defaults.guitarStand')]
            },
            {
              role: t('roles.electricGuitar'),
              person: 'Yedidyah Ben Hod',
              contact_id: '',
              is_user: false,
              user_id: '',
              needs: [t('rider.defaults.connectedSTDI'), t('rider.defaults.guitarStand')]
            },
            {
              role: t('roles.vocals'),
              person: 'Sarah Ben Hod',
              contact_id: '',
              is_user: false,
              user_id: '',
              needs: [t('rider.defaults.micStandXLR')]
            },
            {
              role: t('roles.vocals'),
              person: 'Rebekah Davis',
              contact_id: '',
              is_user: false,
              user_id: '',
              needs: [t('rider.defaults.micStandXLR')]
            },
          ]
        } else {
          // Add new fields to existing worship team members
          parsed.worship_team = parsed.worship_team.map((member: any) => ({
            ...member,
            contact_id: member.contact_id || '',
            is_user: member.is_user || false,
            user_id: member.user_id || member.contact_id || '',
          }))
        }
        // Ensure prayer_leader exists for backwards compatibility
        if (!parsed.has_prayer_leader) {
          parsed.has_prayer_leader = false
        }
        if (!parsed.prayer_leader) {
          parsed.prayer_leader = {
            person: '',
            topic: '',
            description: '',
          }
        }
        // Ensure production_team exists for backwards compatibility
        if (!parsed.production_team) {
          parsed.production_team = {
            soundman: { person: '', contact: '', contact_id: '', is_user: false, user_id: '' },
            projection: { person: '', contact: '', contact_id: '', is_user: false, user_id: '' },
            host: { person: '', contact: '', contact_id: '', is_user: false, user_id: '' },
          }
        } else {
          // Add new fields to existing production team members
          if (parsed.production_team.soundman) {
            parsed.production_team.soundman = {
              ...parsed.production_team.soundman,
              contact_id: parsed.production_team.soundman.contact_id || '',
              is_user: parsed.production_team.soundman.is_user || false,
              user_id: parsed.production_team.soundman.user_id || '',
            }
          }
          if (parsed.production_team.projection) {
            parsed.production_team.projection = {
              ...parsed.production_team.projection,
              contact_id: parsed.production_team.projection.contact_id || '',
              is_user: parsed.production_team.projection.is_user || false,
              user_id: parsed.production_team.projection.user_id || '',
            }
          }
          if (parsed.production_team.host) {
            parsed.production_team.host = {
              ...parsed.production_team.host,
              contact_id: parsed.production_team.host.contact_id || '',
              is_user: parsed.production_team.host.is_user || false,
              user_id: parsed.production_team.host.user_id || '',
            }
          }
        }
        // Ensure post_event_schedule exists for backwards compatibility
        if (parsed.has_post_event_schedule === undefined) {
          parsed.has_post_event_schedule = false
        }
        if (!parsed.post_event_schedule) {
          parsed.post_event_schedule = [
            { item: t('schedule.defaults.tearDown'), offset_minutes: 105, notes: '' },
            { item: t('schedule.defaults.driveHome'), offset_minutes: 130, notes: '' },
          ]
        }
        // Ensure pre_event_schedule items have notes field
        if (parsed.pre_event_schedule) {
          parsed.pre_event_schedule = parsed.pre_event_schedule.map((item: any) => ({
            ...item,
            notes: item.notes || '',
          }))
        }
        // Ensure post_event_schedule items have notes field
        if (parsed.post_event_schedule) {
          parsed.post_event_schedule = parsed.post_event_schedule.map((item: any) => ({
            ...item,
            notes: item.notes || '',
          }))
        }
        // Ensure program_schedule items have all fields
        if (parsed.program_schedule) {
          parsed.program_schedule = parsed.program_schedule.map((item: any) => ({
            ...item,
            type: item.type || 'other',
            key: item.key || '',
            bpm: item.bpm || '',
            person: item.person || '',
            person_id: item.person_id || '',
            person_is_user: item.person_is_user || false,
            speaker: item.speaker || '',
            speaker_id: item.speaker_id || '',
            speaker_is_user: item.speaker_is_user || false,
            topic: item.topic || '',
            points: item.points || '',
            prayer_leader: item.prayer_leader || '',
            prayer_leader_id: item.prayer_leader_id || '',
            prayer_leader_is_user: item.prayer_leader_is_user || false,
            facilitator: item.facilitator || '',
            facilitator_id: item.facilitator_id || '',
            facilitator_is_user: item.facilitator_is_user || false,
            has_ministry_team: item.has_ministry_team || false,
          }))
        }
        return parsed
      } catch (e) {
        console.error('Failed to parse draft:', e)
      }
    }
    return {
    type: 'worship' as EventType,
    title: '',
    description: '',
    event_date: '',
    event_time: '19:00',
    location_name: '',
    address: '',
    venue_id: '',
    est_attendance: '',
    phase: 'concept' as EventPhase,
    status: 'planned' as EventStatus,
    tags: '',
    // Pre-Event Schedule (time offset in minutes from event start, negative = before)
    pre_event_schedule: [
      { item: t('schedule.defaults.arrival'), offset_minutes: -135, notes: '' },
      { item: t('schedule.defaults.soundcheck'), offset_minutes: -120, notes: '' },
      { item: t('schedule.defaults.break'), offset_minutes: -60, notes: '' },
      { item: t('schedule.defaults.preServicePrayer'), offset_minutes: -20, notes: '' },
    ],
    // Program Schedule (time offset in minutes from event start)
    // Songs are 6 minutes each
    program_schedule: [
      { offset_minutes: 0, title: t('schedule.defaults.opening'), type: 'other', person: '', person_id: '', person_is_user: false, key: '', bpm: '', speaker: '', speaker_id: '', speaker_is_user: false, topic: '', points: '', prayer_leader: '', prayer_leader_id: '', prayer_leader_is_user: false, facilitator: '', facilitator_id: '', facilitator_is_user: false, has_ministry_team: false },
      { offset_minutes: 5, title: t('schedule.defaults.song', { number: 1 }), type: 'song', person: '', person_id: '', person_is_user: false, key: '', bpm: '', soluflow_song_id: undefined, speaker: '', speaker_id: '', speaker_is_user: false, topic: '', points: '', prayer_leader: '', prayer_leader_id: '', prayer_leader_is_user: false, facilitator: '', facilitator_id: '', facilitator_is_user: false, has_ministry_team: false },
      { offset_minutes: 11, title: t('schedule.defaults.song', { number: 2 }), type: 'song', person: '', person_id: '', person_is_user: false, key: '', bpm: '', soluflow_song_id: undefined, speaker: '', speaker_id: '', speaker_is_user: false, topic: '', points: '', prayer_leader: '', prayer_leader_id: '', prayer_leader_is_user: false, facilitator: '', facilitator_id: '', facilitator_is_user: false, has_ministry_team: false },
      { offset_minutes: 17, title: t('schedule.defaults.song', { number: 3 }), type: 'song', person: '', person_id: '', person_is_user: false, key: '', bpm: '', soluflow_song_id: undefined, speaker: '', speaker_id: '', speaker_is_user: false, topic: '', points: '', prayer_leader: '', prayer_leader_id: '', prayer_leader_is_user: false, facilitator: '', facilitator_id: '', facilitator_is_user: false, has_ministry_team: false },
      { offset_minutes: 23, title: t('schedule.defaults.song', { number: 4 }), type: 'song', person: '', person_id: '', person_is_user: false, key: '', bpm: '', soluflow_song_id: undefined, speaker: '', speaker_id: '', speaker_is_user: false, topic: '', points: '', prayer_leader: '', prayer_leader_id: '', prayer_leader_is_user: false, facilitator: '', facilitator_id: '', facilitator_is_user: false, has_ministry_team: false },
      { offset_minutes: 29, title: t('schedule.defaults.song', { number: 5 }), type: 'song', person: '', person_id: '', person_is_user: false, key: '', bpm: '', soluflow_song_id: undefined, speaker: '', speaker_id: '', speaker_is_user: false, topic: '', points: '', prayer_leader: '', prayer_leader_id: '', prayer_leader_is_user: false, facilitator: '', facilitator_id: '', facilitator_is_user: false, has_ministry_team: false },
      { offset_minutes: 35, title: t('schedule.defaults.song', { number: 6 }), type: 'song', person: '', person_id: '', person_is_user: false, key: '', bpm: '', soluflow_song_id: undefined, speaker: '', speaker_id: '', speaker_is_user: false, topic: '', points: '', prayer_leader: '', prayer_leader_id: '', prayer_leader_is_user: false, facilitator: '', facilitator_id: '', facilitator_is_user: false, has_ministry_team: false },
      { offset_minutes: 41, title: t('schedule.defaults.prayerTime'), type: 'prayer', person: '', person_id: '', person_is_user: false, key: '', bpm: '', speaker: '', speaker_id: '', speaker_is_user: false, topic: '', points: '', prayer_leader: '', prayer_leader_id: '', prayer_leader_is_user: false, facilitator: '', facilitator_id: '', facilitator_is_user: false, has_ministry_team: false },
      { offset_minutes: 51, title: t('schedule.defaults.song', { number: 7 }), type: 'song', person: '', person_id: '', person_is_user: false, key: '', bpm: '', soluflow_song_id: undefined, speaker: '', speaker_id: '', speaker_is_user: false, topic: '', points: '', prayer_leader: '', prayer_leader_id: '', prayer_leader_is_user: false, facilitator: '', facilitator_id: '', facilitator_is_user: false, has_ministry_team: false },
      { offset_minutes: 57, title: t('schedule.defaults.song', { number: 8 }), type: 'song', person: '', person_id: '', person_is_user: false, key: '', bpm: '', soluflow_song_id: undefined, speaker: '', speaker_id: '', speaker_is_user: false, topic: '', points: '', prayer_leader: '', prayer_leader_id: '', prayer_leader_is_user: false, facilitator: '', facilitator_id: '', facilitator_is_user: false, has_ministry_team: false },
      { offset_minutes: 63, title: t('schedule.defaults.song', { number: 9 }), type: 'song', person: '', person_id: '', person_is_user: false, key: '', bpm: '', soluflow_song_id: undefined, speaker: '', speaker_id: '', speaker_is_user: false, topic: '', points: '', prayer_leader: '', prayer_leader_id: '', prayer_leader_is_user: false, facilitator: '', facilitator_id: '', facilitator_is_user: false, has_ministry_team: false },
      { offset_minutes: 69, title: t('schedule.defaults.song', { number: 10 }), type: 'song', person: '', person_id: '', person_is_user: false, key: '', bpm: '', soluflow_song_id: undefined, speaker: '', speaker_id: '', speaker_is_user: false, topic: '', points: '', prayer_leader: '', prayer_leader_id: '', prayer_leader_is_user: false, facilitator: '', facilitator_id: '', facilitator_is_user: false, has_ministry_team: false },
      { offset_minutes: 75, title: t('schedule.defaults.song', { number: 11 }), type: 'song', person: '', person_id: '', person_is_user: false, key: '', bpm: '', soluflow_song_id: undefined, speaker: '', speaker_id: '', speaker_is_user: false, topic: '', points: '', prayer_leader: '', prayer_leader_id: '', prayer_leader_is_user: false, facilitator: '', facilitator_id: '', facilitator_is_user: false, has_ministry_team: false },
      { offset_minutes: 90, title: t('schedule.defaults.closing'), type: 'other', person: '', person_id: '', person_is_user: false, key: '', bpm: '', speaker: '', speaker_id: '', speaker_is_user: false, topic: '', points: '', prayer_leader: '', prayer_leader_id: '', prayer_leader_is_user: false, facilitator: '', facilitator_id: '', facilitator_is_user: false, has_ministry_team: false },
    ],
    // Post-Event Schedule (time offset in minutes from event start, positive = after)
    has_post_event_schedule: false,
    post_event_schedule: [
      { item: t('schedule.defaults.tearDown'), offset_minutes: 105, notes: '' },
      { item: t('schedule.defaults.driveHome'), offset_minutes: 130, notes: '' },
    ],
    // Rider Details - Worship Team
    worship_team: [
      {
        role: t('roles.guitarVocals'),
        person: 'Shilo Ben Hod',
        contact_id: '',
        is_user: false,
        user_id: '',
        needs: [t('rider.defaults.connectedDI'), t('rider.defaults.micStand2XLR'), t('rider.defaults.guitarStand')]
      },
      {
        role: t('roles.keysVocals'),
        person: 'Levi Davis',
        contact_id: '',
        is_user: false,
        user_id: '',
        needs: [t('rider.defaults.keyboardStand'), t('rider.defaults.micStandXLR'), t('rider.defaults.fiveXLR'), t('rider.defaults.computerStand')]
      },
      {
        role: t('roles.drums'),
        person: 'Boris Shumsky',
        contact_id: '',
        is_user: false,
        user_id: '',
        needs: [t('rider.defaults.micdDrumSet')],
        eDrums: false,
        eDrumsNeeds: [t('rider.defaults.connectedSTDI'), t('rider.defaults.drumsChair')]
      },
      {
        role: t('roles.bass'),
        person: 'Vadym Sokolyk',
        contact_id: '',
        is_user: false,
        user_id: '',
        needs: [t('rider.defaults.connectedDI'), t('rider.defaults.guitarStand')]
      },
      {
        role: t('roles.electricGuitar'),
        person: 'Yedidyah Ben Hod',
        contact_id: '',
        is_user: false,
        user_id: '',
        needs: [t('rider.defaults.connectedSTDI'), t('rider.defaults.guitarStand')]
      },
      {
        role: t('roles.vocals'),
        person: 'Sarah Ben Hod',
        contact_id: '',
        is_user: false,
        user_id: '',
        needs: [t('rider.defaults.micStandXLR')]
      },
      {
        role: t('roles.vocals'),
        person: 'Rebekah Davis',
        contact_id: '',
        is_user: false,
        user_id: '',
        needs: [t('rider.defaults.micStandXLR')]
      },
    ],
    // Prayer Leader
    has_prayer_leader: false,
    prayer_leader: {
      person: '',
      topic: '',
      description: '',
    },
    // Production Team
    production_team: {
      soundman: { person: '', contact: '', contact_id: '', is_user: false, user_id: '' },
      projection: { person: '', contact: '', contact_id: '', is_user: false, user_id: '' },
      host: { person: '', contact: '', contact_id: '', is_user: false, user_id: '' },
    },
    // Other Rider Details
    contact_person: '',
    contact_phone: '',
    soundman_needed: true,
    projection_needed: true,
    special_requirements: '',
    }
  }

  const isDrumsRole = (role: string) => role === 'Drums' || role === t('roles.drums')

  const [formData, setFormData] = useState(getInitialFormData())

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Helper functions to calculate next time for new items
  const getNextPreEventTime = () => {
    if (formData.pre_event_schedule.length === 0) return -30
    const lastItem = formData.pre_event_schedule[formData.pre_event_schedule.length - 1]
    return lastItem.offset_minutes - 30
  }

  const getNextProgramTime = () => {
    if (formData.program_schedule.length === 0) return 0
    const lastItem = formData.program_schedule[formData.program_schedule.length - 1]
    return lastItem.offset_minutes + 10
  }

  const getNextPostEventTime = () => {
    if (formData.post_event_schedule.length === 0) return 105
    const lastItem = formData.post_event_schedule[formData.post_event_schedule.length - 1]
    return lastItem.offset_minutes + 30
  }

  // Drag handlers for each schedule type
  const handlePreEventDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = formData.pre_event_schedule.findIndex((_, i) => `pre-${i}` === active.id)
      const newIndex = formData.pre_event_schedule.findIndex((_, i) => `pre-${i}` === over.id)
      const newSchedule = arrayMove(formData.pre_event_schedule, oldIndex, newIndex)
      // Reset the time of the moved item
      newSchedule[newIndex] = { ...newSchedule[newIndex], offset_minutes: null as any }
      setFormData({ ...formData, pre_event_schedule: newSchedule })
    }
  }

  const handleProgramDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = formData.program_schedule.findIndex((_, i) => `program-${i}` === active.id)
      const newIndex = formData.program_schedule.findIndex((_, i) => `program-${i}` === over.id)
      const newSchedule = arrayMove(formData.program_schedule, oldIndex, newIndex)
      // Reset the time of the moved item
      newSchedule[newIndex] = { ...newSchedule[newIndex], offset_minutes: null as any }
      setFormData({ ...formData, program_schedule: newSchedule })
    }
  }

  const handlePostEventDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = formData.post_event_schedule.findIndex((_, i) => `post-${i}` === active.id)
      const newIndex = formData.post_event_schedule.findIndex((_, i) => `post-${i}` === over.id)
      const newSchedule = arrayMove(formData.post_event_schedule, oldIndex, newIndex)
      // Reset the time of the moved item
      newSchedule[newIndex] = { ...newSchedule[newIndex], offset_minutes: null as any }
      setFormData({ ...formData, post_event_schedule: newSchedule })
    }
  }

  // Load existing event data when in edit mode
  useEffect(() => {
    if (isEditMode && existingEvent && !eventLoading) {
      const eventDate = new Date(existingEvent.date_start)
      const eventTime = `${String(eventDate.getHours()).padStart(2, '0')}:${String(eventDate.getMinutes()).padStart(2, '0')}`

      // Default schedules if none exist
      const defaultPreEventSchedule = [
        { item: t('schedule.defaults.arrival'), offset_minutes: -135 },
        { item: t('schedule.defaults.soundcheck'), offset_minutes: -120 },
        { item: t('schedule.defaults.break'), offset_minutes: -60 },
        { item: t('schedule.defaults.preServicePrayer'), offset_minutes: -20 },
      ]

      const defaultProgramSchedule = [
        { offset_minutes: 0, title: t('schedule.defaults.opening'), person: '' },
        { offset_minutes: 5, title: t('schedule.defaults.song', { number: 1 }), person: '' },
        { offset_minutes: 11, title: t('schedule.defaults.song', { number: 2 }), person: '' },
        { offset_minutes: 17, title: t('schedule.defaults.song', { number: 3 }), person: '' },
        { offset_minutes: 23, title: t('schedule.defaults.song', { number: 4 }), person: '' },
        { offset_minutes: 29, title: t('schedule.defaults.song', { number: 5 }), person: '' },
        { offset_minutes: 35, title: t('schedule.defaults.song', { number: 6 }), person: '' },
        { offset_minutes: 41, title: t('schedule.defaults.prayerTime'), person: '' },
        { offset_minutes: 51, title: t('schedule.defaults.song', { number: 7 }), person: '' },
        { offset_minutes: 57, title: t('schedule.defaults.song', { number: 8 }), person: '' },
        { offset_minutes: 63, title: t('schedule.defaults.song', { number: 9 }), person: '' },
        { offset_minutes: 69, title: t('schedule.defaults.song', { number: 10 }), person: '' },
        { offset_minutes: 75, title: t('schedule.defaults.song', { number: 11 }), person: '' },
        { offset_minutes: 90, title: t('schedule.defaults.closing'), person: '' },
      ]

      const defaultWorshipTeam = [
        {
          role: t('roles.guitarVocals'),
          person: 'Shilo Ben Hod',
          contact_id: '',
          is_user: false,
          user_id: '',
          needs: [t('rider.defaults.connectedDI'), t('rider.defaults.micStand2XLR'), t('rider.defaults.guitarStand')]
        },
        {
          role: t('roles.keysVocals'),
          person: 'Levi Davis',
          contact_id: '',
          is_user: false,
          user_id: '',
          needs: [t('rider.defaults.keyboardStand'), t('rider.defaults.micStandXLR'), t('rider.defaults.fiveXLR'), t('rider.defaults.computerStand')]
        },
        {
          role: t('roles.drums'),
          person: 'Boris Shumsky',
          contact_id: '',
          is_user: false,
          user_id: '',
          needs: [t('rider.defaults.micdDrumSet')],
          eDrums: false,
          eDrumsNeeds: [t('rider.defaults.connectedSTDI'), t('rider.defaults.drumsChair')]
        },
        {
          role: t('roles.bass'),
          person: 'Vadym Sokolyk',
          contact_id: '',
          is_user: false,
          user_id: '',
          needs: [t('rider.defaults.connectedDI'), t('rider.defaults.guitarStand')]
        },
        {
          role: t('roles.electricGuitar'),
          person: 'Yedidyah Ben Hod',
          contact_id: '',
          is_user: false,
          user_id: '',
          needs: [t('rider.defaults.connectedSTDI'), t('rider.defaults.guitarStand')]
        },
        {
          role: t('roles.vocals'),
          person: 'Sarah Ben Hod',
          contact_id: '',
          is_user: false,
          user_id: '',
          needs: [t('rider.defaults.micStandXLR')]
        },
        {
          role: t('roles.vocals'),
          person: 'Rebekah Davis',
          contact_id: '',
          is_user: false,
          user_id: '',
          needs: [t('rider.defaults.micStandXLR')]
        },
      ]

      setFormData({
        type: existingEvent.type,
        title: existingEvent.title,
        description: existingEvent.description || '',
        event_date: eventDate.toISOString().split('T')[0],
        event_time: eventTime,
        location_name: existingEvent.location_name || '',
        address: existingEvent.address || '',
        venue_id: existingEvent.venue_id || '',
        est_attendance: existingEvent.est_attendance?.toString() || '',
        phase: existingEvent.phase,
        status: existingEvent.status,
        tags: existingEvent.tags?.join(', ') || '',
        pre_event_schedule: (existingEvent.program_agenda?.pre_event_schedule && existingEvent.program_agenda.pre_event_schedule.length > 0)
          ? existingEvent.program_agenda.pre_event_schedule.map((item: any) => ({
              ...item,
              notes: item.notes || '',
            }))
          : defaultPreEventSchedule,
        program_schedule: (existingEvent.program_agenda?.program_schedule && existingEvent.program_agenda.program_schedule.length > 0)
          ? existingEvent.program_agenda.program_schedule.map((item: any) => ({
              ...item,
              type: item.type || 'other',
              key: item.key || '',
              bpm: item.bpm || '',
              soluflow_song_id: item.soluflow_song_id || undefined,
              person: item.person || '',
              person_id: item.person_id || '',
              person_is_user: item.person_is_user || false,
              speaker: item.speaker || '',
              speaker_id: item.speaker_id || '',
              speaker_is_user: item.speaker_is_user || false,
              topic: item.topic || '',
              points: item.points || '',
              prayer_leader: item.prayer_leader || '',
              prayer_leader_id: item.prayer_leader_id || '',
              prayer_leader_is_user: item.prayer_leader_is_user || false,
              facilitator: item.facilitator || '',
              facilitator_id: item.facilitator_id || '',
              facilitator_is_user: item.facilitator_is_user || false,
              has_ministry_team: item.has_ministry_team || false,
            }))
          : defaultProgramSchedule,
        has_post_event_schedule: existingEvent.program_agenda?.has_post_event_schedule || false,
        post_event_schedule: (existingEvent.program_agenda?.post_event_schedule && existingEvent.program_agenda.post_event_schedule.length > 0)
          ? existingEvent.program_agenda.post_event_schedule.map((item: any) => ({
              ...item,
              notes: item.notes || '',
            }))
          : [
              { item: t('schedule.defaults.tearDown'), offset_minutes: 105, notes: '' },
              { item: t('schedule.defaults.driveHome'), offset_minutes: 130, notes: '' },
            ],
        worship_team: (existingEvent.rider_details?.worship_team && existingEvent.rider_details.worship_team.length > 0)
          ? existingEvent.rider_details.worship_team.map((member: any) => ({
              ...member,
              contact_id: member.contact_id || '',
              is_user: member.is_user || false,
              user_id: member.user_id || member.contact_id || '',
            }))
          : defaultWorshipTeam,
        has_prayer_leader: existingEvent.rider_details?.has_prayer_leader || false,
        prayer_leader: existingEvent.rider_details?.prayer_leader || { person: '', topic: '', description: '' },
        production_team: existingEvent.rider_details?.production_team ? {
          soundman: {
            person: existingEvent.rider_details.production_team.soundman?.person || '',
            contact: existingEvent.rider_details.production_team.soundman?.contact || '',
            contact_id: existingEvent.rider_details.production_team.soundman?.contact_id || '',
            is_user: existingEvent.rider_details.production_team.soundman?.is_user || false,
            user_id: existingEvent.rider_details.production_team.soundman?.user_id || '',
          },
          projection: {
            person: existingEvent.rider_details.production_team.projection?.person || '',
            contact: existingEvent.rider_details.production_team.projection?.contact || '',
            contact_id: existingEvent.rider_details.production_team.projection?.contact_id || '',
            is_user: existingEvent.rider_details.production_team.projection?.is_user || false,
            user_id: existingEvent.rider_details.production_team.projection?.user_id || '',
          },
          host: {
            person: existingEvent.rider_details.production_team.host?.person || '',
            contact: existingEvent.rider_details.production_team.host?.contact || '',
            contact_id: existingEvent.rider_details.production_team.host?.contact_id || '',
            is_user: existingEvent.rider_details.production_team.host?.is_user || false,
            user_id: existingEvent.rider_details.production_team.host?.user_id || '',
          },
        } : {
          soundman: { person: '', contact: '', contact_id: '', is_user: false, user_id: '' },
          projection: { person: '', contact: '', contact_id: '', is_user: false, user_id: '' },
          host: { person: '', contact: '', contact_id: '', is_user: false, user_id: '' },
        },
        contact_person: existingEvent.rider_details?.contact_person || '',
        contact_phone: existingEvent.rider_details?.contact_phone || '',
        soundman_needed: existingEvent.rider_details?.soundman_needed ?? true,
        projection_needed: existingEvent.rider_details?.projection_needed ?? true,
        special_requirements: existingEvent.rider_details?.special_requirements || '',
      })
    }
  }, [existingEvent, eventLoading, isEditMode])

  // Auto-save draft whenever formData changes (only in create mode)
  useEffect(() => {
    if (isEditMode) return // Don't auto-save drafts in edit mode

    const timer = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(formData))
      setDraftSaved(true)
      setTimeout(() => setDraftSaved(false), 2000)
    }, 1000) // Debounce for 1 second

    return () => clearTimeout(timer)
  }, [formData])

  // Auto-link worship team members to users/contacts
  useEffect(() => {
    if (!users || !contacts) return
    if (isEditMode) return // Only auto-link for new events

    const allContacts = [
      ...users.map(u => ({ id: u.id, name: u.name, isUser: true })),
      ...contacts.map(c => ({ id: c.id, name: c.name, isUser: false }))
    ]

    const updatedWorshipTeam = formData.worship_team.map(member => {
      // Skip if already linked
      if (member.contact_id) return member

      // Try to find matching user/contact
      const match = allContacts.find(c => c.name.toLowerCase() === member.person.toLowerCase())
      if (match) {
        return {
          ...member,
          contact_id: match.id,
          is_user: match.isUser,
          user_id: match.id,
        }
      }
      return member
    })

    // Only update if we found matches
    const hasChanges = updatedWorshipTeam.some((member, idx) =>
      member.contact_id !== formData.worship_team[idx].contact_id
    )

    if (hasChanges) {
      setFormData(prev => ({ ...prev, worship_team: updatedWorshipTeam }))
    }
  }, [users, contacts, isEditMode])

  const clearDraft = () => {
    if (confirm(t('events.confirmClearDraft'))) {
      localStorage.removeItem(DRAFT_KEY)
      navigate('/events')
    }
  }

  const eventTypes = [
    {
      value: 'worship',
      label: t('events.types.worship'),
      icon: '🎵',
      description: t('events.types.worshipDesc')
    },
    {
      value: 'in_house',
      label: t('events.types.inHouse'),
      icon: '🏛️',
      description: t('events.types.inHouseDesc')
    },
    {
      value: 'film',
      label: t('events.types.film'),
      icon: '🎬',
      description: t('events.types.filmDesc')
    },
    {
      value: 'tour_child',
      label: t('events.types.tourEvent'),
      icon: '🚌',
      description: t('events.types.tourEventDesc')
    },
  ]

  const handleNext = () => {
    // Validation for each step
    if (currentStep === 2) {
      if (!formData.event_date) {
        setError(t('events.errors.dateRequired'))
        return
      }
      if (!formData.location_name.trim()) {
        setError(t('events.errors.venueRequired'))
        return
      }
    }
    setError('')
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    setError('')
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    setError('')

    if (!formData.event_date || !formData.location_name.trim()) {
      setError(t('events.errors.completeRequired'))
      return
    }

    try {
      // Convert date and time to datetime for backend
      const [hours, minutes] = formData.event_time.split(':').map(Number)
      const eventDate = new Date(formData.event_date)
      const startDate = new Date(eventDate)
      startDate.setHours(hours, minutes, 0, 0)

      // End date is same as start date + 8 hours (default event duration)
      const endDate = new Date(startDate)
      endDate.setHours(startDate.getHours() + 8)

      const startDateTime = startDate.toISOString()
      const endDateTime = endDate.toISOString()

      const eventData = {
        type: formData.type,
        title: formData.title,
        description: formData.description,
        date_start: startDateTime,
        date_end: endDateTime,
        location_name: formData.location_name,
        address: formData.address,
        venue_id: formData.venue_id || undefined,
        phase: 'concept' as EventPhase, // Default phase
        status: 'planned' as EventStatus, // Default status
        est_attendance: formData.est_attendance ? parseInt(formData.est_attendance) : undefined,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
        program_agenda: {
          pre_event_schedule: formData.pre_event_schedule,
          program_schedule: formData.program_schedule,
          has_post_event_schedule: formData.has_post_event_schedule,
          post_event_schedule: formData.post_event_schedule,
        },
        rider_details: {
          worship_team: formData.worship_team,
          has_prayer_leader: formData.has_prayer_leader,
          prayer_leader: formData.prayer_leader,
          production_team: formData.production_team,
          contact_person: formData.contact_person,
          contact_phone: formData.contact_phone,
          soundman_needed: formData.soundman_needed,
          projection_needed: formData.projection_needed,
          special_requirements: formData.special_requirements,
        },
      }

      if (isEditMode) {
        // Update existing event
        const event = await updateEvent.mutateAsync({ id: id!, data: eventData })
        navigate(`/events/${event.id}`)
      } else {
        // Create new event
        const event = await createEvent.mutateAsync(eventData)
        // Clear draft after successful creation
        localStorage.removeItem(DRAFT_KEY)
        navigate(`/events/${event.id}`)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || (isEditMode ? t('events.errors.failedToUpdate') : t('events.errors.failedToCreate')))
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold gradient-text mb-2">{t('events.wizard.chooseEventType')}</h2>
              <p className="text-gray-600">{t('events.wizard.chooseEventTypeDesc')}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {eventTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: type.value as EventType })}
                  className={`p-6 rounded-2xl border-2 text-left transition-all duration-300 ${
                    formData.type === type.value
                      ? 'border-teal-500 bg-gradient-to-br from-teal-50 to-blue-50 shadow-xl scale-105'
                      : 'border-gray-200 bg-white hover:border-teal-300 hover:shadow-lg'
                  }`}
                >
                  <div className="text-4xl mb-3">{type.icon}</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{type.label}</h3>
                  <p className="text-sm text-gray-600">{type.description}</p>
                </button>
              ))}
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold gradient-text mb-2">{t('events.eventDetails')}</h2>
              <p className="text-gray-600">{t('events.wizard.eventDetailsDesc')}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('common.date')} *
                </label>
                <input
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('events.startTime')} *
                </label>
                <input
                  type="time"
                  value={formData.event_time}
                  onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('events.venue')} *
              </label>
              <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500">
                <VenueAutocomplete
                  value={formData.location_name}
                  venueId={formData.venue_id || undefined}
                  onChange={(name, address, venueId) => {
                    setFormData({
                      ...formData,
                      location_name: name,
                      address: address || formData.address,
                      venue_id: venueId || '',
                    })
                  }}
                  placeholder={t('events.venuePlaceholder')}
                  className="w-full px-3 py-2 border-0 focus:ring-0 focus:outline-none text-sm"
                />
                <div className="border-t border-gray-200">
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    onBlur={() => {
                      if (formData.venue_id && formData.address.trim()) {
                        updateVenue.mutate({ id: formData.venue_id, data: { address: formData.address.trim() } })
                      }
                    }}
                    className="w-full px-3 py-2 border-0 focus:ring-0 focus:outline-none text-sm text-gray-600"
                    placeholder={t('events.addressPlaceholder')}
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('events.eventTitle')}
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input"
                placeholder={t('events.eventTitlePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('events.description')}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input"
                rows={4}
                placeholder={t('events.descriptionPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('events.tagsCommaSeparated')}
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="input"
                placeholder={t('events.tagsPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('events.expectedAttendance')}
              </label>
              <input
                type="number"
                value={formData.est_attendance}
                onChange={(e) => setFormData({ ...formData, est_attendance: e.target.value })}
                className="input"
                placeholder="200"
                min="0"
              />
            </div>
          </div>
        )

      case 3:
        // Helper to calculate time from offset
        const calculateTime = (offsetMinutes: number) => {
          if (!formData.event_time) return ''
          const [hours, minutes] = formData.event_time.split(':').map(Number)
          const totalMinutes = hours * 60 + minutes + offsetMinutes
          const newHours = Math.floor(totalMinutes / 60) % 24
          const newMinutes = totalMinutes % 60
          return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`
        }

        // TODO: Helper to get row color based on item type (currently unused)
        // const getItemColor = (title: string) => { ... }

        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold gradient-text mb-2">{t('events.eventSchedule')}</h2>
              <p className="text-gray-600">{t('events.wizard.scheduleDesc2')}</p>
            </div>

            {/* Pre-Event Schedule */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('events.preEventSchedule')}</h3>
              <div className="overflow-x-auto">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handlePreEventDragEnd}
                >
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="w-8"></th>
                        <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700 w-24">{t('common.time')}</th>
                        <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">{t('common.item')}</th>
                        <th className="w-20"></th>
                      </tr>
                    </thead>
                    <SortableContext
                      items={formData.pre_event_schedule.map((_, i) => `pre-${i}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      <tbody>
                        {formData.pre_event_schedule.map((item, index) => (
                          <SortableRow key={`pre-${index}`} id={`pre-${index}`}>
                            <td className="py-2 px-3 w-24">
                              <input
                                type="time"
                                value={item.offset_minutes !== null ? calculateTime(item.offset_minutes) : ''}
                                onChange={(e) => {
                                  if (!e.target.value) return
                                  const [hours, minutes] = e.target.value.split(':').map(Number)
                                  const [eventHours, eventMinutes] = formData.event_time.split(':').map(Number)
                                  const totalMinutes = hours * 60 + minutes
                                  const eventTotalMinutes = eventHours * 60 + eventMinutes
                                  const offset = totalMinutes - eventTotalMinutes

                                  const newSchedule = [...formData.pre_event_schedule]
                                  newSchedule[index].offset_minutes = offset
                                  setFormData({ ...formData, pre_event_schedule: newSchedule })
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
                                      const newSchedule = [...formData.pre_event_schedule]
                                      newSchedule[index].item = e.target.value
                                      setFormData({ ...formData, pre_event_schedule: newSchedule })
                                    }}
                                    className="input text-sm"
                                    placeholder={t('events.schedule.preEventItemPlaceholder')}
                                    autoFocus
                                  />
                                  <input
                                    type="text"
                                    value={item.notes}
                                    onChange={(e) => {
                                      const newSchedule = [...formData.pre_event_schedule]
                                      newSchedule[index].notes = e.target.value
                                      setFormData({ ...formData, pre_event_schedule: newSchedule })
                                    }}
                                    className="input text-sm"
                                    placeholder={t('events.schedule.notesOptional')}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setEditingPreEventItem(null)}
                                    className="text-xs text-teal-600 hover:text-teal-800 font-semibold"
                                  >
                                    {t('common.done')}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setEditingPreEventItem(index)}
                                  className="text-left w-full py-2 px-3 text-sm text-gray-900 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                                >
                                  <div className="font-semibold">{item.item || t('common.clickToEdit')}</div>
                                  {item.notes && (
                                    <div className="text-xs text-gray-600 mt-1">
                                      {item.notes}
                                    </div>
                                  )}
                                </button>
                              )}
                            </td>
                            <td className="py-2 px-3 align-top">
                              <button
                                type="button"
                                onClick={() => {
                                  const newSchedule = formData.pre_event_schedule.filter((_, i) => i !== index)
                                  setFormData({ ...formData, pre_event_schedule: newSchedule })
                                  if (editingPreEventItem === index) setEditingPreEventItem(null)
                                }}
                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title={t('common.remove')}
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
                  onClick={() => {
                    setFormData({
                      ...formData,
                      pre_event_schedule: [...formData.pre_event_schedule, { item: '', offset_minutes: getNextPreEventTime(), notes: '' }]
                    })
                  }}
                  className="btn-secondary mt-3"
                >
                  {t('events.addPreEventItem')}
                </button>
              </div>
            </div>

            {/* Program Schedule */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('events.programSchedule')}</h3>
              <div className="overflow-x-auto">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleProgramDragEnd}
                >
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="w-8"></th>
                        <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700 w-24">{t('common.time')}</th>
                        <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">{t('common.item')}</th>
                        <th className="w-20"></th>
                      </tr>
                    </thead>
                    <SortableContext
                      items={formData.program_schedule.map((_, i) => `program-${i}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      <tbody>
                        {formData.program_schedule.map((item, index) => {
                          // Build details as JSX with hover cards for person names
                          const getDetailsElements = () => {
                            const parts: React.ReactNode[] = []
                            if (item.type === 'song') {
                              if (item.person) parts.push(<PersonHoverCard key="person" name={item.person} contactId={item.person_id} isUser={item.person_is_user} />)
                              if (item.key) parts.push(<span key="key">{t('events.itemLabels.key')}: {item.key}</span>)
                              if (item.bpm) parts.push(<span key="bpm">{t('events.itemLabels.bpm')}: {item.bpm}</span>)
                            } else if (item.type === 'share') {
                              if (item.speaker) parts.push(<span key="speaker">{t('events.itemLabels.speaker')}: <PersonHoverCard name={item.speaker} contactId={item.speaker_id} isUser={item.speaker_is_user} /></span>)
                              if (item.topic) parts.push(<span key="topic">{t('events.itemLabels.topic')}: {item.topic}</span>)
                            } else if (item.type === 'prayer') {
                              if (item.prayer_leader) parts.push(<span key="leader">{t('events.itemLabels.leader')}: <PersonHoverCard name={item.prayer_leader} contactId={item.prayer_leader_id} isUser={item.prayer_leader_is_user} /></span>)
                              if (item.topic) parts.push(<span key="topic">{t('events.itemLabels.topic')}: {item.topic}</span>)
                            } else if (item.type === 'ministry') {
                              if (item.facilitator) parts.push(<span key="facilitator">{t('events.itemLabels.facilitator')}: <PersonHoverCard name={item.facilitator} contactId={item.facilitator_id} isUser={item.facilitator_is_user} /></span>)
                              if (item.has_ministry_team) parts.push(<span key="ministry">{t('events.itemLabels.ministryTeam')}</span>)
                            }
                            return parts
                          }

                          return (
                            <SortableRow key={`program-${index}`} id={`program-${index}`}>
                              <td className="py-2 px-3 w-24">
                                <input
                                  type="time"
                                  value={item.offset_minutes !== null ? calculateTime(item.offset_minutes) : ''}
                                  onChange={(e) => {
                                    if (!e.target.value) return
                                    const [hours, minutes] = e.target.value.split(':').map(Number)
                                    const [eventHours, eventMinutes] = formData.event_time.split(':').map(Number)
                                    const totalMinutes = hours * 60 + minutes
                                    const eventTotalMinutes = eventHours * 60 + eventMinutes
                                    const offset = totalMinutes - eventTotalMinutes

                                    const newSchedule = [...formData.program_schedule]
                                    newSchedule[index].offset_minutes = offset
                                    setFormData({ ...formData, program_schedule: newSchedule })
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
                                          const newSchedule = [...formData.program_schedule]
                                          newSchedule[index].type = e.target.value
                                          setFormData({ ...formData, program_schedule: newSchedule })
                                        }}
                                        className="input text-sm w-32"
                                      >
                                        <option value="song">{t('events.itemTypes.song')}</option>
                                        <option value="share">{t('events.itemTypes.share')}</option>
                                        <option value="prayer">{t('events.itemTypes.prayer')}</option>
                                        <option value="ministry">{t('events.itemTypes.ministry')}</option>
                                        <option value="other">{t('events.itemTypes.other')}</option>
                                      </select>
                                      <div className="flex-1">
                                        {item.type === 'song' ? (
                                          <SongAutocomplete
                                            value={item.title}
                                            soluflowSongId={item.soluflow_song_id ? Number(item.soluflow_song_id) : undefined}
                                            onChange={(title, song) => {
                                              const newSchedule = [...formData.program_schedule]
                                              newSchedule[index].title = title
                                              if (song) {
                                                newSchedule[index].soluflow_song_id = String(song.id)
                                                newSchedule[index].key = song.key || newSchedule[index].key
                                                newSchedule[index].bpm = song.bpm?.toString() || newSchedule[index].bpm
                                              } else {
                                                newSchedule[index].soluflow_song_id = undefined
                                              }
                                              setFormData({ ...formData, program_schedule: newSchedule })
                                            }}
                                            placeholder={t('autocomplete.searchSongs')}
                                            className="input text-sm"
                                          />
                                        ) : (
                                          <input
                                            type="text"
                                            value={item.title}
                                            onChange={(e) => {
                                              const newSchedule = [...formData.program_schedule]
                                              newSchedule[index].title = e.target.value
                                              setFormData({ ...formData, program_schedule: newSchedule })
                                            }}
                                            className="input text-sm"
                                            placeholder={t('events.schedule.programItemPlaceholder')}
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
                                            value={item.person}
                                            contactId={item.person_id}
                                            isUser={item.person_is_user}
                                            freeTextOnly
                                            onChange={(name, contactId, isUser) => {
                                              const newSchedule = [...formData.program_schedule]
                                              newSchedule[index].person = name
                                              newSchedule[index].person_id = contactId || ''
                                              newSchedule[index].person_is_user = isUser || false
                                              setFormData({ ...formData, program_schedule: newSchedule })
                                            }}
                                            placeholder={t('events.itemLabels.leader')}
                                            className="input text-sm"
                                          />
                                        </div>
                                        <input
                                          type="text"
                                          value={item.key || ''}
                                          onChange={(e) => {
                                            const newSchedule = [...formData.program_schedule]
                                            newSchedule[index].key = e.target.value
                                            setFormData({ ...formData, program_schedule: newSchedule })
                                          }}
                                          className="input text-sm w-20"
                                          placeholder={t('events.itemLabels.key')}
                                        />
                                        <input
                                          type="text"
                                          value={item.bpm || ''}
                                          onChange={(e) => {
                                            const newSchedule = [...formData.program_schedule]
                                            newSchedule[index].bpm = e.target.value
                                            setFormData({ ...formData, program_schedule: newSchedule })
                                          }}
                                          className="input text-sm w-20"
                                          placeholder={t('events.itemLabels.bpm')}
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
                                                const newSchedule = [...formData.program_schedule]
                                                newSchedule[index].speaker = name
                                                newSchedule[index].speaker_id = contactId || ''
                                                newSchedule[index].speaker_is_user = isUser || false
                                                setFormData({ ...formData, program_schedule: newSchedule })
                                              }}
                                              placeholder={t('events.itemLabels.speaker')}
                                              className="input text-sm"
                                            />
                                          </div>
                                          <div className="flex-1">
                                            <input
                                              type="text"
                                              value={item.topic}
                                              onChange={(e) => {
                                                const newSchedule = [...formData.program_schedule]
                                                newSchedule[index].topic = e.target.value
                                                setFormData({ ...formData, program_schedule: newSchedule })
                                              }}
                                              className="input text-sm"
                                              placeholder={t('events.itemLabels.topic')}
                                            />
                                          </div>
                                        </div>
                                        <textarea
                                          value={item.points}
                                          onChange={(e) => {
                                            const newSchedule = [...formData.program_schedule]
                                            newSchedule[index].points = e.target.value
                                            setFormData({ ...formData, program_schedule: newSchedule })
                                          }}
                                          className="input text-sm"
                                          placeholder={t('events.schedule.keyPointsPlaceholder')}
                                          rows={2}
                                        />
                                      </div>
                                    )}

                                    {/* Prayer fields */}
                                    {item.type === 'prayer' && (
                                      <div className="space-y-2">
                                        <div className="flex gap-2">
                                          <div className="flex-1">
                                            <ContactAutocomplete
                                              value={item.prayer_leader}
                                              contactId={item.prayer_leader_id}
                                              isUser={item.prayer_leader_is_user}
                                              freeTextOnly
                                              onChange={(name, contactId, isUser) => {
                                                const newSchedule = [...formData.program_schedule]
                                                newSchedule[index].prayer_leader = name
                                                newSchedule[index].prayer_leader_id = contactId || ''
                                                newSchedule[index].prayer_leader_is_user = isUser || false
                                                setFormData({ ...formData, program_schedule: newSchedule })
                                              }}
                                              placeholder={t('events.prayerLeader')}
                                              className="input text-sm"
                                            />
                                          </div>
                                          <div className="flex-1">
                                            <input
                                              type="text"
                                              value={item.topic}
                                              onChange={(e) => {
                                                const newSchedule = [...formData.program_schedule]
                                                newSchedule[index].topic = e.target.value
                                                setFormData({ ...formData, program_schedule: newSchedule })
                                              }}
                                              className="input text-sm"
                                              placeholder={t('events.wizard.prayerFocus')}
                                            />
                                          </div>
                                        </div>
                                        <textarea
                                          value={item.points}
                                          onChange={(e) => {
                                            const newSchedule = [...formData.program_schedule]
                                            newSchedule[index].points = e.target.value
                                            setFormData({ ...formData, program_schedule: newSchedule })
                                          }}
                                          className="input text-sm"
                                          placeholder={t('events.wizard.prayerPointsPlaceholder')}
                                          rows={2}
                                        />
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
                                              const newSchedule = [...formData.program_schedule]
                                              newSchedule[index].facilitator = name
                                              newSchedule[index].facilitator_id = contactId || ''
                                              newSchedule[index].facilitator_is_user = isUser || false
                                              setFormData({ ...formData, program_schedule: newSchedule })
                                            }}
                                            placeholder={t('events.itemLabels.facilitator')}
                                            className="input text-sm"
                                          />
                                        </div>
                                        <label className="flex items-center cursor-pointer whitespace-nowrap">
                                          <input
                                            type="checkbox"
                                            checked={item.has_ministry_team}
                                            onChange={(e) => {
                                              const newSchedule = [...formData.program_schedule]
                                              newSchedule[index].has_ministry_team = e.target.checked
                                              setFormData({ ...formData, program_schedule: newSchedule })
                                            }}
                                            className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                                          />
                                          <span className="ml-1.5 text-xs font-medium text-gray-700">{t('teams.ministryTeam')}</span>
                                        </label>
                                      </div>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => setEditingProgramItem(null)}
                                      className="text-xs text-teal-600 hover:text-teal-800 font-semibold"
                                    >
                                      {t('common.done')}
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setEditingProgramItem(index)}
                                    className="text-left w-full py-2 px-3 text-sm text-gray-900 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                                  >
                                    <div className="font-semibold">{item.title || t('common.clickToEdit')}</div>
                                    {getDetailsElements().length > 0 && (
                                      <div className="text-xs text-gray-600 mt-1 flex flex-wrap items-center gap-x-1">
                                        {getDetailsElements().map((el, i) => (
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
                                    const newSchedule = formData.program_schedule.filter((_, i) => i !== index)
                                    setFormData({ ...formData, program_schedule: newSchedule })
                                    if (editingProgramItem === index) setEditingProgramItem(null)
                                  }}
                                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title={t('common.remove')}
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
                  onClick={() => {
                    setFormData({
                      ...formData,
                      program_schedule: [...formData.program_schedule, { offset_minutes: getNextProgramTime(), title: '', type: 'other', person: '', person_id: '', person_is_user: false, key: '', bpm: '', soluflow_song_id: undefined, speaker: '', speaker_id: '', speaker_is_user: false, topic: '', points: '', prayer_leader: '', prayer_leader_id: '', prayer_leader_is_user: false, facilitator: '', facilitator_id: '', facilitator_is_user: false, has_ministry_team: false }]
                    })
                  }}
                  className="btn-secondary mt-3"
                >
                  {t('events.addProgramItem')}
                </button>
              </div>
            </div>

            {/* Post-Event Schedule */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('events.postEventSchedule')}</h3>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.has_post_event_schedule}
                    onChange={(e) => setFormData({ ...formData, has_post_event_schedule: e.target.checked })}
                    className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
                  />
                  <span className="ml-2 text-sm font-semibold text-gray-700">{t('events.includePostEventSchedule')}</span>
                </label>
              </div>

              {formData.has_post_event_schedule && (
                <div className="overflow-x-auto">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handlePostEventDragEnd}
                  >
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-gray-200">
                          <th className="w-8"></th>
                          <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700 w-24">{t('common.time')}</th>
                          <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">{t('common.item')}</th>
                          <th className="w-20"></th>
                        </tr>
                      </thead>
                      <SortableContext
                        items={formData.post_event_schedule.map((_, i) => `post-${i}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        <tbody>
                          {formData.post_event_schedule.map((item, index) => (
                            <SortableRow key={`post-${index}`} id={`post-${index}`}>
                              <td className="py-2 px-3 w-24">
                                <input
                                  type="time"
                                  value={item.offset_minutes !== null ? calculateTime(item.offset_minutes) : ''}
                                  onChange={(e) => {
                                    if (!e.target.value) return
                                    const [hours, minutes] = e.target.value.split(':').map(Number)
                                    const [eventHours, eventMinutes] = formData.event_time.split(':').map(Number)
                                    const totalMinutes = hours * 60 + minutes
                                    const eventTotalMinutes = eventHours * 60 + eventMinutes
                                    const offset = totalMinutes - eventTotalMinutes

                                    const newSchedule = [...formData.post_event_schedule]
                                    newSchedule[index].offset_minutes = offset
                                    setFormData({ ...formData, post_event_schedule: newSchedule })
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
                                        const newSchedule = [...formData.post_event_schedule]
                                        newSchedule[index].item = e.target.value
                                        setFormData({ ...formData, post_event_schedule: newSchedule })
                                      }}
                                      className="input text-sm"
                                      placeholder={t('events.schedule.postEventItemPlaceholder')}
                                      autoFocus
                                    />
                                    <input
                                      type="text"
                                      value={item.notes}
                                      onChange={(e) => {
                                        const newSchedule = [...formData.post_event_schedule]
                                        newSchedule[index].notes = e.target.value
                                        setFormData({ ...formData, post_event_schedule: newSchedule })
                                      }}
                                      className="input text-sm"
                                      placeholder={t('events.schedule.notesOptional')}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setEditingPostEventItem(null)}
                                      className="text-xs text-teal-600 hover:text-teal-800 font-semibold"
                                    >
                                      {t('common.done')}
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setEditingPostEventItem(index)}
                                    className="text-left w-full py-2 px-3 text-sm text-gray-900 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                                  >
                                    <div className="font-semibold">{item.item || t('common.clickToEdit')}</div>
                                    {item.notes && (
                                      <div className="text-xs text-gray-600 mt-1">
                                        {item.notes}
                                      </div>
                                    )}
                                  </button>
                                )}
                              </td>
                              <td className="py-2 px-3 align-top">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newSchedule = formData.post_event_schedule.filter((_, i) => i !== index)
                                    setFormData({ ...formData, post_event_schedule: newSchedule })
                                    if (editingPostEventItem === index) setEditingPostEventItem(null)
                                  }}
                                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title={t('common.remove')}
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
                    onClick={() => {
                      setFormData({
                        ...formData,
                        post_event_schedule: [...formData.post_event_schedule, { item: '', offset_minutes: getNextPostEventTime(), notes: '' }]
                      })
                    }}
                    className="btn-secondary mt-3"
                  >
                    {t('events.addPostEventItem')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold gradient-text mb-2">{t('events.technicalRider')}</h2>
              <p className="text-gray-600">{t('events.wizard.riderDesc2')}</p>
            </div>

            {/* Worship Team Section */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('events.worshipTeam')}</h3>
              <div className="space-y-4">
                {(formData.worship_team || []).map((member, memberIndex) => (
                  <div key={memberIndex} className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">{t('events.role')}</label>
                        <input
                          type="text"
                          value={member.role}
                          onChange={(e) => {
                            const newTeam = [...formData.worship_team]
                            newTeam[memberIndex].role = e.target.value
                            setFormData({ ...formData, worship_team: newTeam })
                          }}
                          className="input text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">{t('events.person')}</label>
                        <ContactAutocomplete
                          value={member.person}
                          contactId={member.contact_id}
                          isUser={member.is_user}
                          freeTextOnly
                          onChange={(name, contactId, isUser) => {
                            const newTeam = [...formData.worship_team]
                            newTeam[memberIndex].person = name
                            newTeam[memberIndex].contact_id = contactId || ''
                            newTeam[memberIndex].is_user = isUser || false
                            newTeam[memberIndex].user_id = contactId || ''
                            setFormData({ ...formData, worship_team: newTeam })
                          }}
                          placeholder={t('events.wizard.enterName')}
                          className="input text-sm"
                        />
                      </div>
                    </div>

                    {/* E-Drums Toggle for Drums role */}
                    {isDrumsRole(member.role) && (
                      <div className="mb-3">
                        <label className="flex items-center p-2 bg-white border border-gray-200 rounded-lg">
                          <input
                            type="checkbox"
                            checked={member.eDrums || false}
                            onChange={(e) => {
                              const newTeam = [...formData.worship_team]
                              newTeam[memberIndex].eDrums = e.target.checked
                              setFormData({ ...formData, worship_team: newTeam })
                            }}
                            className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                          />
                          <span className="ml-2 text-sm font-semibold text-gray-900">E-Drums</span>
                        </label>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-semibold text-gray-600">
                          {isDrumsRole(member.role) && member.eDrums ? t('events.needsEDrums') : t('events.needs')}
                        </label>
                        <button
                          type="button"
                          onClick={() => setEditingNeedsIndex(editingNeedsIndex === memberIndex ? null : memberIndex)}
                          className="text-xs text-teal-600 hover:text-teal-700 font-semibold"
                        >
                          {editingNeedsIndex === memberIndex ? t('common.done') : t('common.edit')}
                        </button>
                      </div>

                      {editingNeedsIndex === memberIndex ? (
                        // Edit mode - show input fields
                        <div className="space-y-2">
                          {(isDrumsRole(member.role) && member.eDrums ? member.eDrumsNeeds : member.needs)?.map((need, needIndex) => (
                            <div key={needIndex} className="flex gap-2">
                              <input
                                type="text"
                                value={need}
                                onChange={(e) => {
                                  const newTeam = [...formData.worship_team]
                                  if (isDrumsRole(member.role) && member.eDrums) {
                                    newTeam[memberIndex].eDrumsNeeds![needIndex] = e.target.value
                                  } else {
                                    newTeam[memberIndex].needs[needIndex] = e.target.value
                                  }
                                  setFormData({ ...formData, worship_team: newTeam })
                                }}
                                className="input text-sm flex-1"
                                placeholder={t('events.wizard.neededItem')}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newTeam = [...formData.worship_team]
                                  if (isDrumsRole(member.role) && member.eDrums) {
                                    newTeam[memberIndex].eDrumsNeeds = newTeam[memberIndex].eDrumsNeeds!.filter((_: string, i: number) => i !== needIndex)
                                  } else {
                                    newTeam[memberIndex].needs = newTeam[memberIndex].needs.filter((_, i) => i !== needIndex)
                                  }
                                  setFormData({ ...formData, worship_team: newTeam })
                                }}
                                className="btn-secondary text-sm"
                              >
                                {t('common.remove')}
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const newTeam = [...formData.worship_team]
                              if (isDrumsRole(member.role) && member.eDrums) {
                                if (!newTeam[memberIndex].eDrumsNeeds) {
                                  newTeam[memberIndex].eDrumsNeeds = []
                                }
                                newTeam[memberIndex].eDrumsNeeds.push('')
                              } else {
                                newTeam[memberIndex].needs.push('')
                              }
                              setFormData({ ...formData, worship_team: newTeam })
                            }}
                            className="btn-secondary text-sm"
                          >
                            {t('events.addNeed')}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const newTeam = (formData.worship_team || []).filter((_, i) => i !== memberIndex)
                              setFormData({ ...formData, worship_team: newTeam })
                              setEditingNeedsIndex(null)
                            }}
                            className="btn-secondary text-sm mt-2"
                          >
                            {t('events.removeTeamMember')}
                          </button>
                        </div>
                      ) : (
                        // View mode - show simple text list
                        <div className="text-sm text-gray-700">
                          {(isDrumsRole(member.role) && member.eDrums ? member.eDrumsNeeds : member.needs)?.map((need, needIndex) => (
                            <span key={needIndex}>
                              {need}
                              {needIndex < ((isDrumsRole(member.role) && member.eDrums ? member.eDrumsNeeds : member.needs)?.length || 0) - 1 && ', '}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      worship_team: [...(formData.worship_team || []), { role: '', person: '', contact_id: '', is_user: false, user_id: '', needs: [''] }]
                    })
                  }}
                  className="btn-secondary"
                >
                  {t('events.addTeamMember')}
                </button>
              </div>
            </div>

            {/* Prayer Leader Section */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('events.prayerLeader')}</h3>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.has_prayer_leader}
                    onChange={(e) => setFormData({ ...formData, has_prayer_leader: e.target.checked })}
                    className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
                  />
                  <span className="ml-2 text-sm font-semibold text-gray-700">{t('events.includePrayerLeader')}</span>
                </label>
              </div>

              {formData.has_prayer_leader && (
                <div className="space-y-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-orange-200">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{t('events.person')}</label>
                    <ContactAutocomplete
                      value={formData.prayer_leader.person}
                      contactId={formData.prayer_leader.user_id}
                      freeTextOnly
                      onChange={(name, contactId, isUser) => setFormData({
                        ...formData,
                        prayer_leader: { ...formData.prayer_leader, person: name, user_id: contactId, is_user: isUser }
                      })}
                      placeholder={t('events.wizard.enterName')}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{t('events.topic')}</label>
                    <input
                      type="text"
                      value={formData.prayer_leader.topic}
                      onChange={(e) => setFormData({
                        ...formData,
                        prayer_leader: { ...formData.prayer_leader, topic: e.target.value }
                      })}
                      className="input"
                      placeholder={t('events.wizard.prayerTopicPlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{t('events.description')}</label>
                    <textarea
                      value={formData.prayer_leader.description}
                      onChange={(e) => setFormData({
                        ...formData,
                        prayer_leader: { ...formData.prayer_leader, description: e.target.value }
                      })}
                      className="input"
                      rows={3}
                      placeholder={t('events.wizard.additionalDetailsPlaceholder')}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Production Team Section */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('events.productionTeam')}</h3>
              <div className="space-y-4">
                {/* Soundman */}
                <div className="p-4 bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl border border-teal-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">{t('events.soundman')}</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">{t('events.person')}</label>
                      <ContactAutocomplete
                        value={formData.production_team.soundman.person}
                        contactId={formData.production_team.soundman.contact_id}
                        isUser={formData.production_team.soundman.is_user}
                        freeTextOnly
                        onChange={(name, contactId, isUser) => setFormData({
                          ...formData,
                          production_team: {
                            ...formData.production_team,
                            soundman: { ...formData.production_team.soundman, person: name, contact_id: contactId || '', is_user: isUser || false, user_id: contactId || '' }
                          }
                        })}
                        placeholder={t('events.wizard.enterName')}
                        className="input text-sm"
                      />
                    </div>
                    {!formData.production_team.soundman.contact_id && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">{t('common.contact')}</label>
                        <input
                          type="text"
                          value={formData.production_team.soundman.contact}
                          onChange={(e) => setFormData({
                            ...formData,
                            production_team: {
                              ...formData.production_team,
                              soundman: { ...formData.production_team.soundman, contact: e.target.value }
                            }
                          })}
                          className="input text-sm"
                          placeholder={t('events.wizard.contactInfoPlaceholder')}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Projection */}
                <div className="p-4 bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl border border-teal-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">{t('events.projection')}</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">{t('events.person')}</label>
                      <ContactAutocomplete
                        value={formData.production_team.projection.person}
                        contactId={formData.production_team.projection.contact_id}
                        isUser={formData.production_team.projection.is_user}
                        freeTextOnly
                        onChange={(name, contactId, isUser) => setFormData({
                          ...formData,
                          production_team: {
                            ...formData.production_team,
                            projection: { ...formData.production_team.projection, person: name, contact_id: contactId || '', is_user: isUser || false, user_id: contactId || '' }
                          }
                        })}
                        placeholder={t('events.wizard.enterName')}
                        className="input text-sm"
                      />
                    </div>
                    {!formData.production_team.projection.contact_id && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">{t('common.contact')}</label>
                        <input
                          type="text"
                          value={formData.production_team.projection.contact}
                          onChange={(e) => setFormData({
                            ...formData,
                            production_team: {
                              ...formData.production_team,
                              projection: { ...formData.production_team.projection, contact: e.target.value }
                            }
                          })}
                          className="input text-sm"
                          placeholder={t('events.wizard.contactInfoPlaceholder')}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Host */}
                <div className="p-4 bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl border border-teal-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">{t('events.host')}</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">{t('events.person')}</label>
                      <ContactAutocomplete
                        value={formData.production_team.host.person}
                        contactId={formData.production_team.host.contact_id}
                        isUser={formData.production_team.host.is_user}
                        freeTextOnly
                        onChange={(name, contactId, isUser) => setFormData({
                          ...formData,
                          production_team: {
                            ...formData.production_team,
                            host: { ...formData.production_team.host, person: name, contact_id: contactId || '', is_user: isUser || false, user_id: contactId || '' }
                          }
                        })}
                        placeholder={t('events.wizard.enterName')}
                        className="input text-sm"
                      />
                    </div>
                    {!formData.production_team.host.contact_id && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">{t('common.contact')}</label>
                        <input
                          type="text"
                          value={formData.production_team.host.contact}
                          onChange={(e) => setFormData({
                            ...formData,
                            production_team: {
                              ...formData.production_team,
                              host: { ...formData.production_team.host, contact: e.target.value }
                            }
                          })}
                          className="input text-sm"
                          placeholder={t('events.wizard.contactInfoPlaceholder')}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold gradient-text mb-2">{t('events.wizard.reviewConfirm')}</h2>
              <p className="text-gray-600">{t('events.wizard.reviewConfirmDesc')}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-2xl p-6 space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{t('events.eventType')}</p>
                <p className="text-lg font-bold text-gray-900 capitalize">{formData.type.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{t('events.eventTitle')}</p>
                <p className="text-lg font-bold text-gray-900">{formData.title || t('common.notSet')}</p>
              </div>
              {formData.description && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{t('events.description')}</p>
                  <p className="text-sm text-gray-700">{formData.description}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{t('events.eventDateTime')}</p>
                <p className="text-sm font-bold text-gray-900">
                  {formData.event_date
                    ? `${new Date(formData.event_date).toLocaleDateString()} ${formData.event_time}`
                    : t('common.notSet')}
                </p>
              </div>
              {formData.address && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{t('events.location')}</p>
                  <p className="text-sm font-bold text-gray-900">{formData.address}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{t('events.phase')}</p>
                  <p className="text-sm font-bold text-gray-900 capitalize">{formData.phase.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{t('events.statusLabel')}</p>
                  <p className="text-sm font-bold text-gray-900 capitalize">{formData.status}</p>
                </div>
              </div>
              {formData.program_schedule.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{t('events.programScheduleCount', { count: formData.program_schedule.length })}</p>
                  <p className="text-xs text-gray-600">{t('events.viewFullSchedule')}</p>
                </div>
              )}
              {formData.has_post_event_schedule && formData.post_event_schedule.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{t('events.postEventScheduleCount', { count: formData.post_event_schedule.length })}</p>
                  <p className="text-xs text-gray-600">
                    {formData.post_event_schedule.map((item, index) => (
                      <span key={index}>
                        {item.item}
                        {index < formData.post_event_schedule.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </p>
                </div>
              )}
              {(formData.contact_person || formData.contact_phone || formData.special_requirements) && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{t('events.technicalRider')}</p>
                  {formData.contact_person && (
                    <p className="text-sm text-gray-700">{t('common.contact')}: {formData.contact_person}</p>
                  )}
                  {formData.contact_phone && (
                    <p className="text-sm text-gray-700">{t('common.phone')}: {formData.contact_phone}</p>
                  )}
                  <p className="text-sm text-gray-700">
                    {t('events.soundman')}: {formData.soundman_needed ? t('common.yes') : t('common.no')} |
                    {t('events.projection')}: {formData.projection_needed ? t('common.yes') : t('common.no')}
                  </p>
                  {formData.special_requirements && (
                    <p className="text-sm text-gray-700 mt-1">{formData.special_requirements}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // Show loading state while fetching event data in edit mode
  if (isEditMode && eventLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">{t('events.loadingEventData')}</div>
      </div>
    )
  }

  // Sortable Row Component
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

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header with draft indicator */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isEditMode ? t('events.editEvent') : t('events.createNewEvent')}</h1>
          {draftSaved && !isEditMode && (
            <p className="text-sm text-green-600 flex items-center mt-1">
              <Save className="w-4 h-4 mr-1" />
              {t('events.draftSaved')}
            </p>
          )}
        </div>
        {!isEditMode && (
          <button
            onClick={clearDraft}
            className="btn-secondary text-sm"
          >
            <X className="w-4 h-4 mr-1" />
            {t('events.clearDraftExit')}
          </button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="mb-12">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            // In edit mode, skip rendering step 1 (Template)
            if (isEditMode && step.id === 1) {
              return null
            }

            return (
              <div key={step.id} className="flex-1 relative">
                <div className="flex items-center">
                  {/* Step Circle */}
                  <div
                    onClick={() => isEditMode && step.id > 1 && setCurrentStep(step.id)}
                    className={`relative z-10 w-12 h-12 flex items-center justify-center rounded-full font-bold transition-all duration-300 ${
                      currentStep > step.id
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                        : currentStep === step.id
                        ? 'bg-gradient-to-r from-blue-600 to-teal-600 text-white shadow-xl scale-110'
                        : 'bg-gray-200 text-gray-500'
                    } ${isEditMode && step.id > 1 ? 'cursor-pointer hover:scale-105' : ''}`}
                  >
                    {currentStep > step.id ? (
                      <Check className="w-6 h-6" />
                    ) : (
                      <span>{step.id}</span>
                    )}
                  </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 transition-all duration-500 ${
                      currentStep > step.id
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                        : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>

              {/* Step Label */}
              <div className="mt-3 text-center">
                <p
                  className={`text-sm font-semibold ${
                    currentStep >= step.id ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  {step.name}
                </p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
            </div>
          )
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="card min-h-[400px]">
        {error && (
          <div className="mb-6 rounded-xl bg-red-50 border-2 border-red-200 p-4">
            <p className="text-sm text-red-600 font-medium">{error}</p>
          </div>
        )}

        <div className="animate-fade-in">
          {renderStepContent()}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <button
          onClick={(currentStep === 1 || (isEditMode && currentStep === 2)) ? () => navigate(`/events${isEditMode ? `/${id}` : ''}`) : handlePrevious}
          className="btn-secondary"
        >
          <ArrowLeft className="w-4 h-4 mr-2 inline" />
          {(currentStep === 1 || (isEditMode && currentStep === 2)) ? t('common.cancel') : t('events.previous')}
        </button>

        <div className="flex gap-3">
          {isEditMode ? (
            // Edit mode: Always show Update button, and Next button if not on last step
            <>
              {currentStep < steps.length && (
                <button onClick={handleNext} className="btn-secondary">
                  {t('events.next')}
                  <ArrowRight className="w-4 h-4 ml-2 inline" />
                </button>
              )}
              <button
                onClick={handleSubmit}
                disabled={updateEvent.isPending}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateEvent.isPending ? t('events.updating') : t('events.updateEvent')}
              </button>
            </>
          ) : (
            // Create mode: Show Next or Create button
            currentStep < steps.length ? (
              <button onClick={handleNext} className="btn-primary">
                {t('events.next')}
                <ArrowRight className="w-4 h-4 ml-2 inline" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={createEvent.isPending}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createEvent.isPending ? t('events.creating') : t('events.createEvent')}
              </button>
            )
          )}
        </div>
      </div>

    </div>
  )
}
