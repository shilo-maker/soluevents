import { Check, X, Clock } from 'lucide-react'
import type { InvitationStatus } from '@/types'

const config = {
  pending: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Pending' },
  confirmed: { icon: Check, color: 'text-green-600', bg: 'bg-green-50', label: 'Confirmed' },
  declined: { icon: X, color: 'text-red-500', bg: 'bg-red-50', label: 'Declined' },
} as const

export default function InvitationStatusBadge({ status }: { status: InvitationStatus }) {
  const { icon: Icon, color, bg, label } = config[status] || config.pending
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
