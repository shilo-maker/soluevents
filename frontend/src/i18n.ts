import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from './locales/en.json'
import he from './locales/he.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      he: { translation: he },
    },
    fallbackLng: 'he',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
  })

// Set document direction and lang on language change
i18n.on('languageChanged', (lng) => {
  const dir = lng === 'he' ? 'rtl' : 'ltr'
  document.documentElement.dir = dir
  document.documentElement.lang = lng
})

// Apply initial direction
const initLng = i18n.language || 'he'
document.documentElement.dir = initLng === 'he' ? 'rtl' : 'ltr'
document.documentElement.lang = initLng

export function changeLanguage(lng: string) {
  return i18n.changeLanguage(lng)
}

export function getCurrentLanguage() {
  return i18n.language
}

export default i18n
