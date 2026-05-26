import i18next from 'i18next'
import type { SupportedLocale } from '../kernel/processors/project-config'
import { DEFAULT_LOCALE } from '../kernel/processors/project-config'
import zhCN from './zh-CN.json'

i18next.init({
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  interpolation: {
    escapeValue: false,
  },
  resources: {
    'zh-CN': { translation: zhCN },
  },
  initAsync: false,
})

export const t = i18next.t.bind(i18next)

export function setLocale(locale: SupportedLocale): void {
  i18next.changeLanguage(locale)
}

export function getCurrentLocale(): string {
  return i18next.language
}
