import { useState, useEffect, useRef, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Circle, Clock, AlertCircle, Link as LinkIcon, Edit2, X, Check, Save, MessageCircle, Send, Loader2, ChevronDown } from 'lucide-react'
import { formatDate, formatRelativeTime, isWithinDays, isPast } from '@/lib/utils'
import InvitationStatusBadge from './InvitationStatusBadge'
import ContactAutocomplete from './ContactAutocomplete'
import PersonHoverCard from './PersonHoverCard'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useTaskComments, useAddTaskComment, useDeleteTaskComment } from '@/hooks/useComments'
import { useRespondToTaskAssignment } from '@/hooks/useTasks'
import type { Task, TaskStatus, User } from '@/types'

interface TaskCardProps {
  task: Task & {
    assignee?: { id: string; name: string | null; email: string }
    assignee_contact?: { id: string; name: string; email?: string; phone?: string }
    event?: { id: string; title: string }
  }
  currentUser?: User | null
  onToggle?: (taskId: string, newStatus: 'done' | 'not_started') => void
  onUpdateLink?: (taskId: string, link: string | null) => void
  onUpdateTask?: (taskId: string, data: Partial<Task>) => void
}

const STATUS_KEYS: { value: TaskStatus; key: string; color: string }[] = [
  { value: 'not_started', key: 'tasks.status.not_started', color: 'bg-gray-100 text-gray-700' },
  { value: 'in_progress', key: 'tasks.status.in_progress', color: 'bg-blue-100 text-blue-700' },
  { value: 'waiting', key: 'tasks.status.waiting', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'blocked', key: 'tasks.status.blocked', color: 'bg-red-100 text-red-700' },
  { value: 'done', key: 'tasks.status.done', color: 'bg-green-100 text-green-700' },
]

