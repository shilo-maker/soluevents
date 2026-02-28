import { useState } from 'react'
import { X } from 'lucide-react'
import { useCreateTask } from '@/hooks/useTasks'
import { useEvents } from '@/hooks/useEvents'
import ContactAutocomplete from '@/components/ContactAutocomplete'
import type { TaskPriority, TaskStatus } from '@/types'

interface CreateTaskModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function CreateTaskModal({ isOpen, onClose }: CreateTaskModalProps) {
  const createTask = useCreateTask()
  const { data: events } = useEvents()

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'normal' as TaskPriority,
    status: 'not_started' as TaskStatus,
    due_at: '',
    event_id: '',
    assignee_name: '',
    assignee_contact_id: '',
    assignee_is_user: true,
  })

  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.title) {
      setError('Title is required')
      return
    }

    try {
      const taskData: Record<string, any> = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        status: formData.status,
        event_id: formData.event_id || undefined,
        due_at: formData.due_at || undefined,
        assignee_is_user: formData.assignee_is_user,
      }
      if (formData.assignee_contact_id) {
        if (formData.assignee_is_user) {
          taskData.assignee_id = formData.assignee_contact_id
        } else {
          taskData.assignee_contact_id = formData.assignee_contact_id
        }
      }

      await createTask.mutateAsync(taskData)
      onClose()
      // Reset form
      setFormData({
        title: '',
        description: '',
        priority: 'normal',
        status: 'not_started',
        due_at: '',
        event_id: '',
        assignee_name: '',
        assignee_contact_id: '',
        assignee_is_user: true,
      })
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create task')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Create New Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input"
              required
              placeholder="e.g., Prepare flyer for event"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input"
              rows={3}
              placeholder="Task details..."
            />
          </div>

          {/* Priority and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: e.target.value as TaskPriority })
                }
                className="input"
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as TaskStatus })
                }
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

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input
              type="datetime-local"
              value={formData.due_at}
              onChange={(e) => setFormData({ ...formData, due_at: e.target.value })}
              className="input"
            />
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assign To
            </label>
            <ContactAutocomplete
              value={formData.assignee_name}
              contactId={formData.assignee_contact_id || undefined}
              isUser={formData.assignee_is_user}
              onChange={(name, contactId, isUser) => {
                setFormData({
                  ...formData,
                  assignee_name: name,
                  assignee_contact_id: contactId || '',
                  assignee_is_user: isUser ?? true,
                })
              }}
              placeholder="Search people..."
              className="input"
            />
          </div>

          {/* Event */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Related Event
            </label>
            <select
              value={formData.event_id}
              onChange={(e) => setFormData({ ...formData, event_id: e.target.value })}
              className="input"
            >
              <option value="">None</option>
              {events?.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={createTask.isPending}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createTask.isPending ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
