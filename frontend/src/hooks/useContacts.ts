import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import type { Contact } from '@/types'
import { useWorkspaceStore } from '@/stores/workspaceStore'

export function useContacts() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspace?.id)

  return useQuery({
    queryKey: ['contacts', 'list', activeWorkspaceId],
    queryFn: async () => {
      const response = await api.get<{ data: Contact[]; pagination: any }>('/contacts')
      return response.data.data
    },
    enabled: !!activeWorkspaceId,
  })
}

export function useContact(id: string) {
  return useQuery({
    queryKey: ['contacts', id],
    queryFn: async () => {
      const response = await api.get<Contact>(`/contacts/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

export function useCreateContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<Contact>) => {
      const response = await api.post<Contact>('/contacts', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

export function useUpdateContact(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<Contact>) => {
      const response = await api.patch<Contact>(`/contacts/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['contacts', id] })
    },
  })
}

export function useUpdateContactById() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Contact> }) => {
      const response = await api.patch<Contact>(`/contacts/${id}`, data)
      return response.data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['contacts', variables.id] })
    },
  })
}

export function useDeleteContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/contacts/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}
