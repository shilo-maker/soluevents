import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import api from '@/lib/axios'

export function useWorkspaces() {
  const { workspaces, activeWorkspace, isLoading } = useWorkspaceStore()
  return { workspaces, activeWorkspace, isLoading }
}

export function useSwitchWorkspace() {
  const queryClient = useQueryClient()
  const switchWorkspace = useWorkspaceStore((s) => s.switchWorkspace)

  return useMutation({
    mutationFn: async (id: string) => {
      return switchWorkspace(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tours'] })
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['venues'] })
    },
  })
}

export function useCreateWorkspace() {
  const createWorkspace = useWorkspaceStore((s) => s.createWorkspace)

  return useMutation({
    mutationFn: async (name: string) => {
      return createWorkspace(name)
    },
  })
}

export function useGenerateInvite() {
  return useMutation({
    mutationFn: async (workspaceId: string) => {
      const res = await api.post<{ token: string; expiresAt: string }>(
        `/workspaces/${workspaceId}/invite`
      )
      return res.data
    },
  })
}

export function useAcceptInvite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (token: string) => {
      const res = await api.post<{ workspace: { id: string; name: string; slug: string; workspaceType: string }; alreadyMember: boolean }>(
        `/workspaces/join/${token}`
      )
      return res.data
    },
    onSuccess: async () => {
      // loadWorkspaces is called from AcceptInvitePage before navigation
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tours'] })
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['venues'] })
    },
  })
}
