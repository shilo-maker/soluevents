import { getInitials, getAvatarColor } from '@/lib/imageUtils'

interface AvatarProps {
  src?: string | null
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-xl',
}

export default function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const sizeClasses = sizeMap[size]

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizeClasses} rounded-full object-cover shrink-0 ${className}`}
      />
    )
  }

  const initials = getInitials(name || '?')
  const bg = getAvatarColor(name || '?')

  return (
    <div
      className={`${sizeClasses} rounded-full flex items-center justify-center font-bold text-white shrink-0 ${className}`}
      style={{ backgroundColor: bg }}
      title={name}
    >
      {initials}
    </div>
  )
}
