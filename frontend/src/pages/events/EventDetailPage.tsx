import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Loader2,
  Edit,
  Archive,
  Trash2,
  // UserPlus,
  // X,
  Music,
  ExternalLink,
  Clock,
  Mic2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Monitor,
  Copy,
  Check,
  Mail,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import { createSoluFlowService } from '@/lib/soluflowApi'
import { buildMergedSchedule, hasSetlistChanged } from '@/lib/scheduleSync'
import { useEvent, useUpdateEvent, useDeleteEvent, useFlowService, useSetlist, useRespondToTeamInvite } from '@/hooks/useEvents'
import { useTasks, useUpdateTask } from '@/hooks/useTasks'
import { useSendInvitations } from '@/hooks/useInvitations'
import InvitationStatusBadge from '@/components/InvitationStatusBadge'
import { useRoleAssignments, useCreateRoleAssignment, useDeleteRoleAssignment } from '@/hooks/useRoleAssignments'
import { useAuthStore } from '@/stores/authStore'
import { formatDateTime } from '@/lib/utils'
import Badge from '@/components/Badge'
import PersonHoverCard from '@/components/PersonHoverCard'
import TaskCard from '@/components/TaskCard'
import { useEventRoom } from '@/hooks/useEventRoom'
import type { Task } from '@/types'

type Tab = 'overview' | 'tasks' | 'files' | 'comments'

// Wrapper component to handle task updates
function TaskCardWrapper({ task, readOnly }: { task: any; readOnly?: boolean }) {
  const updateTask = useUpdateTask(task.id)
  const updateTaskRef = useRef(updateTask)
  updateTaskRef.current = updateTask
  const { user: currentUser } = useAuthStore()

  const handleToggle = useCallback((_taskId: string, newStatus: 'done' | 'not_started') => {
    updateTaskRef.current.mutate({ status: newStatus })
  }, [])

  const handleUpdateLink = useCallback((_taskId: string, link: string | null) => {
    updateTaskRef.current.mutate({ link } as any)
  }, [])

  const handleUpdateTask = useCallback((_taskId: string, data: Partial<Task>) => {
    updateTaskRef.current.mutate(data)
  }, [])

  return (
    <TaskCard
      task={task}
      currentUser={currentUser}
      onToggle={handleToggle}
      onUpdateLink={readOnly ? undefined : handleUpdateLink}
      onUpdateTask={handleUpdateTask}
    />
  )
}

