import { Calendar, CheckSquare, Bell, Loader2 } from 'lucide-react'
import { useEvents } from '@/hooks/useEvents'
import { useTasks, useUpdateTask } from '@/hooks/useTasks'
import { useAuthStore } from '@/stores/authStore'
import { isWithinDays } from '@/lib/utils'
import { isAfter } from 'date-fns'
import EventCard from '@/components/EventCard'
import TaskCard from '@/components/TaskCard'

export default function Dashboard() {
  const { user } = useAuthStore()
  const { data: events, isLoading: eventsLoading } = useEvents()
  const { data: tasks, isLoading: tasksLoading } = useTasks({ assignee: 'me' })

  // Filter upcoming events (next 30 days)
  const upcomingEvents = events?.filter((event) => {
    const eventDate = new Date(event.date_start)
    return isAfter(eventDate, new Date()) && isWithinDays(eventDate, 30)
  })

  // Filter pending tasks (not done)
  const pendingTasks = tasks?.filter((task) => task.status !== 'done')

  // Sort by priority and due date
  const sortedTasks = pendingTasks?.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, normal: 2 }
    if (a.priority !== b.priority) {
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    }
    if (a.due_at && b.due_at) {
      return new Date(a.due_at).getTime() - new Date(b.due_at).getTime()
    }
    return 0
  })

  const updateTaskMutation = useUpdateTask('')

  const handleToggleTask = (_taskId: string, newStatus: 'done' | 'not_started') => {
    updateTaskMutation.mutate({ status: newStatus }, {
      onSuccess: () => {
        // Task will be refetched automatically
      },
    })
  }

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 shadow-2xl text-white">
        <h1 className="text-4xl font-bold mb-2">Welcome back, {user?.name}! 👋</h1>
        <p className="text-lg text-white/90">
          Here's what's happening with your events and tasks.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Upcoming Events */}
        <div className="card col-span-2">
          <div className="flex items-center mb-4">
            <Calendar className="w-5 h-5 text-primary-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">
              Upcoming Events (30 days)
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
                  + {upcomingEvents.length - 3} more events
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No upcoming events in the next 30 days</p>
          )}
        </div>

        {/* Notifications */}
        <div className="card">
          <div className="flex items-center mb-4">
            <Bell className="w-5 h-5 text-primary-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">
              Notifications
            </h2>
          </div>
          <p className="text-sm text-gray-500">No new notifications</p>
          <p className="text-xs text-gray-400 mt-2">Coming soon...</p>
        </div>
      </div>

      {/* My Pending Tasks */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <CheckSquare className="w-5 h-5 text-primary-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">
              My Pending Tasks
            </h2>
          </div>
          {pendingTasks && pendingTasks.length > 0 && (
            <span className="text-sm text-gray-500">
              {pendingTasks.length} task{pendingTasks.length !== 1 ? 's' : ''}
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
          <p className="text-sm text-gray-500">No pending tasks</p>
        )}
      </div>
    </div>
  )
}
