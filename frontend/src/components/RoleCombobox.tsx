import { useState, useRef, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'

const ROLE_KEYS_BY_CATEGORY: Record<string, string[]> = {
  worship: [
    'roles.acousticGuitar',
    'roles.electricGuitar',
    'roles.keys',
    'roles.keys',
    'roles.drums',
    'roles.bass',
    'roles.vocals',
    'roles.percussion',
    'roles.violin',
    'roles.cello',
  ],
  production: [
    'roles.soundTechnician',
    'roles.projection',
    'roles.host',
    'roles.lighting',
    'roles.camera',
    'roles.liveStream',
  ],
  logistics: [
    'roles.eventLead',
    'roles.venueLiaison',
    'roles.registration',
    'roles.hospitality',
  ],
}

function getRolesForTeam(teamName: string, t: (key: string) => string): string[] {
  const name = teamName.toLowerCase()
  const worshipName = t('teams.worshipTeam').toLowerCase()
  const productionName = t('teams.productionTeam').toLowerCase()
  const logisticsName = t('teams.logisticsTeam').toLowerCase()

  let keys: string[]
  if (name.includes('worship') || name.includes(worshipName)) keys = ROLE_KEYS_BY_CATEGORY.worship
  else if (name.includes('production') || name.includes(productionName)) keys = ROLE_KEYS_BY_CATEGORY.production
  else if (name.includes('logistics') || name.includes(logisticsName)) keys = ROLE_KEYS_BY_CATEGORY.logistics
  else keys = [...ROLE_KEYS_BY_CATEGORY.worship, ...ROLE_KEYS_BY_CATEGORY.production, ...ROLE_KEYS_BY_CATEGORY.logistics]

  // Deduplicate (Keys#2 maps to same key as Keys)
  return [...new Set(keys.map(k => t(k)))]
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
  placeholder,
  className = 'input text-sm',
}: RoleComboboxProps) {
  const { t } = useTranslation()
  const resolvedPlaceholder = placeholder ?? t('roleCombobox.placeholder')
  const [inputValue, setInputValue] = useState(value)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Build suggestions: category-filtered presets + any custom roles already used in this team
  const allRoles = useMemo(() => {
    const presets = getRolesForTeam(teamName, t)
    const set = new Set(presets)
    existingRoles.forEach(r => { if (r.trim()) set.add(r.trim()) })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [teamName, existingRoles, t])

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
        placeholder={resolvedPlaceholder}
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
