import { useState } from 'react'
import { Plus, Loader2, Search, Calendar as CalendarIcon, ChevronDown, ChevronRight } from 'lucide-react'
import { useEvents } from '@/hooks/useEvents'
import EventCard from '@/components/EventCard'
import CreateEventDialog from './CreateEventDialog'

export default function EventsPage() {
  const { data: events, isLoading } = useEvents()
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showPastEvents, setShowPastEvents] = useState(false)

  // Filter events
  const filteredEvents = events?.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location_name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === 'all' || event.type === filterType
    const matchesStatus = filterStatus === 'all' || event.status === filterStatus
    return matchesSearch && matchesType && matchesStatus
  })

  // Group events
  const now = new Date()
  const upcomingEvents = filteredEvents?.filter(e =>
    (e.status === 'confirmed' || e.status === 'planned') && new Date(e.date_end) >= now
  )
  const pastEvents = filteredEvents?.filter(e =>
    (e.status === 'confirmed' || e.status === 'planned') && new Date(e.date_end) < now
  )
  const archivedEvents = filteredEvents?.filter(e => e.status === 'archived')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your events and worship nights
          </p>
        </div>
        <button
          onClick={() => setIsCreateDialogOpen(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4 inline mr-2" />
          New Event
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[240px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>

          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input"
            >
              <option value="all">All Types</option>
              <option value="worship">Worship Night</option>
              <option value="in_house">In-House Event</option>
              <option value="film">Film Production</option>
              <option value="tour_child">Tour Event</option>
            </select>
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input"
            >
              <option value="all">All Status</option>
              <option value="planned">Planned</option>
              <option value="confirmed">Confirmed</option>
              <option value="canceled">Canceled</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Events List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : filteredEvents && filteredEvents.length > 0 ? (
        <div className="space-y-6">
          {upcomingEvents && upcomingEvents.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Upcoming Events ({upcomingEvents.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          )}

          {pastEvents && pastEvents.length > 0 && (
            <div>
              <button
                onClick={() => setShowPastEvents(!showPastEvents)}
                className="flex items-center gap-2 text-lg font-semibold text-gray-900 hover:text-purple-600 transition-colors mb-4"
              >
                {showPastEvents ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                Past Events ({pastEvents.length})
              </button>
              {showPastEvents && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pastEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}
            </div>
          )}

          {archivedEvents && archivedEvents.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Archived Events ({archivedEvents.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {archivedEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card text-center py-12">
          <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No events found
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {searchQuery || filterType !== 'all' || filterStatus !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by creating your first event'}
          </p>
          {!searchQuery && filterType === 'all' && filterStatus === 'all' && (
            <button
              onClick={() => setIsCreateDialogOpen(true)}
              className="btn-primary"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Create Event
            </button>
          )}
        </div>
      )}
      <CreateEventDialog isOpen={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)} />
    </div>
  )
}
