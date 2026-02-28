import { useEffect, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { isAxiosError } from 'axios'
import { useMemberInviteByToken, useRespondToMemberInvite } from '@/hooks/useWorkspaces'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useTranslation } from 'react-i18next'

function errorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    return error.response?.data?.message || error.message
  }
  return error instanceof Error ? error.message : 'Error'
}

export default function MemberInviteResponsePage() {
  const { t } = useTranslation()
  const { token } = useParams<{ token: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const loadWorkspaces = useWorkspaceStore((s) => s.loadWorkspaces)

  const { data: invite, isLoading, error: fetchError } = useMemberInviteByToken(token)
  const respondMutation = useRespondToMemberInvite()
  const autoSubmitted = useRef(false)

  // Auto-submit from email link (?action=accept|decline)
  const queryAction = searchParams.get('action') as 'accept' | 'decline' | null
  useEffect(() => {
    if (invite && queryAction && !autoSubmitted.current && !respondMutation.isPending && !respondMutation.isSuccess) {
      autoSubmitted.current = true
      handleRespond(queryAction)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invite, queryAction])

  const handleRespond = async (action: 'accept' | 'decline') => {
    if (!token) return
    try {
      await respondMutation.mutateAsync({ token, action })
      if (action === 'accept') {
        await loadWorkspaces()
        setTimeout(() => navigate('/'), 1500)
      }
    } catch {
      // error shown inline
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('memberInvite.invalidInvite')}</h2>
          <p className="text-gray-600 mb-6">{errorMessage(fetchError)}</p>
          <button onClick={() => navigate('/')} className="btn-primary">
            {t('common.goToDashboard')}
          </button>
        </div>
      </div>
    )
  }

  if (respondMutation.isSuccess) {
    const accepted = respondMutation.data?.status === 'accepted'
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-md">
          {accepted ? (
            <>
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">{t('memberInvite.welcome')}</h2>
              <p className="text-gray-600">
                {t('memberInvite.joinedAs', { workspace: invite?.workspace.name, role: invite?.role })}
              </p>
            </>
          ) : (
            <>
              <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">{t('memberInvite.invitationDeclined')}</h2>
              <p className="text-gray-600 mb-6">{t('memberInvite.declinedDesc')}</p>
              <button onClick={() => navigate('/')} className="btn-primary">
                {t('common.goToDashboard')}
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  if (!invite) return null

  return (
    <div className="flex items-center justify-center py-20">
      <div className="max-w-md w-full">
        <div className="card text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('memberInvite.title')}</h1>
          <p className="text-gray-600 mb-6">{t('memberInvite.subtitle')}</p>

          <div className="bg-gradient-to-br from-teal-50 to-teal-50 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">{invite.workspace.name}</h2>
            <div className="space-y-1 text-sm text-gray-600">
              <p>
                <strong>{t('memberInvite.role')}</strong>{' '}
                <span className="capitalize">{invite.role}</span>
              </p>
              <p>
                <strong>{t('memberInvite.invitedBy')}</strong>{' '}
                {invite.invitedBy.name || invite.invitedBy.email}
              </p>
            </div>
          </div>

          {respondMutation.isError && (
            <p className="text-sm text-red-500 mb-4">{errorMessage(respondMutation.error)}</p>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => handleRespond('accept')}
              disabled={respondMutation.isPending}
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2 font-medium"
            >
              {respondMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {t('common.accept')}
            </button>
            <button
              onClick={() => handleRespond('decline')}
              disabled={respondMutation.isPending}
              className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2 font-medium"
            >
              <XCircle className="w-4 h-4" />
              {t('common.decline')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
