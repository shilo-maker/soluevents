export type QuestionType = 'rating' | 'text' | 'yesno'
export type QuestionCategory = 'general' | 'worship' | 'production' | 'logistics'

export interface DebriefQuestion {
  id: string
  category: QuestionCategory
  question_en: string
  question_he: string
  type: QuestionType
}

export const DEBRIEF_QUESTIONS: DebriefQuestion[] = [
  // General — everyone
  {
    id: 'general_overall_rating',
    category: 'general',
    question_en: 'How would you rate the event overall?',
    question_he: 'איך היית מדרג/ת את האירוע בכללותו?',
    type: 'rating',
  },
  {
    id: 'general_went_well',
    category: 'general',
    question_en: 'What went well?',
    question_he: 'מה הלך טוב?',
    type: 'text',
  },
  {
    id: 'general_improve',
    category: 'general',
    question_en: 'What could be improved?',
    question_he: 'מה ניתן לשפר?',
    type: 'text',
  },
  {
    id: 'general_participate_again',
    category: 'general',
    question_en: 'Would you participate again?',
    question_he: 'האם היית משתתף/ת שוב?',
    type: 'yesno',
  },

  // Worship — worship team members
  {
    id: 'worship_sound_quality',
    category: 'worship',
    question_en: 'How was the sound quality on stage?',
    question_he: 'איך היה איכות הסאונד על הבמה?',
    type: 'rating',
  },
  {
    id: 'worship_song_selection',
    category: 'worship',
    question_en: 'Were you comfortable with the song selection?',
    question_he: 'האם הרגשת בנוח עם בחירת השירים?',
    type: 'yesno',
  },
  {
    id: 'worship_rehearsal',
    category: 'worship',
    question_en: 'How was the rehearsal preparation?',
    question_he: 'איך הייתה ההכנה לחזרות?',
    type: 'rating',
  },

  // Production — soundman/projection/host
  {
    id: 'production_tech_requirements',
    category: 'production',
    question_en: 'Were all technical requirements met?',
    question_he: 'האם כל הדרישות הטכניות התמלאו?',
    type: 'yesno',
  },
  {
    id: 'production_equipment_issues',
    category: 'production',
    question_en: 'Any equipment issues?',
    question_he: 'האם היו בעיות ציוד?',
    type: 'text',
  },
  {
    id: 'production_setup_teardown',
    category: 'production',
    question_en: 'How was the setup/teardown process?',
    question_he: 'איך היה תהליך ההקמה/הפירוק?',
    type: 'rating',
  },

  // Logistics — general team members
  {
    id: 'logistics_venue',
    category: 'logistics',
    question_en: 'Was the venue suitable?',
    question_he: 'האם המקום היה מתאים?',
    type: 'yesno',
  },
  {
    id: 'logistics_timing',
    category: 'logistics',
    question_en: 'How was the scheduling/timing?',
    question_he: 'איך היה לוח הזמנים/התזמון?',
    type: 'rating',
  },
  {
    id: 'logistics_issues',
    category: 'logistics',
    question_en: 'Any logistical issues?',
    question_he: 'האם היו בעיות לוגיסטיות?',
    type: 'text',
  },
]

/** Map team names to question categories */
const TEAM_CATEGORY_MAP: Record<string, QuestionCategory> = {
  'Worship Team': 'worship',
  'צוות הלל': 'worship',
  'Production Team': 'production',
  'צוות הפקה': 'production',
  'Logistics Team': 'logistics',
  'צוות לוגיסטיקה': 'logistics',
  'Ministry Team': 'logistics',
  'צוות שרות': 'logistics',
  'Content Team': 'general',
  'צוות תוכן': 'general',
}

/** Determine which question categories apply based on event teams */
export function getCategoriesForEvent(eventTeams: any[] | null): QuestionCategory[] {
  const categories = new Set<QuestionCategory>(['general'])

  if (eventTeams && Array.isArray(eventTeams)) {
    for (const team of eventTeams) {
      const teamName = team.name || ''
      const category = TEAM_CATEGORY_MAP[teamName]
      if (category) {
        categories.add(category)
      }
    }
  }

  // If no specific teams matched, include all categories
  if (categories.size === 1) {
    categories.add('worship')
    categories.add('production')
    categories.add('logistics')
  }

  return Array.from(categories)
}

/** Get relevant questions for an event based on its teams */
export function getQuestionsForEvent(eventTeams: any[] | null): DebriefQuestion[] {
  const categories = getCategoriesForEvent(eventTeams)
  return DEBRIEF_QUESTIONS.filter(q => categories.includes(q.category))
}
