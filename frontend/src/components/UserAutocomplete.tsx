import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useUsers } from '@/hooks/useUsers'
import type { User } from '@/types'

interface UserAutocompleteProps {
  value: string
  onChange: (name: string, userId?: string) => void
  userId?: string  // Track if current value is a linked user
  placeholder?: string
  className?: string
}

export default function UserAutocomplete({
  value,
  onChange,
  userId,
  placeholder,
  className = 'input',
}: UserAutocompleteProps) {
  const { t } = useTranslation()
  const resolvedPlaceholder = placeholder ?? t('autocomplete.searchUsers')
  const [inputValue, setInputValue] = useState(value)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { data: users } = useUsers()

  // Sync external value to input
  useEffect(() => {
    setInputValue(value)
  }, [value])

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)

    // Filter users based on input
    if (newValue.trim() && users) {
      const filtered = users.filter(user =>
        user.name.toLowerCase().includes(newValue.toLowerCase()) ||
        user.email.toLowerCase().includes(newValue.toLowerCase())
      )
      setFilteredUsers(filtered)
      setShowSuggestions(filtered.length > 0)
      setSelectedIndex(-1)
    } else {
      setFilteredUsers([])
      setShowSuggestions(false)
    }

    // Call onChange with just the text (no user ID) when typing
    onChange(newValue, undefined)
  }

  const handleSelectUser = (user: User) => {
    setInputValue(user.name)
    setShowSuggestions(false)
    setSelectedIndex(-1)
    onChange(user.name, user.id)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || filteredUsers.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev =>
          prev < filteredUsers.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0) {
          handleSelectUser(filteredUsers[selectedIndex])
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
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (inputValue.trim() && filteredUsers.length > 0) {
              setShowSuggestions(true)
            }
          }}
          placeholder={resolvedPlaceholder}
          className={`${className} ${userId ? 'pr-8' : ''}`}
        />
        {userId && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-green-600" title={t('contacts.registeredUser')}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {showSuggestions && filteredUsers.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredUsers.map((user, index) => (
            <button
              key={user.id}
              type="button"
              onClick={() => handleSelectUser(user)}
              className={`w-full text-left px-4 py-2 hover:bg-teal-50 transition-colors ${
                index === selectedIndex ? 'bg-teal-50' : ''
              }`}
            >
              <div className="font-semibold text-sm text-gray-900">{user.name}</div>
              <div className="text-xs text-gray-500">{user.email}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
