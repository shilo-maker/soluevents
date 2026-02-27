import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'

export function useSendInvitations() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (eventId: string) => {
      const res = await api.post<{
        sent: number
        skipped: number
        skippedNames: string[]
        alreadyResponded: number
        errors: string[]
      }>(`/invitations/events/${eventId}/send`)
      return res.data
    },
    onSuccess: (_data, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['events', 'detail', eventId] })
    },
  })
}
