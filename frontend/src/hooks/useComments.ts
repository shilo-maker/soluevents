import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'
import type { Comment } from '@/types'

export function useTaskComments(taskId: string, enabled = true) {
  return useQuery({
    queryKey: ['comments', 'task', taskId],
    queryFn: async () => {
      const response = await api.get<Comment[]>(`/tasks/${taskId}/comments`)
      return response.data
    },
    enabled: !!taskId && enabled,
    staleTime: 30 * 1000,
    refetchInterval: enabled ? 60 * 1000 : false, // Fallback poll — Socket.IO handles real-time
  })
}

export function useAddTaskComment(taskId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (body: string) => {
      const response = await api.post<Comment>(`/tasks/${taskId}/comments`, { body })
      return response.data
    },
    onMutate: async (body) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['comments', 'task', taskId] })

      // Snapshot the previous value for rollback
      const previous = queryClient.getQueryData<Comment[]>(['comments', 'task', taskId])

      // Build optimistic comment from current user
      const user = useAuthStore.getState().user
      const optimisticId = `optimistic-${Date.now()}`
      const optimistic: Comment = {
        id: optimisticId,
        body,
        author_id: user?.id ?? '',
        entity_type: 'task',
        entity_id: taskId,
        mentions: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        author: user ? { id: user.id, name: user.name, email: user.email } : undefined,
      }

      // Optimistically append
      queryClient.setQueryData<Comment[]>(
        ['comments', 'task', taskId],
        (old) => [...(old ?? []), optimistic]
      )

      return { previous, optimisticId }
    },
    onError: (_err, _body, context) => {
      // Rollback to the snapshot
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['comments', 'task', taskId], context.previous)
      }
    },
    onSuccess: (serverComment, _body, context) => {
      // Replace the optimistic entry (matched by ID, not body) with real server data
      queryClient.setQueryData<Comment[]>(
        ['comments', 'task', taskId],
        (old) =>
          old?.map((c) =>
            c.id === context?.optimisticId ? serverComment : c
          ) ?? [serverComment]
      )
    },
    // Always refetch after to ensure cache is fully in sync
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', 'task', taskId] })
    },
  })
}

export function useDeleteTaskComment(taskId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (commentId: string) => {
      await api.delete(`/tasks/${taskId}/comments/${commentId}`)
    },
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey: ['comments', 'task', taskId] })

      const previous = queryClient.getQueryData<Comment[]>(['comments', 'task', taskId])

      // Optimistically remove
      queryClient.setQueryData<Comment[]>(
        ['comments', 'task', taskId],
        (old) => old?.filter((c) => c.id !== commentId) ?? []
      )

      return { previous }
    },
    onError: (_err, _commentId, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['comments', 'task', taskId], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', 'task', taskId] })
    },
  })
}
