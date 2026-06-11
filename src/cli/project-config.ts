import type { SkillAdapterId } from '../skills/adapters'
import type { SupportedLocale } from '../infra/i18n/locale'
export { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../infra/i18n/locale'
export type { SupportedLocale }

export interface ProjectConfig {
  version: 1
  mode: 'PRODUCTION' | 'SANDBOX'
  locale?: SupportedLocale
  name?: string
  createdAt?: number
  debug?: boolean
  tools?: {
    enabled?: SkillAdapterId[]
    disabled?: SkillAdapterId[]
  }
}
