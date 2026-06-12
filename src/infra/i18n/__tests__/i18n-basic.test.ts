import { describe, expect, test } from 'bun:test'
import { t, setLocale } from '../index'
import i18next from 'i18next'

// i18next is a global singleton; tests must run sequentially
describe('i18n basic functionality', { concurrent: false }, () => {
  test('t() returns interpolated string for en key', () => {
    setLocale('en')
    const result = t('init.invalidLocale', { locale: 'x' })
    expect(result).toBe('Unsupported locale: x')
  })

  test('t() returns interpolated string for zh-CN key', () => {
    setLocale('zh-CN')
    const result = t('init.invalidLocale', { locale: 'x' })
    expect(result).toBe('不支持的语言: x')
  })

  test('t() returns key itself for nonexistent key', () => {
    const result = t('nonexistent.key')
    expect(result).toBe('nonexistent.key')
  })

  test('setLocale to en works', () => {
    setLocale('en')
    expect(i18next.language).toBe('en')
  })

  test('setLocale to zh-CN works', () => {
    setLocale('zh-CN')
    expect(i18next.language).toBe('zh-CN')
  })

  test('t() returns en string when locale is en', () => {
    setLocale('en')
    const result = t('cache.notFound')
    expect(result).toBe('Cache directory not found')
  })
})
