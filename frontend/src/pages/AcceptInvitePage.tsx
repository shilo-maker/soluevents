import { useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAcceptInvite } from '@/hooks/useWorkspaces'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { Loader2, CheckCircle } from 'lucide-react'
import { isAxiosError } from 'axios'
import { useTranslation } from 'react-i18next'

export default function AcceptInvitePage() {
  const { t } = useTranslation()
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const acceptInvite = useAcceptInvite()
  const loadWorkspaces = useWorkspaceStore((s) => s.loadWorkspaces)
  const calledRef = useRef(false)

  useEffect(() => {
    if (!token || calledRef.current) return
    calledRef.current = true

    acceptInvite.mutate(token, {
      onSuccess: async () => {
        try {
          await loadWorkspaces()
        } catch {
          // Workspace list refresh failed — non-blocking, proceed to dashboard
        }
        navigate('/', { replace: true })
      },
    })
  // Run once on mount — acceptInvite object changes every render but .mutate is stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  if (acceptInvite.isPending) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
        <p className="text-gray-600">{t('invite.joiningWorkspace')}</p>
      </div>
    )
  }

  if (acceptInvite.isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <CheckCircle className="w-8 h-8 text-green-600" />
        <p className="text-gray-600">{t('invite.joinedRedirecting')}</p>
      </div>
    )
  }

  if (acceptInvite.isError) {
    const msg = isAxiosError(acceptInvite.error)
      ? acceptInvite.error.response?.data?.message || acceptInvite.error.message
      : t('invite.failedAccept')
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-red-500 text-lg font-semibold">{t('invite.error')}</div>
        <p className="text-gray-600">{msg}</p>
        <button
          onClick={() => navigate('/', { replace: true })}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          {t('common.goToDashboard')}
        </button>
      </div>
    )
  }

  // Idle state (brief moment before effect fires)
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      <p className="text-gray-600">{t('invite.preparing')}</p>
    </div>
  )
}
