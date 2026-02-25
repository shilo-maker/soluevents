import { useState } from 'react'
import { CheckCircle2, Clock, AlertCircle, Link as LinkIcon, Edit2, X, Check, Save } from 'lucide-react'
import { formatDate, isWithinDays, isPast } from '@/lib/utils'
import Badge from './Badge'
import type { Task, TaskPriority, TaskStatus, User } from '@/types'

interface TaskCardProps {
  task: Task & {
    assignee?: { id: string; name: string; email: string }
    event?: { id: string; title: string }
  }
  currentUser?: User | null
  users?: Array<{ id: string; name: string; email: string }>
  onToggle?: (taskId: string, newStatus: 'done' | 'not_started') => void
  onUpdateLink?: (taskId: string, link: string) => void
  onUpdateTask?: (taskId: string, data: Partial<Task>) => void
}

export default function TaskCard({ task, currentUser, users, onToggle, onUpdateLink, onUpdateTask }: TaskCardProps) {
  const [isEditingLink, setIsEditingLink] = useState(false)
  const [linkValue, setLinkValue] = useState(task.link || '')
  const [isEditingTask, setIsEditingTask] = useState(false)
  const [editFormData, setEditFormData] = useState({
    title: task.title,
    description: task.description || '',
    priority: task.priority,
    status: task.status,
    assignee_id: task.assignee_id || '',
    due_at: task.due_at ? new Date(task.due_at).toISOString().slice(0, 16) : '',
    link: task.link || '',
  })

  const priorityColors = {
    critical: 'danger',
    high: 'warning',
    normal: 'default',
  } as const

  const isDone = task.status === 'done'
  const isOverdue = task.due_at && isPast(task.due_at) && !isDone
  const isDueSoon = task.due_at && isWithinDays(task.due_at, 3) && !isDone
  const isAdmin = currentUser?.org_role === 'admin' || currentUser?.org_role === 'manager'

  const handleSaveLink = () => {
    onUpdateLink?.(task.id, linkValue)
    setIsEditingLink(false)
  }

  const handleCancelLink = () => {
    setLinkValue(task.link || '')
    setIsEditingLink(false)
  }

  const handleSaveTask = () => {
    onUpdateTask?.(task.id, {
      title: editFormData.title,
      description: editFormData.description,
      priority: editFormData.priority,
      status: editFormData.status,
      assignee_id: editFormData.assignee_id || undefined,
      due_at: editFormData.due_at ? new Date(editFormData.due_at).toISOString() : undefined,
      link: editFormData.link,
    })
    setIsEditingTask(false)
  }

  const handleCancelEdit = () => {
    setEditFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      assignee_id: task.assignee_id || '',
      due_at: task.due_at ? new Date(task.due_at).toISOString().slice(0, 16) : '',
      link: task.link || '',
    })
    setIsEditingTask(false)
  }

  if (isEditingTask) {
    return (
      <div className="card">
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">Edit Task</h4>
            <div className="flex gap-2">
              <button
                onClick={handleSaveTask}
                className="btn-primary flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={editFormData.title}
              onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
            <textarea
              value={editFormData.description}
              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
              className="input"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Priority</label>
              <select
                value={editFormData.priority}
                onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value as TaskPriority })}
                className="input"
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
              <select
                value={editFormData.status}
                onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as TaskStatus })}
                className="input"
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting">Waiting</option>
                <option value="blocked">Blocked</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Assigned To</label>
              <select
                value={editFormData.assignee_id}
                onChange={(e) => setEditFormData({ ...editFormData, assignee_id: e.target.value })}
                className="input"
              >
                <option value="">Unassigned</option>
                {users?.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Due Date</label>
              <input
                type="datetime-local"
                value={editFormData.due_at}
                onChange={(e) => setEditFormData({ ...editFormData, due_at: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Link</label>
            <input
              type="url"
              value={editFormData.link}
              onChange={(e) => setEditFormData({ ...editFormData, link: e.target.value })}
              placeholder="https://..."
              className="input"
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start gap-3">
        <button
          onClick={() =>
            onToggle?.(task.id, isDone ? 'not_started' : 'done')
          }
          className="mt-1 flex-shrink-0"
        >
          <CheckCircle2
            className={`w-5 h-5 ${
              isDone
                ? 'text-green-500 fill-green-500'
                : 'text-gray-300 hover:text-gray-400'
            }`}
          />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4
              className={`font-medium ${
                isDone
                  ? 'text-gray-500 line-through'
                  : 'text-gray-900'
              }`}
            >
              {task.title}
            </h4>
            <div className="flex items-center gap-2">
              <Badge variant={priorityColors[task.priority]} size="sm">
                {task.priority}
              </Badge>
              {isAdmin && onUpdateTask && (
                <button
                  onClick={() => setIsEditingTask(true)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Edit task"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {task.description && (
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
              {task.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 text-sm">
            {task.due_at && (
              <div
                className={`flex items-center ${
                  isOverdue
                    ? 'text-red-600'
                    : isDueSoon
                    ? 'text-yellow-600'
                    : 'text-gray-500'
                }`}
              >
                {isOverdue ? (
                  <AlertCircle className="w-4 h-4 mr-1" />
                ) : (
                  <Clock className="w-4 h-4 mr-1" />
                )}
                <span>
                  {isOverdue && 'Overdue: '}
                  {formatDate(task.due_at)}
                </span>
              </div>
            )}

            {task.assignee && (
              <span className="text-gray-500">
                · Assigned to {task.assignee.name}
              </span>
            )}

            {task.event && (
              <span className="text-gray-500">· {task.event.title}</span>
            )}
          </div>

          {/* Link Section */}
          {(task.link || isEditingLink) && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              {isEditingLink ? (
                <div className="flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input
                    type="url"
                    value={linkValue}
                    onChange={(e) => setLinkValue(e.target.value)}
                    placeholder="https://..."
                    className="input text-sm flex-1"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveLink}
                    className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                    title="Save"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCancelLink}
                    className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <a
                    href={task.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline flex-1 truncate"
                  >
                    {task.link}
                  </a>
                  {onUpdateLink && (
                    <button
                      onClick={() => setIsEditingLink(true)}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Edit link"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Add Link Button */}
          {!task.link && !isEditingLink && onUpdateLink && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <button
                onClick={() => setIsEditingLink(true)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <LinkIcon className="w-4 h-4" />
                <span>Add link</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
