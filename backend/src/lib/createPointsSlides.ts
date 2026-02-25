// Server-side slide generation for prayer/sermon/announcements presentations.
// Ported from SoluCast's frontend createPointsSlides.js for direct DB writes.

import { randomUUID } from 'crypto'

const HEBREW_RE = /[\u0590-\u05FF]/

const BG_COLORS: Record<string, string> = {
  sermon: '#1a1a2e',
  prayer: '#000000',
  announcements: '#2d1f3d',
}

const SUBTITLE_PREFIXES: Record<string, string | null> = {
  sermon: null,        // uses numbering (1., 2., etc.)
  prayer: '\u2022 ',   // bullet point
  announcements: '',
}

interface TextBox {
  id: string
  text: string
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  bold: boolean
  italic: boolean
  underline: boolean
  opacity: number
  color: string
  backgroundColor: string
  textAlign: 'left' | 'center' | 'right'
  textDirection: 'ltr' | 'rtl'
  verticalAlign: 'top' | 'center' | 'bottom'
  zIndex: number
}

interface Slide {
  id: string
  order: number
  textBoxes: TextBox[]
  imageBoxes: never[]
  backgroundColor: string
}

interface BibleRef {
  reference: string
  englishText?: string
  hebrewText?: string
  hebrewReference?: string
}

interface SubtitleItem {
  subtitle: string
  subtitleTranslation?: string
  description: string
  descriptionTranslation?: string
  bibleRef?: BibleRef
}

export interface PointsSlidesData {
  type: 'sermon' | 'prayer' | 'announcements'
  title: string
  titleTranslation?: string
  subtitles: SubtitleItem[]
  generateTranslation?: boolean
}

const BASE_TEXT_BOX = {
  bold: false,
  italic: false,
  underline: false,
  opacity: 1,
  backgroundColor: 'transparent',
  color: '#ffffff',
}

function makeTextBox(overrides: Partial<TextBox>): TextBox {
  return { ...BASE_TEXT_BOX, ...overrides, id: randomUUID() } as TextBox
}

// ── Bilingual Layout ──

function buildBilingualTextBoxes(
  data: PointsSlidesData,
  item: SubtitleItem,
  subtitlePrefix: string
): TextBox[] {
  const textBoxes: TextBox[] = []
  const titleIsHebrew = HEBREW_RE.test(data.title)
  const subtitleIsHebrew = HEBREW_RE.test(item.subtitle)
  const hasBibleRef = !!item.bibleRef

  const titleY = 4
  const subtitleY = 14
  const bibleRefY = 24
  const bibleTextY = 32

  const addSide = (side: 'left' | 'right') => {
    const isRight = side === 'right'
    const x = isRight ? 52 : 2
    const textAlign = isRight ? 'right' : 'left' as const
    const textDirection = isRight ? 'rtl' : 'ltr' as const

    // Title
    const titleText =
      !isRight && titleIsHebrew
        ? data.titleTranslation || '[Title Translation]'
        : data.title

    textBoxes.push(
      makeTextBox({
        text: titleText,
        x, y: titleY, width: 46, height: 10, fontSize: 120,
        textAlign, textDirection, verticalAlign: 'center',
        bold: true, zIndex: 10,
      })
    )

    // Subtitle
    let subtitleText: string
    if (isRight) {
      subtitleText = subtitleIsHebrew
        ? `${subtitlePrefix}${item.subtitle}`
        : item.subtitleTranslation || `${subtitlePrefix}${item.subtitle}`
    } else {
      subtitleText = subtitleIsHebrew
        ? item.subtitleTranslation || `${subtitlePrefix}[Translation]`
        : `${subtitlePrefix}${item.subtitle}`
    }

    textBoxes.push(
      makeTextBox({
        text: subtitleText,
        x, y: subtitleY, width: 46, height: 8, fontSize: 90,
        textAlign, textDirection, verticalAlign: 'center',
        bold: false, zIndex: 9,
      })
    )

    // Bible reference + text
    if (hasBibleRef && item.bibleRef) {
      const ref = isRight
        ? item.bibleRef.hebrewReference || item.bibleRef.reference
        : item.bibleRef.reference
      const bibleText = isRight
        ? item.bibleRef.hebrewText || item.bibleRef.englishText || ''
        : item.bibleRef.englishText || item.bibleRef.hebrewText || ''

      textBoxes.push(
        makeTextBox({
          text: `\u{1F4D6} ${ref}`,
          x, y: bibleRefY, width: 46, height: 5, fontSize: 55,
          color: '#00d4ff', textAlign, textDirection, verticalAlign: 'center',
          bold: true, zIndex: 8,
        })
      )

      textBoxes.push(
        makeTextBox({
          text: bibleText,
          x, y: bibleTextY, width: 46, height: 60, fontSize: 55,
          color: 'rgba(255,255,255,0.9)', textAlign, textDirection, verticalAlign: 'top',
          bold: false, italic: true, zIndex: 7,
        })
      )
    }
  }

  addSide('left')
  addSide('right')
  return textBoxes
}

