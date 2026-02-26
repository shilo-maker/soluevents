import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import type { Task } from '@/types'
import { useWorkspaceStore } from '@/stores/workspaceStore'

interface TaskFilters {
  assignee?: string
  event_id?: string
  tour_id?: string
  status?: string
}

export function useTasks(filters?: TaskFilters) {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspace?.id)
  const params = new URLSearchParams()
  if (filters?.assignee) params.append('assignee', filters.assignee)
  if (filters?.event_id) params.append('event_id', filters.event_id)
  if (filters?.tour_id) params.append('tour_id', filters.tour_id)
  if (filters?.status) params.append('status', filters.status)

  return useQuery({
    queryKey: ['tasks', 'list', activeWorkspaceId, filters],
    queryFn: async () => {
      const response = await api.get<{ data: Task[]; pagination: any }>(`/tasks?${params.toString()}`)
      return response.data.data
    },
    enabled: !!activeWorkspaceId,
  })
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['tasks', 'detail', id],
    queryFn: async () => {
      const response = await api.get<Task>(`/tasks/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<Task>) => {
      const response = await api.post<Task>('/tasks', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useUpdateTask(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<Task>) => {
      const response = await api.patch<Task>(`/tasks/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tasks/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
