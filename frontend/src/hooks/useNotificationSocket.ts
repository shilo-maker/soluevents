import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getSocket } from '@/lib/socket'

export function useNotificationSocket() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const setup = () => {
      const socket = getSocket()
      if (!socket) return false

      const onNotificationNew = () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] })
        queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
      }

      socket.on('notification:new', onNotificationNew)

      cleanupRef.current = () => {
        socket.off('notification:new', onNotificationNew)
      }

      return true
    }

    const cleanupRef: { current: (() => void) | null } = { current: null }

    if (!setup()) {
      const retryTimer = setInterval(() => {
        if (setup()) clearInterval(retryTimer)
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
  }, [queryClient])
}
