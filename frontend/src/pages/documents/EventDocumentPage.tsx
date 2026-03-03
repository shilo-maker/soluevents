import { useState, useEffect, useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Loader2, Printer, ArrowLeft, Calendar, MapPin, Clock, Globe } from 'lucide-react'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { he } from 'date-fns/locale/he'
import { enUS } from 'date-fns/locale/en-US'
import logoSm from '@/assets/logo-sm.png'
import InvitationStatusBadge from '@/components/InvitationStatusBadge'
import type { InvitationStatus } from '@/types'
import heLocale from '@/locales/he.json'

const API_BASE = '/api'

// Prefixes whose Hebrew values may appear as stored data (team names, roles, schedule items, etc.)
const TRANSLATABLE_PREFIXES = [
  'teams.', 'roles.', 'schedule.defaults.', 'events.itemTypes.',
  'rider.defaults.', 'events.soundman', 'events.projection', 'events.host',
  'events.worshipTeam', 'events.productionTeam', 'events.prayerLeader',
]

/** Reverse-lookup: given a stored Hebrew string, return its translation in the current language */
function useTranslateValue() {
  const { t } = useTranslation()
  const reverseMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const [key, value] of Object.entries(heLocale)) {
      if (TRANSLATABLE_PREFIXES.some((p) => key.startsWith(p))) {
        map.set(value as string, key)
      }
    }
    return map
  }, [])
  return (value: string) => {
    const key = reverseMap.get(value)
    return key ? t(key) : value
  }
}

interface EventData {
  id: string
  title: string
  type: string
  status: string
  date_start: string
  date_end: string
  timezone: string
  location_name?: string
  address?: string
  program_agenda?: any
  event_teams?: any[]
  rider_details?: any
  tasks?: any[]
}

/** Compute display time from event start + offset_minutes */
function computeTime(eventDateStart: string, offsetMinutes: number | null | undefined): string {
  if (offsetMinutes == null) return '—'
  const base = new Date(eventDateStart)
  const t = new Date(base.getTime() + offsetMinutes * 60000)
  return format(t, 'HH:mm')
}

