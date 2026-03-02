import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Clock } from 'lucide-react'

interface TimeInputProps {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
}

// Generate time options in 15-minute intervals
const TIME_OPTIONS: string[] = []
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
}

const DROPDOWN_HEIGHT = 192 // max-h-48 = 12rem = 192px

/** 24-hour time input (HH:MM) with dropdown picker. Works regardless of OS locale. */
export default function TimeInput({ value, onChange, className = '', placeholder = 'HH:MM' }: TimeInputProps) {
  const [display, setDisplay] = useState(value)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setDisplay(value) }, [value])

  // Compute dropdown position from input's bounding rect
  const updatePos = useCallback(() => {
    if (!wrapRef.current) return
    const rect = wrapRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const openUp = spaceBelow < DROPDOWN_HEIGHT && rect.top > spaceBelow
    setPos({
      top: openUp ? rect.top - DROPDOWN_HEIGHT - 4 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    })
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node) &&
          listRef.current && !listRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const close = () => setOpen(false)
    document.addEventListener('mousedown', handle)
    window.addEventListener('scroll', close, true)
    return () => { document.removeEventListener('mousedown', handle); window.removeEventListener('scroll', close, true) }
  }, [open])

  // Position dropdown and scroll to value when opening
  useEffect(() => {
    if (!open) { setPos(null); return }
    updatePos()
  }, [open, updatePos])

  useEffect(() => {
    if (!open || !listRef.current || !value) return
    const idx = TIME_OPTIONS.findIndex(t => t >= value)
    const target = listRef.current.children[Math.max(0, idx - 2)] as HTMLElement
    if (target) listRef.current.scrollTop = target.offsetTop
  }, [open, value])

  const commit = (raw: string) => {
    const clean = raw.replace(/[^0-9:]/g, '')
    let h: number, m: number
    const coloned = clean.match(/^(\d{1,2}):(\d{1,2})$/)
    const plain = clean.match(/^(\d{2})(\d{2})$/)
    if (coloned) {
      h = parseInt(coloned[1]); m = parseInt(coloned[2])
    } else if (plain) {
      h = parseInt(plain[1]); m = parseInt(plain[2])
    } else {
      setDisplay(value)
      return
    }
    if (h > 23 || m > 59) { setDisplay(value); return }
    const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    setDisplay(formatted)
    onChange(formatted)
  }

  const pick = (time: string) => {
    setDisplay(time)
    onChange(time)
    setOpen(false)
  }

  return (
    <div className="relative" ref={wrapRef}>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          maxLength={5}
          value={display}
          placeholder={placeholder}
          className={className}
          onChange={(e) => {
            let v = e.target.value.replace(/[^0-9:]/g, '')
            if (v.length === 2 && !v.includes(':') && display.length < v.length) v += ':'
            setDisplay(v)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => commit(display)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { commit(display); setOpen(false) }
            if (e.key === 'Escape') setOpen(false)
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => { e.preventDefault(); setOpen(o => !o) }}
          className="absolute end-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
        >
          <Clock className="w-4 h-4" />
        </button>
      </div>
      {open && pos && createPortal(
        <div
          ref={listRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width }}
          className="z-50 max-h-48 overflow-y-auto bg-white rounded-xl shadow-lg border border-gray-200 py-1"
        >
          {TIME_OPTIONS.map(t => (
            <button
              key={t}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pick(t) }}
              className={`block w-full text-start px-3 py-1.5 text-sm hover:bg-teal-50 hover:text-teal-700 ${t === value ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-700'}`}
            >
              {t}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
