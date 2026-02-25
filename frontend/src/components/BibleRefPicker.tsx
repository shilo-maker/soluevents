import { useMemo } from 'react'

export interface BibleRef {
  book: string
  chapter: number | null
  verseStart: number | null
  verseEnd: number | null
}

const BIBLE_BOOKS: { name: string; chapters: number }[] = [
  // Old Testament
  { name: 'Genesis', chapters: 50 },
  { name: 'Exodus', chapters: 40 },
  { name: 'Leviticus', chapters: 27 },
  { name: 'Numbers', chapters: 36 },
  { name: 'Deuteronomy', chapters: 34 },
  { name: 'Joshua', chapters: 24 },
  { name: 'Judges', chapters: 21 },
  { name: 'Ruth', chapters: 4 },
  { name: '1 Samuel', chapters: 31 },
  { name: '2 Samuel', chapters: 24 },
  { name: '1 Kings', chapters: 22 },
  { name: '2 Kings', chapters: 25 },
  { name: '1 Chronicles', chapters: 29 },
  { name: '2 Chronicles', chapters: 36 },
  { name: 'Ezra', chapters: 10 },
  { name: 'Nehemiah', chapters: 13 },
  { name: 'Esther', chapters: 10 },
  { name: 'Job', chapters: 42 },
  { name: 'Psalms', chapters: 150 },
  { name: 'Proverbs', chapters: 31 },
  { name: 'Ecclesiastes', chapters: 12 },
  { name: 'Song of Solomon', chapters: 8 },
  { name: 'Isaiah', chapters: 66 },
  { name: 'Jeremiah', chapters: 52 },
  { name: 'Lamentations', chapters: 5 },
  { name: 'Ezekiel', chapters: 48 },
  { name: 'Daniel', chapters: 12 },
  { name: 'Hosea', chapters: 14 },
  { name: 'Joel', chapters: 3 },
  { name: 'Amos', chapters: 9 },
  { name: 'Obadiah', chapters: 1 },
  { name: 'Jonah', chapters: 4 },
  { name: 'Micah', chapters: 7 },
  { name: 'Nahum', chapters: 3 },
  { name: 'Habakkuk', chapters: 3 },
  { name: 'Zephaniah', chapters: 3 },
  { name: 'Haggai', chapters: 2 },
  { name: 'Zechariah', chapters: 14 },
  { name: 'Malachi', chapters: 4 },
  // New Testament
  { name: 'Matthew', chapters: 28 },
  { name: 'Mark', chapters: 16 },
  { name: 'Luke', chapters: 24 },
  { name: 'John', chapters: 21 },
  { name: 'Acts', chapters: 28 },
  { name: 'Romans', chapters: 16 },
  { name: '1 Corinthians', chapters: 16 },
  { name: '2 Corinthians', chapters: 13 },
  { name: 'Galatians', chapters: 6 },
  { name: 'Ephesians', chapters: 6 },
  { name: 'Philippians', chapters: 4 },
  { name: 'Colossians', chapters: 4 },
  { name: '1 Thessalonians', chapters: 5 },
  { name: '2 Thessalonians', chapters: 3 },
  { name: '1 Timothy', chapters: 6 },
  { name: '2 Timothy', chapters: 4 },
  { name: 'Titus', chapters: 3 },
  { name: 'Philemon', chapters: 1 },
  { name: 'Hebrews', chapters: 13 },
  { name: 'James', chapters: 5 },
  { name: '1 Peter', chapters: 5 },
  { name: '2 Peter', chapters: 3 },
  { name: '1 John', chapters: 5 },
  { name: '2 John', chapters: 1 },
  { name: '3 John', chapters: 1 },
  { name: 'Jude', chapters: 1 },
  { name: 'Revelation', chapters: 22 },
]

