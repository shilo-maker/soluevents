import { useState, useMemo, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Loader2,
  Edit,
  Archive,
  Trash2,
  UserPlus,
  X,
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
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import { createSoluFlowService } from '@/lib/soluflowApi'
import { buildMergedSchedule, hasSetlistChanged } from '@/lib/scheduleSync'
import { useEvent, useUpdateEvent, useDeleteEvent, useFlowService } from '@/hooks/useEvents'
import { useTasks, useUpdateTask } from '@/hooks/useTasks'
import { useRoleAssignments, useCreateRoleAssignment, useDeleteRoleAssignment } from '@/hooks/useRoleAssignments'
import { useUsers } from '@/hooks/useUsers'
import { useAuthStore } from '@/stores/authStore'
import { formatDateTime } from '@/lib/utils'
import Badge from '@/components/Badge'
import TaskCard from '@/components/TaskCard'
import type { EventRole, Task } from '@/types'

type Tab = 'overview' | 'tasks' | 'files' | 'comments'

// Wrapper component to handle task updates
function TaskCardWrapper({ task }: { task: any }) {
  const updateTask = useUpdateTask(task.id)
  const { user: currentUser } = useAuthStore()
  const { data: users } = useUsers()

  const handleToggle = (taskId: string, newStatus: 'done' | 'not_started') => {
    updateTask.mutate({ status: newStatus })
  }

  const handleUpdateLink = (taskId: string, link: string) => {
    updateTask.mutate({ link })
  }

  const handleUpdateTask = (taskId: string, data: Partial<Task>) => {
    updateTask.mutate(data)
  }

  return (
    <TaskCard
      task={task}
      currentUser={currentUser}
      users={users}
      onToggle={handleToggle}
      onUpdateLink={handleUpdateLink}
      onUpdateTask={handleUpdateTask}
    />
  )
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [showAddRole, setShowAddRole] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState<EventRole>('contributor')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [showRider, setShowRider] = useState(false)
  const [showTeams, setShowTeams] = useState(false)
  const [soluflowServiceUrl, setSoluflowServiceUrl] = useState<string | null>(null)
  const [creatingService, setCreatingService] = useState(false)
  const [serviceError, setServiceError] = useState<string | null>(null)
  const [solucastResult, setSolucastResult] = useState<{ shareCode: string; shareUrl: string; itemCount: number } | null>(null)
  const [generatingSolucast, setGeneratingSolucast] = useState(false)
  const [solucastError, setSolucastError] = useState<string | null>(null)
  const [codeCopied, setCodeCopied] = useState(false)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const queryClient = useQueryClient()
  const { data: event, isLoading } = useEvent(id!)
  const { data: tasks, isLoading: tasksLoading } = useTasks({ event_id: id })
  const { data: roleAssignments, isLoading: rolesLoading } = useRoleAssignments({ event_id: id })
  const { data: users } = useUsers()
  const createRoleAssignment = useCreateRoleAssignment()
  const deleteRoleAssignment = useDeleteRoleAssignment()
  const deleteEvent = useDeleteEvent()
  const { data: linkedService } = useFlowService(event?.flow_service_id)
  const updateEvent = useUpdateEvent()
  const syncedRef = useRef(false)

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
        <Link to="/events" className="text-primary-600 hover:text-primary-700">
          ← Back to Events
        </Link>
      </div>
    )
  }

  const phaseColors = {
    concept: 'default',
    prep: 'warning',
    execution: 'info',
    follow_up: 'success',
  } as const

  const statusColors = {
    planned: 'default',
    confirmed: 'success',
    canceled: 'danger',
    archived: 'default',
  } as const

  const eventRoles: EventRole[] = [
    'event_manager',
    'worship_lead',
    'media_lead',
    'logistics',
    'hospitality',
    'comms',
    'contributor',
    'guest',
  ]

  const roleLabels: Record<EventRole, string> = {
    event_manager: 'Event Manager',
    worship_lead: 'Worship Lead',
    media_lead: 'Media Lead',
    logistics: 'Logistics',
    hospitality: 'Hospitality',
    comms: 'Communications',
    contributor: 'Contributor',
    guest: 'Guest',
  }

  const handleAddRole = async () => {
    if (!selectedUserId || !id) return

    try {
      await createRoleAssignment.mutateAsync({
        event_id: id,
        user_id: selectedUserId,
        role: selectedRole,
        scope: 'event',
      })
      setShowAddRole(false)
      setSelectedUserId('')
      setSelectedRole('contributor')
    } catch (error) {
      console.error('Failed to add role assignment:', error)
    }
  }

  const handleRemoveRole = async (assignmentId: string) => {
    try {
      await deleteRoleAssignment.mutateAsync(assignmentId)
    } catch (error) {
      console.error('Failed to remove role assignment:', error)
    }
  }

  const handleDeleteEvent = async () => {
    if (!id) return

    try {
      await deleteEvent.mutateAsync(id)
      navigate('/events')
    } catch (error) {
      console.error('Failed to delete event:', error)
    }
  }

  const handleCreateSoluFlowService = async () => {
    if (!event) return

    setCreatingService(true)
    setServiceError(null)

    try {
      // Get all songs that have soluflow_song_id
      const soluflowSongs = event.program_agenda?.program_schedule?.filter(
        (item: any) => item.type === 'song' && item.soluflow_song_id
      ) || []

      if (soluflowSongs.length === 0) {
        setServiceError('No SoluFlow songs found in the program. Please add songs from SoluFlow first.')
        setCreatingService(false)
        return
      }

      const songIds = soluflowSongs.map((song: any) => song.soluflow_song_id)

      console.log('📊 Creating SoluFlow service with data:', {
        name: event.title,
        date: event.date_start,
        songIds: songIds,
        songIdsDetailed: JSON.stringify(songIds),
        soluflowSongs: soluflowSongs,
        soluflowSongsDetailed: JSON.stringify(soluflowSongs, null, 2)
      })

      // Create service using service account authentication (handled internally)
      const service = await createSoluFlowService({
        name: event.title,
        date: event.date_start,
        songIds: songIds,
        notes: `Created from SoluPlan: ${event.description || ''}`
      })

      if (service) {
        setSoluflowServiceUrl(service.shareUrl)
      } else {
        setServiceError('Failed to create SoluFlow service. Please try again.')
      }
    } catch (error: any) {
      console.error('Error creating SoluFlow service:', error)
      setServiceError('An error occurred while creating the service.')
    } finally {
      setCreatingService(false)
    }
  }

  const handleGenerateSolucast = async () => {
    if (!event || generatingSolucast) return
    setGeneratingSolucast(true)
    setSolucastError(null)
    setSolucastResult(null)

    try {
      const { data } = await api.post(`/integration/events/${event.id}/generate-solucast`)
      setSolucastResult({
        shareCode: data.shareCode,
        shareUrl: data.shareUrl,
        itemCount: data.itemCount,
      })
      // Refresh event data so setlist_id is up to date
      queryClient.invalidateQueries({ queryKey: ['events', id] })
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to generate SoluCast setlist.'
      setSolucastError(msg)
    } finally {
      setGeneratingSolucast(false)
    }
  }

  const copyShareCode = async () => {
    if (!solucastResult) return
    try {
      await navigator.clipboard.writeText(solucastResult.shareCode)
      setCodeCopied(true)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCodeCopied(false), 2000)
    } catch {
      // Clipboard API unavailable (non-HTTPS context)
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'tasks', label: 'Tasks', count: tasks?.length },
    { id: 'files', label: 'Files', count: 0 },
    { id: 'comments', label: 'Comments', count: 0 },
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
            <Badge variant={phaseColors[event.phase]} size="sm">
              {event.phase}
            </Badge>
            <Badge variant={statusColors[event.status]} size="sm">
              {event.status}
            </Badge>
            {event.tags?.map((tag) => (
              <Badge key={tag} variant="default" size="sm">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/events/${id}/edit`} className="btn-secondary">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Link>
          <button className="btn-secondary">
            <Archive className="w-4 h-4 mr-2" />
            Archive
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-secondary text-red-600 hover:bg-red-50 hover:border-red-300"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </button>
        </div>
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
                Event Details
              </h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <Calendar className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Date & Time</p>
                    <p className="text-sm text-gray-600">
                      {formatDateTime(event.date_start)}
                    </p>
                  </div>
                </div>

                {event.location_name && (
                  <div className="flex items-start">
                    <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Location</p>
                      <p className="text-sm text-gray-600">{event.location_name}</p>
                      {event.address && (
                        <p className="text-sm text-gray-500">{event.address}</p>
                      )}
                    </div>
                  </div>
                )}

                {event.est_attendance && (
                  <div className="flex items-start">
                    <Users className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Expected Attendance</p>
                      <p className="text-sm text-gray-600">{event.est_attendance} people</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {event.description && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Description
                </h3>
                <p className="text-sm text-gray-600">{event.description}</p>
              </div>
            )}

            {/* Action Cards — shown when data is missing */}
            {(!event.program_agenda || !event.rider_details || !event.event_teams) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {!event.program_agenda && (
                  <Link
                    to={`/events/${id}/schedule`}
                    className="group card flex items-center gap-4 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">
                        Create Schedule
                      </h4>
                      <p className="text-xs text-gray-500">
                        Add pre-event, program, and post-event timeline
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
                          Create Rider
                        </h4>
                        <p className="text-xs text-gray-500">
                          Add worship team, production team, and tech requirements
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
                          Create Rider
                        </h4>
                        <p className="text-xs text-gray-400">
                          Create a worship team first
                        </p>
                      </div>
                    </div>
                  )
                })()}
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
                        Create Teams
                      </h4>
                      <p className="text-xs text-gray-500">
                        Build worship, production, and logistics teams with members
                      </p>
                    </div>
                  </Link>
                )}
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
                      Event Schedule
                    </h3>
                    {event.flow_service_id && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                        <Music className="w-3 h-3" />
                        SoluFlow
                      </span>
                    )}
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
                {/* Pre-Event Schedule */}
                {event.program_agenda.pre_event_schedule && event.program_agenda.pre_event_schedule.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Pre-Event Schedule</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2 border-gray-200">
                            <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700 w-24">Time</th>
                            <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Item</th>
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
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-700">Program Schedule</h4>
                      <button
                        onClick={handleGenerateSolucast}
                        disabled={generatingSolucast}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors disabled:opacity-50"
                      >
                        {generatingSolucast ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Monitor className="w-3.5 h-3.5" />
                        )}
                        Generate SoluCast
                      </button>
                    </div>

                    {/* SoluCast result */}
                    {solucastResult && (
                      <div className="mb-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                        <p className="text-sm font-semibold text-indigo-900 mb-2">
                          SoluCast setlist created ({solucastResult.itemCount} items)
                        </p>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-gray-600">Share code:</span>
                          <code className="px-2 py-0.5 bg-white rounded border border-indigo-200 text-sm font-mono font-bold text-indigo-800 tracking-wider">
                            {solucastResult.shareCode}
                          </code>
                          <button
                            onClick={copyShareCode}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 rounded transition-colors"
                          >
                            {codeCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {codeCopied ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <a
                          href={solucastResult.shareUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          Open in SoluCast
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {/* SoluCast error */}
                    {solucastError && (
                      <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">{solucastError}</p>
                      </div>
                    )}

                    {/* SoluFlow Success message */}
                    {soluflowServiceUrl && (
                      <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm font-semibold text-green-900 mb-1">Service created successfully!</p>
                        <a
                          href={soluflowServiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          Open in SoluFlow
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
                            <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700 w-24">Time</th>
                            <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Item</th>
                          </tr>
                        </thead>
                        <tbody>
                          {event.program_agenda.program_schedule.map((item, idx) => {
                            const eventTime = new Date(event.date_start)
                            const hasTime = item.offset_minutes != null
                            const itemTime = hasTime ? new Date(eventTime.getTime() + item.offset_minutes * 60000) : null

                            // Build details text based on type
                            const getDetailsText = () => {
                              const details = []
                              if (item.type === 'song') {
                                if (item.person) details.push(item.person)
                                const liveKey = item.soluflow_song_id ? liveKeyMap.get(item.soluflow_song_id) : null
                                const displayKey = liveKey || item.key
                                if (displayKey) details.push(`Key: ${displayKey}`)
                                if (item.bpm) details.push(`BPM: ${item.bpm}`)
                              } else if (item.type === 'share') {
                                if (item.speaker) details.push(`Speaker: ${item.speaker}`)
                                if (item.topic) details.push(`Topic: ${item.topic}`)
                              } else if (item.type === 'prayer') {
                                if (item.prayer_leader) details.push(`Leader: ${item.prayer_leader}`)
                                if (item.topic) details.push(`Topic: ${item.topic}`)
                              } else if (item.type === 'ministry') {
                                if (item.facilitator) details.push(`Facilitator: ${item.facilitator}`)
                                if (item.has_ministry_team) details.push('Ministry Team')
                              } else if (item.person) {
                                details.push(item.person)
                              }
                              return details.join(' • ')
                            }

                            return (
                              <tr key={idx} className="border-b border-gray-100">
                                <td className="py-2 px-3 text-sm text-gray-600 w-24">
                                  {itemTime ? itemTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                                </td>
                                <td className="py-2 px-3">
                                  <div className="font-semibold text-sm text-gray-900">{item.title || 'Untitled'}</div>
                                  {getDetailsText() && (
                                    <div className="text-xs text-gray-600 mt-1">
                                      {getDetailsText()}
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

                {/* Post-Event Schedule */}
                {event.program_agenda.has_post_event_schedule &&
                 event.program_agenda.post_event_schedule &&
                 event.program_agenda.post_event_schedule.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Post-Event Schedule</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2 border-gray-200">
                            <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700 w-24">Time</th>
                            <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Item</th>
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
                <div className="pt-2">
                  <Link
                    to={`/events/${id}/schedule`}
                    className="text-sm text-purple-600 hover:text-purple-700 font-semibold"
                  >
                    Edit Schedule →
                  </Link>
                </div>
                </div>}
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
                      Event Teams
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
                          {team.members?.filter((m: any) => m.name?.trim()).map((member: any, memberIdx: number) => (
                            <div key={memberIdx} className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-teal-50 rounded-xl border border-gray-200">
                              <div className="flex-1">
                                <span className="text-sm font-bold text-gray-900">{member.role || 'No role'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-700">{member.name}</span>
                                {member.contact_id && (
                                  <span className="inline-flex items-center" title={member.is_user ? 'Registered User' : 'Contact'}>
                                    {member.is_user ? (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                    ) : (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="pt-2">
                      <Link
                        to={`/events/${id}/teams`}
                        className="text-sm text-teal-600 hover:text-teal-700 font-semibold"
                      >
                        Edit Teams →
                      </Link>
                    </div>
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
                      Technical Rider
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
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Worship Team</h4>
                    <div className="space-y-3">
                      {event.rider_details.worship_team.map((member, idx) => (
                        <div key={idx} className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase">Role</p>
                              <p className="text-sm font-bold text-gray-900">{member.role}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase">Person</p>
                              <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                {member.person || '-'}
                                {member.user_id && (
                                  <span className="inline-flex items-center" title="Registered User">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                    </svg>
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          {member.role === 'Drums' && member.eDrums && (
                            <div className="mb-2">
                              <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-md">
                                E-Drums
                              </span>
                            </div>
                          )}

                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                              Needs {member.role === 'Drums' && member.eDrums ? '(E-Drums)' : ''}
                            </p>
                            <ul className="space-y-1">
                              {(member.role === 'Drums' && member.eDrums ? member.eDrumsNeeds : member.needs)?.map((need, needIdx) => (
                                <li key={needIdx} className="text-sm text-gray-700 flex items-start">
                                  <span className="text-purple-500 mr-2">•</span>
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
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Production Team</h4>
                    <div className="space-y-3">
                      {/* Soundman */}
                      {(event.rider_details.production_team.soundman?.person || event.rider_details.production_team.soundman?.contact) && (
                        <div className="p-4 bg-gradient-to-r from-gray-50 to-green-50 rounded-xl border border-gray-200">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase">Role</p>
                              <p className="text-sm font-bold text-gray-900">Soundman</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase">Person</p>
                              <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                {event.rider_details.production_team.soundman.person || '-'}
                                {event.rider_details.production_team.soundman.user_id && (
                                  <span className="inline-flex items-center" title="Registered User">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                    </svg>
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          {event.rider_details.production_team.soundman.contact && (
                            <div className="mt-3">
                              <p className="text-xs font-semibold text-gray-500 uppercase">Contact</p>
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
                              <p className="text-xs font-semibold text-gray-500 uppercase">Role</p>
                              <p className="text-sm font-bold text-gray-900">Projection</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase">Person</p>
                              <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                {event.rider_details.production_team.projection.person || '-'}
                                {event.rider_details.production_team.projection.user_id && (
                                  <span className="inline-flex items-center" title="Registered User">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                    </svg>
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          {event.rider_details.production_team.projection.contact && (
                            <div className="mt-3">
                              <p className="text-xs font-semibold text-gray-500 uppercase">Contact</p>
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
                              <p className="text-xs font-semibold text-gray-500 uppercase">Role</p>
                              <p className="text-sm font-bold text-gray-900">Host</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase">Person</p>
                              <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                {event.rider_details.production_team.host.person || '-'}
                                {event.rider_details.production_team.host.user_id && (
                                  <span className="inline-flex items-center" title="Registered User">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                    </svg>
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          {event.rider_details.production_team.host.contact && (
                            <div className="mt-3">
                              <p className="text-xs font-semibold text-gray-500 uppercase">Contact</p>
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
                      <p className="text-xs font-semibold text-gray-500 uppercase">Contact Person</p>
                      <p className="text-sm text-gray-700">{event.rider_details.contact_person}</p>
                    </div>
                  )}
                  {event.rider_details.contact_phone && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Contact Phone</p>
                      <p className="text-sm text-gray-700">{event.rider_details.contact_phone}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
                      <span className="text-sm font-semibold text-gray-700">
                        Soundman: {event.rider_details.soundman_needed ? '✓ Yes' : '✗ No'}
                      </span>
                    </div>
                    <div className="flex items-center p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
                      <span className="text-sm font-semibold text-gray-700">
                        Projection: {event.rider_details.projection_needed ? '✓ Yes' : '✗ No'}
                      </span>
                    </div>
                  </div>
                  {event.rider_details.special_requirements && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Special Requirements</p>
                      <p className="text-sm text-gray-700">{event.rider_details.special_requirements}</p>
                    </div>
                  )}
                <div className="pt-2">
                  <Link
                    to={`/events/${id}/rider`}
                    className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    Edit Rider →
                  </Link>
                </div>
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
            ) : tasks && tasks.length > 0 ? (
              tasks.map((task) => (
                <TaskCardWrapper key={task.id} task={task} />
              ))
            ) : (
              <div className="card text-center py-12">
                <p className="text-sm text-gray-500">No tasks for this event</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'files' && (
          <div className="card text-center py-12">
            <p className="text-sm text-gray-500">File management coming soon...</p>
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="card text-center py-12">
            <p className="text-sm text-gray-500">Comments coming soon...</p>
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
                <h3 className="text-lg font-semibold text-gray-900">Delete Event</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete "{event.title}"? All associated tasks, files, and comments will also be deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 btn-secondary"
                disabled={deleteEvent.isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEvent}
                disabled={deleteEvent.isPending}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleteEvent.isPending ? 'Deleting...' : 'Delete Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
