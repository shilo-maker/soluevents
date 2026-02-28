import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Check, X, Loader2, Calendar, MapPin, RefreshCw } from 'lucide-react'
import axios from 'axios'
import logoSm from '@/assets/logo-sm.png'

interface InvitationData {
  id: string
  name: string
  email: string
  status: 'pending' | 'confirmed' | 'declined'
  roles_summary: Array<{ source: 'team' | 'schedule'; team_name?: string; role: string }>
  responded_at?: string
  event: {
    id: string
    title: string
    date_start: string
    date_end: string
    location_name?: string
    timezone?: string
  }
}

const API_BASE = '/api'

export default function InvitationResponsePage() {
  const { token } = useParams<{ token: string }>()
  const [searchParams] = useSearchParams()
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [respondError, setRespondError] = useState<string | null>(null)
  const [respondingAs, setRespondingAs] = useState<'confirmed' | 'declined' | null>(null)
  const respondingRef = useRef(false)
  const autoRespondedRef = useRef(false)

  const fetchInvitation = () => {
    if (!token) return
    setLoading(true)
    setError(null)
    axios
      .get(`${API_BASE}/invitations/${token}`)
      .then((res) => setInvitation(res.data))
      .catch(() => setError('Invitation not found or has expired.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchInvitation()
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-respond if action param is present (with ref guard for StrictMode)
  useEffect(() => {
    if (!invitation || invitation.status !== 'pending' || autoRespondedRef.current) return
    const action = searchParams.get('action')
    if (action === 'confirm' || action === 'decline') {
      autoRespondedRef.current = true
      handleRespond(action === 'confirm' ? 'confirmed' : 'declined')
    }
  }, [invitation]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRespond = async (status: 'confirmed' | 'declined') => {
    if (!token || respondingRef.current) return
    respondingRef.current = true
    setRespondingAs(status)
    setRespondError(null)
    try {
      const res = await axios.post(`${API_BASE}/invitations/${token}/respond`, { status })
      setInvitation((prev) => prev ? { ...prev, status: res.data.status, responded_at: res.data.responded_at } : prev)
    } catch {
      setRespondError('Failed to submit response. Please try again.')
    } finally {
      respondingRef.current = false
      setRespondingAs(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <X className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invitation Not Found</h1>
          <p className="text-gray-600 mb-4">{error || 'This invitation link is invalid.'}</p>
          <button
            onClick={fetchInvitation}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </div>
      </div>
    )
  }

  const eventDate = new Date(invitation.event.date_start)
  const tz = invitation.event.timezone || undefined
  const dateStr = eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: tz })
  const timeStr = eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: tz })

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 px-8 py-6 text-center border-b border-gray-100">
          <div className="flex items-center justify-center gap-2 mb-1">
            <img src={logoSm} alt="SoluPlan" className="w-5 h-5 rounded" />
            <h1 className="text-sm font-semibold text-purple-600">SoluPlan</h1>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{invitation.event.title}</h2>
        </div>

        <div className="px-8 py-6 space-y-6">
          {/* Event details */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4 text-gray-400" />
              {dateStr} at {timeStr}
            </div>
            {invitation.event.location_name && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 text-gray-400" />
                {invitation.event.location_name}
              </div>
            )}
          </div>

          {/* Greeting */}
          <div>
            <p className="text-gray-700">
              Hi <strong>{invitation.name}</strong>, you've been invited to participate in this event.
            </p>
          </div>

          {/* Roles */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Your Role(s):</h3>
            <ul className="space-y-1">
              {invitation.roles_summary.map((r, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                  {r.source === 'team' ? (
                    <span><strong>{r.team_name}</strong> — {r.role}</span>
                  ) : (
                    <span><strong>Program</strong> — {r.role}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Respond error (inline, doesn't replace page) */}
          {respondError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">
              {respondError}
            </p>
          )}

          {/* Response buttons or status */}
          {invitation.status === 'pending' ? (
            <div className="flex gap-3">
              <button
                onClick={() => handleRespond('confirmed')}
                disabled={!!respondingAs}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {respondingAs === 'confirmed' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Confirm
              </button>
              <button
                onClick={() => handleRespond('declined')}
                disabled={!!respondingAs}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {respondingAs === 'declined' ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                Decline
              </button>
            </div>
          ) : (
            <div className="text-center space-y-3">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${
                invitation.status === 'confirmed'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}>
                {invitation.status === 'confirmed' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                {invitation.status === 'confirmed' ? 'You confirmed this invitation' : 'You declined this invitation'}
              </div>
              <p className="text-xs text-gray-500">
                Changed your mind?{' '}
                <button
                  onClick={() => handleRespond(invitation.status === 'confirmed' ? 'declined' : 'confirmed')}
                  disabled={!!respondingAs}
                  className="text-purple-600 hover:text-purple-800 font-medium underline"
                >
                  {invitation.status === 'confirmed' ? 'Decline instead' : 'Confirm instead'}
                </button>
              </p>
            </div>
          )}
        </div>

        <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">Sent via SoluPlan</p>
        </div>
      </div>
    </div>
  )
}
