import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bell, Building2, Music, UserX, UserCheck, Check, X, Loader2, CheckCheck, Trash2, MessageCircle, Send } from 'lucide-react'
import { isAxiosError } from 'axios'
import { useQueryClient } from '@tanstack/react-query'
import { useNotifications, useNotificationCounts, useMarkAllAsRead, useClearNotifications, useDeleteNotification } from '@/hooks/useNotifications'
import { useRespondToMemberInvite } from '@/hooks/useWorkspaces'
import { useRespondToTeamInvite } from '@/hooks/useEvents'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import api from '@/lib/axios'
import type { Notification } from '@/types'

function errorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    return error.response?.data?.message || error.message
  }
  return error instanceof Error ? error.message : 'Error'
}

function timeAgo(dateStr: string, t: (key: string, opts?: Record<string, unknown>) => string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return t('time.justNow')
  if (minutes < 60) return t('time.minutesAgo', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('time.hoursAgo', { count: hours })
  const days = Math.floor(hours / 24)
  return t('time.daysAgo', { count: days })
}

export default function NotificationBell() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const loadWorkspaces = useWorkspaceStore((s) => s.loadWorkspaces)

  const queryClient = useQueryClient()

  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [actingId, setActingId] = useState<string | null>(null)
  const [errorId, setErrorId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replySending, setReplySending] = useState(false)
  const replyInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { data: notifications } = useNotifications(open)
  const { data: counts } = useNotificationCounts()
  const unreadCount = counts?.count ?? 0
  const markAllMutation = useMarkAllAsRead()
  const clearMutation = useClearNotifications()
  const deleteMutation = useDeleteNotification()
  const respondMutation = useRespondToMemberInvite()
  const teamInviteMutation = useRespondToTeamInvite()

  const closeDropdown = useCallback(() => { setOpen(false); setExpanded(false); setReplyingTo(null); setReplyText('') }, [])

  // Auto-focus reply input when opened
  useEffect(() => {
    if (replyingTo) replyInputRef.current?.focus()
  }, [replyingTo])

  const handleReply = async (taskId: string, notificationId: string) => {
    const body = replyText.trim()
    if (!body) return
    setReplySending(true)
    try {
      await api.post(`/tasks/${taskId}/comments`, { body })
      queryClient.invalidateQueries({ queryKey: ['comments', 'task', taskId] })
      deleteMutation.mutate(notificationId)
      setReplyingTo(null)
      setReplyText('')
    } catch (err) {
      setErrorId(notificationId)
      setErrorMsg(errorMessage(err))
    } finally {
      setReplySending(false)
    }
  }

  // Auto-mark notifications as read when dropdown is opened
  useEffect(() => {
    if (open && unreadCount > 0) {
      markAllMutation.mutateAsync().catch(() => {})
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        closeDropdown()
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeDropdown()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, closeDropdown])

  const handleAccept = async (notification: Notification) => {
    const token = notification.payload?.token
    if (!token) return
    setActingId(notification.id)
    setErrorId(null)
    try {
      await respondMutation.mutateAsync({ token, action: 'accept' })
      // Backend already deletes the notification on respond — just refresh
      try { await loadWorkspaces() } catch {}
      closeDropdown()
      navigate('/')
    } catch (err) {
      setErrorId(notification.id)
      setErrorMsg(errorMessage(err))
    } finally {
      setActingId(null)
    }
  }

  const handleDecline = async (notification: Notification) => {
    const token = notification.payload?.token
    if (!token) return
    setActingId(notification.id)
    setErrorId(null)
    try {
      await respondMutation.mutateAsync({ token, action: 'decline' })
      // Backend already deletes the notification on respond
    } catch (err) {
      setErrorId(notification.id)
      setErrorMsg(errorMessage(err))
    } finally {
      setActingId(null)
    }
  }

  const handleTeamAccept = async (notification: Notification) => {
    const { event_id, member_id } = notification.payload || {}
    if (!event_id || !member_id) return
    setActingId(notification.id)
    setErrorId(null)
    try {
      await teamInviteMutation.mutateAsync({ eventId: event_id, memberId: member_id, action: 'accept' })
    } catch (err) {
      setErrorId(notification.id)
      setErrorMsg(errorMessage(err))
    } finally {
      setActingId(null)
    }
  }

  const handleTeamDecline = async (notification: Notification) => {
    const { event_id, member_id } = notification.payload || {}
    if (!event_id || !member_id) return
    setActingId(notification.id)
    setErrorId(null)
    try {
      await teamInviteMutation.mutateAsync({ eventId: event_id, memberId: member_id, action: 'decline' })
    } catch (err) {
      setErrorId(notification.id)
      setErrorMsg(errorMessage(err))
    } finally {
      setActingId(null)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllMutation.mutateAsync()
    } catch {
      // non-critical
    }
  }

  const handleClearAll = async () => {
    try {
      await clearMutation.mutateAsync()
      setErrorId(null)
    } catch {
      // non-critical
    }
  }

  const renderNotification = (n: Notification) => {
    const isUnread = !n.read_at
    const isInvite = n.type === 'workspace_invite'
    const isTeamInvite = n.type === 'event_team_invite'
    const isTeamRemoved = n.type === 'event_team_removed'
    const isTeamResponse = n.type === 'event_team_response'
    const isTaskComment = n.type === 'task_comment'
    const payload = n.payload || {}
    const isActing = actingId === n.id
    const hasActions = isInvite || isTeamInvite

    // Clickable event link helper
    const eventLink = payload.event_id ? (
      <Link to={`/events/${payload.event_id}`} onClick={closeDropdown}
        className="font-bold text-teal-600 hover:text-teal-700 hover:underline">
        {payload.event_title || t('notifications.anEvent')}
      </Link>
    ) : <strong>{payload.event_title || t('notifications.anEvent')}</strong>

    // Task title — links to event tasks tab if event_id present
    const taskLink = isTaskComment && payload.event_id ? (
      <Link to={`/events/${payload.event_id}?tab=tasks`} onClick={closeDropdown}
        className="font-bold text-blue-600 hover:text-blue-700 hover:underline">
        {payload.task_title || t('notifications.aTask')}
      </Link>
    ) : <strong>{payload.task_title || t('notifications.aTask')}</strong>

    // Choose icon + gradient based on notification type
    const IconComponent = isTaskComment ? MessageCircle : isTeamRemoved ? UserX : isTeamResponse ? UserCheck : isTeamInvite ? Music : Building2
    const iconGradient = isTaskComment
      ? 'from-blue-500 to-indigo-500'
      : isTeamRemoved
        ? 'from-red-400 to-orange-400'
        : isTeamResponse
          ? payload.action === 'accept' ? 'from-green-500 to-emerald-500' : 'from-orange-400 to-amber-400'
          : isTeamInvite
            ? 'from-teal-500 to-green-500'
            : 'from-teal-500 to-cyan-500'
    const bgHighlight = isUnread
      ? isTaskComment ? 'bg-blue-50/50'
        : isTeamRemoved ? 'bg-red-50/50'
        : isTeamResponse ? (payload.action === 'accept' ? 'bg-green-50/50' : 'bg-orange-50/50')
        : isTeamInvite ? 'bg-teal-50/50'
        : 'bg-teal-50/50'
      : ''

    return (
      <div
        key={n.id}
        className={`p-3 border-b border-gray-100 last:border-0 ${bgHighlight}`}
      >
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${iconGradient} flex items-center justify-center text-white shrink-0 mt-0.5`}>
            <IconComponent className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            {isTaskComment ? (
              <p className="text-sm text-gray-900">
                <strong>{payload.commenter_name || t('notifications.someone')}</strong>{' '}
                {t('notifications.commentedOn')} {taskLink}
                {payload.comment_body && (
                  <span className="text-gray-500">: &ldquo;{payload.comment_body}&rdquo;</span>
                )}
              </p>
            ) : isTeamResponse ? (
              <p className="text-sm text-gray-900">
                <strong>{payload.member_name || t('notifications.someone')}</strong>{' '}
                {payload.action === 'accept' ? t('notifications.acceptedRoleOf') : t('notifications.declinedRoleOf')}{' '}
                <strong>{payload.team_role || t('notifications.aRole')}</strong>{' '}
                {t('notifications.at')} {eventLink}
                {payload.team_name && <span className="text-gray-500"> ({payload.team_name})</span>}
              </p>
            ) : isTeamRemoved ? (
              <p className="text-sm text-gray-900">
                {t('notifications.removedFrom')}{' '}
                <strong>{payload.team_role || t('notifications.aRole')}</strong>{' '}
                {t('notifications.at')} {eventLink}
              </p>
            ) : isTeamInvite ? (
              <p className="text-sm text-gray-900">
                {t('notifications.invitedToPlay')}{' '}
                <strong>{payload.team_role || t('notifications.aRole')}</strong>{' '}
                {t('notifications.at')} {eventLink}
                {payload.team_name && <span className="text-gray-500"> ({payload.team_name})</span>}
              </p>
            ) : isInvite ? (
              <p className="text-sm text-gray-900">
                <strong>{payload.invited_by_name || t('notifications.someone')}</strong>{' '}
                {t('notifications.invitedToJoin')}{' '}
                <strong>{payload.workspace_name || t('notifications.aWorkspace')}</strong>{' '}
                {t('notifications.asRole')} <span className="capitalize">{payload.role || t('common.member').toLowerCase()}</span>
              </p>
            ) : (
              <p className="text-sm text-gray-900">{payload.message || t('notifications.newNotification')}</p>
            )}
            <p className="text-xs text-gray-500 mt-0.5">{timeAgo(n.created_at, t)}</p>

            {isTaskComment && payload.task_id && (
              replyingTo === n.id ? (
                <div className="flex items-center gap-1.5 mt-2">
                  <input
                    ref={replyInputRef}
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(payload.task_id!, n.id) }
                      if (e.key === 'Escape') { setReplyingTo(null); setReplyText('') }
                    }}
                    placeholder={t('notifications.writeReply')}
                    disabled={replySending}
                    className="flex-1 text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 disabled:opacity-50"
                  />
                  <button
                    onClick={() => handleReply(payload.task_id!, n.id)}
                    disabled={replySending || !replyText.trim()}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                    title={t('common.send')}
                  >
                    {replySending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setReplyingTo(n.id); setReplyText(''); setErrorId(null) }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-1.5 flex items-center gap-1"
                >
                  <MessageCircle className="w-3 h-3" />
                  {t('notifications.reply')}
                </button>
              )
            )}

            {hasActions && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => isTeamInvite ? handleTeamAccept(n) : handleAccept(n)}
                  disabled={isActing}
                  className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  {t('common.accept')}
                </button>
                <button
                  onClick={() => isTeamInvite ? handleTeamDecline(n) : handleDecline(n)}
                  disabled={isActing}
                  className="text-xs px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  {t('common.decline')}
                </button>
              </div>
            )}

            {errorId === n.id && (
              <p className="text-xs text-red-500 mt-1">{errorMsg}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-1">
            {isUnread && (
              <div className="w-2 h-2 rounded-full bg-teal-500" />
            )}
            <button
              onClick={() => deleteMutation.mutate(n.id)}
              disabled={deleteMutation.isPending}
              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors rounded-md"
              title={t('notifications.dismiss')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-3 text-gray-600 hover:text-teal-600 rounded-xl hover:bg-teal-50 transition-all duration-200"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white rounded-full px-1 bg-gradient-to-r from-red-500 to-pink-500">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 top-full mt-1 w-[calc(100vw-2rem)] sm:w-96 bg-white rounded-xl shadow-xl border border-gray-200/60 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">{t('notifications.title')}</h3>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={markAllMutation.isPending}
                  className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  {t('notifications.markAllRead')}
                </button>
              )}
              {notifications && notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  disabled={clearMutation.isPending}
                  className="text-xs text-gray-400 hover:text-red-500 font-medium flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t('notifications.clear')}
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications && notifications.length > 0 ? (
              <>
                {(expanded ? notifications : notifications.slice(0, 4)).map(renderNotification)}
                {!expanded && notifications.length > 4 && (
                  <button
                    onClick={() => setExpanded(true)}
                    className="w-full py-2.5 text-xs font-medium text-teal-600 hover:text-teal-700 hover:bg-teal-50/50 transition-colors border-t border-gray-100"
                  >
                    {t('notifications.showMore', { count: notifications.length - 4 })}
                  </button>
                )}
              </>
            ) : (
              <div className="py-8 text-center">
                <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">{t('notifications.noNotifications')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