function TaskCard({ task, currentUser, onToggle, onUpdateLink, onUpdateTask }: TaskCardProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [isEditingLink, setIsEditingLink] = useState(false)
  const [linkValue, setLinkValue] = useState(task.link || '')
  const [isEditingTask, setIsEditingTask] = useState(false)
  const [optimisticStatus, setOptimisticStatus] = useState<TaskStatus | null>(null)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [statusOpen, setStatusOpen] = useState(false)
  const statusRef = useRef<HTMLDivElement>(null)

  // Determine initial assignee name and contact info for the autocomplete
  const initialAssigneeName = task.assignee?.name || task.assignee?.email || task.assignee_contact?.name || task.assignee_contact?.email || ''
  const initialAssigneeContactId = task.assignee_is_user === false
    ? task.assignee_contact_id || ''
    : task.assignee_id || ''
  const initialAssigneeIsUser = task.assignee_is_user !== false

  const [editFormData, setEditFormData] = useState({
    title: task.title,
    description: task.description || '',
    priority: task.priority,
    status: task.status,
    assignee_name: initialAssigneeName,
    assignee_contact_id: initialAssigneeContactId,
    assignee_is_user: initialAssigneeIsUser,
    due_at: task.due_at ? new Date(task.due_at).toISOString().slice(0, 16) : '',
    link: task.link || '',
  })

  // Sync editFormData when task prop changes (e.g. after refetch)
  useEffect(() => {
    if (!isEditingTask) {
      const name = task.assignee?.name || task.assignee?.email || task.assignee_contact?.name || task.assignee_contact?.email || ''
      const contactId = task.assignee_is_user === false
        ? task.assignee_contact_id || ''
        : task.assignee_id || ''
      const isUser = task.assignee_is_user !== false
      setEditFormData({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        status: task.status,
        assignee_name: name,
        assignee_contact_id: contactId,
        assignee_is_user: isUser,
        due_at: task.due_at ? new Date(task.due_at).toISOString().slice(0, 16) : '',
        link: task.link || '',
      })
      setLinkValue(task.link || '')
    }
    // Reset optimistic state when server data arrives
    setOptimisticStatus(null)
  }, [task, isEditingTask])

  const wsRole = useWorkspaceStore((s) => s.activeWorkspace?.role)
  const userId = currentUser?.id

  // Permission: assignee (only if confirmed), creator, org admin, or workspace admin/planner
  const hasConfirmedAssignment = !task.assignment_status || task.assignment_status === 'confirmed'
  const isAssignee = !!(userId && (
    ((task.assignee_id === userId || task.assignee?.id === userId) && hasConfirmedAssignment) ||
    task.creator_id === userId
  ))
  const isPrivileged = currentUser?.org_role === 'admin' || wsRole === 'admin' || wsRole === 'planner'
  const canToggle = !!onToggle && (isAssignee || isPrivileged)
  const canEditTask = !!onUpdateTask && (isAssignee || isPrivileged)
  const canChangeStatus = !!onUpdateTask && (isAssignee || isPrivileged)
  const canComment = isAssignee || isPrivileged

  // Close status dropdown on click outside
  useEffect(() => {
    if (!statusOpen) return
    const handler = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [statusOpen])

  // Comment hooks — only fetch when thread is expanded
  const { data: comments, isLoading: commentsLoading, isError: commentsError } = useTaskComments(task.id, commentsOpen)
  const addComment = useAddTaskComment(task.id)
  const deleteCommentMutation = useDeleteTaskComment(task.id)

  // Task assignment response
  const respondMutation = useRespondToTaskAssignment()
  const isCurrentUserPendingAssignee = !!(userId && task.assignee_id === userId && task.assignment_status === 'pending')

  const handleAddComment = () => {
    const body = commentText.trim()
    if (!body) return
    setCommentText('')  // Clear immediately for snappy UX
    addComment.mutate(body)
  }

  const displayStatus = optimisticStatus ?? task.status
  const isDone = displayStatus === 'done'
  const isOverdue = task.due_at && isPast(task.due_at) && !isDone
  const isDueSoon = task.due_at && isWithinDays(task.due_at, 3) && !isDone

  const handleSaveLink = () => {
    onUpdateLink?.(task.id, linkValue || null)
    setIsEditingLink(false)
  }

  const handleCancelLink = () => {
    setLinkValue(task.link || '')
    setIsEditingLink(false)
  }

  const handleSaveTask = () => {
    const data: Partial<Task> & { assignee_is_user?: boolean } = {
      title: editFormData.title,
      description: editFormData.description || undefined,
      priority: editFormData.priority,
      status: editFormData.status,
      due_at: editFormData.due_at ? new Date(editFormData.due_at).toISOString() : undefined,
      link: editFormData.link || undefined,
      assignee_is_user: editFormData.assignee_is_user,
    }
    if (editFormData.assignee_is_user) {
      data.assignee_id = editFormData.assignee_contact_id || undefined
    } else {
      data.assignee_contact_id = editFormData.assignee_contact_id || undefined
    }
    onUpdateTask?.(task.id, data)
    setIsEditingTask(false)
  }

  const handleCancelEdit = () => {
    setEditFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      assignee_name: initialAssigneeName,
      assignee_contact_id: initialAssigneeContactId,
      assignee_is_user: initialAssigneeIsUser,
      due_at: task.due_at ? new Date(task.due_at).toISOString().slice(0, 16) : '',
      link: task.link || '',
    })
    setIsEditingTask(false)
  }

  if (isEditingTask) {
    return (
      <div className="card relative z-10">
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">{t('tasks.editTask')}</h4>
            <div className="flex gap-2">
              <button
                onClick={handleSaveTask}
                className="btn-primary flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {t('common.save')}
              </button>
              <button
                onClick={handleCancelEdit}
                className="btn-secondary"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t('common.title')}</label>
            <input
              type="text"
              value={editFormData.title}
              onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t('common.description')}</label>
            <textarea
              value={editFormData.description}
              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
              className="input"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t('common.status')}</label>
            <select
              value={editFormData.status}
              onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as TaskStatus })}
              className="input"
            >
              <option value="not_started">{t('tasks.status.not_started')}</option>
              <option value="in_progress">{t('tasks.status.in_progress')}</option>
              <option value="waiting">{t('tasks.status.waiting')}</option>
              <option value="blocked">{t('tasks.status.blocked')}</option>
              <option value="done">{t('tasks.status.done')}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('tasks.assignedTo')}</label>
              <ContactAutocomplete
                value={editFormData.assignee_name}
                contactId={editFormData.assignee_contact_id || undefined}
                isUser={editFormData.assignee_is_user}
                onChange={(name, contactId, isUser) => {
                  setEditFormData({
                    ...editFormData,
                    assignee_name: name,
                    assignee_contact_id: contactId || '',
                    assignee_is_user: isUser ?? true,
                  })
                }}
                placeholder={t('tasks.searchPeople')}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('tasks.dueDate')}</label>
              <input
                type="datetime-local"
                value={editFormData.due_at}
                onChange={(e) => setEditFormData({ ...editFormData, due_at: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t('tasks.link')}</label>
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
    <div
      className={`card transition-all duration-300 ${isDone ? 'opacity-60 hover:opacity-80' : 'hover:shadow-md'} ${task.event ? 'cursor-pointer' : ''}`}
      onClick={() => { if (task.event) navigate(`/events/${task.event.id}?tab=tasks`) }}
    >
      <div className="flex items-start gap-3">
        {canToggle && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              const newDone = !isDone
              setOptimisticStatus(newDone ? 'done' : 'not_started')
              onToggle?.(task.id, newDone ? 'done' : 'not_started')
            }}
            className="mt-1 flex-shrink-0 group"
          >
            {isDone ? (
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center transition-all duration-300 group-hover:bg-gray-300">
                <Check className="w-3 h-3 text-white stroke-[3]" />
              </div>
            ) : (
              <Circle className="w-5 h-5 text-gray-300 transition-all duration-300 group-hover:text-green-400 group-hover:scale-110" />
            )}
          </button>
        )}

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
              {canComment && (
                <button
                  onClick={(e) => { e.stopPropagation(); setCommentsOpen((o) => !o) }}
                  className={`p-1 flex items-center gap-1 text-sm transition-colors ${commentsOpen ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                  title={t('tasks.comments')}
                >
                  <MessageCircle className="w-4 h-4" />
                  {(comments && comments.length > 0) ? (
                    <span className="text-xs">{comments.length}</span>
                  ) : (task.comment_count != null && task.comment_count > 0) ? (
                    <span className="text-xs">{task.comment_count}</span>
                  ) : null}
                </button>
              )}
              {canEditTask && (
                <button
                  onClick={(e) => { e.stopPropagation(); setIsEditingTask(true) }}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title={t('common.edit')}
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
            {/* Inline status selector */}
            <div ref={statusRef} className="relative" onClick={(e) => e.stopPropagation()}>
              {canChangeStatus ? (
                <button
                  onClick={() => setStatusOpen((o) => !o)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_KEYS.find((s) => s.value === displayStatus)?.color ?? 'bg-gray-100 text-gray-700'}`}
                >
                  {t(STATUS_KEYS.find((s) => s.value === displayStatus)?.key ?? '')}
                  <ChevronDown className="w-3 h-3" />
                </button>
              ) : (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_KEYS.find((s) => s.value === displayStatus)?.color ?? 'bg-gray-100 text-gray-700'}`}>
                  {t(STATUS_KEYS.find((s) => s.value === displayStatus)?.key ?? '')}
                </span>
              )}
              {statusOpen && (
                <div className="absolute left-0 bottom-full mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 min-w-[140px]">
                  {STATUS_KEYS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        if (opt.value !== displayStatus) {
                          setOptimisticStatus(opt.value)
                          onUpdateTask?.(task.id, { status: opt.value })
                        }
                        setStatusOpen(false)
                      }}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-2 ${opt.value === displayStatus ? 'font-semibold' : ''}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${opt.color.split(' ')[0].replace('100', '500')}`} />
                      {t(opt.key)}
                    </button>
                  ))}
                </div>
              )}
            </div>

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
                  {isOverdue && t('tasks.overdue')}
                  {formatDate(task.due_at, 'EEEE, MMM d, HH:mm')}
                </span>
              </div>
            )}

            {(task.assignee || task.assignee_contact) && (
              <span className="text-gray-500 inline-flex items-center gap-1">
                ·{' '}
                <PersonHoverCard
                  name={task.assignee?.name || task.assignee?.email || task.assignee_contact?.name || task.assignee_contact?.email || ''}
                  contactId={task.assignee?.id || task.assignee_contact?.id}
                  isUser={task.assignee_is_user}
                />
                {task.assignment_status && (
                  <InvitationStatusBadge status={task.assignment_status} />
                )}
              </span>
            )}

            {task.event && (
              <span className="text-gray-500">· {task.event.title}</span>
            )}
          </div>

          {/* Task Assignment Accept/Decline */}
          {isCurrentUserPendingAssignee && (
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              <div className="flex gap-2">
                <button
                  onClick={() => respondMutation.mutate({ taskId: task.id, action: 'accept' })}
                  disabled={respondMutation.isPending}
                  className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {respondMutation.isPending && respondMutation.variables?.action === 'accept' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  {t('common.accept')}
                </button>
                <button
                  onClick={() => respondMutation.mutate({ taskId: task.id, action: 'decline' })}
                  disabled={respondMutation.isPending}
                  className="text-xs px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {respondMutation.isPending && respondMutation.variables?.action === 'decline' ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                  {t('common.decline')}
                </button>
              </div>
              {respondMutation.isError && (
                <p className="text-xs text-red-500 mt-1">{t('common.error')}</p>
              )}
            </div>
          )}

          {/* Link Section */}
          {(task.link || isEditingLink) && (
            <div className="mt-3 pt-3 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
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
                    title={t('common.save')}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCancelLink}
                    className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"
                    title={t('common.cancel')}
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
                      title={t('tasks.editLink')}
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
            <div className="mt-3 pt-3 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setIsEditingLink(true)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <LinkIcon className="w-4 h-4" />
                <span>{t('tasks.addLink')}</span>
              </button>
            </div>
          )}

          {/* Comment Thread */}
          {commentsOpen && canComment && (
            <div className="mt-3 pt-3 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
              {commentsLoading ? (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              ) : commentsError ? (
                <p className="text-xs text-gray-400 py-2">{t('tasks.cantLoadComments')}</p>
              ) : (
                <>
                  {comments && comments.length > 0 ? (
                    <div className="space-y-3 mb-3 max-h-64 overflow-y-auto">
                      {comments.map((c) => (
                        <div key={c.id} className="flex items-start gap-2 group/comment">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="text-sm font-medium text-gray-900">
                                {c.author?.name || c.author?.email || t('common.unknown')}
                              </span>
                              <span className="text-xs text-gray-400">
                                {formatRelativeTime(c.created_at)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{c.body}</p>
                          </div>
                          {!c.id.startsWith('optimistic-') && (c.author_id === userId || currentUser?.org_role === 'admin') && (
                            <button
                              onClick={() => { if (!deleteCommentMutation.isPending) deleteCommentMutation.mutate(c.id) }}
                              className="p-0.5 text-gray-300 hover:text-red-500 opacity-0 group-hover/comment:opacity-100 transition-all flex-shrink-0 disabled:opacity-30"
                              title={t('tasks.deleteComment')}
                              disabled={deleteCommentMutation.isPending}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 mb-3">{t('tasks.noComments')}</p>
                  )}
                  {addComment.isError && (
                    <p className="text-xs text-red-500 mb-1">{t('tasks.failedComment')}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment() } }}
                      placeholder={t('tasks.addComment')}
                      className="input text-sm flex-1"
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!commentText.trim() || addComment.isPending}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title={t('common.send')}
                    >
                      {addComment.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default memo(TaskCard)
