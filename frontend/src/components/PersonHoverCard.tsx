import { useState, useRef, useMemo, useLayoutEffect } from 'react'
import { useUsers } from '@/hooks/useUsers'
import { useContacts } from '@/hooks/useContacts'
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
      className={`relative inline-flex items-center gap-1.5 ${person ? 'cursor-default' : ''} ${className}`}
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
      {person ? (
        <Avatar src={person.avatar_url} name={person.name} size="xs" />
      ) : (
        <Avatar name={name} size="xs" />
      )}
      {name}
      {show && person && (
        <span
          ref={popupRef}
          className={`absolute z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-4 pointer-events-none whitespace-nowrap ${popupPos ? '' : 'invisible'} ${popupPos?.flipY ? 'bottom-full mb-1' : 'top-full mt-1'} ${popupPos?.flipX ? 'right-0' : 'left-0'}`}
        >
          <span className="flex items-center gap-3 mb-2">
            <Avatar src={person.avatar_url} name={person.name} size="lg" />
            <span className="flex flex-col">
              <span className="font-semibold text-sm text-gray-900">{person.name}</span>
              <span className="text-xs text-gray-400">{person.isUser ? 'Member' : 'Contact'}</span>
            </span>
          </span>
          {person.email && (
            <span className="block text-xs text-gray-600 mt-1">{person.email}</span>
          )}
          {person.phone && (
            <span className="block text-xs text-gray-600">{person.phone}</span>
          )}
          {person.role && (
            <span className="block text-xs text-gray-500 capitalize">{person.role}</span>
          )}
        </span>
      )}
    </span>
  )
}
