import { useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, CheckSquare, Bell, Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useEvents } from '@/hooks/useEvents'
import { useTasks } from '@/hooks/useTasks'
import { useAuthStore } from '@/stores/authStore'
import api from '@/lib/axios'
import { isWithinDays } from '@/lib/utils'
import { isAfter } from 'date-fns'
import EventCard from '@/components/EventCard'
import TaskCard from '@/components/TaskCard'

export default function Dashboard() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { data: events, isLoading: eventsLoading } = useEvents()
  const { data: tasks, isLoading: tasksLoading } = useTasks({ assignee: 'me' })

  // Filter upcoming events (next 30 days)
  const upcomingEvents = useMemo(() => events?.filter((event) => {
    const eventDate = new Date(event.date_start)
    return isAfter(eventDate, new Date()) && isWithinDays(eventDate, 30)
  }), [events])

  // Filter pending tasks (not done)
  const pendingTasks = useMemo(() => tasks?.filter((task) => task.status !== 'done'), [tasks])

  // Sort by priority and due date
  const sortedTasks = useMemo(() => pendingTasks?.slice().sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, normal: 2 }
    if (a.priority !== b.priority) {
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    }
    if (a.due_at && b.due_at) {
      return new Date(a.due_at).getTime() - new Date(b.due_at).getTime()
    }
    return 0
  }), [pendingTasks])

  const queryClient = useQueryClient()

  const handleToggleTask = useCallback((taskId: string, newStatus: 'done' | 'not_started') => {
    api.patch(`/tasks/${taskId}`, { status: newStatus }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }).catch(() => {
      // Refresh to show actual state on failure
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    })
  }, [queryClient])

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-3xl p-5 sm:p-8 shadow-2xl text-white">
        <h1 className="text-2xl sm:text-4xl font-bold mb-2">{t('dashboard.welcomeBack', { name: user?.name })} 👋</h1>
        <p className="text-lg text-white/90">
          {t('dashboard.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Upcoming Events */}
        <div className="card lg:col-span-2">
          <div className="flex items-center mb-4">
            <Calendar className="w-5 h-5 text-primary-600 me-2" />
            <h2 className="text-lg font-semibold text-gray-900">
              {t('dashboard.upcomingEvents')}
            </h2>
          </div>

          {eventsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : upcomingEvents && upcomingEvents.length > 0 ? (
            <div className="space-y-3">
              {upcomingEvents.slice(0, 3).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
              {upcomingEvents.length > 3 && (
                <p className="text-sm text-gray-500 text-center pt-2">
                  {t('dashboard.moreEvents', { count: upcomingEvents.length - 3 })}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">{t('dashboard.noUpcoming')}</p>
          )}
        </div>

        {/* Notifications */}
        <div className="card">
          <div className="flex items-center mb-4">
            <Bell className="w-5 h-5 text-primary-600 me-2" />
            <h2 className="text-lg font-semibold text-gray-900">
              {t('dashboard.notifications')}
            </h2>
          </div>
          <p className="text-sm text-gray-500">{t('dashboard.noNotifications')}</p>
          <p className="text-xs text-gray-400 mt-2">{t('dashboard.comingSoon')}</p>
        </div>
      </div>

      {/* My Pending Tasks */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <CheckSquare className="w-5 h-5 text-primary-600 me-2" />
            <h2 className="text-lg font-semibold text-gray-900">
              {t('dashboard.myPendingTasks')}
            </h2>
          </div>
          {pendingTasks && pendingTasks.length > 0 && (
            <span className="text-sm text-gray-500">
              {t('dashboard.taskCount', { count: pendingTasks.length })}
            </span>
          )}
        </div>

        {tasksLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : sortedTasks && sortedTasks.length > 0 ? (
          <div className="space-y-3">
            {sortedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={handleToggleTask}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">{t('dashboard.noPendingTasks')}</p>
        )}
      </div>
    </div>
  )
}
