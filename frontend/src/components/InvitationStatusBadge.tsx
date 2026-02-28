import { useTranslation } from 'react-i18next'
import { Check, X, Clock } from 'lucide-react'
import type { InvitationStatus } from '@/types'

const config = {
  pending: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', labelKey: 'invitationBadge.pending' },
  confirmed: { icon: Check, color: 'text-green-600', bg: 'bg-green-50', labelKey: 'invitationBadge.confirmed' },
  declined: { icon: X, color: 'text-red-500', bg: 'bg-red-50', labelKey: 'invitationBadge.declined' },
} as const

export default function InvitationStatusBadge({ status }: { status: InvitationStatus }) {
  const { t } = useTranslation()
  const { icon: Icon, color, bg, labelKey } = config[status] || config.pending
  const label = t(labelKey)
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium ${color} ${bg}`}
      title={label}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}
