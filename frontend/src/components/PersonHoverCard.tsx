import { useState, useRef, useMemo, useLayoutEffect } from 'react'
import { useUsers } from '@/hooks/useUsers'
import { useContacts } from '@/hooks/useContacts'
import { Shield } from 'lucide-react'
import Avatar from './Avatar'

interface PersonHoverCardProps {
  name: string
  contactId?: string
  isUser?: boolean
  className?: string
}

export default function PersonHoverCard({
  name,
  contactId,
  className = '',
}: PersonHoverCardProps) {
  const [show, setShow] = useState(false)
  const [popupPos, setPopupPos] = useState<{ flipY: boolean; flipX: boolean } | null>(null)
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const popupRef = useRef<HTMLSpanElement>(null)
  const { data: users } = useUsers()
  const { data: contacts } = useContacts()

  const person = useMemo(() => {
    if (!contactId) return null
    const u = users?.find(u => u.id === contactId)
    if (u) return { name: u.name, email: u.email, role: u.org_role, phone: undefined as string | undefined, avatar_url: u.avatar_url, isUser: true }
    const c = contacts?.find(c => c.id === contactId)
    if (c) return { name: c.name, email: c.email, phone: c.phone, role: c.role, avatar_url: undefined as string | undefined, isUser: false }
    return null
  }, [contactId, users, contacts])

  useLayoutEffect(() => {
    if (!show || !popupRef.current) return
    const parent = popupRef.current.parentElement
    if (!parent) return
    const triggerRect = parent.getBoundingClientRect()
    const popupRect = popupRef.current.getBoundingClientRect()
    setPopupPos({
      flipY: triggerRect.bottom + popupRect.height + 4 > window.innerHeight,
      flipX: triggerRect.left + popupRect.width > window.innerWidth - 8,
    })
  }, [show])

  if (!name) return null

  return (
    <span
      className={`relative inline-flex items-center gap-1 ${person ? 'cursor-default' : ''} ${className}`}
      onMouseEnter={() => {
        if (person) {
          timeout.current = setTimeout(() => { setPopupPos(null); setShow(true) }, 400)
        }
      }}
      onMouseLeave={() => {
        if (timeout.current) clearTimeout(timeout.current)
        setShow(false)
      }}
    >
      {name}
      {person && (
        <span className="inline-flex items-center" title={person.isUser ? 'Member' : 'Contact'}>
          {person.isUser ? (
            <Shield className="h-3.5 w-3.5 text-purple-600" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          )}
        </span>
      )}
      {show && person && (
        <span
          ref={popupRef}
          className={`absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 pointer-events-none whitespace-nowrap ${popupPos ? '' : 'invisible'} ${popupPos?.flipY ? 'bottom-full mb-1' : 'top-full mt-1'} ${popupPos?.flipX ? 'right-0' : 'left-0'}`}
        >
          <span className="flex items-center gap-2 mb-1">
            <Avatar src={person.avatar_url} name={person.name} size="sm" />
            <span className="font-semibold text-sm text-gray-900">{person.name}</span>
            <span className="text-xs text-gray-400">{person.isUser ? 'Member' : 'Contact'}</span>
          </span>
          {person.email && (
            <span className="block text-xs text-gray-600 ml-6">{person.email}</span>
          )}
          {person.phone && (
            <span className="block text-xs text-gray-600 ml-6">{person.phone}</span>
          )}
          {person.role && (
            <span className="block text-xs text-gray-500 ml-6 capitalize">{person.role}</span>
          )}
        </span>
      )}
    </span>
  )
}
