import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/lib/axios'
import type { Workspace } from '@/types'

interface WorkspaceState {
  workspaces: Workspace[]
  activeWorkspace: Workspace | null
  isLoading: boolean
  error: string | null
  loadWorkspaces: () => Promise<void>
  switchWorkspace: (id: string) => Promise<Workspace | null>
  createWorkspace: (name: string) => Promise<Workspace>
  clearWorkspaces: () => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: [],
      activeWorkspace: null,
      isLoading: false,
      error: null,

      loadWorkspaces: async () => {
        if (get().isLoading) return // dedup concurrent calls
        set({ isLoading: true, error: null })
        try {
          const res = await api.get<Workspace[]>('/workspaces')
          const workspaces = Array.isArray(res.data) ? res.data : []
          const active = workspaces.find((w) => w.is_active) ?? null
          set({ workspaces, activeWorkspace: active, isLoading: false })
        } catch (err: any) {
          set({
            workspaces: [],
            activeWorkspace: null,
            isLoading: false,
            error: err?.response?.data?.message || 'Failed to load workspaces',
          })
        }
      },

      switchWorkspace: async (id: string) => {
        const res = await api.patch<Workspace>(`/workspaces/${id}/switch`)
        const switched = res.data

        // Update local state — prefer server role, fall back to local
        const existingWs = get().workspaces.find((w) => w.id === id)
        const workspaces = get().workspaces.map((w) => ({
          ...w,
          is_active: w.id === id,
        }))
        set({
          workspaces,
          activeWorkspace: {
            ...switched,
            is_active: true,
            role: switched.role ?? existingWs?.role,
          },
        })
        return switched
      },

      createWorkspace: async (name: string) => {
        const res = await api.post<Workspace>('/workspaces', { name })
        const workspace = res.data
        set((state) => ({
          workspaces: [...state.workspaces, workspace],
        }))
        return workspace
      },

      clearWorkspaces: () =>
        set({
          workspaces: [],
          activeWorkspace: null,
          isLoading: false,
          error: null,
        }),
    }),
    {
      name: 'workspace-storage',
      partialize: (state) => ({
        workspaces: state.workspaces,
        activeWorkspace: state.activeWorkspace,
      }),
    }
  )
)
