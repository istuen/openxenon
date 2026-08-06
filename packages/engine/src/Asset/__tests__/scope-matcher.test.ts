// =============================================================================
// scope-matcher.test.ts — v0.7+ Blueprint ## Scope 段文件范围校验单元测试
//
// 来源：design-blueprint-context-template Draft（2026-08-06 grilling）
//       oxn-work-domain inv-35 (artifacts-within-scope)
// =============================================================================

import { describe, expect, test } from 'bun:test'
import { matchesAllow, matchesAny, validatePathScope, type Scope } from '../scope-matcher'

describe('validatePathScope', () => {
  const fullScope: Scope = {
    allow: ['packages/cli/src/**', 'packages/engine/src/**'],
    forbid: ['packages/engine/src/kernel/**'],
    desc: 'standard dev scope',
  }

  test('path ⊆ allow + ∩ forbid = ∅ → ok', () => {
    expect(validatePathScope('packages/cli/src/commands/work.ts', fullScope)).toEqual({ ok: true })
    expect(validatePathScope('packages/engine/src/Work/plan-hash.ts', fullScope)).toEqual({ ok: true })
  })

  test('path ∩ forbid → 拒绝（即使在 allow 内）', () => {
    const r = validatePathScope('packages/engine/src/kernel/foo.ts', fullScope)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('in-forbid')
  })

  test('path ∉ allow → 拒绝', () => {
    const r = validatePathScope('docs/rfcs/zh-cn/RFC-0001.md', fullScope)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('not-in-allow')
  })

  test('allow 为空 → 允许任意路径（向后兼容）', () => {
    const openScope: Scope = { allow: [], forbid: [], desc: 'open' }
    expect(validatePathScope('any/path.ts', openScope)).toEqual({ ok: true })
    expect(validatePathScope('docs/rfcs/x.md', openScope)).toEqual({ ok: true })
  })

  test('forbid 为空 → 不限制', () => {
    const noForbid: Scope = { allow: ['packages/**'], forbid: [], desc: 'no forbid' }
    expect(validatePathScope('packages/any/file.ts', noForbid)).toEqual({ ok: true })
  })
})

describe('matchesAllow', () => {
  test('allow=[] → 匹配任意', () => {
    expect(matchesAllow('any/path.ts', [])).toBe(true)
  })

  test('allow=[pattern] → 匹配或不匹配', () => {
    expect(matchesAllow('packages/cli/src/x.ts', ['packages/cli/**'])).toBe(true)
    expect(matchesAllow('packages/engine/src/x.ts', ['packages/cli/**'])).toBe(false)
  })

  test('allow 多 pattern → 任一匹配即 true', () => {
    expect(matchesAllow('docs/foo.md', ['packages/**', 'docs/**'])).toBe(true)
    expect(matchesAllow('other/x.ts', ['packages/**', 'docs/**'])).toBe(false)
  })

  test('路径前导 ./ 被规范化', () => {
    expect(matchesAllow('./packages/cli/src/x.ts', ['packages/cli/**'])).toBe(true)
  })

  test('递归 glob foo/** 匹配 foo 与 foo/x', () => {
    expect(matchesAllow('packages', ['packages/**'])).toBe(true)
    expect(matchesAllow('packages/cli/src/x.ts', ['packages/**'])).toBe(true)
  })
})

describe('matchesAny (forbid)', () => {
  test('空列表 → 不匹配', () => {
    expect(matchesAny('any/path.ts', [])).toBe(false)
  })

  test('forbid 多 pattern → 任一匹配即 true', () => {
    expect(matchesAny('packages/cli/src/x.ts', ['packages/engine/**', 'packages/cli/**'])).toBe(true)
  })

  test('路径未命中任何 forbid → false', () => {
    expect(matchesAny('docs/foo.md', ['packages/cli/**', 'packages/engine/**'])).toBe(false)
  })
})
