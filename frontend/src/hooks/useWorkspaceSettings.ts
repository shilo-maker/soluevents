import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import type { WorkspaceMember, WorkspaceInvitation } from '@/types'

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
