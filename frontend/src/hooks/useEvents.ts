import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import type { Event, FlowService } from '@/types'
import { useWorkspaceStore } from '@/stores/workspaceStore'

export function useEvents() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspace?.id)

  return useQuery({
    queryKey: ['events', 'list', activeWorkspaceId],
    queryFn: async () => {
      const response = await api.get<{ data: Event[]; pagination: any }>('/events')
      return response.data.data
    },
    enabled: !!activeWorkspaceId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useEvent(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['events', 'detail', id],
    queryFn: async () => {
      const response = await api.get<Event>(`/events/${id}`)
      return response.data
    },
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<Event>) => {
      const response = await api.post<Event>('/events', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useUpdateEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Event> }) => {
      const response = await api.patch<Event>(`/events/${id}`, data)
      return response.data
    },
    onSuccess: (updatedEvent, variables) => {
      // Merge update response into cached detail (preserves relations like tasks, files, invitations
      // that aren't included in the PATCH response)
      queryClient.setQueryData(['events', 'detail', variables.id], (old: any) =>
        old ? { ...old, ...updatedEvent } : updatedEvent
      )
      queryClient.invalidateQueries({ queryKey: ['events', 'list'] })
    },
  })
}

export function useDeleteEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/events/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

// SoluCast setlist integration
export function useSetlist(setlistId: string | null | undefined) {
  return useQuery({
    queryKey: ['setlists', setlistId],
    queryFn: async () => {
      const res = await api.get<{ id: string; name: string; shareCode: string; itemCount: number }>(
        `/integration/setlists/${setlistId}`
      )
      return res.data
    },
    enabled: !!setlistId,
    staleTime: 2 * 60 * 1000,
  })
}

// SoluFlow service integration
export function useFlowService(serviceId: string | null | undefined) {
  return useQuery({
    queryKey: ['flowServices', serviceId],
    queryFn: async () => {
      const res = await api.get<FlowService>(`/integration/services/${serviceId}`)
      return res.data
    },
    enabled: !!serviceId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useRespondToTeamInvite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ eventId, memberId, action }: { eventId: string; memberId: string; action: 'accept' | 'decline' }) => {
      const res = await api.post(`/events/${eventId}/team-invite/${memberId}/respond`, { action })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useFlowServiceByCode() {
  return useMutation({
    mutationFn: async (code: string) => {
      const res = await api.get<FlowService>(`/integration/services/code/${code}`)
      return res.data
    },
  })
}
