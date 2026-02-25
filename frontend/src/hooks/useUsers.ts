import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import type { User } from '@/types'

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get<{ data: User[]; pagination: any }>('/users')
      return response.data.data
    },
  })
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      const response = await api.get<User>(`/users/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      name: string
      email: string
      password: string
      org_role?: string
    }) => {
      const response = await api.post<User>('/users', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useUpdateUser(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<User> & { password?: string }) => {
      const response = await api.patch<User>(`/users/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['users', id] })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
