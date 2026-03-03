import { useState, useMemo, useCallback, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Star,
  Send,
  ChevronDown,
  ChevronRight,
  Loader2,
  CheckCircle2,
  MessageSquare,
  BarChart3,
  Users,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  Edit3,
} from 'lucide-react'
import api from '@/lib/axios'

// ─── Types ──────────────────────────────────────────────────────────────────────

interface DebriefQuestion {
  id: string
  category: string
  question_en: string
  question_he: string
  type: 'rating' | 'text' | 'yesno'
}

interface DebriefData {
  id: string
  event_id: string
  status: 'draft' | 'sent' | 'closed'
  questions: DebriefQuestion[]
  sent_at: string | null
  closed_at: string | null
  created_by: string
  created_at: string
  response_count: number
  user_has_responded: boolean
  user_response: { id: string; answers: { question_id: string; value: any }[] } | null
}

interface ResponseData {
  id: string
  debrief_id: string
  user_id: string
  answers: { question_id: string; value: any }[]
  submitted_at: string
  user: {
    id: string
    name: string | null
    name_he: string | null
    name_en: string | null
    username?: string | null
    email: string
    avatar_url: string | null
  }
}

interface Props {
  eventId: string
  canEdit: boolean
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const CATEGORY_ORDER = ['general', 'worship', 'production', 'logistics']
const STALE_TIME = 2 * 60 * 1000 // 2 minutes

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function DebriefTab({ eventId, canEdit }: Props) {
  const { t, i18n } = useTranslation()
  const isHe = i18n.language === 'he'

  const [view, setView] = useState<'form' | 'summary' | 'byPerson'>('form')
  const [expandedPersons, setExpandedPersons] = useState<Set<string>>(new Set())

  const { data: debriefResult, isLoading, isError } = useQuery({
    queryKey: ['debrief', eventId],
    queryFn: async () => {
      const res = await api.get(`/events/${eventId}/debrief`)
      return res.data
    },
    staleTime: STALE_TIME,
  })

  const debrief: DebriefData | null = debriefResult?.data || null
  const suggestedQuestions: DebriefQuestion[] = debriefResult?.suggestedQuestions || []

  // Only fetch responses when organizer is viewing results
  const { data: responsesResult } = useQuery({
    queryKey: ['debrief-responses', eventId, debrief?.id],
    queryFn: async () => {
      const res = await api.get(`/events/${eventId}/debrief/${debrief!.id}/responses`)
      return res.data
    },
    enabled: !!debrief && canEdit && (view === 'summary' || view === 'byPerson'),
    staleTime: STALE_TIME,
  })

  const responses: ResponseData[] = responsesResult?.data || []

  const effectiveView = useMemo(() => {
    if (!debrief) return 'create'
    if (debrief.status === 'draft' && canEdit) return 'edit'
    // Allow form access only when debrief is actively accepting responses
    if (debrief.status === 'sent' && view === 'form') return 'form'
    if (debrief.user_has_responded || canEdit) {
      // For non-sent debriefs, never show form (closed can't accept responses)
      if (view === 'form' && debrief.status !== 'sent') return 'summary'
      return view
    }
    // Non-organizer who hasn't responded yet defaults to form
    if (debrief.status === 'sent') return 'form'
    return 'summary'
  }, [debrief, canEdit, view])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="card text-center py-12">
        <AlertCircle className="w-10 h-10 text-red-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">{t('common.error')}</p>
      </div>
    )
  }

  // Non-organizers: hide if no debrief or debrief is still in draft
  if (!canEdit && (!debrief || debrief.status === 'draft')) {
    return (
      <div className="card text-center py-12">
        <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">{t('debrief.noDebrief')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* View toggle */}
      {debrief && (debrief.user_has_responded || canEdit) && debrief.status !== 'draft' && (
        <div className="flex gap-2">
          <button
            onClick={() => setView('summary')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              effectiveView === 'summary'
                ? 'bg-teal-100 text-teal-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            {t('debrief.summary')}
          </button>
          {canEdit && (
            <button
              onClick={() => setView('byPerson')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                effectiveView === 'byPerson'
                  ? 'bg-teal-100 text-teal-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Users className="w-4 h-4" />
              {t('debrief.byPerson')}
            </button>
          )}
          {debrief.status === 'sent' && (
            <button
              onClick={() => setView('form')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                effectiveView === 'form'
                  ? 'bg-teal-100 text-teal-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {debrief.user_has_responded ? (
                <><Edit3 className="w-4 h-4" />{t('debrief.editResponse')}</>
              ) : (
                <><MessageSquare className="w-4 h-4" />{t('debrief.submitResponse')}</>
              )}
            </button>
          )}
        </div>
      )}

      {effectiveView === 'create' && (
        <CreateDebriefPanel
          eventId={eventId}
          suggestedQuestions={suggestedQuestions}
          isHe={isHe}
        />
      )}

      {effectiveView === 'edit' && debrief && (
        <CreateDebriefPanel
          eventId={eventId}
          suggestedQuestions={debrief.questions}
          existingDebrief={debrief}
          isHe={isHe}
        />
      )}

      {effectiveView === 'form' && debrief && (
        <DebriefForm
          eventId={eventId}
          debrief={debrief}
          isHe={isHe}
        />
      )}

      {effectiveView === 'summary' && debrief && (
        <SummaryView
          debrief={debrief}
          responses={responses}
          isHe={isHe}
          canEdit={canEdit}
        />
      )}

      {effectiveView === 'byPerson' && debrief && (
        <ByPersonView
          debrief={debrief}
          responses={responses}
          expandedPersons={expandedPersons}
          setExpandedPersons={setExpandedPersons}
          isHe={isHe}
        />
      )}
    </div>
  )
}

// ─── Create/Edit Debrief Panel ───────────────────────────────────────────────

function CreateDebriefPanel({
  eventId,
  suggestedQuestions,
  existingDebrief,
  isHe,
}: {
  eventId: string
  suggestedQuestions: DebriefQuestion[]
  existingDebrief?: DebriefData
  isHe: boolean
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [questions, setQuestions] = useState<DebriefQuestion[]>(suggestedQuestions)
  const [customQuestion, setCustomQuestion] = useState('')
  const [customType, setCustomType] = useState<'rating' | 'text' | 'yesno'>('text')
  const [error, setError] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: async (data: { questions: DebriefQuestion[] }) => {
      return api.post(`/events/${eventId}/debrief`, data)
    },
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['debrief', eventId] })
    },
    onError: () => setError(t('common.error')),
  })

  const updateMutation = useMutation({
    mutationFn: async (data: { questions?: DebriefQuestion[]; status?: string }) => {
      return api.put(`/events/${eventId}/debrief/${existingDebrief!.id}`, data)
    },
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['debrief', eventId] })
    },
    onError: () => setError(t('common.error')),
  })

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!existingDebrief) {
        const res = await api.post(`/events/${eventId}/debrief`, { questions })
        const debriefId = res.data.data.id
        return api.post(`/events/${eventId}/debrief/${debriefId}/send`)
      }
      await api.put(`/events/${eventId}/debrief/${existingDebrief.id}`, { questions })
      return api.post(`/events/${eventId}/debrief/${existingDebrief.id}/send`)
    },
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['debrief', eventId] })
    },
    onError: () => {
      setError(t('common.error'))
      // Invalidate cache so UI recovers if create succeeded but send failed
      queryClient.invalidateQueries({ queryKey: ['debrief', eventId] })
    },
  })

  const handleSaveDraft = () => {
    if (existingDebrief) {
      updateMutation.mutate({ questions })
    } else {
      createMutation.mutate({ questions })
    }
  }

  const addCustomQuestion = () => {
    if (!customQuestion.trim()) return
    const newQ: DebriefQuestion = {
      id: `custom_${Date.now()}`,
      category: 'general',
      question_en: customQuestion,
      question_he: customQuestion,
      type: customType,
    }
    setQuestions(prev => [...prev, newQ])
    setCustomQuestion('')
  }

  const removeQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id))
  }

  // Group questions with sequential numbering
  const numbered = useMemo(() => {
    const map = new Map<string, DebriefQuestion[]>()
    for (const q of questions) {
      const list = map.get(q.category) || []
      list.push(q)
      map.set(q.category, list)
    }
    let num = 0
    return CATEGORY_ORDER
      .filter(c => map.has(c))
      .map(c => ({
        category: c,
        questions: map.get(c)!.map(q => ({ ...q, num: ++num })),
      }))
  }, [questions])

  const isSaving = createMutation.isPending || updateMutation.isPending
  const isSending = sendMutation.isPending

  return (
    <div className="card p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{t('debrief.createDebrief')}</h3>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
          {questions.length} {t('debrief.questions')}
        </span>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {numbered.map(({ category, questions: catQuestions }) => (
        <div key={category} className="space-y-2">
          <h4 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
            {t(`debrief.category.${category}`)}
          </h4>
          {catQuestions.map(q => (
            <div key={q.id} className="flex items-start gap-2 bg-gray-50 rounded-lg p-3">
              <span className="text-xs text-gray-400 mt-0.5 w-5 shrink-0">{q.num}.</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800">{isHe ? q.question_he : q.question_en}</p>
                <span className="text-xs text-gray-400 mt-0.5 inline-block">
                  {t(`debrief.${q.type}`)}
                </span>
              </div>
              <button
                onClick={() => removeQuestion(q.id)}
                className="text-gray-300 hover:text-red-400 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ))}

      {/* Add custom question */}
      <div className="border border-dashed border-gray-300 rounded-lg p-3 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={customQuestion}
            onChange={e => setCustomQuestion(e.target.value)}
            placeholder={t('debrief.addQuestion')}
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
            onKeyDown={e => e.key === 'Enter' && addCustomQuestion()}
          />
          <select
            value={customType}
            onChange={e => setCustomType(e.target.value as any)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="text">{t('debrief.text')}</option>
            <option value="rating">{t('debrief.rating')}</option>
            <option value="yesno">{t('debrief.yesno')}</option>
          </select>
          <button
            onClick={addCustomQuestion}
            className="p-1.5 rounded-lg text-teal-600 hover:bg-teal-50"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSaveDraft}
          disabled={isSaving || questions.length === 0}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t('debrief.saveDraft')}
        </button>
        <button
          onClick={() => sendMutation.mutate()}
          disabled={isSending || questions.length === 0}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
        >
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {t('debrief.sendDebrief')}
        </button>
      </div>
    </div>
  )
}

// ─── Debrief Form (respondent view) ──────────────────────────────────────────

function DebriefForm({
  eventId,
  debrief,
  isHe,
}: {
  eventId: string
  debrief: DebriefData
  isHe: boolean
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [answers, setAnswers] = useState<Record<string, any>>(() => {
    if (debrief.user_response?.answers) {
      const map: Record<string, any> = {}
      for (const a of debrief.user_response.answers) {
        map[a.question_id] = a.value
      }
      return map
    }
    return {}
  })
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateAnswer = useCallback((questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }, [])

  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = Object.entries(answers).map(([question_id, value]) => ({
        question_id,
        value,
      }))
      return api.post(`/events/${eventId}/debrief/${debrief.id}/respond`, {
        answers: payload,
      })
    },
    onSuccess: () => {
      setSubmitted(true)
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['debrief', eventId] })
      queryClient.invalidateQueries({ queryKey: ['debrief-responses', eventId] })
    },
    onError: () => setError(t('common.error')),
  })

  if (submitted) {
    return (
      <div className="card text-center py-12" role="status">
        <CheckCircle2 className="w-12 h-12 text-teal-500 mx-auto mb-3" />
        <p className="text-lg font-medium text-gray-900">{t('debrief.thankYou')}</p>
      </div>
    )
  }

  const questions = debrief.questions as DebriefQuestion[]

  const grouped = useMemo(() => {
    const map = new Map<string, DebriefQuestion[]>()
    for (const q of questions) {
      const list = map.get(q.category) || []
      list.push(q)
      map.set(q.category, list)
    }
    return CATEGORY_ORDER
      .filter(c => map.has(c))
      .map(c => ({ category: c, questions: map.get(c)! }))
  }, [questions])

  const hasAnswers = useMemo(() => questions.some(q => {
    const val = answers[q.id]
    if (q.type === 'rating') return typeof val === 'number' && val > 0
    if (q.type === 'text') return typeof val === 'string' && val.trim().length > 0
    if (q.type === 'yesno') return val === true || val === false
    return false
  }), [answers, questions])

  return (
    <div className="space-y-5">
      {error && (
        <div role="alert" className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {grouped.map(({ category, questions: catQuestions }) => (
        <div key={category} className="card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
            {t(`debrief.category.${category}`)}
          </h3>
          {catQuestions.map(q => (
            <QuestionInput
              key={q.id}
              question={q}
              value={answers[q.id]}
              onChange={updateAnswer}
              isHe={isHe}
            />
          ))}
        </div>
      ))}

      <button
        onClick={() => submitMutation.mutate()}
        disabled={submitMutation.isPending || !hasAnswers}
        className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
      >
        {submitMutation.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
        {debrief.user_has_responded ? t('debrief.editResponse') : t('debrief.submitResponse')}
      </button>
    </div>
  )
}

// ─── Question Input (memoized to prevent full-form re-renders) ──────────────

const QuestionInput = memo(function QuestionInput({
  question: q,
  value,
  onChange,
  isHe,
}: {
  question: DebriefQuestion
  value: any
  onChange: (questionId: string, value: any) => void
  isHe: boolean
}) {
  const { t } = useTranslation()
  const labelId = `debrief-q-${q.id}`

  return (
    <div className="space-y-1.5">
      <label id={labelId} className="text-sm font-medium text-gray-800">
        {isHe ? q.question_he : q.question_en}
      </label>

      {q.type === 'rating' && (
        <RatingInput
          value={value || 0}
          onChange={val => onChange(q.id, val)}
          labelId={labelId}
        />
      )}

      {q.type === 'text' && (
        <textarea
          value={value || ''}
          onChange={e => onChange(q.id, e.target.value)}
          rows={3}
          aria-labelledby={labelId}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none"
          placeholder={t('debrief.textPlaceholder')}
        />
      )}

      {q.type === 'yesno' && (
        <div role="radiogroup" aria-labelledby={labelId} className="flex gap-2">
          <button
            type="button"
            role="radio"
            aria-checked={value === true}
            onClick={() => onChange(q.id, true)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              value === true
                ? 'bg-teal-100 text-teal-700 ring-1 ring-teal-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('common.yes')}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={value === false}
            onClick={() => onChange(q.id, false)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              value === false
                ? 'bg-red-100 text-red-700 ring-1 ring-red-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('common.no')}
          </button>
        </div>
      )}
    </div>
  )
})

// ─── Rating Input ────────────────────────────────────────────────────────────

const RatingInput = memo(function RatingInput({
  value,
  onChange,
  labelId,
}: {
  value: number
  onChange: (v: number) => void
  labelId?: string
}) {
  const [hover, setHover] = useState(0)
  return (
    <div role="radiogroup" aria-labelledby={labelId} className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={star === value}
          aria-label={`${star} / 5`}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          className="p-0.5 transition-colors"
        >
          <Star
            className={`w-6 h-6 ${
              star <= (hover || value)
                ? 'text-amber-400 fill-amber-400'
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  )
})

// ─── Summary View ────────────────────────────────────────────────────────────

function SummaryView({
  debrief,
  responses,
  isHe,
  canEdit,
}: {
  debrief: DebriefData
  responses: ResponseData[]
  isHe: boolean
  canEdit: boolean
}) {
  const { t } = useTranslation()
  const questions = debrief.questions as DebriefQuestion[]

  const stats = useMemo(() => {
    const result: Record<string, { type: string; values: any[]; avg?: number; yesCount?: number; noCount?: number }> = {}

    for (const q of questions) {
      result[q.id] = { type: q.type, values: [] }
    }

    for (const r of responses) {
      for (const a of r.answers) {
        if (result[a.question_id]) {
          result[a.question_id].values.push(a.value)
        }
      }
    }

    for (const stat of Object.values(result)) {
      if (stat.type === 'rating') {
        const nums = stat.values.filter((v: any) => typeof v === 'number')
        stat.avg = nums.length > 0 ? nums.reduce((a: number, b: number) => a + b, 0) / nums.length : 0
      }
      if (stat.type === 'yesno') {
        stat.yesCount = stat.values.filter((v: any) => v === true).length
        stat.noCount = stat.values.filter((v: any) => v === false).length
      }
    }

    return result
  }, [questions, responses])

  const showDetailedStats = canEdit && responses.length > 0

  return (
    <div className="space-y-4">
      {/* Response count */}
      <div className="card p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
          <Users className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">
            {debrief.response_count} {t('debrief.responses')}
          </p>
          <p className="text-xs text-gray-500">
            {debrief.status === 'sent' ? t('debrief.statusSent')
              : debrief.status === 'closed' ? t('debrief.statusClosed')
              : t('debrief.statusDraft')}
          </p>
        </div>
      </div>

      {/* Detailed stats for organizers */}
      {showDetailedStats && questions.map(q => {
        const s = stats[q.id]
        if (!s) return null

        return (
          <div key={q.id} className="card p-4 space-y-2">
            <p className="text-sm font-medium text-gray-800">
              {isHe ? q.question_he : q.question_en}
            </p>

            {q.type === 'rating' && s.avg !== undefined && (
              <div className="flex items-center gap-3">
                <div className="flex gap-0.5" aria-hidden="true">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= Math.round(s.avg!) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-semibold text-gray-700">
                  {s.avg.toFixed(1)}
                </span>
                <span className="text-xs text-gray-400">
                  ({s.values.length} {t('debrief.responses')})
                </span>
              </div>
            )}

            {q.type === 'yesno' && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-teal-400" />
                  <span className="text-sm text-gray-700">
                    {t('common.yes')}: {s.yesCount}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <span className="text-sm text-gray-700">
                    {t('common.no')}: {s.noCount}
                  </span>
                </div>
                {(s.yesCount! + s.noCount!) > 0 && (
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-[200px]">
                    <div
                      className="h-full bg-teal-400 rounded-full"
                      style={{ width: `${(s.yesCount! / (s.yesCount! + s.noCount!)) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            {q.type === 'text' && s.values.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {s.values.filter((v: any) => v && String(v).trim()).map((v: any, i: number) => (
                  <p key={i} className="text-sm text-gray-600 bg-gray-50 rounded px-2.5 py-1.5">
                    {String(v)}
                  </p>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── By Person View ──────────────────────────────────────────────────────────

function ByPersonView({
  debrief,
  responses,
  expandedPersons,
  setExpandedPersons,
  isHe,
}: {
  debrief: DebriefData
  responses: ResponseData[]
  expandedPersons: Set<string>
  setExpandedPersons: (s: Set<string>) => void
  isHe: boolean
}) {
  const { t } = useTranslation()
  const questions = debrief.questions as DebriefQuestion[]
  const qMap = useMemo(() => new Map(questions.map(q => [q.id, q])), [questions])

  const togglePerson = (id: string) => {
    const next = new Set(expandedPersons)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpandedPersons(next)
  }

  if (responses.length === 0) {
    return (
      <div className="card text-center py-12">
        <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">{t('debrief.noResponses')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {responses.map(r => {
        const isExpanded = expandedPersons.has(r.id)
        const displayName = isHe
          ? (r.user.name_he || r.user.name || r.user.username || r.user.email)
          : (r.user.name_en || r.user.name || r.user.username || r.user.email)
        const panelId = `person-${r.id}-answers`

        return (
          <div key={r.id} className="card overflow-hidden">
            <button
              onClick={() => togglePerson(r.id)}
              aria-expanded={isExpanded}
              aria-controls={panelId}
              className="w-full flex items-center gap-3 p-4 text-start hover:bg-gray-50 transition-colors"
            >
              {r.user.avatar_url ? (
                <img src={r.user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 text-sm font-medium">
                  {(displayName || '?')[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                <p className="text-xs text-gray-400">
                  {new Date(r.submitted_at).toLocaleDateString(isHe ? 'he-IL' : 'en-US')}
                </p>
              </div>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {isExpanded && (
              <div id={panelId} className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                {r.answers.map(a => {
                  const q = qMap.get(a.question_id)
                  if (!q) return null
                  return (
                    <div key={a.question_id} className="space-y-1">
                      <p className="text-xs font-medium text-gray-500">
                        {isHe ? q.question_he : q.question_en}
                      </p>
                      {q.type === 'rating' && (
                        <div className="flex gap-0.5" aria-label={`${a.value} / 5`}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= (a.value as number) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                      {q.type === 'text' && (
                        <p className="text-sm text-gray-700">{String(a.value || '-')}</p>
                      )}
                      {q.type === 'yesno' && (
                        <span className={`text-sm font-medium ${a.value ? 'text-teal-600' : 'text-red-500'}`}>
                          {a.value ? t('common.yes') : t('common.no')}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
