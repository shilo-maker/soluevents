import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2, Save, Plus, X, ChevronDown, ChevronRight } from 'lucide-react'
import { useEvent, useUpdateEvent } from '@/hooks/useEvents'
import { useAuthStore } from '@/stores/authStore'
import ContactAutocomplete from '@/components/ContactAutocomplete'
import RoleCombobox from '@/components/RoleCombobox'
import InvitationStatusBadge from '@/components/InvitationStatusBadge'

const VOCALS_COMBINABLE = ['Acoustic Guitar', 'Electric Guitar', 'Bass', 'Keys']

function parseRole(role: string): { instrument: string; hasVocals: boolean } {
  // "Electric Guitar + Vocals" → instrument=Electric Guitar, hasVocals=true
  const match = role.match(/^(.+?)\s*\+\s*Vocals$/)
  if (match && VOCALS_COMBINABLE.includes(match[1].trim())) {
    return { instrument: match[1].trim(), hasVocals: true }
  }
  // "Vocals + Electric Guitar" → instrument=Electric Guitar, hasVocals=true
  const matchReverse = role.match(/^Vocals\s*\+\s*(.+)$/)
  if (matchReverse && VOCALS_COMBINABLE.includes(matchReverse[1].trim())) {
    return { instrument: matchReverse[1].trim(), hasVocals: true }
  }
  // "Vocals" alone
  if (role === 'Vocals') return { instrument: '', hasVocals: true }
  // Plain instrument
  return { instrument: role, hasVocals: false }
}

function composeRole(instrument: string, hasVocals: boolean): string {
  if (instrument && hasVocals) return `${instrument} + Vocals`
  if (!instrument && hasVocals) return 'Vocals'
  return instrument
}

/** Sub-component for the role column (instrument combobox + vocals checkboxes). */
function MemberRoleCell({
  member,
  teamName,
  teamMembers,
  onRoleChange,
}: {
  member: TeamMember
  teamName: string
  teamMembers: TeamMember[]
  onRoleChange: (newRole: string) => void
}) {
  const { t } = useTranslation()
  const { instrument, hasVocals } = parseRole(member.role)
  const isWorshipTeam = teamName.toLowerCase().includes('worship')
  const isInstrument = VOCALS_COMBINABLE.includes(instrument)
  const isVocalsOnly = hasVocals && !instrument

  const existingRoles = teamMembers.map(m => {
    const p = parseRole(m.role)
    return p.instrument || (p.hasVocals ? 'Vocals' : m.role)
  })

  return (
    <>
      <RoleCombobox
        value={isVocalsOnly ? 'Vocals' : instrument}
        onChange={(val) => {
          if (val === 'Vocals') {
            onRoleChange('Vocals')
          } else {
            const keepVocals = hasVocals && VOCALS_COMBINABLE.includes(val)
            onRoleChange(composeRole(val, keepVocals))
          }
        }}
        teamName={teamName}
        existingRoles={existingRoles}
      />
      {isWorshipTeam && isInstrument && (
        <label className="flex items-center gap-1.5 mt-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={hasVocals}
            onChange={(e) => onRoleChange(composeRole(instrument, e.target.checked))}
            className="w-3.5 h-3.5 text-teal-600 rounded focus:ring-teal-500"
          />
          <span className="text-xs font-medium text-gray-600">{t('events.teams.addVocals')}</span>
        </label>
      )}
      {isWorshipTeam && isVocalsOnly && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
          {VOCALS_COMBINABLE.map(inst => (
            <label key={inst} className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={false}
                onChange={() => onRoleChange(composeRole(inst, true))}
                className="w-3.5 h-3.5 text-teal-600 rounded focus:ring-teal-500"
              />
              <span className="text-xs font-medium text-gray-600">+ {inst}</span>
            </label>
          ))}
        </div>
      )}
    </>
  )
}

interface TeamMember {
  member_id?: string
  role: string
  contact_id: string
  is_user: boolean
  name: string
  email?: string
  phone?: string
  status?: 'pending' | 'confirmed' | 'declined'
}

interface Team {
  name: string
  members: TeamMember[]
}

const defaultTeams: Team[] = [
  {
    name: 'Worship Team',
    members: [
      { role: 'Acoustic Guitar + Vocals', contact_id: '', is_user: false, name: '' },
      { role: 'Keys', contact_id: '', is_user: false, name: '' },
      { role: 'Drums', contact_id: '', is_user: false, name: '' },
      { role: 'Bass', contact_id: '', is_user: false, name: '' },
      { role: 'Electric Guitar', contact_id: '', is_user: false, name: '' },
      { role: 'Vocals', contact_id: '', is_user: false, name: '' },
    ],
  },
  {
    name: 'Production Team',
    members: [
      { role: 'Sound Technician', contact_id: '', is_user: false, name: '' },
      { role: 'Projection', contact_id: '', is_user: false, name: '' },
      { role: 'Host', contact_id: '', is_user: false, name: '' },
    ],
  },
  {
    name: 'Logistics Team',
    members: [
      { role: 'Event Manager', contact_id: '', is_user: false, name: '' },
      { role: 'Venue Liaison', contact_id: '', is_user: false, name: '' },
    ],
  },
]

