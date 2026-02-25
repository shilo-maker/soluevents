import { useState, useRef, useEffect } from 'react'
import { searchSongs, SoluFlowSong } from '@/lib/soluflowApi'
import { Music } from 'lucide-react'

interface SongAutocompleteProps {
  value: string
  onChange: (title: string, song?: SoluFlowSong) => void
  soluflowSongId?: number  // Track if current value is linked to SoluFlow
  placeholder?: string
  className?: string
}

export default function SongAutocomplete({
  value,
  onChange,
  soluflowSongId,
  placeholder = 'Search SoluFlow songs...',
  className = 'input',
}: SongAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<SoluFlowSong[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Call onChange with just the text (no song data) when typing
    onChange(newValue, undefined)

    // Don't search if input is too short
    if (!newValue.trim() || newValue.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      setLoading(false)
      return
    }

    // Debounce search
    setLoading(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchSongs(newValue, 10)
        setSuggestions(results)
        setShowSuggestions(results.length > 0)
        setSelectedIndex(-1)
      } catch (error) {
        console.error('Error searching songs:', error)
        setSuggestions([])
        setShowSuggestions(false)
      } finally {
        setLoading(false)
      }
    }, 300) // 300ms debounce
  }

  const handleSelectSong = (song: SoluFlowSong) => {
    setInputValue(song.title)
    setShowSuggestions(false)
    setSelectedIndex(-1)
    setSuggestions([])
    onChange(song.title, song)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0) {
          handleSelectSong(suggestions[selectedIndex])
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
            if (inputValue.trim().length >= 2 && suggestions.length > 0) {
              setShowSuggestions(true)
            }
          }}
          placeholder={placeholder}
          className={`${className} ${soluflowSongId ? 'pr-8' : ''}`}
        />
        {soluflowSongId && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2" title="Linked to SoluFlow">
            <Music className="h-5 w-5 text-blue-600" />
          </div>
        )}
      </div>

      {loading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg px-4 py-3 text-sm text-gray-600">
          Searching SoluFlow...
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((song, index) => (
            <button
              key={song.id}
              type="button"
              onClick={() => handleSelectSong(song)}
              className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                index === selectedIndex ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Music className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span className="font-semibold text-sm text-gray-900">{song.title}</span>
                  </div>
                  {song.authors && (
                    <div className="text-xs text-gray-600 mt-0.5 ml-6">{song.authors}</div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 ml-6">
                    {song.key && <span className="font-medium">{song.key}</span>}
                    {song.bpm && (
                      <>
                        {song.key && <span>•</span>}
                        <span>{song.bpm} BPM</span>
                      </>
                    )}
                    {song.workspace && (
                      <>
                        {(song.key || song.bpm) && <span>•</span>}
                        <span className="truncate">{song.workspace}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {!loading && showSuggestions && suggestions.length === 0 && inputValue.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg px-4 py-3 text-sm text-gray-500">
          No songs found in SoluFlow
        </div>
      )}
    </div>
  )
}
