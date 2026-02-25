import { useState, useRef, useEffect, useMemo } from 'react'
import { Plus } from 'lucide-react'

const ROLES_BY_CATEGORY: Record<string, string[]> = {
  worship: [
    'Acoustic Guitar',
    'Electric Guitar',
    'Keys',
    'Keys#2',
    'Drums',
    'Bass',
    'Vocals',
    'Percussion',
    'Violin',
    'Cello',
  ],
  production: [
    'Sound Technician',
    'Projection',
    'Host',
    'Lighting',
    'Camera',
    'Live Stream',
  ],
  logistics: [
    'Event Lead',
    'Venue Liaison',
    'Registration',
    'Hospitality',
  ],
}

function getRolesForTeam(teamName: string): string[] {
  const name = teamName.toLowerCase()
  if (name.includes('worship')) return ROLES_BY_CATEGORY.worship
  if (name.includes('production')) return ROLES_BY_CATEGORY.production
  if (name.includes('logistics')) return ROLES_BY_CATEGORY.logistics
  // Unknown team — show all roles
  return [...ROLES_BY_CATEGORY.worship, ...ROLES_BY_CATEGORY.production, ...ROLES_BY_CATEGORY.logistics]
}

interface RoleComboboxProps {
  value: string
  onChange: (value: string) => void
  teamName?: string
  existingRoles?: string[]
  placeholder?: string
  className?: string
}

export default function RoleCombobox({
  value,
  onChange,
  teamName = '',
  existingRoles = [],
  placeholder = 'Select or type role...',
  className = 'input text-sm',
}: RoleComboboxProps) {
  const [inputValue, setInputValue] = useState(value)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Build suggestions: category-filtered presets + any custom roles already used in this team
  const allRoles = useMemo(() => {
    const presets = getRolesForTeam(teamName)
    const set = new Set(presets)
    existingRoles.forEach(r => { if (r.trim()) set.add(r.trim()) })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [teamName, existingRoles])

  const filtered = useMemo(() => {
    if (!inputValue.trim()) return allRoles
    return allRoles.filter(r =>
      r.toLowerCase().includes(inputValue.toLowerCase())
    )
  }, [inputValue, allRoles])

  const exactMatch = filtered.some(
    r => r.toLowerCase() === inputValue.trim().toLowerCase()
  )
  const showCreateOption = !exactMatch && inputValue.trim().length > 0
  const totalItems = filtered.length + (showCreateOption ? 1 : 0)

  useEffect(() => {
    setInputValue(value)
  }, [value])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (role: string) => {
    setInputValue(role)
    setShowDropdown(false)
    setSelectedIndex(-1)
    onChange(role)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setShowDropdown(true)
    setSelectedIndex(-1)
    onChange(newValue)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || totalItems === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev < totalItems - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < filtered.length) {
          handleSelect(filtered[selectedIndex])
        } else if (selectedIndex === filtered.length && showCreateOption) {
          handleSelect(inputValue.trim())
        }
        break
      case 'Escape':
        setShowDropdown(false)
        setSelectedIndex(-1)
        break
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setShowDropdown(true)}
        placeholder={placeholder}
        className={className}
      />

      {showDropdown && totalItems > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((role, index) => (
            <button
              key={role}
              type="button"
              onClick={() => handleSelect(role)}
              className={`w-full text-left px-4 py-1.5 text-sm hover:bg-teal-50 transition-colors ${
                index === selectedIndex ? 'bg-teal-50' : ''
              }`}
            >
              {role}
            </button>
          ))}

          {showCreateOption && (
            <button
              type="button"
              onClick={() => handleSelect(inputValue.trim())}
              className={`w-full text-left px-4 py-1.5 hover:bg-green-50 transition-colors border-t ${
                selectedIndex === filtered.length ? 'bg-green-50' : ''
              }`}
            >
              <div className="flex items-center gap-2 text-green-700">
                <Plus className="h-3.5 w-3.5" />
                <span className="text-sm font-medium">"{inputValue.trim()}"</span>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
