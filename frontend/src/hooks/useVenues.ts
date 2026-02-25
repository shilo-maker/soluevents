import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import type { Venue } from '@/types'

export function useVenues() {
  return useQuery({
    queryKey: ['venues'],
    queryFn: async () => {
      const response = await api.get<{ data: Venue[]; pagination: any }>('/venues')
      return response.data.data
    },
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
