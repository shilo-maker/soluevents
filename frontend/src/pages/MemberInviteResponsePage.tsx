import { useEffect, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { isAxiosError } from 'axios'
import { useMemberInviteByToken, useRespondToMemberInvite } from '@/hooks/useWorkspaces'
import { useWorkspaceStore } from '@/stores/workspaceStore'

function errorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    return error.response?.data?.message || error.message
  }
  return error instanceof Error ? error.message : 'An error occurred'
}

export default function MemberInviteResponsePage() {
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
          <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Invitation</h2>
          <p className="text-gray-600 mb-6">{errorMessage(fetchError)}</p>
          <button onClick={() => navigate('/')} className="btn-primary">
            Go to Dashboard
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
              <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome!</h2>
              <p className="text-gray-600">
                You've joined <strong>{invite?.workspace.name}</strong> as <strong>{invite?.role}</strong>.
                Redirecting...
              </p>
            </>
          ) : (
            <>
              <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Invitation Declined</h2>
              <p className="text-gray-600 mb-6">You have declined the invitation.</p>
              <button onClick={() => navigate('/')} className="btn-primary">
                Go to Dashboard
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Workspace Invitation</h1>
          <p className="text-gray-600 mb-6">You've been invited to join a workspace</p>

          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">{invite.workspace.name}</h2>
            <div className="space-y-1 text-sm text-gray-600">
              <p>
                <strong>Role:</strong>{' '}
                <span className="capitalize">{invite.role}</span>
              </p>
              <p>
                <strong>Invited by:</strong>{' '}
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
              Accept
            </button>
            <button
              onClick={() => handleRespond('decline')}
              disabled={respondMutation.isPending}
              className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2 font-medium"
            >
              <XCircle className="w-4 h-4" />
              Decline
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
