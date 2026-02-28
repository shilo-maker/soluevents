import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { useEvent, useUpdateEvent } from '@/hooks/useEvents'
import ContactAutocomplete from '@/components/ContactAutocomplete'

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

const defaultWorshipTeam: WorshipMember[] = [
  { role: 'Guitar + Vocals', person: '', contact_id: '', is_user: false, user_id: '', needs: ['Connected DI box', 'Mic + Stand + 2 XLRs', 'Guitar Stand'] },
  { role: 'Keys + Vocals', person: '', contact_id: '', is_user: false, user_id: '', needs: ['Keyboard stand', 'Mic + Stand + XLR', '5 XLRs inputs', 'Computer Stand'] },
  { role: 'Drums', person: '', contact_id: '', is_user: false, user_id: '', needs: ["Mic'd Drum Set + chair"], eDrums: false, eDrumsNeeds: ['Connected ST DI box', 'Drums Chair'] },
  { role: 'Bass', person: '', contact_id: '', is_user: false, user_id: '', needs: ['Connected DI box', 'Guitar Stand'] },
]

export default function EditRiderPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: event, isLoading } = useEvent(id!)
  const updateEvent = useUpdateEvent()

  const [worshipTeam, setWorshipTeam] = useState<WorshipMember[]>([])
  const [contactPerson, setContactPerson] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [soundmanNeeded, setSoundmanNeeded] = useState(true)
  const [projectionNeeded, setProjectionNeeded] = useState(true)
  const [specialRequirements, setSpecialRequirements] = useState('')
  const [editingNeedsIndex, setEditingNeedsIndex] = useState<number | null>(null)
  const [error, setError] = useState('')

  // Load event data
  useEffect(() => {
    if (!event) return

    if (event.rider_details) {
      const rd = event.rider_details as any
      setWorshipTeam(
        rd.worship_team?.length > 0
          ? rd.worship_team.map((m: any) => ({ ...m, contact_id: m.contact_id || '', is_user: m.is_user || false, user_id: m.user_id || m.contact_id || '' }))
          : defaultWorshipTeam
      )
      setContactPerson(rd.contact_person || '')
      setContactPhone(rd.contact_phone || '')
      setSoundmanNeeded(rd.soundman_needed ?? true)
      setProjectionNeeded(rd.projection_needed ?? true)
      setSpecialRequirements(rd.special_requirements || '')
    } else {
      // Pre-fill from event_teams if available
      const teams = (event as any).event_teams as any[] | undefined
      if (teams && Array.isArray(teams)) {
        const worshipTeamData = teams.find((t: any) => t.name?.toLowerCase().includes('worship'))
        if (worshipTeamData?.members?.length) {
          const needsMap: Record<string, string[]> = {
            'acoustic guitar': ['Connected DI box', 'Mic + Stand + 2 XLRs', 'Guitar Stand'],
            'electric guitar': ['Connected DI box', 'Mic + Stand + 2 XLRs', 'Guitar Stand'],
            'keys': ['Keyboard stand', 'Mic + Stand + XLR', '5 XLRs inputs', 'Computer Stand'],
            'keys#2': ['Keyboard stand', 'Mic + Stand + XLR', '5 XLRs inputs', 'Computer Stand'],
            'drums': ["Mic'd Drum Set + chair"],
            'bass': ['Connected DI box', 'Guitar Stand'],
            'vocals': ['Mic + Stand + XLR'],
            'percussion': ['Mic + Stand'],
            'violin': ['Connected DI box', 'Music Stand'],
            'cello': ['Connected DI box', 'Music Stand'],
          }
          setWorshipTeam(worshipTeamData.members
            .filter((m: any) => m.name?.trim())
            .map((m: any) => {
              const baseRole = m.role?.replace(/\s*\+\s*Vocals$/, '').toLowerCase() || ''
              const isDrums = baseRole === 'drums'
              return {
                role: m.role || '',
                person: m.name || '',
                contact_id: m.contact_id || '',
                is_user: m.is_user || false,
                user_id: m.contact_id || '',
                needs: needsMap[baseRole] || [''],
                ...(isDrums ? { eDrums: false, eDrumsNeeds: ['Connected ST DI box', 'Drums Chair'] } : {}),
              }
            }))
        } else {
          setWorshipTeam(defaultWorshipTeam)
        }
      } else {
        setWorshipTeam(defaultWorshipTeam)
      }
    }
  }, [event])

  const handleSave = async () => {
    setError('')
    try {
      await updateEvent.mutateAsync({
        id: id!,
        data: {
          rider_details: {
            worship_team: worshipTeam,
            contact_person: contactPerson,
            contact_phone: contactPhone,
            soundman_needed: soundmanNeeded,
            projection_needed: projectionNeeded,
            special_requirements: specialRequirements,
          },
        } as any,
      })
      navigate(`/events/${id}`)
    } catch (err: any) {
      setError(err.response?.data?.message || t('events.rider.failedToSave'))
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
            <h1 className="text-2xl font-bold text-gray-900">{t('events.technicalRider')}</h1>
            <p className="text-sm text-gray-500">{event.title}</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={updateEvent.isPending}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4 mr-2 inline" />
          {updateEvent.isPending ? t('events.rider.saving') : t('events.rider.saveRider')}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Worship Team */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('events.worshipTeam')}</h3>
        <div className="space-y-4">
          {worshipTeam.map((member, memberIndex) => (
            <div key={memberIndex} className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{t('common.role')}</label>
                  <input
                    type="text"
                    value={member.role}
                    onChange={(e) => {
                      const updated = [...worshipTeam]
                      updated[memberIndex].role = e.target.value
                      setWorshipTeam(updated)
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
                      const updated = [...worshipTeam]
                      updated[memberIndex].person = name
                      updated[memberIndex].contact_id = contactId || ''
                      updated[memberIndex].is_user = isUser || false
                      updated[memberIndex].user_id = contactId || ''
                      setWorshipTeam(updated)
                    }}
                    placeholder={t('common.name')}
                    className="input text-sm"
                  />
                </div>
              </div>

              {/* E-Drums Toggle */}
              {member.role === 'Drums' && (
                <div className="mb-3">
                  <label className="flex items-center p-2 bg-white border border-gray-200 rounded-lg">
                    <input
                      type="checkbox"
                      checked={member.eDrums || false}
                      onChange={(e) => {
                        const updated = [...worshipTeam]
                        updated[memberIndex].eDrums = e.target.checked
                        setWorshipTeam(updated)
                      }}
                      className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                    />
                    <span className="ml-2 text-sm font-semibold text-gray-900">{t('events.rider.eDrums')}</span>
                  </label>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-gray-600">
                    {member.role === 'Drums' && member.eDrums ? t('events.needsEDrums') : t('events.needs')}
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
                  <div className="space-y-2">
                    {(member.role === 'Drums' && member.eDrums ? member.eDrumsNeeds : member.needs)?.map((need, needIndex) => (
                      <div key={needIndex} className="flex gap-2">
                        <input
                          type="text"
                          value={need}
                          onChange={(e) => {
                            const updated = [...worshipTeam]
                            if (member.role === 'Drums' && member.eDrums) {
                              updated[memberIndex].eDrumsNeeds![needIndex] = e.target.value
                            } else {
                              updated[memberIndex].needs[needIndex] = e.target.value
                            }
                            setWorshipTeam(updated)
                          }}
                          className="input text-sm flex-1"
                          placeholder={t('events.rider.itemName')}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...worshipTeam]
                            if (member.role === 'Drums' && member.eDrums) {
                              updated[memberIndex].eDrumsNeeds = updated[memberIndex].eDrumsNeeds!.filter((_, i) => i !== needIndex)
                            } else {
                              updated[memberIndex].needs = updated[memberIndex].needs.filter((_, i) => i !== needIndex)
                            }
                            setWorshipTeam(updated)
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
                        const updated = [...worshipTeam]
                        if (member.role === 'Drums' && member.eDrums) {
                          if (!updated[memberIndex].eDrumsNeeds) updated[memberIndex].eDrumsNeeds = []
                          updated[memberIndex].eDrumsNeeds!.push('')
                        } else {
                          updated[memberIndex].needs.push('')
                        }
                        setWorshipTeam(updated)
                      }}
                      className="btn-secondary text-sm"
                    >
                      {t('events.addNeed')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setWorshipTeam(worshipTeam.filter((_, i) => i !== memberIndex))
                        setEditingNeedsIndex(null)
                      }}
                      className="btn-secondary text-sm mt-2"
                    >
                      {t('events.removeTeamMember')}
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-gray-700">
                    {(member.role === 'Drums' && member.eDrums ? member.eDrumsNeeds : member.needs)?.map((need, needIndex) => (
                      <span key={needIndex}>
                        {need}
                        {needIndex < ((member.role === 'Drums' && member.eDrums ? member.eDrumsNeeds : member.needs)?.length || 0) - 1 && ', '}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setWorshipTeam([...worshipTeam, { role: '', person: '', contact_id: '', is_user: false, user_id: '', needs: [''] }])}
            className="btn-secondary"
          >
            {t('events.addTeamMember')}
          </button>
        </div>
      </div>

      {/* Contact & Requirements */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('events.rider.contactRequirements')}</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('events.contactPerson')}</label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="input"
                placeholder={t('common.name')}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('events.contactPhone')}</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="input"
                placeholder={t('common.phone')}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center p-3 bg-gradient-to-br from-blue-50 to-teal-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={soundmanNeeded}
                onChange={(e) => setSoundmanNeeded(e.target.checked)}
                className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
              />
              <span className="ml-2 text-sm font-semibold text-gray-700">{t('events.rider.soundmanNeeded')}</span>
            </label>
            <label className="flex items-center p-3 bg-gradient-to-br from-blue-50 to-teal-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={projectionNeeded}
                onChange={(e) => setProjectionNeeded(e.target.checked)}
                className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
              />
              <span className="ml-2 text-sm font-semibold text-gray-700">{t('events.rider.projectionNeeded')}</span>
            </label>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t('events.specialRequirements')}</label>
            <textarea
              value={specialRequirements}
              onChange={(e) => setSpecialRequirements(e.target.value)}
              className="input"
              rows={3}
              placeholder={t('events.rider.specialReqPlaceholder')}
            />
          </div>
        </div>
      </div>

      {/* Bottom Save */}
      <div className="flex justify-end gap-3">
        <Link to={`/events/${id}`} className="btn-secondary">{t('common.cancel')}</Link>
        <button
          onClick={handleSave}
          disabled={updateEvent.isPending}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4 mr-2 inline" />
          {updateEvent.isPending ? t('events.rider.saving') : t('events.rider.saveRider')}
        </button>
      </div>
    </div>
  )
}
