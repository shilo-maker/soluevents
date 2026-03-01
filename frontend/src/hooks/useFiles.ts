import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import type { EventFile, StorageUsage } from '@/types'

export function useEventFiles(eventId: string) {
  return useQuery({
    queryKey: ['files', 'event', eventId],
    queryFn: async () => {
      const response = await api.get<EventFile[]>(`/files/events/${eventId}`)
      return response.data
    },
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateLinkFile(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { url: string; filename: string; category?: string; notes?: string }) => {
      const response = await api.post<EventFile>(`/files/events/${eventId}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', 'event', eventId] })
      queryClient.invalidateQueries({ queryKey: ['files', 'storage'] })
    },
  })
}

export function useUploadFile(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { file: File; category?: string; notes?: string }) => {
      const formData = new FormData()
      formData.append('file', data.file)
      if (data.category) formData.append('category', data.category)
      if (data.notes) formData.append('notes', data.notes)

      const response = await api.post<EventFile>(`/files/events/${eventId}`, formData, {
        headers: { 'Content-Type': undefined },
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', 'event', eventId] })
      queryClient.invalidateQueries({ queryKey: ['files', 'storage'] })
    },
  })
}

export function useDeleteFile(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (fileId: string) => {
      await api.delete(`/files/${fileId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', 'event', eventId] })
      queryClient.invalidateQueries({ queryKey: ['files', 'storage'] })
    },
  })
}

export function useUserStorage() {
  return useQuery({
    queryKey: ['files', 'storage'],
    queryFn: async () => {
      const response = await api.get<StorageUsage>('/files/storage/me')
      return response.data
    },
    staleTime: 60 * 1000,
  })
}
