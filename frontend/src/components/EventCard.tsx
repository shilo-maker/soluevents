import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Calendar, MapPin, Users, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { useDeleteEvent } from '@/hooks/useEvents'
import Badge from './Badge'
import type { Event } from '@/types'

interface EventCardProps {
  event: Event
}

export default function EventCard({ event }: EventCardProps) {
  const navigate = useNavigate()
  const deleteEvent = useDeleteEvent()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  function handleDelete() {
    deleteEvent.mutate(event.id, {
      onSuccess: () => {
        setShowDeleteConfirm(false)
      },
    })
  }

  return (
    <>
      <Link
        to={`/events/${event.id}`}
        className="group relative block card hover:scale-[1.02] transition-all duration-300 cursor-pointer border-l-4 border-purple-500"
      >
        {/* 3-dot menu */}
        <div
          ref={menuRef}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={(e) => e.preventDefault()}
        >
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setMenuOpen(!menuOpen)
            }}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setMenuOpen(false)
                  navigate(`/events/${event.id}?edit=true`)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setMenuOpen(false)
                  setShowDeleteConfirm(true)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>

        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
              {event.title}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={phaseColors[event.phase]} size="sm">
                {event.phase}
              </Badge>
              <Badge variant={statusColors[event.status]} size="sm">
                {event.status}
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex items-center bg-blue-50/50 rounded-lg px-3 py-2">
            <Calendar className="w-4 h-4 mr-2 text-blue-600" />
            <span className="font-medium">{formatDateTime(event.date_start)}</span>
          </div>

          {event.location_name && (
            <div className="flex items-center bg-purple-50/50 rounded-lg px-3 py-2">
              <MapPin className="w-4 h-4 mr-2 text-purple-600" />
              <span className="font-medium">{event.location_name}</span>
            </div>
          )}

          {event.est_attendance && (
            <div className="flex items-center bg-green-50/50 rounded-lg px-3 py-2">
              <Users className="w-4 h-4 mr-2 text-green-600" />
              <span className="font-medium">{event.est_attendance} expected</span>
            </div>
          )}
        </div>

        {event.tags && event.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
            {event.tags.map((tag) => (
              <Badge key={tag} variant="default" size="sm">
                #{tag}
              </Badge>
            ))}
          </div>
        )}
      </Link>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Event</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete <strong>{event.title}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteEvent.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteEvent.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