export default function EventDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  useEventRoom(id)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user: currentUser } = useAuthStore()
  const initialTab = (searchParams.get('tab') as Tab) || 'overview'
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)
  // TODO: Role management UI state (commented with their handlers)
  // const [showAddRole, setShowAddRole] = useState(false)
  // const [selectedUserId, setSelectedUserId] = useState('')
  // const [selectedRole, setSelectedRole] = useState<EventRole>('contributor')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [showRider, setShowRider] = useState(false)
  const [showTeams, setShowTeams] = useState(false)
  const [soluflowServiceUrl] = useState<string | null>(null)
  const [serviceError] = useState<string | null>(null)
  const [solucastCopied, setSolucastCopied] = useState(false)
  const [showSendInvitations, setShowSendInvitations] = useState(false)
  const [invitationResult, setInvitationResult] = useState<{ sent: number; skipped: number; skippedNames: string[]; alreadyResponded: number; errors: string[] } | null>(null)
  const [invitationError, setInvitationError] = useState<string | null>(null)
  const sendInvitations = useSendInvitations()

  const queryClient = useQueryClient()
  const { data: event, isLoading } = useEvent(id!)
  const { data: tasks, isLoading: tasksLoading } = useTasks({ event_id: id })
  const { data: roleAssignments } = useRoleAssignments({ event_id: id })
  const createRoleAssignment = useCreateRoleAssignment()
  const deleteRoleAssignment = useDeleteRoleAssignment()
  const deleteEvent = useDeleteEvent()
  const { data: linkedService } = useFlowService(event?.flow_service_id)
  const { data: linkedSetlist } = useSetlist(event?.setlist_id)
  const updateEvent = useUpdateEvent()
  const respondToTeamInvite = useRespondToTeamInvite()
  const syncedRef = useRef(false)

  // Read-only: user cannot edit unless backend says can_edit
  const canEdit = event?.can_edit ?? false

  // Auto-sync: when linked service has changed songs, update the saved schedule
  useEffect(() => {
    if (!linkedService?.songs || !event?.program_agenda?.program_schedule || syncedRef.current) return
    if (!hasSetlistChanged(event.program_agenda.program_schedule, linkedService.songs)) return

    syncedRef.current = true
    const merged = buildMergedSchedule(event.program_agenda.program_schedule, linkedService.songs)
    updateEvent.mutate({
      id: event.id,
      data: {
        program_agenda: {
          ...event.program_agenda,
          program_schedule: merged,
        },
        flow_service_id: event.flow_service_id,
      } as any,
    }, {
      onSuccess: () => {
        api.post(`/integration/events/${event.id}/generate-solucast`)
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ['setlists'] })
            queryClient.invalidateQueries({ queryKey: ['events', 'detail', id] })
          })
          .catch(() => {})
      },
    })
  }, [linkedService, event]) // eslint-disable-line react-hooks/exhaustive-deps

  // Build a map of soluflow_song_id → live transposed key from the linked service
  const liveKeyMap = useMemo(() => {
    if (!linkedService?.songs) return new Map<string, string>()
    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    const flatToSharp: Record<string, string> = { 'Db': 'C#', 'Eb': 'D#', 'Fb': 'E', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#', 'Cb': 'B' }
    const map = new Map<string, string>()
    for (const fs of linkedService.songs) {
      if (!fs.song) continue
      const origKey = fs.song.musicalKey || ''
      const semitones = fs.transposition || 0
      if (!origKey || !semitones) {
        map.set(fs.song.id, origKey)
      } else {
        const isMinor = origKey.endsWith('m')
        const root = isMinor ? origKey.slice(0, -1) : origKey
        const normalized = flatToSharp[root] || root
        const idx = keys.indexOf(normalized)
        map.set(fs.song.id, idx === -1 ? origKey : keys[((idx + semitones) % 12 + 12) % 12] + (isMinor ? 'm' : ''))
      }
    }
    return map
  }, [linkedService])

  // Auto-dismiss invitation result banner
  useEffect(() => {
    if (!invitationResult) return
    const timer = setTimeout(() => setInvitationResult(null), 8000)
    return () => clearTimeout(timer)
  }, [invitationResult])

  // Build invitation status maps keyed by email, name, and contact/user ID
  const invitationStatusMap = useMemo(() => {
    const byEmail = new Map<string, 'pending' | 'confirmed' | 'declined'>()
    const byName = new Map<string, 'pending' | 'confirmed' | 'declined'>()
    const byId = new Map<string, 'pending' | 'confirmed' | 'declined'>()
    if (event?.invitations) {
      for (const inv of event.invitations) {
        byEmail.set(inv.email.toLowerCase(), inv.status)
        byName.set(inv.name.toLowerCase(), inv.status)
        if (inv.user_id) byId.set(inv.user_id, inv.status)
        if (inv.contact_id) byId.set(inv.contact_id, inv.status)
      }
    }
    return { byEmail, byName, byId }
  }, [event?.invitations])

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
        <h3 className="text-lg font-medium text-gray-900 mb-2">{t('events.eventNotFound')}</h3>
        <Link to="/events" className="text-primary-600 hover:text-primary-700">
          ← {t('events.backToEvents')}
        </Link>
      </div>
    )
  }

  // TODO: Role management UI - temporarily commented to avoid noUnusedLocals
  // const eventRoles: EventRole[] = [
  //   'event_manager', 'worship_lead', 'media_lead', 'logistics',
  //   'hospitality', 'comms', 'contributor', 'guest',
  // ]
  // const roleLabels: Record<EventRole, string> = {
  //   event_manager: 'Event Manager', worship_lead: 'Worship Lead',
  //   media_lead: 'Media Lead', logistics: 'Logistics',
  //   hospitality: 'Hospitality', comms: 'Communications',
  //   contributor: 'Contributor', guest: 'Guest',
  // }
  // const handleAddRole = async () => { ... }
  // const handleRemoveRole = async (assignmentId: string) => { ... }
  void createRoleAssignment
  void deleteRoleAssignment

  const handleDeleteEvent = async () => {
    if (!id) return

    try {
      await deleteEvent.mutateAsync(id)
      navigate('/events')
    } catch (error) {
      console.error('Failed to delete event:', error)
    }
  }

  // TODO: SoluFlow service creation - temporarily commented to avoid noUnusedLocals
  // const handleCreateSoluFlowService = async () => { ... }
  void createSoluFlowService

  const tabs = [
    { id: 'overview', label: t('events.tabs.overview') },
    { id: 'tasks', label: t('events.tabs.tasks'), count: tasks?.length },
    { id: 'files', label: t('events.tabs.files'), count: 0 },
    { id: 'comments', label: t('events.tabs.comments'), count: 0 },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/events"
          className="text-gray-400 hover:text-gray-600"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            {event.tags?.map((tag) => (
              <Badge key={tag} variant="default" size="sm">
                {tag}
              </Badge>
            ))}
            {event.created_by === currentUser?.id ? (
              <Badge variant="primary" size="sm">{t('events.eventManager')}</Badge>
            ) : (
              <>
                {event.team_member_status === 'pending' && (
                  <Badge variant="warning" size="sm">{t('events.invited')}</Badge>
                )}
                {event.team_member_status === 'confirmed' && (
                  <Badge variant="primary" size="sm">{t('events.teamMember')}</Badge>
                )}
              </>
            )}
          </div>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Link to={`/events/${id}/edit`} className="btn-secondary">
              <Edit className="w-4 h-4 mr-2" />
              {t('common.edit')}
            </Link>
            <button className="btn-secondary">
              <Archive className="w-4 h-4 mr-2" />
              {t('common.archive')}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="btn-secondary text-red-600 hover:bg-red-50 hover:border-red-300"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t('common.delete')}
            </button>
            {!!(event.event_teams?.length || event.program_agenda?.program_schedule?.length) && (
              <button
                onClick={() => setShowSendInvitations(true)}
                disabled={sendInvitations.isPending}
                className="btn-secondary text-teal-600 hover:bg-teal-50 hover:border-teal-300"
              >
                <Mail className="w-4 h-4 mr-2" />
                {sendInvitations.isPending ? t('events.sending') : t('events.sendInvitations')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 text-gray-400">({tab.count})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Details Card */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('events.details')}
              </h3>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {formatDateTime(event.date_start)}
                </span>

                {event.location_name && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([event.location_name, event.address].filter(Boolean).join(', '))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-teal-600 transition-colors"
                  >
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="hover:underline">{event.location_name}{event.address ? `, ${event.address}` : ''}</span>
                  </a>
                )}

                {event.est_attendance && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                    <Users className="w-4 h-4 text-gray-400" />
                    {event.est_attendance} {t('events.people')}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            {event.description && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('events.description')}
                </h3>
                <p className="text-sm text-gray-600">{event.description}</p>
              </div>
            )}

            {/* Action Cards — shown when data is missing (hidden for team-only members) */}
            {canEdit && (!event.program_agenda || !event.rider_details || !event.event_teams) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {!event.event_teams && (
                  <Link
                    to={`/events/${id}/teams`}
                    className="group card flex items-center gap-4 hover:border-teal-300 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center group-hover:bg-teal-200 transition-colors">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 group-hover:text-teal-700 transition-colors">
                        {t('events.createTeams')}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {t('events.createTeamsDesc')}
                      </p>
                    </div>
                  </Link>
                )}
                {!event.program_agenda && (
                  <Link
                    to={`/events/${id}/schedule`}
                    className="group card flex items-center gap-4 hover:border-teal-300 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center group-hover:bg-teal-200 transition-colors">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 group-hover:text-teal-700 transition-colors">
                        {t('events.createSchedule')}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {t('events.createScheduleDesc')}
                      </p>
                    </div>
                  </Link>
                )}
                {!event.rider_details && (() => {
                  const hasWorshipTeam = event.event_teams?.some((t: any) =>
                    t.name?.toLowerCase().includes('worship') && t.members?.some((m: any) => m.name?.trim())
                  )
                  return hasWorshipTeam ? (
                    <Link
                      to={`/events/${id}/rider`}
                      className="group card flex items-center gap-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        <Mic2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                          {t('events.createRider')}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {t('events.createRiderDesc')}
                        </p>
                      </div>
                    </Link>
                  ) : (
                    <div className="card flex items-center gap-4 opacity-40 cursor-not-allowed">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center">
                        <Mic2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-400">
                          {t('events.createRider')}
                        </h4>
                        <p className="text-xs text-gray-400">
                          {t('events.createRiderFirst')}
                        </p>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Program & Agenda */}
            {event.program_agenda && (
              <div className="card">
                <button
                  onClick={() => setShowSchedule(!showSchedule)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {t('events.schedule')}
                    </h3>
                    {!showSchedule && (
                      <span className="text-xs text-gray-500 font-normal">
                        {[
                          event.program_agenda.pre_event_schedule?.length && `${event.program_agenda.pre_event_schedule.length} pre-event`,
                          event.program_agenda.program_schedule?.length && `${event.program_agenda.program_schedule.length} program`,
                          event.program_agenda.post_event_schedule?.length && `${event.program_agenda.post_event_schedule.length} post-event`,
                        ].filter(Boolean).join(' · ')} items
                      </span>
                    )}
                  </div>
                  {showSchedule ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {showSchedule && <div className="mt-4">
                {/* Pre-Event */}
                {event.program_agenda.pre_event_schedule && event.program_agenda.pre_event_schedule.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('events.preEvent')}</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2 border-gray-200">
                            <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700 w-24">{t('common.time')}</th>
                            <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">{t('common.item')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {event.program_agenda.pre_event_schedule.map((item, idx) => {
                            const eventTime = new Date(event.date_start)
                            const itemTime = new Date(eventTime.getTime() + item.offset_minutes * 60000)
                            return (
                              <tr key={idx} className="border-b border-gray-100">
                                <td className="py-2 px-3 text-sm text-gray-600 w-24">
                                  {itemTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="py-2 px-3">
                                  <div className="font-semibold text-sm text-gray-900">{item.item}</div>
                                  {item.notes && (
                                    <div className="text-xs text-gray-600 mt-1">
                                      {item.notes}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Program Schedule */}
                {event.program_agenda.program_schedule && event.program_agenda.program_schedule.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('events.programSchedule')}</h4>

                    {/* SoluFlow Success message */}
                    {soluflowServiceUrl && (
                      <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm font-semibold text-green-900 mb-1">{t('events.serviceCreatedSuccess')}</p>
                        <a
                          href={soluflowServiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {t('events.openInSoluFlow')}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {/* Error message */}
                    {serviceError && (
                      <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">{serviceError}</p>
                      </div>
                    )}

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2 border-gray-200">
                            <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700 w-24">{t('common.time')}</th>
                            <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">{t('common.item')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {event.program_agenda.program_schedule.map((item, idx) => {
                            const eventTime = new Date(event.date_start)
                            const hasTime = item.offset_minutes != null
                            const itemTime = hasTime ? new Date(eventTime.getTime() + item.offset_minutes * 60000) : null

                            // Build details as JSX with hover cards for person names
                            const personWithBadge = (name: string, contactId?: string, isUser?: boolean) => {
                              const status = (contactId && invitationStatusMap.byId.get(contactId))
                                || invitationStatusMap.byName.get(name.toLowerCase())
                              return (
                                <span className="inline-flex items-center gap-1">
                                  <PersonHoverCard name={name} contactId={contactId} isUser={isUser} />
                                  {status && <InvitationStatusBadge status={status} />}
                                </span>
                              )
                            }

                            const getDetailsElements = () => {
                              const parts: React.ReactNode[] = []
                              if (item.type === 'song') {
                                if (item.person) parts.push(<span key="person">{personWithBadge(item.person, item.person_id, item.person_is_user)}</span>)
                                const liveKey = item.soluflow_song_id ? liveKeyMap.get(item.soluflow_song_id) : null
                                const displayKey = liveKey || item.key
                                if (displayKey) parts.push(<span key="key">{t('events.itemLabels.key')}: {displayKey}</span>)
                                if (item.bpm) parts.push(<span key="bpm">{t('events.itemLabels.bpm')}: {item.bpm}</span>)
                              } else if (item.type === 'share') {
                                if (item.speaker) parts.push(<span key="speaker">{t('events.itemLabels.speaker')}: {personWithBadge(item.speaker, item.speaker_id, item.speaker_is_user)}</span>)
                                if (item.topic) parts.push(<span key="topic">{t('events.itemLabels.topic')}: {item.topic}</span>)
                              } else if (item.type === 'prayer') {
                                if (item.prayer_leader) parts.push(<span key="leader">{t('events.itemLabels.leader')}: {personWithBadge(item.prayer_leader, item.prayer_leader_id, item.prayer_leader_is_user)}</span>)
                                if (item.topic) parts.push(<span key="topic">{t('events.itemLabels.topic')}: {item.topic}</span>)
                              } else if (item.type === 'ministry') {
                                if (item.facilitator) parts.push(<span key="facilitator">{t('events.itemLabels.facilitator')}: {personWithBadge(item.facilitator, item.facilitator_id, item.facilitator_is_user)}</span>)
                                if (item.has_ministry_team) parts.push(<span key="ministry">{t('events.itemLabels.ministryTeam')}</span>)
                              } else if (item.person) {
                                parts.push(<span key="person">{personWithBadge(item.person, item.person_id, item.person_is_user)}</span>)
                              }
                              return parts
                            }

                            return (
                              <tr key={idx} className="border-b border-gray-100">
                                <td className="py-2 px-3 text-sm text-gray-600 w-24">
                                  {itemTime ? itemTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                                </td>
                                <td className="py-2 px-3">
                                  <div className="font-semibold text-sm text-gray-900">{item.title || t('common.untitled')}</div>
                                  {(() => { const details = getDetailsElements(); return details.length > 0 && (
                                    <div className="text-xs text-gray-600 mt-1 flex flex-wrap items-center gap-x-1">
                                      {details.map((el, i) => (
                                        <span key={i} className="inline-flex items-center">
                                          {i > 0 && <span className="mx-1">•</span>}
                                          {el}
                                        </span>
                                      ))}
                                    </div>
                                  ) })()}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Post-Event */}
                {event.program_agenda.has_post_event_schedule &&
                 event.program_agenda.post_event_schedule &&
                 event.program_agenda.post_event_schedule.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('events.postEvent')}</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2 border-gray-200">
                            <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700 w-24">{t('common.time')}</th>
                            <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">{t('common.item')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {event.program_agenda.post_event_schedule.map((item, idx) => {
                            const eventTime = new Date(event.date_start)
                            const itemTime = new Date(eventTime.getTime() + item.offset_minutes * 60000)
                            return (
                              <tr key={idx} className="border-b border-gray-100">
                                <td className="py-2 px-3 text-sm text-gray-600 w-24">
                                  {itemTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="py-2 px-3">
                                  <div className="font-semibold text-sm text-gray-900">{item.item}</div>
                                  {item.notes && (
                                    <div className="text-xs text-gray-600 mt-1">
                                      {item.notes}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {canEdit && (
                  <div className="pt-2">
                    <Link
                      to={`/events/${id}/schedule`}
                      className="text-sm text-teal-600 hover:text-teal-700 font-semibold"
                    >
                      {t('events.editSchedule')} →
                    </Link>
                  </div>
                )}
                </div>}
              </div>
            )}

            {/* Resources */}
            {(event.flow_service_id || event.setlist_id) && (
              <div className="card">
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {(event.flow_service_id && linkedService?.code ? 1 : 0) + (event.setlist_id && linkedSetlist?.shareCode ? 1 : 0)}
                  </span>
                  <h3 className="text-lg font-semibold text-gray-900">{t('events.resources')}</h3>
                  <div className="flex flex-wrap gap-2 ml-auto">
                    {event.flow_service_id && linkedService?.code && (
                      <a
                        href={`https://soluflow.app/service/code/${linkedService.code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-sm font-semibold rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
                      >
                        <Music className="w-4 h-4" />
                        SoluFlow
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {event.setlist_id && linkedSetlist?.shareCode && (
                      <div className="relative group">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 text-sm font-semibold rounded-lg border border-teal-200 cursor-default">
                          <Monitor className="w-4 h-4" />
                          SoluCast
                        </div>
                        <div className="absolute right-0 bottom-full pb-1 hidden group-hover:flex flex-col z-10 min-w-[140px]"><div className="bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                          <a
                            href={`https://solucast.app/open/${linkedSetlist.shareCode}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Open
                          </a>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`https://solucast.app/open/${linkedSetlist.shareCode}`)
                              setSolucastCopied(true)
                              setTimeout(() => setSolucastCopied(false), 2000)
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors w-full text-left"
                          >
                            {solucastCopied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                            {solucastCopied ? t('common.copied') : t('common.copyLink')}
                          </button>
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(
                              [
                                `*${event.title}*`,
                                formatDateTime(event.date_start),
                                event.location_name || '',
                                '',
                                ...(event.program_agenda?.program_schedule?.length ? [
                                  '*תכנית:*',
                                  ...event.program_agenda.program_schedule.map((item: any) =>
                                    `- ${item.title}${item.person ? ` — ${item.person}` : ''}`
                                  ),
                                  '',
                                ] : []),
                                `https://solucast.app/open/${linkedSetlist.shareCode}`,
                              ].filter(Boolean).join('\n')
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            WhatsApp
                          </a>
                        </div></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Event Teams */}
            {event.event_teams && Array.isArray(event.event_teams) && event.event_teams.length > 0 && (
              <div className="card">
                <button
                  onClick={() => setShowTeams(!showTeams)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    {(() => {
                      const filledTeams = event.event_teams!.filter((t: any) => t.members?.some((m: any) => m.name?.trim()))
                      const allFilled = filledTeams.length === event.event_teams!.length
                      return allFilled ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {filledTeams.length}
                        </span>
                      )
                    })()}
                    <h3 className="text-lg font-semibold text-gray-900">
                      {t('events.teams')}
                    </h3>
                    {!showTeams && (
                      <span className="text-xs text-gray-500 font-normal">
                        {(() => {
                          const filledTeams = event.event_teams!.filter((t: any) => t.members?.some((m: any) => m.name?.trim()))
                          return filledTeams.map((t: any) => t.name).filter(Boolean).join(' · ')
                        })()}
                      </span>
                    )}
                  </div>
                  {showTeams ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {showTeams && (
                  <div className="mt-4 space-y-4">
                    {event.event_teams
                      .filter((team: any) => team.members?.some((m: any) => m.name?.trim()))
                      .map((team: any, teamIdx: number) => (
                      <div key={teamIdx}>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">{team.name}</h4>
                        <div className="space-y-2">
                          {team.members?.filter((m: any) => m.name?.trim()).map((member: any, memberIdx: number) => {
                            const isOwnPending = member.is_user && member.contact_id === currentUser?.id && member.status === 'pending' && member.member_id
                            const status = member.status
                              || (member.email && invitationStatusMap.byEmail.get(member.email.toLowerCase()))
                              || (member.contact_id && invitationStatusMap.byId.get(member.contact_id))
                              || invitationStatusMap.byName.get(member.name?.toLowerCase())
                            return (
                              <div key={memberIdx} className={`flex items-center gap-3 p-3 rounded-xl border ${isOwnPending ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200' : 'bg-gradient-to-r from-gray-50 to-teal-50 border-gray-200'}`}>
                                <div className="flex-1">
                                  <span className="text-sm font-bold text-gray-900">{member.role || t('events.noRole')}</span>
                                </div>
                                <PersonHoverCard name={member.name} contactId={member.contact_id} isUser={member.is_user} className="text-sm text-gray-700" />
                                {isOwnPending ? (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => respondToTeamInvite.mutate({ eventId: event.id, memberId: member.member_id, action: 'accept' })}
                                      disabled={respondToTeamInvite.isPending}
                                      className="text-xs px-2.5 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
                                    >
                                      {t('common.accept')}
                                    </button>
                                    <button
                                      onClick={() => respondToTeamInvite.mutate({ eventId: event.id, memberId: member.member_id, action: 'decline' })}
                                      disabled={respondToTeamInvite.isPending}
                                      className="text-xs px-2.5 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 font-medium"
                                    >
                                      {t('common.decline')}
                                    </button>
                                  </div>
                                ) : status ? <InvitationStatusBadge status={status} /> : null}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                    {canEdit && (
                      <div className="pt-2">
                        <Link
                          to={`/events/${id}/teams`}
                          className="text-sm text-teal-600 hover:text-teal-700 font-semibold"
                        >
                          {t('events.editTeams')} →
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Technical Rider */}
            {event.rider_details && (
              <div className="card">
                <button
                  onClick={() => setShowRider(!showRider)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {t('events.technicalRider')}
                    </h3>
                    {!showRider && (
                      <span className="text-xs text-gray-500 font-normal">
                        {[
                          event.rider_details.worship_team?.length && `${event.rider_details.worship_team.length} worship`,
                          (event.rider_details.production_team?.soundman?.person || event.rider_details.production_team?.projection?.person || event.rider_details.production_team?.host?.person) && 'production',
                        ].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </div>
                  {showRider ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {showRider && <div className="mt-4">
                {/* Worship Team Section */}
                {event.rider_details.worship_team && event.rider_details.worship_team.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('events.worshipTeam')}</h4>
                    <div className="space-y-3">
                      {event.rider_details.worship_team.map((member, idx) => (
                        <div key={idx} className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase">{t('events.role')}</p>
                              <p className="text-sm font-bold text-gray-900">{member.role}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase">{t('events.person')}</p>
                              <p className="text-sm font-bold text-gray-900">
                                {member.person ? (
                                  <PersonHoverCard name={member.person} contactId={member.contact_id || member.user_id} isUser={member.is_user} />
                                ) : '-'}
                              </p>
                            </div>
                          </div>

                          {member.role === 'Drums' && member.eDrums && (
                            <div className="mb-2">
                              <span className="inline-flex items-center px-2 py-1 bg-teal-100 text-teal-700 text-xs font-semibold rounded-md">
                                {t('events.rider.eDrums')}
                              </span>
                            </div>
                          )}

                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                              {t('events.needs')} {member.role === 'Drums' && member.eDrums ? `(${t('events.rider.eDrums')})` : ''}
                            </p>
                            <ul className="space-y-1">
                              {(member.role === 'Drums' && member.eDrums ? member.eDrumsNeeds : member.needs)?.map((need, needIdx) => (
                                <li key={needIdx} className="text-sm text-gray-700 flex items-start">
                                  <span className="text-teal-500 mr-2">•</span>
                                  <span>{need}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Production Team Section */}
                {event.rider_details.production_team && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('events.productionTeam')}</h4>
                    <div className="space-y-3">
                      {/* Soundman */}
                      {(event.rider_details.production_team.soundman?.person || event.rider_details.production_team.soundman?.contact) && (
                        <div className="p-4 bg-gradient-to-r from-gray-50 to-green-50 rounded-xl border border-gray-200">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase">{t('events.role')}</p>
                              <p className="text-sm font-bold text-gray-900">{t('events.soundman')}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase">{t('events.person')}</p>
                              <p className="text-sm font-bold text-gray-900">
                                {event.rider_details.production_team.soundman.person ? (
                                  <PersonHoverCard name={event.rider_details.production_team.soundman.person} contactId={event.rider_details.production_team.soundman.contact_id || event.rider_details.production_team.soundman.user_id} isUser={event.rider_details.production_team.soundman.is_user} />
                                ) : '-'}
                              </p>
                            </div>
                          </div>
                          {event.rider_details.production_team.soundman.contact && (
                            <div className="mt-3">
                              <p className="text-xs font-semibold text-gray-500 uppercase">{t('common.contact')}</p>
                              <p className="text-sm text-gray-700">{event.rider_details.production_team.soundman.contact}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Projection */}
                      {(event.rider_details.production_team.projection?.person || event.rider_details.production_team.projection?.contact) && (
                        <div className="p-4 bg-gradient-to-r from-gray-50 to-green-50 rounded-xl border border-gray-200">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase">{t('events.role')}</p>
                              <p className="text-sm font-bold text-gray-900">{t('events.projection')}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase">{t('events.person')}</p>
                              <p className="text-sm font-bold text-gray-900">
                                {event.rider_details.production_team.projection.person ? (
                                  <PersonHoverCard name={event.rider_details.production_team.projection.person} contactId={event.rider_details.production_team.projection.contact_id || event.rider_details.production_team.projection.user_id} isUser={event.rider_details.production_team.projection.is_user} />
                                ) : '-'}
                              </p>
                            </div>
                          </div>
                          {event.rider_details.production_team.projection.contact && (
                            <div className="mt-3">
                              <p className="text-xs font-semibold text-gray-500 uppercase">{t('common.contact')}</p>
                              <p className="text-sm text-gray-700">{event.rider_details.production_team.projection.contact}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Host */}
                      {(event.rider_details.production_team.host?.person || event.rider_details.production_team.host?.contact) && (
                        <div className="p-4 bg-gradient-to-r from-gray-50 to-green-50 rounded-xl border border-gray-200">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase">{t('events.role')}</p>
                              <p className="text-sm font-bold text-gray-900">{t('events.host')}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase">{t('events.person')}</p>
                              <p className="text-sm font-bold text-gray-900">
                                {event.rider_details.production_team.host.person ? (
                                  <PersonHoverCard name={event.rider_details.production_team.host.person} contactId={event.rider_details.production_team.host.contact_id || event.rider_details.production_team.host.user_id} isUser={event.rider_details.production_team.host.is_user} />
                                ) : '-'}
                              </p>
                            </div>
                          </div>
                          {event.rider_details.production_team.host.contact && (
                            <div className="mt-3">
                              <p className="text-xs font-semibold text-gray-500 uppercase">{t('common.contact')}</p>
                              <p className="text-sm text-gray-700">{event.rider_details.production_team.host.contact}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Contact & Other Section */}
                <div className="space-y-3">
                  {event.rider_details.contact_person && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">{t('events.contactPerson')}</p>
                      <p className="text-sm text-gray-700">{event.rider_details.contact_person}</p>
                    </div>
                  )}
                  {event.rider_details.contact_phone && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">{t('events.contactPhone')}</p>
                      <p className="text-sm text-gray-700">{event.rider_details.contact_phone}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center p-3 bg-gradient-to-br from-blue-50 to-teal-50 rounded-lg">
                      <span className="text-sm font-semibold text-gray-700">
                        {t('events.soundman')}: {event.rider_details.soundman_needed ? `✓ ${t('common.yes')}` : `✗ ${t('common.no')}`}
                      </span>
                    </div>
                    <div className="flex items-center p-3 bg-gradient-to-br from-blue-50 to-teal-50 rounded-lg">
                      <span className="text-sm font-semibold text-gray-700">
                        {t('events.projection')}: {event.rider_details.projection_needed ? `✓ ${t('common.yes')}` : `✗ ${t('common.no')}`}
                      </span>
                    </div>
                  </div>
                  {event.rider_details.special_requirements && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">{t('events.specialRequirements')}</p>
                      <p className="text-sm text-gray-700">{event.rider_details.special_requirements}</p>
                    </div>
                  )}
                {canEdit && (
                  <div className="pt-2">
                    <Link
                      to={`/events/${id}/rider`}
                      className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      {t('events.editRider')} →
                    </Link>
                  </div>
                )}
                </div>
                </div>}
              </div>
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-4">
            {tasksLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : tasks && tasks.length > 0 ? (() => {
              const isPrivileged =
                event?.created_by === currentUser?.id ||
                currentUser?.org_role === 'admin' ||
                roleAssignments?.some(
                  (ra) => ra.user_id === currentUser?.id && ra.role === 'event_manager'
                )

              const myTasks = tasks.filter(
                (t) => t.assignee_id === currentUser?.id || t.creator_id === currentUser?.id
              )
              const teamTasks = tasks.filter(
                (t) => t.assignee_id !== currentUser?.id && t.creator_id !== currentUser?.id
              )

              if (isPrivileged || teamTasks.length === 0) {
                return tasks.map((task) => (
                  <TaskCardWrapper key={task.id} task={task} readOnly={!canEdit} />
                ))
              }

              return (
                <>
                  {myTasks.length > 0 && (
                    <details open>
                      <summary className="flex items-center gap-2 cursor-pointer select-none py-2 group [&::marker]:content-[''] [&::-webkit-details-marker]:hidden">
                        <ChevronRight className="w-4 h-4 text-gray-400 transition-transform group-open:hidden" />
                        <ChevronDown className="w-4 h-4 text-gray-400 hidden group-open:block" />
                        <span className="text-sm font-semibold text-gray-700">{t('tasks.myTasks')}</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{myTasks.length}</span>
                      </summary>
                      <div className="space-y-4 mt-2">
                        {myTasks.map((task) => (
                          <TaskCardWrapper key={task.id} task={task} readOnly={!canEdit} />
                        ))}
                      </div>
                    </details>
                  )}
                  {teamTasks.length > 0 && (
                    <details>
                      <summary className="flex items-center gap-2 cursor-pointer select-none py-2 group [&::marker]:content-[''] [&::-webkit-details-marker]:hidden">
                        <ChevronRight className="w-4 h-4 text-gray-400 transition-transform group-open:hidden" />
                        <ChevronDown className="w-4 h-4 text-gray-400 hidden group-open:block" />
                        <span className="text-sm font-semibold text-gray-700">{t('tasks.teamTasks')}</span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{teamTasks.length}</span>
                      </summary>
                      <div className="space-y-4 mt-2">
                        {teamTasks.map((task) => (
                          <TaskCardWrapper key={task.id} task={task} readOnly={!canEdit} />
                        ))}
                      </div>
                    </details>
                  )}
                </>
              )
            })() : (
              <div className="card text-center py-12">
                <p className="text-sm text-gray-500">{t('tasks.noTasksForEvent')}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'files' && (
          <div className="card text-center py-12">
            <p className="text-sm text-gray-500">{t('events.fileManagementComingSoon')}</p>
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="card text-center py-12">
            <p className="text-sm text-gray-500">{t('events.commentsComingSoon')}</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{t('events.deleteEvent')}</h3>
                <p className="text-sm text-gray-500">{t('common.actionCannotBeUndone')}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              {t('events.deleteEventConfirm', { title: event.title })}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 btn-secondary"
                disabled={deleteEvent.isPending}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteEvent}
                disabled={deleteEvent.isPending}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleteEvent.isPending ? t('events.deleting') : t('events.deleteEvent')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Invitations Modal */}
      {showSendInvitations && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                <Mail className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{t('events.sendInvitations')}</h3>
                <p className="text-sm text-gray-500">{t('events.notifyTeamViaEmail')}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              {t('events.invitationEmailDesc')}
            </p>
            {event.invitations && event.invitations.length > 0 && (() => {
              const respondedCount = event.invitations.filter((i: any) => i.status !== 'pending').length
              return respondedCount > 0 ? (
                <p className="text-xs text-gray-500 mb-4">
                  {t('events.alreadyRespondedKept', { count: respondedCount })}
                </p>
              ) : (
                <p className="text-xs text-gray-500 mb-4">
                  {t('events.previouslySent', { count: event.invitations.length })}
                </p>
              )
            })()}
            {invitationError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-2">
                {invitationError}
              </p>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setShowSendInvitations(false); setInvitationError(null) }}
                className="flex-1 btn-secondary"
                disabled={sendInvitations.isPending}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={async () => {
                  setInvitationError(null)
                  try {
                    const result = await sendInvitations.mutateAsync(event.id)
                    setInvitationResult(result)
                    setShowSendInvitations(false)
                  } catch (err: any) {
                    setInvitationError(err?.response?.data?.message || err?.message || t('events.errors.failedSendInvitations'))
                  }
                }}
                disabled={sendInvitations.isPending}
                className="flex-1 bg-teal-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sendInvitations.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin inline mr-2" />{t('events.sending')}</>
                ) : (
                  t('events.sendInvitations')
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invitation Result Banner */}
      {invitationResult && (
        <div className="fixed top-4 right-4 z-50 bg-white rounded-xl shadow-lg border border-gray-200 p-4 max-w-sm animate-in">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">
                {t('events.invitationsSent', { count: invitationResult.sent })}
              </p>
              {invitationResult.alreadyResponded > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {t('events.alreadyRespondedKept', { count: invitationResult.alreadyResponded })}
                </p>
              )}
              {invitationResult.skipped > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {t('events.skippedNoEmail', { count: invitationResult.skipped, names: invitationResult.skippedNames.join(', ') })}
                </p>
              )}
              {invitationResult.errors.length > 0 && (
                <div className="mt-1">
                  <p className="text-xs text-red-600 font-medium">{t('events.failedCount', { count: invitationResult.errors.length })}</p>
                  {invitationResult.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-500">{e}</p>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setInvitationResult(null)} className="text-gray-400 hover:text-gray-600">
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