export default function EditTeamsPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: event, isLoading } = useEvent(id!)
  const updateEvent = useUpdateEvent()

  const [teams, setTeams] = useState<Team[]>([])
  const [collapsedTeams, setCollapsedTeams] = useState<Set<number> | null>(null)
  const [error, setError] = useState('')

  // Load event data
  useEffect(() => {
    if (!event) return

    if (event.event_teams && Array.isArray(event.event_teams) && event.event_teams.length > 0) {
      const loaded = event.event_teams.map((t: any) => ({
        name: t.name || '',
        members: (t.members || []).map((m: any) => ({
          member_id: m.member_id || undefined,
          role: m.role || '',
          contact_id: m.contact_id || '',
          is_user: m.is_user || false,
          name: m.name || '',
          email: m.email || '',
          phone: m.phone || '',
          status: m.status || undefined,
        })),
      }))
      setTeams(loaded)
      setCollapsedTeams(new Set(loaded.map((_: any, i: number) => i)))
    } else {
      // Pre-fill creator as Event Manager in Logistics Team
      const user = useAuthStore.getState().user
      const prefilled = defaultTeams.map(team => {
        if (team.name !== 'Logistics Team') return team
        return {
          ...team,
          members: team.members.map(m => {
            if (m.role !== 'Event Manager') return m
            return user ? {
              ...m,
              contact_id: user.id,
              is_user: true,
              name: user.name || user.email || '',
              email: user.email || '',
              status: 'confirmed' as const,
            } : m
          }),
        }
      })
      setTeams(prefilled)
      setCollapsedTeams(new Set(prefilled.map((_, i) => i)))
    }
  }, [event])

  const updateTeamName = (teamIndex: number, name: string) => {
    setTeams(prev => prev.map((t, i) =>
      i === teamIndex ? { ...t, name } : t
    ))
  }

  const updateMember = (teamIndex: number, memberIndex: number, field: keyof TeamMember, value: any) => {
    setTeams(prev => prev.map((t, i) =>
      i === teamIndex
        ? { ...t, members: t.members.map((m, j) => j === memberIndex ? { ...m, [field]: value } : m) }
        : t
    ))
  }

  const handleMemberContactChange = (teamIndex: number, memberIndex: number, name: string, contactId?: string, isUser?: boolean) => {
    setTeams(prev => prev.map((t, i) =>
      i === teamIndex
        ? {
            ...t,
            members: t.members.map((m, j) => {
              if (j !== memberIndex) return m
              const personChanged = contactId !== m.contact_id
              return {
                ...m,
                name,
                contact_id: contactId || '',
                is_user: isUser || false,
                // Clear member_id and status when person changes so backend creates a fresh invite
                ...(personChanged ? { member_id: undefined, status: undefined } : {}),
              }
            }),
          }
        : t
    ))
  }

  const addMember = (teamIndex: number) => {
    setTeams(prev => prev.map((t, i) =>
      i === teamIndex
        ? { ...t, members: [...t.members, { role: '', contact_id: '', is_user: false, name: '' }] }
        : t
    ))
  }

  const removeMember = (teamIndex: number, memberIndex: number) => {
    setTeams(prev => prev.map((t, i) =>
      i === teamIndex
        ? { ...t, members: t.members.filter((_, j) => j !== memberIndex) }
        : t
    ))
  }

  const addTeam = () => {
    setTeams(prev => [...prev, { name: '', members: [{ role: '', contact_id: '', is_user: false, name: '' }] }])
  }

  const removeTeam = (teamIndex: number) => {
    setTeams(prev => prev.filter((_, i) => i !== teamIndex))
  }

  const toggleCollapse = (teamIndex: number) => {
    setCollapsedTeams(prev => {
      const next = new Set(prev)
      if (next.has(teamIndex)) next.delete(teamIndex)
      else next.add(teamIndex)
      return next
    })
  }

  const handleSave = async () => {
    setError('')
    try {
      await updateEvent.mutateAsync({
        id: id!,
        data: { event_teams: teams } as any,
      })
      navigate(`/events/${id}`)
    } catch (err: any) {
      setError(err.response?.data?.message || t('events.teams.failedToSave'))
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
        <h3 className="text-lg font-medium text-gray-900 mb-2">{t('events.eventNotFound')}</h3>
        <Link to="/events" className="text-primary-600 hover:text-primary-700">{t('events.backToEvents')}</Link>
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
            <h1 className="text-2xl font-bold text-gray-900">{t('events.teams.eventTeams')}</h1>
            <p className="text-sm text-gray-500">{event.title}</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={updateEvent.isPending}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4 mr-2 inline" />
          {updateEvent.isPending ? t('events.teams.saving') : t('events.teams.saveTeams')}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Team Cards */}
      {teams.map((team, teamIndex) => {
        const isCollapsed = !collapsedTeams || collapsedTeams.has(teamIndex)
        const filledCount = team.members.filter(m => m.name?.trim()).length
        return (
        <div key={teamIndex} className="card relative overflow-visible" style={{ zIndex: teams.length - teamIndex }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <button
                type="button"
                onClick={() => toggleCollapse(teamIndex)}
                className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center flex-shrink-0 hover:bg-teal-200 transition-colors"
              >
                {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              {isCollapsed ? (
                <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => toggleCollapse(teamIndex)}>
                  <h3 className="text-lg font-semibold text-gray-900">{team.name || t('events.teams.unnamedTeam')}</h3>
                  <span className="text-xs text-gray-500">
                    {t('events.teams.membersCount', { filled: filledCount, total: team.members.length })}
                  </span>
                </div>
              ) : (
                <input
                  type="text"
                  value={team.name}
                  onChange={(e) => updateTeamName(teamIndex, e.target.value)}
                  className="input text-lg font-semibold flex-1"
                  placeholder={t('events.teams.teamNamePlaceholder')}
                />
              )}
            </div>
            <button
              type="button"
              onClick={() => removeTeam(teamIndex)}
              className="ml-3 text-red-400 hover:text-red-600 transition-colors"
              title={t('events.teams.removeTeam')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {!isCollapsed && (
            <div className="space-y-3 mt-4">
              {team.members.map((member, memberIndex) => (
                <div key={memberIndex} className="p-3 bg-gradient-to-r from-gray-50 to-teal-50 rounded-xl border border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="grid grid-cols-2 gap-3 flex-1">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">{t('common.role')}</label>
                        <MemberRoleCell
                          member={member}
                          teamName={team.name}
                          teamMembers={team.members}
                          onRoleChange={(newRole) => updateMember(teamIndex, memberIndex, 'role', newRole)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">{t('events.person')}</label>
                        <ContactAutocomplete
                          value={member.name}
                          contactId={member.contact_id || undefined}
                          isUser={member.is_user}
                          freeTextOnly
                          onChange={(name, contactId, isUser) => handleMemberContactChange(teamIndex, memberIndex, name, contactId, isUser)}
                          placeholder={t('tasks.searchPeople')}
                          className="input text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-6">
                      {member.status && member.is_user && (
                        <InvitationStatusBadge status={member.status} />
                      )}
                      {member.role === 'Event Manager' && (
                        <button
                          type="button"
                          onClick={() => {
                            setTeams(prev => prev.map((t, i) =>
                              i === teamIndex
                                ? { ...t, members: [...t.members.slice(0, memberIndex + 1), { role: 'Event Manager', contact_id: '', is_user: false, name: '' }, ...t.members.slice(memberIndex + 1)] }
                                : t
                            ))
                          }}
                          className="text-teal-400 hover:text-teal-600 transition-colors"
                          title={t('events.teams.addAnotherEventManager')}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeMember(teamIndex, memberIndex)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title={t('events.teams.removeMember')}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => addMember(teamIndex)}
                className="btn-secondary text-sm"
              >
                <Plus className="w-4 h-4 mr-1 inline" />
                {t('events.teams.addMember')}
              </button>
            </div>
          )}
        </div>
        )
      })}

      {/* Add Team */}
      <button
        type="button"
        onClick={addTeam}
        className="w-full card flex items-center justify-center gap-2 py-4 text-teal-600 hover:text-teal-700 hover:border-teal-300 hover:shadow-md transition-all cursor-pointer"
      >
        <Plus className="w-5 h-5" />
        <span className="font-semibold">{t('events.teams.addTeam')}</span>
      </button>

      {/* Bottom Save */}
      <div className="flex justify-end gap-3">
        <Link to={`/events/${id}`} className="btn-secondary">{t('common.cancel')}</Link>
        <button
          onClick={handleSave}
          disabled={updateEvent.isPending}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4 mr-2 inline" />
          {updateEvent.isPending ? t('events.teams.saving') : t('events.teams.saveTeams')}
        </button>
      </div>
    </div>
  )
}
