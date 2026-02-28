import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { connectSocket, disconnectSocket } from '@/lib/socket'

export function useSocketConnection() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (isAuthenticated) {
      connectSocket()
    } else {
      disconnectSocket()
    }
    // No cleanup disconnect — socket lifecycle is managed by auth state,
    // not Layout mount/unmount. clearAuth() calls disconnectSocket().
  }, [isAuthenticated])
}
