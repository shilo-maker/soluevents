import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'

/** Shared dedup promise — prevents multiple concurrent refresh calls */
let refreshPromise: Promise<string> | null = null

/**
 * Refreshes the access token using the stored refresh token.
 * Deduplicates concurrent calls — if a refresh is already in-flight,
 * subsequent callers get the same promise.
 *
 * Used by both the axios 401 interceptor and the useAppResume hook.
 */
export function refreshAuth(): Promise<string> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const state = useAuthStore.getState()
    if (!state.isAuthenticated || !state.user || !state.refreshToken) {
      throw new Error('No user session')
    }

    const response = await axios.post('/api/auth/refresh', {
      refresh_token: state.refreshToken,
    })

    const { access_token, refresh_token } = response.data

    // Re-check — user may have logged out while refresh was in-flight
    if (!useAuthStore.getState().isAuthenticated) {
      throw new Error('Logged out during refresh')
    }

    useAuthStore.getState().setAuth(
      state.user,
      access_token,
      refresh_token || state.refreshToken,
    )

    return access_token
  })().finally(() => {
    refreshPromise = null
  })

  return refreshPromise
}
