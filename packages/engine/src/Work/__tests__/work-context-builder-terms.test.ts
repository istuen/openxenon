// =============================================================================
// work-context-builder-terms.test.ts — v0.7.3 P3 (ADR-0061 §D1+D2) 多视角 term 视图
//
// 覆盖：
//   9. buildTermViews: 聚合同名 term 多视角
//  10. partitionBackgroundDomains: 拆分 main + backgrounds
//  11. token 预算：4+ background 仅 name 列表
//  12. contextMode=lean → 不加载 background domains
//
// ADR-0088 P6 (2026-08-02 phase 3.4)：从 work-context-builder.test.ts 拆出 P3 部分
// =============================================================================

import { describe, expect, test } from 'bun:test'
import {
  renderContextHuman,
  buildTermViews,
  partitionBackgroundDomains,
  type DomainLanguageEntry,
} from '../work-context-builder'

describe('buildTermViews — v0.7.3 P3: D1+D2 term 视图聚合', () => {
  const makeLang = (terms: Array<{ name: string; desc: string }>, bans: string[] = [], invs: string[] = []) => ({
    terms,
    ban: bans,
    invariant: invs,
  })

  const makeEntry = (name: string, terms: Array<{ name: string; desc: string }>): DomainLanguageEntry => ({
    name,
    scope: '@prj',
    ref: `@prj/domains/${name}`,
    fileHash: 'a'.repeat(64),
    language: makeLang(terms),
  })

  test('单 main Domain + 0 background → 仅 main 视图', () => {
    const main = makeLang([{ name: 'A', desc: 'main-A' }])
    const result = buildTermViews(main, [], { maxBackgroundFull: 3 })
    expect(result.termViews).toHaveLength(1)
    expect(result.termViews[0]?.views).toHaveLength(1)
    expect(result.termViews[0]?.views[0]).toMatchObject({
      domain: 'main',
      desc: 'main-A',
      isMain: true,
      isNameOnly: false,
    })
    expect(result.backgroundDomains).toEqual([])
  })

  test('main + background 同名 term → 同一 termView 含两个 view（main + background）', () => {
    const main = makeLang([{ name: 'Task', desc: 'main-task' }])
    const bg1 = makeEntry('oxn-engine-domain', [{ name: 'Task', desc: 'engine-task' }])
    const result = buildTermViews(main, [bg1], { maxBackgroundFull: 3 })
    expect(result.termViews).toHaveLength(1)
    const tv = result.termViews[0]!
    expect(tv.name).toBe('Task')
    expect(tv.views).toHaveLength(2)
    expect(tv.views.find((v) => v.isMain)?.desc).toBe('main-task')
    expect(tv.views.find((v) => !v.isMain)?.desc).toBe('engine-task')
  })

  test('main 无、background 有 → background 单 view（isMain=false）', () => {
    const bg1 = makeEntry('oxn-work-domain', [{ name: 'Work', desc: 'work-desc' }])
    const result = buildTermViews(null, [bg1], { maxBackgroundFull: 3 })
    expect(result.termViews).toHaveLength(1)
    const tv = result.termViews[0]!
    expect(tv.views).toHaveLength(1)
    expect(tv.views[0]).toMatchObject({
      domain: 'oxn-work-domain',
      desc: 'work-desc',
      isMain: false,
      isNameOnly: false,
    })
  })

  test('token 预算：4+ background Domains → 前 3 满注入，4+ 仅 nameOnly', () => {
    const main = makeLang([{ name: 'X', desc: 'main-X' }])
    const bgs = [
      makeEntry('bg1', [{ name: 'X', desc: 'bg1-X' }]),
      makeEntry('bg2', [{ name: 'X', desc: 'bg2-X' }]),
      makeEntry('bg3', [{ name: 'X', desc: 'bg3-X' }]),
      makeEntry('bg4', [{ name: 'X', desc: 'bg4-X' }]),
      makeEntry('bg5', [{ name: 'X', desc: 'bg5-X' }]),
    ]
    const result = buildTermViews(main, bgs, { maxBackgroundFull: 3 })
    const tv = result.termViews[0]!
    expect(tv.views).toHaveLength(6)
    expect(tv.views.find((v) => v.domain === 'bg1' && v.isNameOnly === false)?.desc).toBe('bg1-X')
    expect(tv.views.find((v) => v.domain === 'bg3' && v.isNameOnly === false)?.desc).toBe('bg3-X')
    expect(tv.views.find((v) => v.domain === 'bg4')?.isNameOnly).toBe(true)
    expect(tv.views.find((v) => v.domain === 'bg4')?.desc).toBe('')
    expect(tv.views.find((v) => v.domain === 'bg5')?.isNameOnly).toBe(true)
  })

  test('background domain 无 language → 跳过该 domain', () => {
    const main = makeLang([{ name: 'A', desc: 'main-A' }])
    const bgNoLang: DomainLanguageEntry = {
      name: 'empty-domain',
      scope: '@prj',
      ref: '@prj/domains/empty-domain',
      fileHash: 'a'.repeat(64),
      language: undefined,
    }
    const result = buildTermViews(main, [bgNoLang], { maxBackgroundFull: 3 })
    expect(result.termViews).toHaveLength(1)
    expect(result.termViews[0]?.views.find((v) => v.domain === 'empty-domain')).toBeUndefined()
  })
})

