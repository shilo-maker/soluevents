import { format, formatDistanceToNow, isAfter, isBefore, addDays } from 'date-fns'
import { he } from 'date-fns/locale/he'
import { enUS } from 'date-fns/locale/en-US'
import i18n from '@/i18n'

function getDateLocale() {
  return i18n.language === 'he' ? he : enUS
}

export function formatDate(date: string | Date, formatStr: string = 'PPP') {
  return format(new Date(date), formatStr, { locale: getDateLocale() })
}

export function formatDateTime(date: string | Date) {
  return format(new Date(date), 'PPP HH:mm', { locale: getDateLocale() })
}

export function formatRelativeTime(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: getDateLocale() })
}

export function isUpcoming(date: string | Date) {
  return isAfter(new Date(date), new Date())
}

export function isPast(date: string | Date) {
  return isBefore(new Date(date), new Date())
}

export function isWithinDays(date: string | Date, days: number) {
  const targetDate = new Date(date)
  const today = new Date()
  const maxDate = addDays(today, days)
  return isAfter(targetDate, today) && isBefore(targetDate, maxDate)
}

export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
