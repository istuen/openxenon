// =============================================================================
// src/cli/__tests__/domain-canonicalization.test.ts (v1.0.2)
//
// 验证 IAP_INTENT_NAME_FILE_MISMATCH 防御：
//   1. toKebab 规范化正确性（PascalCase / camelCase / snake_case / kebab-case）
//   2. assertNameFileConsistent 命中规则（macOS-safe 字符串比对）
//   3. 不一致时抛出 IAPError with NAME_FILE_MISMATCH
//   4. 一致时不抛错
// =============================================================================

import { describe, expect, test } from 'bun:test'
import { IAPError } from '@openxenon/engine/errors'
import { assertNameFileConsistent, toKebab } from '@openxenon/engine/kernel'

describe('toKebab (规范化函数)', () => {
  test('PascalCase → kebab-case', () => {
    expect(toKebab('MemberContext')).toBe('member-context')
    expect(toKebab('WechatMinigameContext')).toBe('wechat-minigame-context')
    expect(toKebab('CLIContext')).toBe('cli-context')
  })

  test('多段 PascalCase', () => {
    expect(toKebab('IntentAlignContext')).toBe('intent-align-context')
  })

  test('连续大写处理（HTMLParser → html-parser）', () => {
    expect(toKebab('HTMLParser')).toBe('html-parser')
    expect(toKebab('CLIContext')).toBe('cli-context')
  })

  test('snake_case → kebab-case', () => {
    expect(toKebab('wechat_minigame')).toBe('wechat-minigame')
  })

  test('已是 kebab-case → 原样', () => {
    expect(toKebab('work-context')).toBe('work-context')
    expect(toKebab('planet-minigame-pipeline')).toBe('planet-minigame-pipeline')
  })
})

describe('assertNameFileConsistent (NAME_FILE_MISMATCH 防御)', () => {
  test('匹配: MemberContext / member-context.md → 不抛错', () => {
    expect(() =>
      assertNameFileConsistent('MemberContext', '/x/.openxenon/domains/member-context.md', 'domain'),
    ).not.toThrow()
  })

  test('匹配: 已是 kebab-case', () => {
    expect(() =>
      assertNameFileConsistent(
        'planet-minigame-pipeline',
        '/x/.openxenon/blueprints/planet-minigame-pipeline.md',
        'blueprint',
      ),
    ).not.toThrow()
  })

  test('匹配: snake_case 声明 vs kebab-case 文件', () => {
    // 规范化后等价
    expect(() =>
      assertNameFileConsistent('wechat_minigame', '/x/.openxenon/domains/wechat-minigame.md', 'domain'),
    ).not.toThrow()
  })

  test('不匹配: MemberContext 声明 vs foo-bar.md 文件 → 抛 IAPError', () => {
    let caught: unknown = null
    try {
      assertNameFileConsistent('MemberContext', '/x/.openxenon/domains/foo-bar.md', 'domain')
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(IAPError)
    const err = caught as IAPError
    expect(err.name).toBe('IAP_INTENT_NAME_FILE_MISMATCH')
    expect(err.axis).toBe('INTENT')
    expect(err.code).toBe('NAME_FILE_MISMATCH')
    expect(err.action).toBe('YIELD_TO_HUMAN')
    expect(err.message).toContain("'MemberContext'")
    expect(err.message).toContain("'foo-bar.md'")
    expect(err.context).toEqual({
      entityType: 'domain',
      declared: 'MemberContext',
      file: 'foo-bar.md',
      normalized: 'member-context',
      suggestion: expect.stringContaining('Either rename the file'),
    })
  })

  test('不匹配: blueprint 实体类型也走相同检查', () => {
    let caught: unknown = null
    try {
      assertNameFileConsistent('MyBlueprint', '/x/.openxenon/blueprints/other.md', 'blueprint')
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(IAPError)
    const err = caught as IAPError
    expect(err.context?.entityType).toBe('blueprint')
  })
})
