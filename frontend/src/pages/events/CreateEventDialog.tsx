import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { useCreateEvent } from '@/hooks/useEvents'
import { useUpdateVenue } from '@/hooks/useVenues'
import VenueAutocomplete from '@/components/VenueAutocomplete'
import type { EventType, EventPhase, EventStatus } from '@/types'

interface InitialEventData {
  type: EventType
  title: string
  location_name: string
  address: string
  venue_id: string
  description: string
  tags: string
  est_attendance: string
  event_time: string
  program_agenda?: object
}

interface CreateEventDialogProps {
  isOpen: boolean
  onClose: () => void
  initialData?: InitialEventData
}

export default function CreateEventDialog({ isOpen, onClose, initialData }: CreateEventDialogProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const createEvent = useCreateEvent()
  const updateVenue = useUpdateVenue()
  const programAgendaRef = useRef<object | undefined>(undefined)

  const eventTypes = [
    { value: 'worship', label: t('events.types.worship'), icon: '🎵', description: t('events.types.worshipDesc') },
    { value: 'in_house', label: t('events.types.inHouse'), icon: '🏛️', description: t('events.types.inHouseDesc') },
    { value: 'film', label: t('events.types.film'), icon: '🎬', description: t('events.types.filmDesc') },
    { value: 'tour_child', label: t('events.types.tourEvent'), icon: '🚌', description: t('events.types.tourEventDesc') },
  ]

  const isDuplicate = !!initialData

  const [formData, setFormData] = useState({
    type: 'worship' as EventType,
    event_date: '',
    event_time: '19:00',
    location_name: '',
    address: '',
    venue_id: '',
    title: '',
    description: '',
    tags: '',
    est_attendance: '',
  })

  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        type: initialData.type,
        event_date: '',
        event_time: initialData.event_time,
        location_name: initialData.location_name,
        address: initialData.address,
        venue_id: initialData.venue_id,
        title: initialData.title,
        description: initialData.description,
        tags: initialData.tags,
        est_attendance: initialData.est_attendance,
      })
      programAgendaRef.current = initialData.program_agenda
    }
  }, [isOpen, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.event_date) {
      setError(t('events.errors.dateRequired'))
      return
    }
    if (!formData.event_time) {
      setError(t('events.errors.startTimeRequired'))
      return
    }
    if (!formData.location_name.trim()) {
      setError(t('events.errors.venueRequired'))
      return
    }

    try {
      const [hours, minutes] = formData.event_time.split(':').map(Number)
      const [year, month, day] = formData.event_date.split('-').map(Number)
      const startDate = new Date(year, month - 1, day, hours, minutes, 0, 0)

      const endDate = new Date(startDate)
      endDate.setHours(startDate.getHours() + 8)

      const payload: Record<string, any> = {
        type: formData.type,
        title: formData.title || `${eventTypes.find(t => t.value === formData.type)?.label || 'Event'} — ${formData.event_date}`,
        description: formData.description || undefined,
        date_start: startDate.toISOString(),
        date_end: endDate.toISOString(),
        location_name: formData.location_name,
        address: formData.address || undefined,
        venue_id: formData.venue_id || undefined,
        est_attendance: formData.est_attendance ? parseInt(formData.est_attendance) : undefined,
        phase: 'concept' as EventPhase,
        status: 'planned' as EventStatus,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      }

      if (programAgendaRef.current) {
        payload.program_agenda = programAgendaRef.current
      }

      const event = await createEvent.mutateAsync(payload)

      resetForm()
      onClose()
      navigate(`/events/${event.id}`)
    } catch (err: any) {
      setError(err.response?.data?.message || t('events.errors.failedToCreate'))
    }
  }

  const resetForm = () => {
    setFormData({
      type: 'worship',
      event_date: '',
      event_time: '19:00',
      location_name: '',
      address: '',
      venue_id: '',
      title: '',
      description: '',
      tags: '',
      est_attendance: '',
    })
    programAgendaRef.current = undefined
    setError('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-900">{isDuplicate ? t('events.duplicateEvent') : t('events.createNewEvent')}</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('events.eventType')}</label>
            <div className="flex gap-2">
              {eventTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: type.value as EventType })}
                  className={`flex-1 px-3 py-2 rounded-lg border text-center transition-all ${
                    formData.type === type.value
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-gray-200 bg-white hover:border-teal-300 text-gray-700'
                  }`}
                >
                  <span className="text-lg">{type.icon}</span>
                  <div className="text-xs font-medium mt-0.5">{type.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.date')} *</label>
              <input
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('events.startTime')} *</label>
              <input
                type="time"
                value={formData.event_time}
                onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                className="input"
              />
            </div>
          </div>

          {/* Venue */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('events.venue')} *</label>
            <div className="border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500">
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

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('events.eventTitle')}</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input"
              placeholder={t('events.eventTitlePlaceholder')}
            />
            <p className="text-xs text-gray-400 mt-1">{t('events.titleAutoGenerate')}</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('events.description')}</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input"
              rows={3}
              placeholder={t('events.descriptionPlaceholder')}
            />
          </div>

          {/* Tags & Attendance */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('events.tags')}</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="input"
                placeholder={t('events.tagsPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('events.expectedAttendance')}</label>
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

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={handleClose} className="btn-secondary">
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={createEvent.isPending}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createEvent.isPending ? t('events.creating') : isDuplicate ? t('events.createCopy') : t('events.createEvent')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
