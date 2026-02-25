import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Loader2, MapPin, Calendar, Users } from 'lucide-react'
import { useTours } from '@/hooks/useTours'
import { formatDate } from '@/lib/utils'
import Badge from '@/components/Badge'
import CreateTourModal from './CreateTourModal'

export default function ToursPage() {
  const { data: tours, isLoading } = useTours()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tours</h1>
          <p className="mt-1 text-sm text-gray-500">
            Plan and manage multi-day tours
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4 inline mr-2" />
          New Tour
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : tours && tours.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tours.map((tour: any) => (
            <Link
              key={tour.id}
              to={`/tours/${tour.id}`}
              className="card hover:shadow-md transition-shadow duration-200 cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 flex-1">
                  {tour.title}
                </h3>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>
                    {formatDate(tour.start_date)} - {formatDate(tour.end_date)}
                  </span>
                </div>

                {tour.regions && tour.regions.length > 0 && (
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{tour.regions.join(', ')}</span>
                  </div>
                )}

                {tour.tour_days && (
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    <span>{tour.tour_days.length} day{tour.tour_days.length !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>

              {tour.regions && tour.regions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {tour.regions.map((region: string) => (
                    <Badge key={region} variant="default" size="sm">
                      {region}
                    </Badge>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No tours yet
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Get started by creating your first tour
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Create Tour
          </button>
        </div>
      )}

      {/* Create Tour Modal */}
      <CreateTourModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  )
}
