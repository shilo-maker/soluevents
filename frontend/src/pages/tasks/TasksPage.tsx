import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Plus, Loader2, Search, LayoutGrid, List as ListIcon, AlertTriangle } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useTasks } from '@/hooks/useTasks'
import { useAuthStore } from '@/stores/authStore'
import api from '@/lib/axios'
import TaskCard from '@/components/TaskCard'
import TaskKanban from '@/components/TaskKanban'
import CreateTaskModal from './CreateTaskModal'
import type { TaskStatus } from '@/types'

type View = 'list' | 'kanban'

export default function TasksPage() {
  const { t } = useTranslation()
  const { user: _user } = useAuthStore()
  const [view, setView] = useState<View>('list')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterAssignee, setFilterAssignee] = useState<string>('me')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [error, setError] = useState('')
  const errorTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const showError = useCallback((msg: string) => {
    setError(msg)
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    errorTimerRef.current = setTimeout(() => setError(''), 5000)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const { data: tasks, isLoading } = useTasks(
    filterAssignee === 'all' ? {} : { assignee: filterAssignee }
  )

  const queryClient = useQueryClient()

  const handleToggleTask = useCallback((taskId: string, newStatus: TaskStatus) => {
    api.patch(`/tasks/${taskId}`, { status: newStatus }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }).catch((err: any) => {
      showError(err.response?.data?.message || t('tasks.errors.failedUpdateStatus'))
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    })
  }, [queryClient, showError, t])

  const handleUpdateTask = useCallback((taskId: string, data: Record<string, any>) => {
    api.patch(`/tasks/${taskId}`, data).then(() => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }).catch((err: any) => {
      showError(err.response?.data?.message || t('tasks.errors.failedUpdate'))
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    })
  }, [queryClient, showError, t])

  const handleUpdateLink = useCallback((taskId: string, link: string | null) => {
    api.patch(`/tasks/${taskId}`, { link }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }).catch((err: any) => {
      showError(err.response?.data?.message || t('tasks.errors.failedUpdateLink'))
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    })
  }, [queryClient, showError])

  // Filter tasks
  const filteredTasks = useMemo(() => tasks?.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      task.description?.toLowerCase().includes(debouncedSearch.toLowerCase())
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority
    return matchesSearch && matchesStatus && matchesPriority
  }), [tasks, debouncedSearch, filterStatus, filterPriority])

  // Sort tasks by priority and due date
  const sortedTasks = useMemo(() => filteredTasks?.slice().sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, normal: 2 }
    if (a.priority !== b.priority) {
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    }
    if (a.due_at && b.due_at) {
      return new Date(a.due_at).getTime() - new Date(b.due_at).getTime()
    }
    return 0
  }), [filteredTasks])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('tasks.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('tasks.subtitle')}
          </p>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary">
          <Plus className="w-4 h-4 inline mr-2" />
          {t('tasks.newTask')}
        </button>
      </div>

      {/* Filters and View Toggle */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-0 sm:min-w-[240px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('tasks.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>

          {/* Filters */}
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="input"
          >
            <option value="me">{t('tasks.myTasks')}</option>
            <option value="all">{t('tasks.allTasks')}</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input"
          >
            <option value="all">{t('tasks.allStatus')}</option>
            <option value="not_started">{t('tasks.status.not_started')}</option>
            <option value="in_progress">{t('tasks.status.in_progress')}</option>
            <option value="waiting">{t('tasks.status.waiting')}</option>
            <option value="blocked">{t('tasks.status.blocked')}</option>
            <option value="done">{t('tasks.status.done')}</option>
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="input"
          >
            <option value="all">{t('tasks.allPriority')}</option>
            <option value="critical">{t('tasks.priority.critical')}</option>
            <option value="high">{t('tasks.priority.high')}</option>
            <option value="normal">{t('tasks.priority.normal')}</option>
          </select>

          {/* View Toggle */}
          <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-1">
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded ${
                view === 'list'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={t('tasks.listView')}
            >
              <ListIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('kanban')}
              className={`p-2 rounded ${
                view === 'kanban'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={t('tasks.kanbanView')}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700 text-sm font-medium">
            {t('common.dismiss')}
          </button>
        </div>
      )}

      {/* Tasks Display */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : sortedTasks && sortedTasks.length > 0 ? (
        view === 'list' ? (
          <div className="space-y-3">
            {sortedTasks.map((task) => (
              <TaskCard key={task.id} task={task} currentUser={_user} onToggle={handleToggleTask} onUpdateTask={handleUpdateTask} onUpdateLink={handleUpdateLink} />
            ))}
          </div>
        ) : (
          <TaskKanban
            tasks={sortedTasks}
            currentUser={_user}
            onTaskUpdate={handleToggleTask}
            onUpdateTask={handleUpdateTask}
            onUpdateLink={handleUpdateLink}
          />
        )
      ) : (
        <div className="card text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('tasks.noTasksFound')}</h3>
          <p className="text-sm text-gray-500 mb-4">
            {debouncedSearch || filterStatus !== 'all' || filterPriority !== 'all'
              ? t('tasks.tryAdjustingFilters')
              : t('tasks.getStarted')}
          </p>
          {!debouncedSearch && filterStatus === 'all' && filterPriority === 'all' && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-primary"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              {t('tasks.createTask')}
            </button>
          )}
        </div>
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  )
}
