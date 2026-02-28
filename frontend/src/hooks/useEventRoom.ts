import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { getSocket } from '@/lib/socket'

export function useEventRoom(eventId: string | undefined) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  // Keep navigate stable in callbacks without adding to deps
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate

  useEffect(() => {
    if (!eventId) return

    // Wait for socket to become available (may be connecting)
    const trySetup = () => {
      const socket = getSocket()
      if (!socket) return false

      socket.emit('join:event', eventId)

      const onTaskChange = () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] })
        queryClient.invalidateQueries({ queryKey: ['events', 'detail', eventId] })
      }

      const onCommentChange = (data: { taskId?: string }) => {
        if (data.taskId) {
          queryClient.invalidateQueries({ queryKey: ['comments', 'task', data.taskId] })
        }
        // Invalidate tasks (comment count) and event detail
        queryClient.invalidateQueries({ queryKey: ['tasks'] })
        queryClient.invalidateQueries({ queryKey: ['events', 'detail', eventId] })
      }

      const onEventUpdated = () => {
        queryClient.invalidateQueries({ queryKey: ['events', 'detail', eventId] })
        queryClient.invalidateQueries({ queryKey: ['events'] })
      }

      const onEventDeleted = () => {
        queryClient.invalidateQueries({ queryKey: ['events'] })
        navigateRef.current('/events')
      }

      // Re-join room on reconnect
      const onReconnect = () => {
        socket.emit('join:event', eventId)
      }

      socket.on('task:created', onTaskChange)
      socket.on('task:updated', onTaskChange)
      socket.on('task:deleted', onTaskChange)
      socket.on('comment:created', onCommentChange)
      socket.on('comment:deleted', onCommentChange)
      socket.on('event:updated', onEventUpdated)
      socket.on('event:deleted', onEventDeleted)
      socket.on('connect', onReconnect)

      cleanupRef.current = () => {
        if (socket.connected) {
          socket.emit('leave:event', eventId)
        }
        socket.off('task:created', onTaskChange)
        socket.off('task:updated', onTaskChange)
        socket.off('task:deleted', onTaskChange)
        socket.off('comment:created', onCommentChange)
        socket.off('comment:deleted', onCommentChange)
        socket.off('event:updated', onEventUpdated)
        socket.off('event:deleted', onEventDeleted)
        socket.off('connect', onReconnect)
      }

      return true
    }

    const cleanupRef: { current: (() => void) | null } = { current: null }

    // If socket isn't ready yet, retry briefly
    if (!trySetup()) {
      const retryTimer = setInterval(() => {
        if (trySetup()) clearInterval(retryTimer)
      }, 200)
      const timeout = setTimeout(() => clearInterval(retryTimer), 5000)

      return () => {
        clearInterval(retryTimer)
        clearTimeout(timeout)
        cleanupRef.current?.()
      }
    }

    return () => {
      cleanupRef.current?.()
    }
  }, [eventId, queryClient])
}
