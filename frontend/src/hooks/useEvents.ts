import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import type { Event, FlowService } from '@/types'

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await api.get<{ data: Event[]; pagination: any }>('/events')
      return response.data.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ['events', id],
    queryFn: async () => {
      const response = await api.get<Event>(`/events/${id}`)
      return response.data
    },
    enabled: !!id,
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
      // Optimistic cache update for the detail view
      queryClient.setQueryData(['events', variables.id], updatedEvent)
      queryClient.invalidateQueries({ queryKey: ['events'] })
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

// SoluFlow service integration
export function useFlowService(serviceId: string | null | undefined) {
  return useQuery({
    queryKey: ['flowServices', serviceId],
    queryFn: async () => {
      const res = await api.get<FlowService>(`/integration/services/${serviceId}`)
      return res.data
    },
    enabled: !!serviceId,
    staleTime: 0,
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
