import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'

export interface EmailSettingsResponse {
  smtp_host: string | null
  smtp_port: number | null
  smtp_secure: boolean
  smtp_user: string | null
  has_password: boolean
  email_from: string | null
}

export interface EmailSettingsPayload {
  smtp_host: string
  smtp_port: number
  smtp_secure: boolean
  smtp_user: string
  smtp_pass: string
  email_from: string
}

export function useUserEmailSettings() {
  return useQuery({
    queryKey: ['user', 'email-settings'],
    queryFn: async () => {
      const res = await api.get<EmailSettingsResponse>('/user/email-settings')
      return res.data
    },
  })
}

export function useUpdateUserEmailSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<EmailSettingsPayload>) => {
      const res = await api.patch('/user/email-settings', payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'email-settings'] })
    },
  })
}

export function useTestUserEmailSettings() {
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<{ message: string }>('/user/email-settings/test')
      return res.data
    },
  })
}