export function parseBibleRef(ref: string | BibleRef | undefined | null): BibleRef {
  if (!ref) return { book: '', chapter: null, verseStart: null, verseEnd: null }
  if (typeof ref === 'object' && 'book' in ref) return ref

  // Parse string like "Genesis 1:1-3" or "Psalms 23"
  const str = String(ref).trim()
  if (!str) return { book: '', chapter: null, verseStart: null, verseEnd: null }

  // Match "Book Chapter:VerseStart-VerseEnd"
  const match = str.match(/^(.+?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/)
  if (match) {
    return {
      book: match[1],
      chapter: parseInt(match[2]),
      verseStart: match[3] ? parseInt(match[3]) : null,
      verseEnd: match[4] ? parseInt(match[4]) : null,
    }
  }

  // Just a book name
  const bookMatch = BIBLE_BOOKS.find((b) => str.startsWith(b.name))
  if (bookMatch) return { book: bookMatch.name, chapter: null, verseStart: null, verseEnd: null }

  return { book: '', chapter: null, verseStart: null, verseEnd: null }
}

export function formatBibleRef(ref: BibleRef): string {
  if (!ref.book) return ''
  let s = ref.book
  if (ref.chapter != null) {
    s += ` ${ref.chapter}`
    if (ref.verseStart != null) {
      s += `:${ref.verseStart}`
      if (ref.verseEnd != null && ref.verseEnd !== ref.verseStart) {
        s += `-${ref.verseEnd}`
      }
    }
  }
  return s
}

interface BibleRefPickerProps {
  value: string | BibleRef | undefined | null
  onChange: (formatted: string, ref: BibleRef) => void
  className?: string
}

export default function BibleRefPicker({ value, onChange, className }: BibleRefPickerProps) {
  const ref = useMemo(() => parseBibleRef(value), [value])

  const selectedBook = BIBLE_BOOKS.find((b) => b.name === ref.book)
  const chapterCount = selectedBook?.chapters || 0

  const update = (partial: Partial<BibleRef>) => {
    const next = { ...ref, ...partial }
    onChange(formatBibleRef(next), next)
  }

  return (
    <div className={`flex gap-1.5 items-center ${className || ''}`}>
      <select
        value={ref.book}
        onChange={(e) => update({ book: e.target.value, chapter: null, verseStart: null, verseEnd: null })}
        className="input text-xs w-32"
      >
        <option value="">Book</option>
        <optgroup label="Old Testament">
          {BIBLE_BOOKS.slice(0, 39).map((b) => (
            <option key={b.name} value={b.name}>{b.name}</option>
          ))}
        </optgroup>
        <optgroup label="New Testament">
          {BIBLE_BOOKS.slice(39).map((b) => (
            <option key={b.name} value={b.name}>{b.name}</option>
          ))}
        </optgroup>
      </select>

      {ref.book && (
        <select
          value={ref.chapter ?? ''}
          onChange={(e) => {
            const ch = e.target.value ? parseInt(e.target.value) : null
            update({ chapter: ch, verseStart: null, verseEnd: null })
          }}
          className="input text-xs w-15"
        >
          <option value="">Ch.</option>
          {Array.from({ length: chapterCount }, (_, i) => i + 1).map((ch) => (
            <option key={ch} value={ch}>{ch}</option>
          ))}
        </select>
      )}

      {ref.chapter != null && (
        <>
          <input
            type="number"
            min={1}
            value={ref.verseStart ?? ''}
            onChange={(e) => {
              const v = e.target.value ? parseInt(e.target.value) : null
              update({ verseStart: v })
            }}
            className="input text-xs w-13"
            placeholder="v."
          />
          <span className="text-gray-400 text-xs">-</span>
          <input
            type="number"
            min={ref.verseStart || 1}
            value={ref.verseEnd ?? ''}
            onChange={(e) => {
              const v = e.target.value ? parseInt(e.target.value) : null
              update({ verseEnd: v })
            }}
            className="input text-xs w-13"
            placeholder="to"
          />
        </>
      )}
    </div>
  )
}
