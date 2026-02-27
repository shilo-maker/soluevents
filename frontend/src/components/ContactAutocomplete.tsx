import { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react'
import { useUsers } from '@/hooks/useUsers'
import { useContacts, useCreateContact, useUpdateContactById } from '@/hooks/useContacts'
import { Shield, Plus, Check, X, Pencil } from 'lucide-react'

interface ContactAutocompleteProps {
  value: string
  onChange: (name: string, contactId?: string, isUser?: boolean) => void
  contactId?: string
  isUser?: boolean
  placeholder?: string
  className?: string
  freeTextOnly?: boolean
}

type ContactSuggestion = {
  id: string
  name: string
  email?: string
  phone?: string
  role?: string
  isUser: boolean
}

export default function ContactAutocomplete({
  value,
  onChange,
  contactId,
  isUser = false,
  placeholder = 'Enter name...',
  className = 'input',
  freeTextOnly = false,
}: ContactAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [showHoverCard, setShowHoverCard] = useState(false)
  const [hoverPos, setHoverPos] = useState<{ flipY: boolean } | null>(null)
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hoverRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { data: users } = useUsers()
  const { data: contacts } = useContacts()
  const createContact = useCreateContact()
  const updateContact = useUpdateContactById()

  // Combine users and contacts into a unified list
  const allContacts = useMemo<ContactSuggestion[]>(() => {
    const userSuggestions: ContactSuggestion[] = users?.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.org_role,
      isUser: true,
    })) || []

    const contactSuggestions: ContactSuggestion[] = contacts?.map(contact => ({
      id: contact.id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      role: contact.role,
      isUser: false,
    })) || []

    return [...userSuggestions, ...contactSuggestions].sort((a, b) =>
      a.name.localeCompare(b.name)
    )
  }, [users, contacts])

  // Find the currently linked contact's details
  const linkedContact = useMemo(() => {
    if (!contactId) return null
    return allContacts.find(c => c.id === contactId) || null
  }, [contactId, allContacts])

  // Filter contacts based on input
  const filteredContacts = useMemo(() => {
    if (allContacts.length === 0) return []
    if (!inputValue.trim()) return allContacts
    return allContacts.filter(contact =>
      contact.name.toLowerCase().includes(inputValue.toLowerCase()) ||
      contact.email?.toLowerCase().includes(inputValue.toLowerCase()) ||
      contact.role?.toLowerCase().includes(inputValue.toLowerCase())
    )
  }, [inputValue, allContacts])

  const exactMatch = filteredContacts.some(
    c => c.name.toLowerCase() === inputValue.trim().toLowerCase()
  )
  const showCreateOption = !freeTextOnly && !exactMatch && inputValue.trim().length > 0
  const showAddContactOption = freeTextOnly && !exactMatch && inputValue.trim().length > 0
  const totalItems = filteredContacts.length + (showCreateOption || showAddContactOption ? 1 : 0)

  useEffect(() => {
    setInputValue(value)
  }, [value])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
        setShowCreateForm(false)
        setShowEditForm(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useLayoutEffect(() => {
    if (!showHoverCard || !hoverRef.current) return
    const parent = hoverRef.current.parentElement
    if (!parent) return
    const parentRect = parent.getBoundingClientRect()
    const hoverRect = hoverRef.current.getBoundingClientRect()
    setHoverPos({
      flipY: parentRect.bottom + hoverRect.height + 4 > window.innerHeight,
    })
  }, [showHoverCard])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setShowSuggestions(true)
    setSelectedIndex(-1)
    setShowCreateForm(false)
    setShowEditForm(false)
    onChange(newValue, undefined, false)
  }

  const handleSelectContact = (contact: ContactSuggestion) => {
    setInputValue(contact.name)
    setShowSuggestions(false)
    setSelectedIndex(-1)
    setShowCreateForm(false)
    onChange(contact.name, contact.id, contact.isUser)
  }

  const handleOpenCreateForm = () => {
    setShowCreateForm(true)
    setNewName(inputValue.trim())
    setNewEmail('')
    setNewPhone('')
  }

  const handleCancelCreate = () => {
    setShowCreateForm(false)
  }

  const handleConfirmCreate = async () => {
    const contactName = freeTextOnly ? newName.trim() : inputValue.trim()
    if (!contactName) return
    try {
      const data: { name: string; email?: string; phone?: string } = { name: contactName }
      if (newEmail.trim()) data.email = newEmail.trim()
      if (newPhone.trim()) data.phone = newPhone.trim()
      const newContact = await createContact.mutateAsync(data)
      setInputValue(newContact.name)
      setShowSuggestions(false)
      setShowCreateForm(false)
      setSelectedIndex(-1)
      onChange(newContact.name, newContact.id, false)
    } catch (err) {
      console.error('Failed to create contact:', err)
    }
  }

  const handleOpenEditForm = () => {
    setEditEmail(linkedContact?.email || '')
    setEditPhone(linkedContact?.phone || '')
    setShowEditForm(true)
    setShowSuggestions(false)
  }

  const handleCancelEdit = () => {
    setShowEditForm(false)
  }

  const handleConfirmEdit = async () => {
    if (!contactId || !linkedContact || linkedContact.isUser) return
    try {
      await updateContact.mutateAsync({
        id: contactId,
        data: {
          email: editEmail.trim() || undefined,
          phone: editPhone.trim() || undefined,
        },
      })
      setShowEditForm(false)
    } catch (err) {
      console.error('Failed to update contact:', err)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showCreateForm || showEditForm) return

    if (!showSuggestions || totalItems === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev < totalItems - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < filteredContacts.length) {
          handleSelectContact(filteredContacts[selectedIndex])
        } else if (selectedIndex === filteredContacts.length && (showCreateOption || showAddContactOption)) {
          handleOpenCreateForm()
        } else {
          setShowSuggestions(false)
          setSelectedIndex(-1)
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedIndex(-1)
        break
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div
        className="relative"
        onMouseEnter={() => {
          if (linkedContact && !showSuggestions && !showEditForm && !showCreateForm) {
            hoverTimeout.current = setTimeout(() => { setHoverPos(null); setShowHoverCard(true) }, 400)
          }
        }}
        onMouseLeave={() => {
          if (hoverTimeout.current) clearTimeout(hoverTimeout.current)
          setShowHoverCard(false)
        }}
      >
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (hoverTimeout.current) clearTimeout(hoverTimeout.current)
            setShowHoverCard(false)
            if (!showEditForm) setShowSuggestions(true)
          }}
          placeholder={placeholder}
          className={`${className} ${contactId ? 'pr-14' : ''}`}
        />
        {contactId && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {!isUser && !freeTextOnly && (
              <button
                type="button"
                onClick={handleOpenEditForm}
                className="text-gray-400 hover:text-teal-600 transition-colors"
                title="Edit contact info"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            <div title={isUser ? "Registered User" : "Contact"}>
              {isUser ? (
                <Shield className="h-5 w-5 text-purple-600" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </div>
        )}

        {/* Hover info card */}
        {showHoverCard && linkedContact && (
          <div
            ref={hoverRef}
            className={`absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-3 pointer-events-none ${hoverPos ? '' : 'invisible'} ${hoverPos?.flipY ? 'bottom-full mb-1' : 'mt-1'}`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              {linkedContact.isUser ? (
                <Shield className="h-4 w-4 text-purple-600 flex-shrink-0" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              )}
              <span className="font-semibold text-sm text-gray-900">{linkedContact.name}</span>
              <span className="text-xs text-gray-400">{linkedContact.isUser ? 'Member' : 'Contact'}</span>
            </div>
            {linkedContact.email && (
              <div className="text-xs text-gray-600 ml-6">{linkedContact.email}</div>
            )}
            {linkedContact.phone && (
              <div className="text-xs text-gray-600 ml-6">{linkedContact.phone}</div>
            )}
            {linkedContact.role && (
              <div className="text-xs text-gray-500 ml-6 capitalize">{linkedContact.role}</div>
            )}
          </div>
        )}
      </div>

      {/* Edit form */}
      {showEditForm && contactId && linkedContact && !linkedContact.isUser && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
          <div className="p-3">
            <div className="text-sm font-semibold text-gray-900 mb-3">
              Edit: {linkedContact.name}
            </div>
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="input text-sm"
                  placeholder="email@example.com"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleConfirmEdit() }
                    else if (e.key === 'Escape') handleCancelEdit()
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="input text-sm"
                  placeholder="+1 (555) 000-0000"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleConfirmEdit() }
                    else if (e.key === 'Escape') handleCancelEdit()
                  }}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleConfirmEdit}
                  disabled={updateContact.isPending}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                >
                  <Check className="h-3.5 w-3.5" />
                  {updateContact.isPending ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && !showEditForm && (totalItems > 0 || showCreateForm) && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {!showCreateForm && filteredContacts.map((contact, index) => (
            <button
              key={contact.id}
              type="button"
              onClick={() => handleSelectContact(contact)}
              className={`w-full text-left px-4 py-2 hover:bg-purple-50 transition-colors ${
                index === selectedIndex ? 'bg-purple-50' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-900">{contact.name}</span>
                    {contact.isUser && (
                      <Shield className="h-3 w-3 text-purple-600" />
                    )}
                  </div>
                  {contact.email && (
                    <div className="text-xs text-gray-500 truncate">{contact.email}</div>
                  )}
                  {contact.role && (
                    <div className="text-xs text-gray-500 capitalize truncate">{contact.role}</div>
                  )}
                </div>
              </div>
            </button>
          ))}

          {showCreateOption && !showCreateForm && (
            <button
              type="button"
              onClick={handleOpenCreateForm}
              className={`w-full text-left px-4 py-2 hover:bg-green-50 transition-colors border-t ${
                selectedIndex === filteredContacts.length ? 'bg-green-50' : ''
              }`}
            >
              <div className="flex items-center gap-2 text-green-700">
                <Plus className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Create contact "{inputValue.trim()}"
                </span>
              </div>
            </button>
          )}

          {showAddContactOption && !showCreateForm && (
            <button
              type="button"
              onClick={handleOpenCreateForm}
              className={`w-full text-left px-4 py-2 hover:bg-green-50 transition-colors ${filteredContacts.length > 0 ? 'border-t' : ''} ${
                selectedIndex === filteredContacts.length ? 'bg-green-50' : ''
              }`}
            >
              <div className="flex items-center gap-2 text-green-700">
                <Plus className="h-4 w-4" />
                <span className="text-sm font-medium">Add Contact</span>
              </div>
            </button>
          )}

          {showCreateForm && (
            <div className="p-3 border-t">
              {freeTextOnly ? (
                <div className="text-sm font-semibold text-gray-900 mb-3">New Contact</div>
              ) : (
                <div className="text-sm font-semibold text-gray-900 mb-3">
                  New contact: {inputValue.trim()}
                </div>
              )}
              <div className="space-y-2">
                {freeTextOnly && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Name</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="input text-sm"
                      placeholder="Full name"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); handleConfirmCreate() }
                        else if (e.key === 'Escape') handleCancelCreate()
                      }}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="input text-sm"
                    placeholder="email@example.com"
                    autoFocus={!freeTextOnly}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); handleConfirmCreate() }
                      else if (e.key === 'Escape') handleCancelCreate()
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="input text-sm"
                    placeholder="+1 (555) 000-0000"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); handleConfirmCreate() }
                      else if (e.key === 'Escape') handleCancelCreate()
                    }}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleConfirmCreate}
                    disabled={createContact.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {createContact.isPending ? 'Creating...' : 'Add'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelCreate}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
