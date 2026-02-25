import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Loader2,
  Edit,
  Users,
} from 'lucide-react'
import { useTour } from '@/hooks/useTours'
import { useTasks } from '@/hooks/useTasks'
import { formatDate } from '@/lib/utils'
import Badge from '@/components/Badge'
import TaskCard from '@/components/TaskCard'

type Tab = 'overview' | 'schedule' | 'tasks' | 'files'

export default function TourDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const { data: tour, isLoading } = useTour(id!)
  const { data: tasks, isLoading: tasksLoading } = useTasks({ tour_id: id })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!tour) {
    return (
      <div className="card text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Tour not found</h3>
        <Link to="/tours" className="text-primary-600 hover:text-primary-700">
          ← Back to Tours
        </Link>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'schedule', label: 'Daily Schedule', count: (tour as any).tour_days?.length },
    { id: 'tasks', label: 'Tasks', count: tasks?.length },
    { id: 'files', label: 'Files', count: 0 },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/tours" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{tour.title}</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>
              {formatDate(tour.start_date)} - {formatDate(tour.end_date)}
            </span>
          </div>
        </div>
        <button className="btn-secondary">
          <Edit className="w-4 h-4 mr-2" />
          Edit
        </button>
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
            {/* Tour Info */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Tour Details
              </h3>
              <div className="space-y-4">
                {tour.regions && tour.regions.length > 0 && (
                  <div className="flex items-start">
                    <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Regions</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {tour.regions.map((region) => (
                          <Badge key={region} variant="default" size="sm">
                            {region}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Team Leads */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Leads</h3>
              <div className="grid grid-cols-2 gap-4">
                {(tour as any).director && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Director</p>
                    <p className="text-sm font-medium text-gray-900">
                      {(tour as any).director.name}
                    </p>
                  </div>
                )}
                {(tour as any).logistics && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Logistics</p>
                    <p className="text-sm font-medium text-gray-900">
                      {(tour as any).logistics.name}
                    </p>
                  </div>
                )}
                {(tour as any).comms && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Communications</p>
                    <p className="text-sm font-medium text-gray-900">
                      {(tour as any).comms.name}
                    </p>
                  </div>
                )}
                {(tour as any).media && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Media</p>
                    <p className="text-sm font-medium text-gray-900">
                      {(tour as any).media.name}
                    </p>
                  </div>
                )}
                {(tour as any).hospitality && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Hospitality</p>
                    <p className="text-sm font-medium text-gray-900">
                      {(tour as any).hospitality.name}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Schedule</h3>
            <p className="text-sm text-gray-500">Tour day management coming soon...</p>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-4">
            {tasksLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : tasks && tasks.length > 0 ? (
              tasks.map((task) => <TaskCard key={task.id} task={task} />)
            ) : (
              <div className="card text-center py-12">
                <p className="text-sm text-gray-500">No tasks for this tour</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'files' && (
          <div className="card text-center py-12">
            <p className="text-sm text-gray-500">File management coming soon...</p>
          </div>
        )}
      </div>
    </div>
  )
}
