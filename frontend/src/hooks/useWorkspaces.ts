import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (workspaceId: string) => {
      const res = await api.post<{ token: string; expiresAt: string }>(
        `/workspaces/${workspaceId}/invite`
      )
      return res.data
    },
    onSuccess: (_data, workspaceId) => {
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId, 'invitations'] })
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

// ── Direct member invite hooks ──────────────────────────────────────

export function useMemberInviteByToken(token: string | undefined) {
  return useQuery({
    queryKey: ['member-invite', token],
    queryFn: async () => {
      const res = await api.get(`/workspaces/member-invite/${token}`)
      return res.data as {
        id: string
        workspace: { id: string; name: string; slug: string }
        role: string
        invitedBy: { id: string; name?: string; email: string }
        invited_email: string
        expires_at: string
      }
    },
    enabled: !!token,
    retry: false,
  })
}

export function useRespondToMemberInvite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ token, action }: { token: string; action: 'accept' | 'decline' }) => {
      const res = await api.post(`/workspaces/member-invite/${token}/respond`, { action })
      return res.data as { status: string; workspace?: { id: string; name: string; slug: string } }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tours'] })
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['venues'] })
    },
  })
}
