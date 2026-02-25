import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useCreateEvent } from '@/hooks/useEvents'
import { useUpdateVenue } from '@/hooks/useVenues'
import VenueAutocomplete from '@/components/VenueAutocomplete'
import type { EventType, EventPhase, EventStatus } from '@/types'

interface CreateEventDialogProps {
  isOpen: boolean
  onClose: () => void
}

const eventTypes = [
  { value: 'worship', label: 'Worship Night', icon: '🎵', description: 'Evening worship service with music and prayer' },
  { value: 'in_house', label: 'In-House Event', icon: '🏛️', description: 'Internal event at your venue' },
  { value: 'film', label: 'Film Production', icon: '🎬', description: 'Video recording or film project' },
  { value: 'tour_child', label: 'Tour Event', icon: '🚌', description: 'Part of a multi-city tour' },
]

export default function CreateEventDialog({ isOpen, onClose }: CreateEventDialogProps) {
  const navigate = useNavigate()
  const createEvent = useCreateEvent()
  const updateVenue = useUpdateVenue()

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.event_date) {
      setError('Event date is required')
      return
    }
    if (!formData.location_name.trim()) {
      setError('Venue name is required')
      return
    }

    try {
      const [hours, minutes] = formData.event_time.split(':').map(Number)
      const eventDate = new Date(formData.event_date)
      const startDate = new Date(eventDate)
      startDate.setHours(hours, minutes, 0, 0)

      const endDate = new Date(startDate)
      endDate.setHours(startDate.getHours() + 8)

      const event = await createEvent.mutateAsync({
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
      })

      onClose()
      navigate(`/events/${event.id}`)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create event')
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
          <h2 className="text-xl font-semibold text-gray-900">Create New Event</h2>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
            <div className="flex gap-2">
              {eventTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: type.value as EventType })}
                  className={`flex-1 px-3 py-2 rounded-lg border text-center transition-all ${
                    formData.type === type.value
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 bg-white hover:border-purple-300 text-gray-700'
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Venue *</label>
            <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-purple-500">
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
                placeholder="Venue name"
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
                  placeholder="Address or Google Maps link (optional)"
                />
              </div>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input"
              placeholder="e.g., Summer Worship Night 2025"
            />
            <p className="text-xs text-gray-400 mt-1">Leave blank to auto-generate from type and date</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input"
              rows={3}
              placeholder="Brief description of the event..."
            />
          </div>

          {/* Tags & Attendance */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="input"
                placeholder="worship, summer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Attendance</label>
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={createEvent.isPending}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createEvent.isPending ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
