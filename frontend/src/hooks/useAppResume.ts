import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { refreshAuth } from '@/lib/refreshAuth'
import { disconnectSocket, connectSocket } from '@/lib/socket'
import { queryClient } from '@/lib/queryClient'

/**
 * Proactively refreshes the access token when the PWA resumes from background.
 * On mobile, the app may be suspended for hours — the access token (1h TTL)
 * will have expired by then. This avoids a flash of 401 errors on resume.
 *
 * Uses the shared refreshAuth() with dedup — safe to call even if the axios
 * interceptor triggers a refresh simultaneously.
 */
export function useAppResume() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (!isAuthenticated) return

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return

      const state = useAuthStore.getState()
      if (!state.isAuthenticated || !state.refreshToken || !state.user) return

      refreshAuth()
        .then(() => {
          // Reconnect socket with fresh token
          disconnectSocket()
          connectSocket()

          // Refresh stale data
          queryClient.invalidateQueries()
          useWorkspaceStore.getState().loadWorkspaces()
        })
        .catch(() => {
          // Refresh failed — either offline (session kept) or token invalid
          // (axios interceptor will handle redirect on next API call)
        })
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isAuthenticated])
}
