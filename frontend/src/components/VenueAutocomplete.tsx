import { useState, useRef, useEffect, useMemo } from 'react'
import { useVenues, useCreateVenue } from '@/hooks/useVenues'
import { MapPin, Plus } from 'lucide-react'
import type { Venue } from '@/types'

interface VenueAutocompleteProps {
  value: string
  venueId?: string
  onChange: (name: string, address: string, venueId?: string) => void
  placeholder?: string
  className?: string
}

export default function VenueAutocomplete({
  value,
  venueId,
  onChange,
  placeholder = 'Search venues...',
  className = 'input',
}: VenueAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { data: venues } = useVenues()
  const createVenue = useCreateVenue()

  // Filter venues based on input
  const filtered = useMemo(() => {
    if (!inputValue.trim() || !venues) return []
    return venues.filter(v =>
      v.name.toLowerCase().includes(inputValue.toLowerCase()) ||
      v.address?.toLowerCase().includes(inputValue.toLowerCase())
    )
  }, [inputValue, venues])

  // Check if there's an exact match
  const exactMatch = filtered.some(
    v => v.name.toLowerCase() === inputValue.trim().toLowerCase()
  )

  // Total items in dropdown (filtered + optional "create new")
  const totalItems = filtered.length + (!exactMatch && inputValue.trim() ? 1 : 0)

  // Sync external value
  useEffect(() => {
    setInputValue(value)
  }, [value])

  // Click-outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (venue: Venue) => {
    setInputValue(venue.name)
    setShowDropdown(false)
    setSelectedIndex(-1)
    onChange(venue.name, venue.address || '', venue.id)
  }

  const handleCreateNew = async () => {
    if (!inputValue.trim()) return
    try {
      const newVenue = await createVenue.mutateAsync({ name: inputValue.trim() })
      setShowDropdown(false)
      setSelectedIndex(-1)
      onChange(newVenue.name, newVenue.address || '', newVenue.id)
    } catch (err) {
      console.error('Failed to create venue:', err)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setShowDropdown(newValue.trim().length > 0)
    setSelectedIndex(-1)
    // Clear venue link when typing freely
    onChange(newValue, '', undefined)
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
        } else if (selectedIndex === filtered.length && !exactMatch) {
          handleCreateNew()
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
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (inputValue.trim()) setShowDropdown(true)
          }}
          placeholder={placeholder}
          className={`${className} ${venueId ? 'pr-8' : ''}`}
        />
        {venueId && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2" title="Linked Venue">
            <MapPin className="h-5 w-5 text-green-600" />
          </div>
        )}
      </div>

      {showDropdown && totalItems > 0 && (
        <div className="absolute z-50 w-full mt-0 bg-white border border-gray-300 rounded-b-lg shadow-lg max-h-60 overflow-y-auto">
          {filtered.map((venue, index) => (
            <button
              key={venue.id}
              type="button"
              onClick={() => handleSelect(venue)}
              className={`w-full text-left px-4 py-2 hover:bg-purple-50 transition-colors ${
                index === selectedIndex ? 'bg-purple-50' : ''
              }`}
            >
              <span className="font-semibold text-sm text-gray-900">{venue.name}</span>
              {venue.address && (
                <div className="text-xs text-gray-500 truncate">{venue.address}</div>
              )}
            </button>
          ))}

          {!exactMatch && inputValue.trim() && (
            <button
              type="button"
              onClick={handleCreateNew}
              disabled={createVenue.isPending}
              className={`w-full text-left px-4 py-2 hover:bg-green-50 transition-colors border-t ${
                selectedIndex === filtered.length ? 'bg-green-50' : ''
              }`}
            >
              <div className="flex items-center gap-2 text-green-700">
                <Plus className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {createVenue.isPending ? 'Creating...' : `Create venue "${inputValue.trim()}"`}
                </span>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
