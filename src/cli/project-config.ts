import type { SkillAdapterId } from '../skills/adapters'

export type SupportedLocale = 'zh-CN' | 'en'

export const DEFAULT_LOCALE: SupportedLocale = 'zh-CN'

export const SUPPORTED_LOCALES: SupportedLocale[] = ['zh-CN', 'en']

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