// ── Single Language Layout ──

function buildSingleLangTextBoxes(
  data: PointsSlidesData,
  item: SubtitleItem,
  subtitlePrefix: string,
  type: string
): TextBox[] {
  const textBoxes: TextBox[] = []
  const rtl = HEBREW_RE.test(item.subtitle)
  const isAnnouncements = type === 'announcements'
  const textAlign: 'left' | 'center' | 'right' = rtl
    ? 'right'
    : isAnnouncements
      ? 'center'
      : 'left'
  const textDirection: 'ltr' | 'rtl' = rtl ? 'rtl' : 'ltr'

  const subtitleText = `${subtitlePrefix}${item.subtitle}`

  // Title
  textBoxes.push(
    makeTextBox({
      text: data.title,
      x: 5, y: 5, width: 90, height: 15, fontSize: 140,
      textAlign: rtl ? 'right' : 'left', verticalAlign: 'center',
      bold: true, zIndex: 5,
      textDirection,
    })
  )

  // Subtitle
  textBoxes.push(
    makeTextBox({
      text: subtitleText,
      x: 5, y: 30, width: 90, height: 18, fontSize: 110,
      textAlign, verticalAlign: 'center',
      zIndex: 4,
      textDirection,
    })
  )

  // Description (optional)
  const desc = item.description && item.description.trim()
  if (desc) {
    textBoxes.push(
      makeTextBox({
        text: item.description,
        x: 5, y: 55, width: 90, height: 35, fontSize: 80,
        color: 'rgba(255,255,255,0.85)',
        textAlign, verticalAlign: 'top',
        zIndex: 3,
        textDirection,
      })
    )
  }

  // Bible reference (optional)
  if (item.bibleRef) {
    const bibleRtl = HEBREW_RE.test(item.bibleRef.hebrewText || '')
    const bibleDir: 'ltr' | 'rtl' = bibleRtl ? 'rtl' : 'ltr'
    const bibleAlign: 'left' | 'right' = bibleRtl ? 'right' : 'left'
    const bibleRefY = desc ? 75 : 55
    const bibleTextY = desc ? 82 : 62
    const displayRef = item.bibleRef.hebrewReference || item.bibleRef.reference
    const displayText = item.bibleRef.hebrewText || item.bibleRef.englishText || ''

    textBoxes.push(
      makeTextBox({
        text: `\u{1F4D6} ${displayRef}`,
        x: 5, y: bibleRefY, width: 90, height: 6, fontSize: 60,
        color: '#00d4ff', textAlign: bibleAlign, verticalAlign: 'center',
        bold: true, zIndex: 2,
        textDirection: bibleDir,
      })
    )

    if (displayText) {
      textBoxes.push(
        makeTextBox({
          text: displayText,
          x: 5, y: bibleTextY, width: 90, height: 16, fontSize: 65,
          color: 'rgba(255,255,255,0.9)', textAlign: bibleAlign, verticalAlign: 'top',
          bold: false, italic: !bibleRtl, zIndex: 1,
          textDirection: bibleDir,
        })
      )
    }
  }

  return textBoxes
}

// ── Main export ──

export function createPointsSlides(data: PointsSlidesData): Slide[] {
  const { type, subtitles } = data
  const backgroundColor = BG_COLORS[type]
  const isBilingual = data.generateTranslation || false

  return subtitles.map((item, index) => {
    const prefix = SUBTITLE_PREFIXES[type]
    const subtitlePrefix = prefix === null ? `${index + 1}. ` : prefix

    const textBoxes = isBilingual
      ? buildBilingualTextBoxes(data, item, subtitlePrefix)
      : buildSingleLangTextBoxes(data, item, subtitlePrefix, type)

    return {
      id: randomUUID(),
      order: index,
      textBoxes,
      imageBoxes: [] as never[],
      backgroundColor,
    }
  })
}
