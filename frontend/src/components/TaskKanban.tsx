import { useTranslation } from 'react-i18next'
import type { Task, TaskStatus, User } from '@/types'
import TaskCard from './TaskCard'

interface TaskKanbanProps {
  tasks: (Task & {
    assignee?: { id: string; name: string | null; email: string }
    assignee_contact?: { id: string; name: string; email?: string; phone?: string }
    event?: { id: string; title: string }
  })[]
  currentUser?: User | null
  onTaskUpdate: (taskId: string, newStatus: TaskStatus) => void
  onUpdateTask?: (taskId: string, data: Partial<Task>) => void
  onUpdateLink?: (taskId: string, link: string | null) => void
}

export default function TaskKanban({ tasks, currentUser, onTaskUpdate, onUpdateTask, onUpdateLink }: TaskKanbanProps) {
  const { t } = useTranslation()
  const columns: { id: TaskStatus; key: string }[] = [
    { id: 'not_started', key: 'tasks.status.not_started' },
    { id: 'in_progress', key: 'tasks.status.in_progress' },
    { id: 'waiting', key: 'tasks.status.waiting' },
    { id: 'blocked', key: 'tasks.status.blocked' },
    { id: 'done', key: 'tasks.status.done' },
  ]

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter((task) => task.status === status)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {columns.map((column) => {
        const columnTasks = getTasksByStatus(column.id)
        return (
          <div key={column.id} className="flex flex-col">
            <div className="card mb-3">
              <h3 className="font-semibold text-gray-900 text-sm">
                {t(column.key)}
              </h3>
              <span className="text-xs text-gray-500">{t('tasks.kanban.tasks', { count: columnTasks.length })}</span>
            </div>
            <div className="space-y-3 flex-1">
              {columnTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  currentUser={currentUser}
                  onToggle={onTaskUpdate}
                  onUpdateTask={onUpdateTask}
                  onUpdateLink={onUpdateLink}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
