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
  const columns: { id: TaskStatus; label: string }[] = [
    { id: 'not_started', label: 'Not Started' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'waiting', label: 'Waiting' },
    { id: 'blocked', label: 'Blocked' },
    { id: 'done', label: 'Done' },
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
                {column.label}
              </h3>
              <span className="text-xs text-gray-500">{columnTasks.length} tasks</span>
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
