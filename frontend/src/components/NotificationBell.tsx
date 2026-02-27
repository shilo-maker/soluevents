import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Building2, Check, X, Loader2, CheckCheck, Trash2 } from 'lucide-react'
import { isAxiosError } from 'axios'
import { useNotifications, useNotificationCounts, useMarkAllAsRead, useClearNotifications } from '@/hooks/useNotifications'
import { useRespondToMemberInvite } from '@/hooks/useWorkspaces'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import type { Notification } from '@/types'

function errorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    return error.response?.data?.message || error.message
  }
  return error instanceof Error ? error.message : 'An error occurred'
}

export default function NotificationBell() {
  const navigate = useNavigate()
  const loadWorkspaces = useWorkspaceStore((s) => s.loadWorkspaces)

  const [open, setOpen] = useState(false)
  const [actingId, setActingId] = useState<string | null>(null)
  const [errorId, setErrorId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { data: notifications } = useNotifications(open)
  const { data: counts } = useNotificationCounts()
  const unreadCount = counts?.count ?? 0
  const totalCount = counts?.total ?? 0
  const markAllMutation = useMarkAllAsRead()
  const clearMutation = useClearNotifications()
  const respondMutation = useRespondToMemberInvite()

  const closeDropdown = useCallback(() => setOpen(false), [])

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

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const renderNotification = (n: Notification) => {
    const isUnread = !n.read_at
    const isInvite = n.type === 'workspace_invite'
    const payload = n.payload || {}
    const isActing = actingId === n.id

    return (
      <div
        key={n.id}
        className={`p-3 border-b border-gray-100 last:border-0 ${isUnread ? 'bg-purple-50/50' : ''}`}
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white shrink-0 mt-0.5">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            {isInvite ? (
              <p className="text-sm text-gray-900">
                <strong>{payload.invited_by_name || 'Someone'}</strong> invited you to join{' '}
                <strong>{payload.workspace_name || 'a workspace'}</strong> as <span className="capitalize">{payload.role || 'member'}</span>
              </p>
            ) : (
              <p className="text-sm text-gray-900">{payload.message || 'You have a new notification'}</p>
            )}
            <p className="text-xs text-gray-500 mt-0.5">{timeAgo(n.created_at)}</p>

            {isInvite && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleAccept(n)}
                  disabled={isActing}
                  className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  Accept
                </button>
                <button
                  onClick={() => handleDecline(n)}
                  disabled={isActing}
                  className="text-xs px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Decline
                </button>
              </div>
            )}

            {errorId === n.id && (
              <p className="text-xs text-red-500 mt-1">{errorMsg}</p>
            )}
          </div>
          {isUnread && (
            <div className="w-2 h-2 rounded-full bg-purple-500 shrink-0 mt-2" />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-3 text-gray-600 hover:text-purple-600 rounded-xl hover:bg-purple-50 transition-all duration-200"
      >
        <Bell className="w-5 h-5" />
        {totalCount > 0 && (
          <span className={`absolute top-2 right-2 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white rounded-full px-1 ${
            unreadCount > 0
              ? 'bg-gradient-to-r from-red-500 to-pink-500'
              : 'bg-gray-400'
          }`}>
            {totalCount > 9 ? '9+' : totalCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-96 bg-white rounded-xl shadow-xl border border-gray-200/60 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={markAllMutation.isPending}
                  className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
              {notifications && notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  disabled={clearMutation.isPending}
                  className="text-xs text-gray-400 hover:text-red-500 font-medium flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications && notifications.length > 0 ? (
              notifications.map(renderNotification)
            ) : (
              <div className="py-8 text-center">
                <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No notifications yet</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
