import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md'
}

export default function Badge({ children, variant = 'default', size = 'md' }: BadgeProps) {
  const variantClasses = {
    default: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border border-gray-300',
    primary: 'bg-gradient-to-r from-teal-100 to-cyan-100 text-teal-700 border border-teal-300',
    success: 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-300',
    warning: 'bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 border border-orange-300',
    danger: 'bg-gradient-to-r from-red-100 to-pink-100 text-red-700 border border-red-300',
    info: 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border border-blue-300',
  }

  const sizeClasses = {
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold shadow-sm',
        variantClasses[variant],
        sizeClasses[size]
      )}
    >
      {children}
    </span>
  )
}
