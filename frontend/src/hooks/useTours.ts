import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import type { Tour } from '@/types'

export function useTours() {
  return useQuery({
    queryKey: ['tours'],
    queryFn: async () => {
      const response = await api.get<{ data: Tour[]; pagination: any }>('/tours')
      return response.data.data
    },
  })
}

export function useTour(id: string) {
  return useQuery({
    queryKey: ['tours', id],
    queryFn: async () => {
      const response = await api.get<Tour>(`/tours/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

export function useCreateTour() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<Tour>) => {
      const response = await api.post<Tour>('/tours', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tours'] })
    },
  })
}

export function useUpdateTour(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<Tour>) => {
      const response = await api.patch<Tour>(`/tours/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tours'] })
      queryClient.invalidateQueries({ queryKey: ['tours', id] })
    },
  })
}

export function useDeleteTour() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tours/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tours'] })
    },
  })
}
