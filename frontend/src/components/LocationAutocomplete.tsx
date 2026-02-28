import { useRef, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useJsApiLoader } from '@react-google-maps/api'

const libraries: ('places')[] = ['places']

interface LocationAutocompleteProps {
  value: string
  onChange: (address: string, placeDetails?: google.maps.places.PlaceResult) => void
  placeholder?: string
  className?: string
}

export default function LocationAutocomplete({
  value,
  onChange,
  placeholder,
  className = 'input',
}: LocationAutocompleteProps) {
  const { t } = useTranslation()
  const resolvedPlaceholder = placeholder ?? t('autocomplete.searchLocations')
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [inputValue, setInputValue] = useState(value)

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  })

  // Sync external value to input
  useEffect(() => {
    setInputValue(value)
  }, [value])

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return

    // Initialize autocomplete
    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['establishment', 'geocode'],
      fields: ['formatted_address', 'name', 'geometry', 'place_id', 'address_components'],
    })

    // Listen for place selection
    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace()
      if (place && place.formatted_address) {
        setInputValue(place.formatted_address)
        onChange(place.formatted_address, place)
      }
    })

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }
    }
  }, [isLoaded, onChange])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    // Don't call onChange here - only when a place is selected from dropdown
  }

  if (!isLoaded) {
    return (
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        placeholder={resolvedPlaceholder}
        className={className}
      />
    )
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={inputValue}
      onChange={handleChange}
      placeholder={resolvedPlaceholder}
      className={className}
    />
  )
}
