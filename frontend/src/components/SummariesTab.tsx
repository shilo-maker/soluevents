import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, Users, User, ClipboardList, Mic, ExternalLink } from 'lucide-react'

interface SummariesTabProps {
  eventId: string
  event: any
}

interface PersonOption {
  id: string
  name: string
  isUser: boolean
}

export default function SummariesTab({ eventId, event }: SummariesTabProps) {
  const { t } = useTranslation()
  const [selectedPersonId, setSelectedPersonId] = useState('')

  const hasSchedule = !!(
    event.program_agenda &&
    (event.program_agenda.pre_event_schedule?.length ||
      event.program_agenda.program_schedule?.length ||
      event.program_agenda.post_event_schedule?.length)
  )
  const hasTeams = !!(event.event_teams && event.event_teams.length > 0)
  const hasRider = !!(
    event.rider_details &&
    (event.rider_details.worship_team?.length ||
      event.rider_details.production_team)
  )

  // Extract unique people from event_teams, program_agenda, and rider_details
  const people = useMemo(() => {
    const map = new Map<string, PersonOption>()

    const addPerson = (id: string, name: string, isUser: boolean) => {
      if (id && !map.has(id)) {
        map.set(id, { id, name: name || 'Unknown', isUser })
      }
    }

    // From event_teams — members have { contact_id, is_user, name, role }
    if (event.event_teams) {
      for (const team of event.event_teams) {
        for (const member of team.members || []) {
          if (member.contact_id) {
            addPerson(member.contact_id, member.name, !!member.is_user)
          }
        }
      }
    }

    // From program_schedule — items have flat fields: person/person_id/person_is_user,
    // speaker/speaker_id/speaker_is_user, facilitator, prayer_leader, etc.
    if (event.program_agenda?.program_schedule) {
      for (const item of event.program_agenda.program_schedule) {
        if (item.person_id) {
          addPerson(item.person_id, item.person || 'Unknown', !!item.person_is_user)
        }
        if (item.speaker_id) {
          addPerson(item.speaker_id, item.speaker || 'Unknown', !!item.speaker_is_user)
        }
        if (item.facilitator_id) {
          addPerson(item.facilitator_id, item.facilitator || 'Unknown', !!item.facilitator_is_user)
        }
        if (item.prayer_leader_id) {
          addPerson(item.prayer_leader_id, item.prayer_leader || 'Unknown', !!item.prayer_leader_is_user)
        }
      }
    }

    // From rider_details — production_team has soundman/projection/host with { person, user_id, contact_id, is_user }
    // Also worship_team members with { person, user_id, contact_id, is_user }
    if (event.rider_details) {
      const pt = event.rider_details.production_team
      if (pt) {
        for (const role of ['soundman', 'projection', 'host'] as const) {
          const entry = pt[role]
          if (entry?.person) {
            const id = entry.contact_id || entry.user_id || entry.person
            addPerson(id, entry.person, !!entry.is_user)
          }
        }
      }
      if (event.rider_details.worship_team) {
        for (const member of event.rider_details.worship_team) {
          if (member.person) {
            const id = member.contact_id || member.user_id || member.person
            addPerson(id, member.person, !!member.is_user)
          }
        }
      }
      // Prayer leader
      const pl = event.rider_details.prayer_leader
      if (pl?.person) {
        const id = pl.contact_id || pl.user_id || pl.person
        addPerson(id, pl.person, !!pl.is_user)
      }
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [event.event_teams, event.program_agenda, event.rider_details])

  const selectedPerson = people.find((p) => p.id === selectedPersonId)

  const openDocument = (docType: string, query?: string) => {
    const url = `/events/${eventId}/doc/${docType}${query || ''}`
    window.location.href = url
  }

  const cards = [
    {
      key: 'schedule',
      icon: Calendar,
      title: t('summaries.eventSchedule'),
      description: t('summaries.eventScheduleDesc'),
      disabled: !hasSchedule,
      disabledReason: t('summaries.noScheduleData'),
      onClick: () => openDocument('schedule'),
    },
    {
      key: 'teams',
      icon: Users,
      title: t('summaries.teamsList'),
      description: t('summaries.teamsListDesc'),
      disabled: !hasTeams,
      disabledReason: t('summaries.noTeamsData'),
      onClick: () => openDocument('teams'),
    },
    {
      key: 'rider',
      icon: Mic,
      title: t('summaries.riderDocument'),
      description: t('summaries.riderDocumentDesc'),
      disabled: !hasRider,
      disabledReason: t('summaries.noRiderData'),
      onClick: () => openDocument('rider'),
    },
    {
      key: 'tasks-report',
      icon: ClipboardList,
      title: t('summaries.tasksReport'),
      description: t('summaries.tasksReportDesc'),
      disabled: false,
      disabledReason: t('summaries.noTasksData'),
      onClick: () => openDocument('tasks-report'),
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div
            key={card.key}
            className={`card flex flex-col ${card.disabled ? 'opacity-50' : ''}`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  card.disabled
                    ? 'bg-gray-100 text-gray-400'
                    : 'bg-teal-50 text-teal-600'
                }`}
              >
                <card.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900">{card.title}</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4 flex-1">
              {card.disabled ? card.disabledReason : card.description}
            </p>
            <button
              onClick={card.onClick}
              disabled={card.disabled}
              className="btn-primary text-sm flex items-center justify-center gap-2 w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ExternalLink className="w-4 h-4" />
              {t('summaries.openDocument')}
            </button>
          </div>
        ))}

        {/* Person Summary card */}
        <div className={`card flex flex-col ${people.length === 0 ? 'opacity-50' : ''}`}>
          <div className="flex items-center gap-3 mb-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                people.length === 0
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-teal-50 text-teal-600'
              }`}
            >
              <User className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-gray-900">{t('summaries.personSummary')}</h3>
          </div>
          <p className="text-sm text-gray-500 mb-3 flex-1">
            {people.length === 0
              ? t('summaries.noPeopleData')
              : t('summaries.personSummaryDesc')}
          </p>
          {people.length > 0 && (
            <select
              value={selectedPersonId}
              onChange={(e) => setSelectedPersonId(e.target.value)}
              className="input text-sm mb-3"
              aria-label={t('summaries.selectPerson')}
            >
              <option value="">{t('summaries.selectPerson')}</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => {
              if (selectedPerson) {
                openDocument(
                  'person-summary',
                  `?personId=${encodeURIComponent(selectedPerson.id)}&isUser=${selectedPerson.isUser}`
                )
              }
            }}
            disabled={!selectedPerson || people.length === 0}
            className="btn-primary text-sm flex items-center justify-center gap-2 w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ExternalLink className="w-4 h-4" />
            {t('summaries.openDocument')}
          </button>
        </div>
    </div>
  )
}
