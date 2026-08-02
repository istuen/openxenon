// =============================================================================
// work-validator-legacy.test.ts — v0.7.3 P7 (ADR-0061 §D6) Work ## Refs legacy kind: domain warn
//
// 覆盖：
//   9. detectLegacyDomainRefs: 空/缺省/无 legacy/1 个/多 个/ref 缺省/stack 不触发
//  10. legacyDomainRefsToWarnings: 空/1 个/多 个
//
// ADR-0088 P6 (2026-08-02 phase 3.4)：从 work-validator.test.ts 拆出 P7 部分
// =============================================================================

import { describe, expect, test } from 'bun:test'
import { detectLegacyDomainRefs, legacyDomainRefsToWarnings } from '../work-validator'

// ───────── detectLegacyDomainRefs ─────────

describe('detectLegacyDomainRefs — v0.7.3 P7', () => {
  test('空 refs → []', () => {
    const work = { refs: [] }
    expect(detectLegacyDomainRefs(work as never)).toEqual([])
  })

  test('refs 字段缺省 → []', () => {
    const work = {}
    expect(detectLegacyDomainRefs(work as never)).toEqual([])
  })

  test('无 legacy ref（仅 blueprint）→ []', () => {
    const work = {
      refs: [{ kind: 'blueprint', name: 'oxn-blueprint', ref: '@prj/blueprints/oxn-blueprint' }],
    }
    expect(detectLegacyDomainRefs(work as never)).toEqual([])
  })

  test('1 个 legacy ref → 返回带 refName + ref + suggestion', () => {
    const work = {
      refs: [
        { kind: 'domain', name: 'TrustChain', ref: '@prj/domains/TrustChain' },
        { kind: 'blueprint', name: 'oxn-blueprint', ref: '@prj/blueprints/oxn-blueprint' },
      ],
    }
    const r = detectLegacyDomainRefs(work as never)
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({
      refName: 'TrustChain',
      ref: '@prj/domains/TrustChain',
    })
    expect(r[0]?.suggestion).toContain('Move to Blueprint ## Use')
    expect(r[0]?.suggestion).toContain('TrustChain')
  })

  test('多个 legacy ref → 全部列出', () => {
    const work = {
      refs: [
        { kind: 'domain', name: 'D1', ref: '@prj/domains/D1' },
        { kind: 'domain', name: 'D2', ref: '@prj/domains/D2' },
        { kind: 'blueprint', name: 'bp', ref: '@prj/blueprints/bp' },
      ],
    }
    const r = detectLegacyDomainRefs(work as never)
    expect(r).toHaveLength(2)
    expect(r.map((e) => e.refName).sort()).toEqual(['D1', 'D2'])
  })

  test('ref 字段缺省 → suggestion 退回 refName', () => {
    const work = {
      refs: [{ kind: 'domain', name: 'TrustChain' }],
    }
    const r = detectLegacyDomainRefs(work as never)
    expect(r).toHaveLength(1)
    expect(r[0]?.ref).toBeNull()
    expect(r[0]?.suggestion).toContain('TrustChain')
  })

  test('kind 是 stack → 不触发（stack 是 Work 级合法 kind）', () => {
    const work = {
      refs: [{ kind: 'stack', name: 'oxn-stack', ref: '@prj/stack/oxn-stack' }],
    }
    expect(detectLegacyDomainRefs(work as never)).toEqual([])
  })
})

// ───────── legacyDomainRefsToWarnings ─────────

describe('legacyDomainRefsToWarnings — v0.7.3 P7', () => {
  test('空数组 → []', () => {
    expect(legacyDomainRefsToWarnings([])).toEqual([])
  })

  test('1 个 entry → 1 条 warning 含 OXN_WORK_LEGACY_DOMAIN_REF', () => {
    const ws = legacyDomainRefsToWarnings([
      { refName: 'TrustChain', ref: '@prj/domains/TrustChain', suggestion: 'Move to Blueprint' },
    ])
    expect(ws).toHaveLength(1)
    expect(ws[0]).toContain('OXN_WORK_LEGACY_DOMAIN_REF')
    expect(ws[0]).toContain('TrustChain')
    expect(ws[0]).toContain('@prj/domains/TrustChain')
    expect(ws[0]).toContain('v0.8.0 will hard-block')
  })

  test('多 entry → 多 warnings', () => {
    const ws = legacyDomainRefsToWarnings([
      { refName: 'D1', ref: '@prj/domains/D1', suggestion: 's1' },
      { refName: 'D2', ref: null, suggestion: 's2' },
    ])
    expect(ws).toHaveLength(2)
  })
})
