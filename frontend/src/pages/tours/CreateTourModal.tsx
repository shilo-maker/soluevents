import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useCreateTour } from '@/hooks/useTours'
import { useUsers } from '@/hooks/useUsers'

interface CreateTourModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function CreateTourModal({ isOpen, onClose }: CreateTourModalProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const createTour = useCreateTour()
  const { data: users } = useUsers()

  const [formData, setFormData] = useState({
    title: '',
    start_date: '',
    end_date: '',
    regions: '',
    director_user_id: '',
    logistics_user_id: '',
    comms_user_id: '',
    media_user_id: '',
    hospitality_user_id: '',
  })

  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.title || !formData.start_date || !formData.end_date) {
      setError(t('tours.errors.requiredFields'))
      return
    }

    try {
      const tourData = {
        ...formData,
        regions: formData.regions ? formData.regions.split(',').map((r) => r.trim()) : [],
        director_user_id: formData.director_user_id || undefined,
        logistics_user_id: formData.logistics_user_id || undefined,
        comms_user_id: formData.comms_user_id || undefined,
        media_user_id: formData.media_user_id || undefined,
        hospitality_user_id: formData.hospitality_user_id || undefined,
      }

      const tour = await createTour.mutateAsync(tourData)
      onClose()
      navigate(`/tours/${tour.id}`)
    } catch (err: any) {
      setError(err.response?.data?.message || t('tours.errors.failedToCreate'))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">{t('tours.createNewTour')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('tours.tourName')} {t('common.required')}
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input"
              required
              placeholder={t('tours.titlePlaceholder')}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('tours.startDate')} {t('common.required')}
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('tours.endDate')} {t('common.required')}
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="input"
                required
              />
            </div>
          </div>

          {/* Regions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('tours.regions')}
            </label>
            <input
              type="text"
              value={formData.regions}
              onChange={(e) => setFormData({ ...formData, regions: e.target.value })}
              className="input"
              placeholder={t('tours.regionsPlaceholder')}
            />
          </div>

          {/* Team Leads */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">{t('tours.teamLeads')}</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('tours.director')}
                </label>
                <select
                  value={formData.director_user_id}
                  onChange={(e) =>
                    setFormData({ ...formData, director_user_id: e.target.value })
                  }
                  className="input"
                >
                  <option value="">{t('common.none')}</option>
                  {users?.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('tours.logisticsLead')}
                </label>
                <select
                  value={formData.logistics_user_id}
                  onChange={(e) =>
                    setFormData({ ...formData, logistics_user_id: e.target.value })
                  }
                  className="input"
                >
                  <option value="">{t('common.none')}</option>
                  {users?.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('tours.communicationsLead')}
                </label>
                <select
                  value={formData.comms_user_id}
                  onChange={(e) =>
                    setFormData({ ...formData, comms_user_id: e.target.value })
                  }
                  className="input"
                >
                  <option value="">{t('common.none')}</option>
                  {users?.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('tours.mediaLead')}
                </label>
                <select
                  value={formData.media_user_id}
                  onChange={(e) =>
                    setFormData({ ...formData, media_user_id: e.target.value })
                  }
                  className="input"
                >
                  <option value="">{t('common.none')}</option>
                  {users?.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('tours.hospitalityLead')}
                </label>
                <select
                  value={formData.hospitality_user_id}
                  onChange={(e) =>
                    setFormData({ ...formData, hospitality_user_id: e.target.value })
                  }
                  className="input"
                >
                  <option value="">{t('common.none')}</option>
                  {users?.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={createTour.isPending}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createTour.isPending ? t('tours.creating') : t('tours.createTour')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
