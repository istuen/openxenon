import i18next from 'i18next'
import type { SupportedLocale } from './locale'
import { DEFAULT_LOCALE } from './locale'
import zhCN from './zh-CN.json'
import en from './en.json'

i18next.init({
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  interpolation: {
    escapeValue: false,
  },
  resources: {
    'zh-CN': { translation: zhCN },
    en: { translation: en },
  },
  initAsync: false,
})

// v0.0.29+: setLocale 真接 i18next.changeLanguage()，让 init --locale <l>
// 真的切换本进程输出语言（v0.0.28 之前只持久化 ProjectConfig.locale，
// 进程内仍输出 zh-CN fallback）。getCurrentLocale 已删（0 调用方）。

export const t = i18next.t.bind(i18next)

export function setLocale(locale: SupportedLocale): void {
  i18next.changeLanguage(locale)
}
