import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import { useWorkspaceStore } from './workspaceStore'
import { queryClient } from '@/lib/queryClient'
import { disconnectSocket } from '@/lib/socket'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  setAuth: (user: User, accessToken: string, refreshToken: string) => void
  patchUser: (partial: Partial<User>) => void
  clearAuth: () => void
}

/** True once Zustand has restored state from localStorage */
let _hydrated = false
export const hasHydrated = () => _hydrated

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken, refreshToken) =>
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        }),
      patchUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : state.user,
        })),
      clearAuth: () => {
        disconnectSocket()
        useWorkspaceStore.getState().clearWorkspaces()
        queryClient.clear()
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        })
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => () => { _hydrated = true },
    }
  )
)
