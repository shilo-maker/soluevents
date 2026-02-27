import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import type { WorkspaceMember, WorkspaceInvitation, UserSearchResult, WorkspaceMemberInvite } from '@/types'

interface WorkspaceDetailsResponse {
  workspace: { id: string; name: string; slug: string; workspaceType: string }
  members: WorkspaceMember[]
}

export function useWorkspaceDetails(wsId: string | undefined) {
  return useQuery({
    queryKey: ['workspace', wsId],
    queryFn: async () => {
      const res = await api.get<WorkspaceDetailsResponse>(`/workspaces/${wsId}`)
      return res.data
    },
    enabled: !!wsId,
  })
}

export function useRenameWorkspace(wsId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await api.patch(`/workspaces/${wsId}`, { name })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', wsId] })
    },
  })
}

export function useUpdateMemberRole(wsId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await api.patch(`/workspaces/${wsId}/members/${userId}`, { role })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', wsId] })
    },
  })
}

export function useRemoveMember(wsId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/workspaces/${wsId}/members/${userId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', wsId] })
    },
  })
}

export function useDeleteWorkspace() {
  return useMutation({
    mutationFn: async (wsId: string) => {
      await api.delete(`/workspaces/${wsId}`)
    },
  })
}

export function useWorkspaceInvitations(wsId: string | undefined) {
  return useQuery({
    queryKey: ['workspace', wsId, 'invitations'],
    queryFn: async () => {
      const res = await api.get<WorkspaceInvitation[]>(`/workspaces/${wsId}/invitations`)
      return res.data
    },
    enabled: !!wsId,
  })
}

export function useRevokeInvitation(wsId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (inviteId: string) => {
      await api.delete(`/workspaces/${wsId}/invitations/${inviteId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', wsId, 'invitations'] })
    },
  })
}

// ── Direct Member Invite hooks ──────────────────────────────────────

export function useSearchUserByEmail(wsId: string | undefined, email: string) {
  return useQuery({
    queryKey: ['workspace', wsId, 'search-user', email],
    queryFn: async () => {
      const res = await api.get<UserSearchResult>(
        `/workspaces/${wsId}/search-user?email=${encodeURIComponent(email)}`
      )
      return res.data
    },
    enabled: !!wsId && email.length > 2 && email.includes('@'),
  })
}

export function useSendMemberInvite(wsId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const res = await api.post<WorkspaceMemberInvite>(
        `/workspaces/${wsId}/member-invites`,
        { email, role }
      )
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', wsId, 'member-invites'] })
      queryClient.invalidateQueries({ queryKey: ['workspace', wsId, 'search-user'] })
    },
  })
}

export function useWorkspaceMemberInvites(wsId: string | undefined) {
  return useQuery({
    queryKey: ['workspace', wsId, 'member-invites'],
    queryFn: async () => {
      const res = await api.get<WorkspaceMemberInvite[]>(`/workspaces/${wsId}/member-invites`)
      return res.data
    },
    enabled: !!wsId,
  })
}

export function useRevokeMemberInvite(wsId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (inviteId: string) => {
      await api.delete(`/workspaces/${wsId}/member-invites/${inviteId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', wsId, 'member-invites'] })
    },
  })
}
