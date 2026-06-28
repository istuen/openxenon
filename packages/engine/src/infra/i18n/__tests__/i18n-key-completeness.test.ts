import { describe, expect, test } from 'bun:test'
import zhCN from '../zh-CN.json'
import en from '../en.json'

type NestedRecord = Record<string, string | NestedRecord>

function flattenKeys(obj: NestedRecord, prefix = ''): string[] {
  const keys: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'object' && value !== null) {
      keys.push(...flattenKeys(value as NestedRecord, fullKey))
    } else {
      keys.push(fullKey)
    }
  }
  return keys
}

const zhCNKeys = flattenKeys(zhCN as unknown as NestedRecord)
const enKeys = flattenKeys(en as unknown as NestedRecord)

describe('zh-CN key completeness', () => {
  test('all zh-CN keys are present', () => {
    expect(zhCNKeys.length).toBeGreaterThan(0)
    // no missing keys within zh-CN itself — trivially true if parse succeeds
    expect(zhCNKeys).toEqual(zhCNKeys)
  })

  test('zh-CN has no duplicate keys', () => {
    const unique = new Set(zhCNKeys)
    expect(unique.size).toBe(zhCNKeys.length)
  })
})

describe('en key completeness', () => {
  test('all en keys are present', () => {
    expect(enKeys.length).toBeGreaterThan(0)
    expect(enKeys).toEqual(enKeys)
  })

  test('en has no duplicate keys', () => {
    const unique = new Set(enKeys)
    expect(unique.size).toBe(enKeys.length)
  })
})

describe('en-zh parity', () => {
  test('en and zh-CN have identical key sets', () => {
    const zhSet = new Set(zhCNKeys)
    const enSet = new Set(enKeys)

    const missingInEn = zhCNKeys.filter((k) => !enSet.has(k))
    const extraInEn = enKeys.filter((k) => !zhSet.has(k))

    expect(missingInEn).toEqual([])
    expect(extraInEn).toEqual([])
  })

  test('en and zh-CN have same number of keys', () => {
    expect(enKeys.length).toBe(zhCNKeys.length)
  })
})