export default function EventDocumentPage() {
  const { t, i18n } = useTranslation()
  const { id, docType } = useParams<{ id: string; docType: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [event, setEvent] = useState<EventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Apply language from URL on mount
  useEffect(() => {
    const lang = searchParams.get('lang')
    if (lang && (lang === 'he' || lang === 'en') && lang !== i18n.language) {
      i18n.changeLanguage(lang)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleLanguage = () => {
    const newLang = i18n.language === 'he' ? 'en' : 'he'
    i18n.changeLanguage(newLang)
    setSearchParams((prev) => {
      prev.set('lang', newLang)
      return prev
    }, { replace: true })
  }

  useEffect(() => {
    if (!id || !docType) return
    setLoading(true)
    axios
      .get(`${API_BASE}/documents/events/${id}/${docType}`)
      .then((res) => setEvent(res.data.data))
      .catch(() => setError(t('summaries.documentNotFound')))
      .finally(() => setLoading(false))
  }, [id, docType]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-4">
        <p className="text-gray-500">{error || t('summaries.documentNotFound')}</p>
        <a href="/" className="text-teal-600 hover:underline text-sm">
          {t('common.goToDashboard')}
        </a>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Toolbar */}
      <div className="doc-toolbar sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <a
            href={`/events/${id}?tab=summaries`}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </a>
          <span className="font-medium text-gray-900 truncate">{event.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <Globe className="w-4 h-4" />
            {i18n.language === 'he' ? 'Switch to English' : 'החלף לעברית'}
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`*${event.title}*\n${window.location.href}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp
          </a>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
          >
            <Printer className="w-4 h-4" />
            {t('summaries.printPdf')}
          </button>
        </div>
      </div>

      {/* Document Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {docType === 'schedule' && <ScheduleDocument event={event} />}
        {docType === 'teams' && <TeamsDocument event={event} />}
        {docType === 'person-summary' && (
          <PersonSummaryDocument
            event={event}
            personId={searchParams.get('personId') || ''}
          />
        )}
        {docType === 'tasks-report' && <TasksReportDocument event={event} />}
        {docType === 'rider' && <RiderDocument event={event} />}
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto px-6 pb-8 text-center">
        <div className="border-t border-gray-100 pt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
          <img src={logoSm} alt="" className="w-4 h-4 opacity-50" />
          <span>{t('summaries.generatedBy')}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Event Header ───────────────────────────────────────────────
function EventHeader({ event }: { event: EventData }) {
  const { i18n } = useTranslation()
  const locale = i18n.language === 'he' ? he : enUS
  const start = new Date(event.date_start)
  const end = new Date(event.date_end)
  const dateStr = format(start, 'EEEE, d MMMM yyyy', { locale })
  const timeStr = `${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`

  return (
    <div className="mb-8 pb-6 border-b-2 border-gray-200">
      <h1 className="text-2xl font-bold text-gray-900 mb-3">{event.title}</h1>
      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
        <span className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-gray-400" />
          {dateStr}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-gray-400" />
          {timeStr}
        </span>
        {event.location_name && (
          event.address ? (
            <a
              href={event.address}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-teal-600 hover:underline print:text-gray-600 print:no-underline"
            >
              <MapPin className="w-4 h-4 text-gray-400" />
              {event.location_name}
            </a>
          ) : (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-gray-400" />
              {event.location_name}
            </span>
          )
        )}
      </div>
    </div>
  )
}

// ─── Helper: get person display name from a program_schedule item ──
function getItemPerson(item: any): string {
  return item.person || item.speaker || item.facilitator || item.prayer_leader || '—'
}

// ─── Schedule Document ──────────────────────────────────────────
function ScheduleDocument({ event }: { event: EventData }) {
  const { t } = useTranslation()
  const agenda = event.program_agenda

  const hasAnyItems =
    (agenda?.pre_event_schedule?.length ?? 0) > 0 ||
    (agenda?.program_schedule?.length ?? 0) > 0 ||
    (agenda?.post_event_schedule?.length ?? 0) > 0

  if (!agenda || !hasAnyItems) {
    return (
      <>
        <EventHeader event={event} />
        <p className="text-gray-500 text-center py-12">{t('summaries.noScheduleData')}</p>
      </>
    )
  }

  return (
    <>
      <EventHeader event={event} />

      {agenda.pre_event_schedule?.length > 0 && (
        <ScheduleTable
          title={t('events.preEventSchedule')}
          items={agenda.pre_event_schedule}
          eventDateStart={event.date_start}
          variant="simple"
        />
      )}

      {agenda.program_schedule?.length > 0 && (
        <ScheduleTable
          title={t('events.programSchedule')}
          items={agenda.program_schedule}
          eventDateStart={event.date_start}
          variant="program"
        />
      )}

      {agenda.post_event_schedule?.length > 0 && (
        <ScheduleTable
          title={t('events.postEventSchedule')}
          items={agenda.post_event_schedule}
          eventDateStart={event.date_start}
          variant="simple"
        />
      )}
    </>
  )
}

function ScheduleTable({
  title,
  items,
  eventDateStart,
  variant,
}: {
  title: string
  items: any[]
  eventDateStart: string
  variant: 'simple' | 'program'
}) {
  const { t } = useTranslation()
  const tv = useTranslateValue()
  const isProgram = variant === 'program'

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">{title}</h2>
      <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-gray-50 text-start">
            <th className="px-4 py-2.5 font-medium text-gray-600 text-start w-20">{t('common.time')}</th>
            <th className="px-4 py-2.5 font-medium text-gray-600 text-start w-48">{t('common.item')}</th>
            {isProgram && (
              <th className="px-4 py-2.5 font-medium text-gray-600 text-start w-36">{t('events.person')}</th>
            )}
            <th className="px-4 py-2.5 font-medium text-gray-600 text-start">{t('common.notes')}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any, i: number) => (
            <tr key={i} className="border-t border-gray-100 doc-table-row">
              <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                {computeTime(eventDateStart, item.offset_minutes)}
              </td>
              <td className="px-4 py-2.5 text-gray-900">
                <div>{tv(item.title || item.item || '—')}</div>
                {isProgram && item.type === 'song' && item.key && (
                  <span className="text-xs text-gray-400 ms-1">
                    {t('events.schedule.key')}: {item.key}
                    {item.bpm ? ` · ${item.bpm} BPM` : ''}
                  </span>
                )}
              </td>
              {isProgram && (
                <td className="px-4 py-2.5 text-gray-600">
                  {getItemPerson(item)}
                </td>
              )}
              <td className="px-4 py-2.5 text-gray-500 text-xs">
                {item.notes || ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Teams Document ─────────────────────────────────────────────
function TeamsDocument({ event }: { event: EventData }) {
  const { t } = useTranslation()
  const tv = useTranslateValue()

  if (!event.event_teams?.length) {
    return (
      <>
        <EventHeader event={event} />
        <p className="text-gray-500 text-center py-12">{t('summaries.noTeamsData')}</p>
      </>
    )
  }

  return (
    <>
      <EventHeader event={event} />
      {event.event_teams.map((team: any, ti: number) => (
        <div key={ti} className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            {tv(team.name || t('events.teams.unnamedTeam'))}
          </h2>
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-50 text-start">
                <th className="px-4 py-2.5 font-medium text-gray-600 text-start">{t('common.name')}</th>
                <th className="px-4 py-2.5 font-medium text-gray-600 text-start">{t('common.role')}</th>
                <th className="px-4 py-2.5 font-medium text-gray-600 text-start w-28">{t('common.status')}</th>
              </tr>
            </thead>
            <tbody>
              {(team.members || []).map((member: any, mi: number) => (
                <tr key={mi} className="border-t border-gray-100 doc-table-row">
                  <td className="px-4 py-2.5 text-gray-900">{member.name || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-600">{tv(member.role || t('events.noRole'))}</td>
                  <td className="px-4 py-2.5">
                    <InvitationStatusBadge status={(member.status || 'pending') as InvitationStatus} />
                  </td>
                </tr>
              ))}
              {(!team.members || team.members.length === 0) && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-gray-400 text-sm">
                    {t('summaries.noMembers')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ))}
    </>
  )
}

// ─── Person Summary Document ────────────────────────────────────
function PersonSummaryDocument({
  event,
  personId,
}: {
  event: EventData
  personId: string
}) {
  const { t, i18n } = useTranslation()
  const tv = useTranslateValue()

  if (!personId) {
    return (
      <>
        <EventHeader event={event} />
        <p className="text-gray-500 text-center py-12">{t('summaries.noDataForPerson')}</p>
      </>
    )
  }

  let personName = ''

  // Match a team member: { contact_id, is_user, name }
  const matchesTeamMember = (member: any) => {
    if (!member) return false
    return member.contact_id === personId
  }

  // Match a program schedule person by person_id / speaker_id / facilitator_id / prayer_leader_id
  const matchesProgramPerson = (item: any): string | null => {
    if (item.person_id === personId) return item.person || '—'
    if (item.speaker_id === personId) return item.speaker || '—'
    if (item.facilitator_id === personId) return item.facilitator || '—'
    if (item.prayer_leader_id === personId) return item.prayer_leader || '—'
    return null
  }

  // Match a rider person: { person, user_id, contact_id, is_user }
  const matchesRiderPerson = (entry: any) => {
    if (!entry?.person) return false
    if (entry.contact_id === personId || entry.user_id === personId) return true
    // Fallback: match by name when no contact_id/user_id exists
    if (!entry.contact_id && !entry.user_id && entry.person === personId) return true
    return false
  }

  // 1. Team Assignments
  const teamAssignments: Array<{ team: string; role: string; status?: string }> = []
  if (event.event_teams) {
    for (const team of event.event_teams) {
      for (const member of team.members || []) {
        if (matchesTeamMember(member)) {
          if (!personName) personName = member.name
          teamAssignments.push({
            team: team.name || t('events.teams.unnamedTeam'),
            role: member.role || t('events.noRole'),
            status: member.status,
          })
        }
      }
    }
  }

  // 2. Schedule Appearances (only program_schedule has people)
  const scheduleAppearances: Array<{ phase: string; time: string; item: string }> = []
  if (event.program_agenda?.program_schedule) {
    for (const item of event.program_agenda.program_schedule) {
      const name = matchesProgramPerson(item)
      if (name !== null) {
        if (!personName) personName = name
        scheduleAppearances.push({
          phase: t('events.programSchedule'),
          time: computeTime(event.date_start, item.offset_minutes),
          item: item.title || '—',
        })
      }
    }
  }

  // 3. Rider Responsibilities
  const riderRoles: Array<{ role: string }> = []
  if (event.rider_details) {
    // Production team roles
    const pt = event.rider_details.production_team
    if (pt) {
      const roles = [
        { key: 'soundman' as const, label: t('events.soundman') },
        { key: 'projection' as const, label: t('events.projection') },
        { key: 'host' as const, label: t('events.host') },
      ]
      for (const r of roles) {
        if (matchesRiderPerson(pt[r.key])) {
          if (!personName) personName = pt[r.key].person
          riderRoles.push({ role: r.label })
        }
      }
    }
    // Worship team members
    if (event.rider_details.worship_team) {
      for (const member of event.rider_details.worship_team) {
        if (matchesRiderPerson(member)) {
          if (!personName) personName = member.person
          riderRoles.push({ role: member.role || t('events.noRole') })
        }
      }
    }
    // Prayer leader
    const pl = event.rider_details.prayer_leader
    if (pl?.person && matchesRiderPerson(pl)) {
      if (!personName) personName = pl.person
      riderRoles.push({ role: t('events.prayerLeader') })
    }
  }

  // 4. Task Assignments — check both fields since personId may be a contact_id or user_id
  const assignedTasks = (event.tasks || []).filter((task: any) => {
    return task.assignee_id === personId || task.assignee_contact_id === personId
  })

  if (!personName) personName = personId

  const isEmpty =
    teamAssignments.length === 0 &&
    scheduleAppearances.length === 0 &&
    riderRoles.length === 0 &&
    assignedTasks.length === 0

  return (
    <>
      <EventHeader event={event} />

      <div className="mb-6 pb-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">{personName}</h2>
        <p className="text-sm text-gray-500">{t('summaries.personSummarySubtitle')}</p>
      </div>

      {isEmpty && (
        <p className="text-gray-500 text-center py-12">{t('summaries.noDataForPerson')}</p>
      )}

      {/* Team Assignments */}
      {teamAssignments.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('summaries.teamAssignments')}</h3>
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-50 text-start">
                <th className="px-4 py-2.5 font-medium text-gray-600 text-start">{t('events.teams.eventTeams')}</th>
                <th className="px-4 py-2.5 font-medium text-gray-600 text-start">{t('common.role')}</th>
                <th className="px-4 py-2.5 font-medium text-gray-600 text-start w-28">{t('common.status')}</th>
              </tr>
            </thead>
            <tbody>
              {teamAssignments.map((a, i) => (
                <tr key={i} className="border-t border-gray-100 doc-table-row">
                  <td className="px-4 py-2.5 text-gray-900">{tv(a.team)}</td>
                  <td className="px-4 py-2.5 text-gray-600">{tv(a.role)}</td>
                  <td className="px-4 py-2.5">
                    <InvitationStatusBadge status={(a.status || 'pending') as InvitationStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Schedule Appearances */}
      {scheduleAppearances.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('summaries.scheduleAppearances')}</h3>
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-50 text-start">
                <th className="px-4 py-2.5 font-medium text-gray-600 text-start">{t('events.phase')}</th>
                <th className="px-4 py-2.5 font-medium text-gray-600 text-start w-20">{t('common.time')}</th>
                <th className="px-4 py-2.5 font-medium text-gray-600 text-start">{t('common.item')}</th>
              </tr>
            </thead>
            <tbody>
              {scheduleAppearances.map((a, i) => (
                <tr key={i} className="border-t border-gray-100 doc-table-row">
                  <td className="px-4 py-2.5 text-gray-600">{a.phase}</td>
                  <td className="px-4 py-2.5 text-gray-500">{a.time}</td>
                  <td className="px-4 py-2.5 text-gray-900">{tv(a.item)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Task Assignments */}
      {assignedTasks.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('summaries.taskAssignments')}</h3>
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-50 text-start">
                <th className="px-4 py-2.5 font-medium text-gray-600 text-start">{t('common.title')}</th>
                <th className="px-4 py-2.5 font-medium text-gray-600 text-start w-28">{t('common.status')}</th>
                <th className="px-4 py-2.5 font-medium text-gray-600 text-start w-28">{t('common.priority')}</th>
                <th className="px-4 py-2.5 font-medium text-gray-600 text-start w-28">{t('tasks.dueDate')}</th>
              </tr>
            </thead>
            <tbody>
              {assignedTasks.map((task: any) => (
                <tr key={task.id} className="border-t border-gray-100 doc-table-row">
                  <td className="px-4 py-2.5 text-gray-900">{task.title}</td>
                  <td className="px-4 py-2.5 text-gray-600 text-xs">{task.status}</td>
                  <td className="px-4 py-2.5 text-gray-600 text-xs">{task.priority}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">
                    {task.due_at ? format(new Date(task.due_at), 'PPP', { locale: i18n.language === 'he' ? he : enUS }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Rider Responsibilities */}
      {riderRoles.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('summaries.riderResponsibilities')}</h3>
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-50 text-start">
                <th className="px-4 py-2.5 font-medium text-gray-600 text-start">{t('common.role')}</th>
              </tr>
            </thead>
            <tbody>
              {riderRoles.map((r, i) => (
                <tr key={i} className="border-t border-gray-100 doc-table-row">
                  <td className="px-4 py-2.5 text-gray-900">{tv(r.role)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

// ─── Tasks Report Document ─────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  waiting: 'bg-yellow-100 text-yellow-700',
  blocked: 'bg-red-100 text-red-700',
  done: 'bg-green-100 text-green-700',
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-amber-100 text-amber-700',
  normal: 'bg-gray-100 text-gray-600',
}

function TasksReportDocument({ event }: { event: EventData }) {
  const { t, i18n } = useTranslation()
  const tasks = event.tasks || []

  // Build a contact_id → name map from event_teams
  const contactNameMap = new Map<string, string>()
  if (event.event_teams) {
    for (const team of event.event_teams) {
      for (const member of team.members || []) {
        if (member.contact_id) {
          contactNameMap.set(member.contact_id, member.name || t('common.unknown'))
        }
      }
    }
  }

  const resolveAssignee = (task: any): string => {
    if (task.assignee_contact_id && contactNameMap.has(task.assignee_contact_id)) {
      return contactNameMap.get(task.assignee_contact_id)!
    }
    return '—'
  }

  if (tasks.length === 0) {
    return (
      <>
        <EventHeader event={event} />
        <p className="text-gray-500 text-center py-12">{t('summaries.noTasksData')}</p>
      </>
    )
  }

  // Sort by priority (critical > high > normal) then by due date
  const priorityOrder: Record<string, number> = { critical: 0, high: 1, normal: 2 }
  const sorted = [...tasks].sort((a, b) => {
    const pa = priorityOrder[a.priority] ?? 2
    const pb = priorityOrder[b.priority] ?? 2
    if (pa !== pb) return pa - pb
    if (a.due_at && b.due_at) return new Date(a.due_at).getTime() - new Date(b.due_at).getTime()
    if (a.due_at) return -1
    if (b.due_at) return 1
    return 0
  })

  // Status counts
  const statusCounts: Record<string, number> = {}
  for (const task of tasks) {
    statusCounts[task.status] = (statusCounts[task.status] || 0) + 1
  }

  return (
    <>
      <EventHeader event={event} />

      <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('summaries.tasksSummary')}</h2>

      {/* Summary stats */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="px-3 py-1.5 rounded-lg bg-gray-50 text-sm font-medium text-gray-700">
          {t('nav.tasks')}: {tasks.length}
        </div>
        {Object.entries(statusCounts).map(([status, count]) => (
          <div
            key={status}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}
          >
            {t(`tasks.status.${status}`)}: {count}
          </div>
        ))}
      </div>

      {/* Tasks table */}
      <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-gray-50 text-start">
            <th className="px-4 py-2.5 font-medium text-gray-600 text-start">{t('common.title')}</th>
            <th className="px-4 py-2.5 font-medium text-gray-600 text-start w-28">{t('common.status')}</th>
            <th className="px-4 py-2.5 font-medium text-gray-600 text-start w-24">{t('common.priority')}</th>
            <th className="px-4 py-2.5 font-medium text-gray-600 text-start w-36">{t('summaries.assignee')}</th>
            <th className="px-4 py-2.5 font-medium text-gray-600 text-start w-28">{t('tasks.dueDate')}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((task: any) => (
            <tr key={task.id} className="border-t border-gray-100 doc-table-row">
              <td className="px-4 py-2.5 text-gray-900">{task.title}</td>
              <td className="px-4 py-2.5">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[task.status] || 'bg-gray-100 text-gray-600'}`}>
                  {t(`tasks.status.${task.status}`)}
                </span>
              </td>
              <td className="px-4 py-2.5">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[task.priority] || 'bg-gray-100 text-gray-600'}`}>
                  {t(`tasks.priority.${task.priority}`)}
                </span>
              </td>
              <td className="px-4 py-2.5 text-gray-600">{resolveAssignee(task)}</td>
              <td className="px-4 py-2.5 text-gray-500 text-xs">
                {task.due_at ? format(new Date(task.due_at), 'PPP', { locale: i18n.language === 'he' ? he : enUS }) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

// ─── Rider Document ────────────────────────────────────────────
function RiderDocument({ event }: { event: EventData }) {
  const { t } = useTranslation()
  const tv = useTranslateValue()
  const rider = event.rider_details

  const hasWorshipTeam = rider?.worship_team?.length > 0
  const hasProductionTeam = !!(
    rider?.production_team?.soundman?.person ||
    rider?.production_team?.projection?.person ||
    rider?.production_team?.host?.person
  )

  if (!rider || (!hasWorshipTeam && !hasProductionTeam)) {
    return (
      <>
        <EventHeader event={event} />
        <p className="text-gray-500 text-center py-12">{t('summaries.noRiderData')}</p>
      </>
    )
  }

  return (
    <>
      <EventHeader event={event} />

      {/* Worship Team */}
      {hasWorshipTeam && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">{t('events.worshipTeam')}</h2>
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-50 text-start">
                <th className="px-4 py-2.5 font-medium text-gray-600 text-start">{t('common.role')}</th>
                <th className="px-4 py-2.5 font-medium text-gray-600 text-start">{t('common.name')}</th>
                <th className="px-4 py-2.5 font-medium text-gray-600 text-start">{t('events.needs')}</th>
              </tr>
            </thead>
            <tbody>
              {rider.worship_team.map((member: any, i: number) => (
                <tr key={i} className="border-t border-gray-100 doc-table-row">
                  <td className="px-4 py-2.5 text-gray-900 font-medium">{tv(member.role || '—')}</td>
                  <td className="px-4 py-2.5 text-gray-600">{member.person || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">
                    {(member.needs || []).map((n: string) => tv(n)).join(', ') || '—'}
                    {member.eDrums && member.eDrumsNeeds?.length > 0 && (
                      <>
                        <br />
                        <span className="text-gray-400">
                          {t('events.rider.eDrums')}: {member.eDrumsNeeds.map((n: string) => tv(n)).join(', ')}
                        </span>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Prayer Leader */}
      {rider.has_prayer_leader && rider.prayer_leader?.person && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">{t('events.prayerLeader')}</h2>
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-50 text-start">
                <th className="px-4 py-2.5 font-medium text-gray-600 text-start">{t('common.name')}</th>
                <th className="px-4 py-2.5 font-medium text-gray-600 text-start">{t('events.topic')}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-100 doc-table-row">
                <td className="px-4 py-2.5 text-gray-900">{rider.prayer_leader.person}</td>
                <td className="px-4 py-2.5 text-gray-600">{rider.prayer_leader.topic || '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Production Team */}
      {hasProductionTeam && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">{t('events.productionTeam')}</h2>
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-50 text-start">
                <th className="px-4 py-2.5 font-medium text-gray-600 text-start">{t('common.role')}</th>
                <th className="px-4 py-2.5 font-medium text-gray-600 text-start">{t('common.name')}</th>
              </tr>
            </thead>
            <tbody>
              {([
                { key: 'soundman', label: t('events.soundman') },
                { key: 'projection', label: t('events.projection') },
                { key: 'host', label: t('events.host') },
              ] as const).map(({ key, label }) => {
                const entry = rider.production_team?.[key]
                if (!entry?.person) return null
                return (
                  <tr key={key} className="border-t border-gray-100 doc-table-row">
                    <td className="px-4 py-2.5 text-gray-900 font-medium">{label}</td>
                    <td className="px-4 py-2.5 text-gray-600">{entry.person}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Contact & Requirements */}
      {(rider.contact_person || rider.contact_phone || rider.special_requirements ||
        rider.soundman_needed || rider.projection_needed) && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">{t('events.rider.contactRequirements')}</h2>
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <tbody>
              {rider.contact_person && (
                <tr className="border-t border-gray-100 doc-table-row">
                  <td className="px-4 py-2.5 text-gray-600 font-medium w-48">{t('events.contactPerson')}</td>
                  <td className="px-4 py-2.5 text-gray-900">{rider.contact_person}</td>
                </tr>
              )}
              {rider.contact_phone && (
                <tr className="border-t border-gray-100 doc-table-row">
                  <td className="px-4 py-2.5 text-gray-600 font-medium w-48">{t('events.contactPhone')}</td>
                  <td className="px-4 py-2.5 text-gray-900">{rider.contact_phone}</td>
                </tr>
              )}
              {rider.soundman_needed != null && (
                <tr className="border-t border-gray-100 doc-table-row">
                  <td className="px-4 py-2.5 text-gray-600 font-medium w-48">{t('events.rider.soundmanNeeded')}</td>
                  <td className="px-4 py-2.5 text-gray-900">{rider.soundman_needed ? t('common.yes') : t('common.no')}</td>
                </tr>
              )}
              {rider.projection_needed != null && (
                <tr className="border-t border-gray-100 doc-table-row">
                  <td className="px-4 py-2.5 text-gray-600 font-medium w-48">{t('events.rider.projectionNeeded')}</td>
                  <td className="px-4 py-2.5 text-gray-900">{rider.projection_needed ? t('common.yes') : t('common.no')}</td>
                </tr>
              )}
              {rider.special_requirements && (
                <tr className="border-t border-gray-100 doc-table-row">
                  <td className="px-4 py-2.5 text-gray-600 font-medium w-48">{t('events.specialRequirements')}</td>
                  <td className="px-4 py-2.5 text-gray-900 whitespace-pre-wrap">{rider.special_requirements}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
