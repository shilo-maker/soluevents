import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import type { Venue } from '@/types'
import { useWorkspaceStore } from '@/stores/workspaceStore'

export function useVenues() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspace?.id)

  return useQuery({
    queryKey: ['venues', 'list', activeWorkspaceId],
    queryFn: async () => {
      const response = await api.get<{ data: Venue[]; pagination: any }>('/venues')
      return response.data.data
    },
    enabled: !!activeWorkspaceId,
  })
}

export function useUpdateVenue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; address?: string } }) => {
      const response = await api.patch<Venue>(`/venues/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venues'] })
    },
  })
}

export function useCreateVenue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { name: string; address?: string }) => {
      const response = await api.post<Venue>('/venues', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venues'] })
    },
  })
}