describe('partitionBackgroundDomains — v0.7.3 P3', () => {
  const makeEntry = (name: string): DomainLanguageEntry => ({
    name,
    scope: '@prj',
    ref: `@prj/domains/${name}`,
    fileHash: 'a'.repeat(64),
    language: { terms: [], ban: [], invariant: [] },
  })

  test('匹配 taskDomain → 拆分 main + backgrounds（保持顺序）', () => {
    const entries = [makeEntry('main-domain'), makeEntry('bg1'), makeEntry('bg2')]
    const { main, backgrounds } = partitionBackgroundDomains(entries, 'main-domain')
    expect(main?.name).toBe('main-domain')
    expect(backgrounds.map((b) => b.name)).toEqual(['bg1', 'bg2'])
  })

  test('无 taskDomain → main=null, backgrounds=全部', () => {
    const entries = [makeEntry('d1'), makeEntry('d2')]
    const { main, backgrounds } = partitionBackgroundDomains(entries, undefined)
    expect(main).toBeNull()
    expect(backgrounds).toHaveLength(2)
  })

  test('taskDomain 不在 entries → main=null, backgrounds=全部（向后兼容）', () => {
    const entries = [makeEntry('d1'), makeEntry('d2')]
    const { main, backgrounds } = partitionBackgroundDomains(entries, 'unknown')
    expect(main).toBeNull()
    expect(backgrounds).toHaveLength(2)
  })
})

describe('renderContextHuman — v0.7.3 P3: 多视角块状渲染', () => {
  const base = {
    workspace: 'demo',
    task: 'step1',
    currentPart: null,
    workContext: { overallGoal: 'g', constraints: [] },
    injectedDomains: [],
    diagnostics: [],
  }

  test('full mode + termViews → 块状渲染（含 main + background 视角 + [Domain] 前缀）', () => {
    const out = renderContextHuman({
      ...base,
      allowedLanguage: {
        mustUseTerms: [],
        banned: [],
        invariants: [],
        termViews: [
          {
            name: 'Task',
            views: [
              { domain: 'main', desc: 'main-task', isMain: true, isNameOnly: false },
              { domain: 'bg1', desc: 'bg1-task', isMain: false, isNameOnly: false },
            ],
          },
        ],
        mainDomain: 'main',
        backgroundDomains: ['bg1'],
        contextMode: 'full',
      },
    })
    expect(out).toContain('## Allowed Language (multi-view)')
    expect(out).toContain('Main view: `main`')
    expect(out).toContain('### Terms')
    expect(out).toContain('#### Task')
    expect(out).toContain('[main [main]] main-task')
    expect(out).toContain('[bg1] bg1-task')
  })

  test('full mode + nameOnly background → 标注 [name-only]', () => {
    const out = renderContextHuman({
      ...base,
      allowedLanguage: {
        mustUseTerms: [],
        banned: [],
        invariants: [],
        termViews: [
          {
            name: 'X',
            views: [{ domain: 'main', desc: 'main-X', isMain: true, isNameOnly: false }],
          },
          {
            name: 'Y',
            views: [{ domain: 'bg1', desc: 'bg1-Y', isMain: false, isNameOnly: false }],
          },
        ],
        mainDomain: 'main',
        backgroundDomains: ['bg1', 'bg2', 'bg3', 'bg4'],
        contextMode: 'full',
      },
    })
    expect(out).toContain('Background views: `bg1`, `bg2`, `bg3`, `bg4`')
    expect(out).toContain('Token budget')
  })

  test('lean mode → flat 列表渲染（BWC）', () => {
    const out = renderContextHuman({
      ...base,
      allowedLanguage: {
        mustUseTerms: [{ name: 'Task', desc: 'main-task' }],
        banned: ['fake'],
        invariants: ['inv-1'],
        contextMode: 'lean',
      },
    })
    expect(out).toContain('## Allowed Language (lean mode)')
    expect(out).toContain('- Task: main-task')
    expect(out).toContain('### Bans')
    expect(out).toContain('- fake')
    expect(out).toContain('### Invariants')
    expect(out).toContain('- inv-1')
  })
})
