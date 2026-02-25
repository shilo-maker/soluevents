import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import type { RoleAssignment, User, EventRole } from '@/types'

interface RoleAssignmentWithUser extends RoleAssignment {
  user: User
}

interface RoleAssignmentFilters {
  event_id?: string
  tour_id?: string
}

// Get role assignments
export function useRoleAssignments(filters: RoleAssignmentFilters) {
  return useQuery<RoleAssignmentWithUser[]>({
    queryKey: ['roleAssignments', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.event_id) params.append('event_id', filters.event_id)
      if (filters.tour_id) params.append('tour_id', filters.tour_id)

      const response = await api.get(`/role-assignments?${params.toString()}`)
      return response.data
    },
    enabled: !!(filters.event_id || filters.tour_id),
  })
}

// Create role assignment
export function useCreateRoleAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      event_id?: string
      tour_id?: string
      user_id: string
      role: EventRole
      scope: 'event' | 'tour' | 'tour_day'
    }) => {
      const response = await api.post('/role-assignments', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roleAssignments'] })
    },
  })
}

// Delete role assignment
export function useDeleteRoleAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/role-assignments/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roleAssignments'] })
    },
  })
}
