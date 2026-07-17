// =============================================================================
// work-context-builder.test.ts — External 注入到 Work 上下文覆盖
//
// 覆盖本会话新增的两层注入模型（Work 消化，Task 自包含）在 context builder 的落点：
//   1. renderContextHuman 渲染 "## External References (read during Intent)"
//   2. 无 domainExternals 时不渲染 External 段
//   3. buildWorkContext（Work 级，无 --task）从引用 Domain 收集 domainExternals
//   4. Domain 无 externals → domainExternals 省略
//
// 🆕 v0.7.3 P1 增量覆盖（F1 + F2 修复）：
//   5. F1: blueprints.json 存在 → context 含 blueprintIR
//   6. F2: blueprint domainRefs 引用的 Domain → language 被加载
//   7. backcompat: blueprints.json 缺失 → 不注入 blueprintIR/domainLanguages
//   8. backcompat: blueprint 的 domain 文件找不到 → 该条目被跳过
//
// 🆕 v0.7.3 P3 增量覆盖（D1 + D2）：
//   9. buildTermViews: 聚合同名 term 多视角
//  10. partitionBackgroundDomains: 拆分 main + backgrounds
//  11. token 预算：4+ background 仅 name 列表
//  12. contextMode=lean → 不加载 background domains
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  buildWorkContext,
  renderContextHuman,
  loadPerWorkBlueprints,
  buildTermViews,
  partitionBackgroundDomains,
  type DomainLanguageEntry,
} from '../work-context-builder'

// ───────── renderContextHuman: External 渲染（纯函数） ─────────

describe('renderContextHuman — External References', () => {
  const base = {
    workspace: 'demo',
    currentPart: null,
    workContext: { overallGoal: 'g', constraints: [] },
    injectedDomains: [],
    diagnostics: [],
  }

  test('渲染 External References 段（adr path + library url）', () => {
    const out = renderContextHuman({
      ...base,
      domainExternals: [
        {
          domainName: 'TrustChain',
          externals: [
            { name: 'trust-chain-model', kind: 'adr', path: '.openxenon/docs/adrs/0057.md', summary: '信任链' },
            { name: 'axios', kind: 'library', url: 'https://axios-http.com/docs' },
          ],
        },
      ],
    })
    expect(out).toContain('## External References (read during Intent)')
    expect(out).toContain('TrustChain Domain:')
    expect(out).toContain('- trust-chain-model (adr): .openxenon/docs/adrs/0057.md — 信任链')
    expect(out).toContain('- axios (library): https://axios-http.com/docs')
  })

  test('kind 为空 → 显示 unknown；无 location → (no location)', () => {
    const out = renderContextHuman({
      ...base,
      domainExternals: [{ domainName: 'D', externals: [{ name: 'x', kind: '' }] }],
    })
    expect(out).toContain('- x (unknown): (no location)')
  })

  test('无 domainExternals → 不渲染 External 段', () => {
    const out = renderContextHuman(base)
    expect(out).not.toContain('## External References')
  })

  test('domainExternals 为空数组 → 不渲染 External 段', () => {
    const out = renderContextHuman({ ...base, domainExternals: [] })
    expect(out).not.toContain('## External References')
  })
})

// ───────── buildWorkContext: Work 级收集 domainExternals（集成） ─────────

describe('buildWorkContext — Work 级 domainExternals', () => {
  let tmpDir: string
  const workName = 'ext-work'

  function setup(domainMd: string): void {
    // work.md：## Refs 声明 work 级 domain（→ work.domains 被填充）+ ## Tasks
    const workDir = join(tmpDir, '.openxenon', 'works', workName)
    mkdirSync(workDir, { recursive: true })
    writeFileSync(
      join(workDir, 'work.md'),
      `---\nentity: work\nversion: 0.7.0\nname: ${workName}\n---\n` +
        `# Work: ${workName}\n\n` +
        `## Context\n### main\n- goal: demo\n- constraints:\n  - c1\n\n` +
        `## Refs\n### TrustChain\n- kind: domain\n- ref: @prj/domains/TrustChain\n\n` +
        `## Tasks\n### step1\n- domain: TrustChain\n`,
    )
    // domain 文件：.openxenon/domains/TrustChain.md
    const domainsDir = join(tmpDir, '.openxenon', 'domains')
    mkdirSync(domainsDir, { recursive: true })
    writeFileSync(join(domainsDir, 'TrustChain.md'), domainMd)
  }

  beforeEach(() => {
    tmpDir = join(tmpdir(), `wcb-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(tmpDir, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
  })

  test('引用 Domain 含 ## Externals → domainExternals 被收集', () => {
    setup(
      `# Domain: TrustChain\n> 信任链\n\n` +
        `## Externals\n### adr-0057\n- path: .openxenon/docs/adrs/0057.md\n- kind: adr\n- summary: 信任链核心模型\n`,
    )
    const ctx = buildWorkContext({ projectRoot: tmpDir, workName, assetFormat: 'md', lockCheck: false })
    expect(ctx.domainExternals).toHaveLength(1)
    expect(ctx.domainExternals?.[0]?.domainName).toBe('TrustChain')
    expect(ctx.domainExternals?.[0]?.externals?.[0]).toMatchObject({
      name: 'adr-0057',
      kind: 'adr',
      path: '.openxenon/docs/adrs/0057.md',
    })
  })

  test('渲染后的 human 输出含 External References 段', () => {
    setup(`# Domain: TrustChain\n> 信任链\n\n## Externals\n### adr-0057\n- path: a.md\n- kind: adr\n`)
    const ctx = buildWorkContext({ projectRoot: tmpDir, workName, assetFormat: 'md', lockCheck: false })
    const human = renderContextHuman(ctx)
    expect(human).toContain('## External References (read during Intent)')
    expect(human).toContain('TrustChain Domain:')
  })

  test('引用 Domain 无 externals → domainExternals 省略', () => {
    setup(`# Domain: TrustChain\n> 信任链\n\n## Terms\n### t\n- desc: term\n`)
    const ctx = buildWorkContext({ projectRoot: tmpDir, workName, assetFormat: 'md', lockCheck: false })
    expect(ctx.domainExternals).toBeUndefined()
  })
})

// ───────── 🆕 v0.7.3 P1: F1 + F2 修复覆盖 ─────────

describe('buildWorkContext — v0.7.3 P1: BlueprintIR + Domain language 注入', () => {
  let tmpDir: string
  const workName = 'bp-work'

  function setupWithBlueprints(opts: {
    workDomainsRef?: string
    blueprintDomainName?: string
    blueprintDomainContent?: string
    includeBlueprintsJson?: boolean
  }): void {
    const {
      workDomainsRef = 'TrustChain',
      blueprintDomainName = 'TrustChain',
      blueprintDomainContent = '',
      includeBlueprintsJson = true,
    } = opts
    const workDir = join(tmpDir, '.openxenon', 'works', workName)
    mkdirSync(workDir, { recursive: true })

    // work.md：声明 work-level domain ref + 至少 1 task
    writeFileSync(
      join(workDir, 'work.md'),
      `---\nentity: work\nversion: 0.7.0\nname: ${workName}\n---\n` +
        `# Work: ${workName}\n\n` +
        `## Context\n### main\n- goal: demo\n- constraints: []\n\n` +
        `## Refs\n### TrustChain\n- kind: domain\n- ref: @prj/domains/TrustChain\n\n` +
        `## Tasks\n### step1\n- domain: TrustChain\n`,
    )

    // domain 文件
    const domainsDir = join(tmpDir, '.openxenon', 'domains')
    mkdirSync(domainsDir, { recursive: true })
    writeFileSync(
      join(domainsDir, `${blueprintDomainName}.md`),
      blueprintDomainContent ||
        `# Domain: ${blueprintDomainName}\n> 信任链\n\n## Externals\n### adr-0057\n- path: a.md\n- kind: adr\n`,
    )

    if (includeBlueprintsJson) {
      // 写一个最小的 blueprints.json（lock 期生成的 artifact）
      const idx = {
        schemaVersion: 1,
        workName,
        generatedAt: '2026-07-17T00:00:00.000Z',
        projectRoot: tmpDir,
        sourceHash: 'a'.repeat(64),
        declaredRefs: ['@prj/blueprints/oxn-blueprint'],
        blueprintCount: 1,
        invalidCount: 0,
        blueprints: [
          {
            name: 'oxn-blueprint',
            scope: '@prj',
            file: '.openxenon/assets/blueprints/oxn-blueprint.md',
            status: 'ok',
            version: 1,
            slots: [
              { name: 'discuss', deps: [], observe: [] },
              { name: 'design', deps: ['discuss'], observe: ['lint-check'] },
            ],
            errors: [],
            ref: '@prj/blueprints/oxn-blueprint',
            domainRefs: [
              {
                name: blueprintDomainName,
                kind: 'domain',
                ref: '@prj/domains/' + blueprintDomainName,
                scope: '@prj',
                version: 1,
                fileHash: 'a'.repeat(64),
              },
            ],
            workflowRefs: [],
            stackRefs: [],
            nestedBlueprintRefs: [],
          },
        ],
      }
      writeFileSync(join(workDir, 'blueprints.json'), JSON.stringify(idx, null, 2))
    }
  }

  beforeEach(() => {
    tmpDir = join(tmpdir(), `wcb-p1-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(tmpDir, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
  })

  test('F1: blueprints.json 存在 → context 含 blueprintIR 字段', () => {
    setupWithBlueprints({})
    const ctx = buildWorkContext({ projectRoot: tmpDir, workName, assetFormat: 'md', lockCheck: false })
    expect(ctx.blueprintIR).toBeDefined()
    expect(ctx.blueprintIR?.schemaVersion).toBe(1)
    expect(ctx.blueprintIR?.blueprints).toHaveLength(1)
    expect(ctx.blueprintIR?.blueprints[0]?.name).toBe('oxn-blueprint')
    expect(ctx.blueprintIR?.blueprints[0]?.slots.map((s) => s.name)).toEqual(['discuss', 'design'])
  })

  test('F2: blueprint domainRefs 引用的 Domain → language 被加载', () => {
    setupWithBlueprints({
      blueprintDomainContent:
        `# Domain: TrustChain\n> 信任链核心模型\n\n` +
        `## Terms\n### trust-chain\n- desc: 三方信任关系\n### proof\n- desc: 不变量证明\n\n` +
        `## Bans\n### forbidden\n- items:\n  - fake-proof\n  - bypass-trust\n- desc: 禁止构造\n\n` +
        `## Invariants\n### inv-1\n- value: 信任链必须可追溯\n`,
    })
    const ctx = buildWorkContext({ projectRoot: tmpDir, workName, assetFormat: 'md', lockCheck: false })
    expect(ctx.domainLanguages).toBeDefined()
    expect(ctx.domainLanguages).toHaveLength(1)
    const entry = ctx.domainLanguages?.[0]
    expect(entry?.name).toBe('TrustChain')
    expect(entry?.scope).toBe('@prj')
    expect(entry?.ref).toBe('@prj/domains/TrustChain')
    expect(entry?.fileHash).toHaveLength(64)
    expect(entry?.language?.terms.map((t) => t.name)).toEqual(['trust-chain', 'proof'])
    expect(entry?.language?.ban).toContain('fake-proof')
    expect(entry?.language?.ban).toContain('bypass-trust')
    expect(entry?.language?.ban).toContain('禁止构造')
    expect(entry?.language?.invariant).toContain('信任链必须可追溯')
  })

  test('backcompat: blueprints.json 缺失 → blueprintIR / domainLanguages 都不注入（老 Work 兼容）', () => {
    setupWithBlueprints({ includeBlueprintsJson: false })
    const ctx = buildWorkContext({ projectRoot: tmpDir, workName, assetFormat: 'md', lockCheck: false })
    expect(ctx.blueprintIR).toBeUndefined()
    expect(ctx.domainLanguages).toBeUndefined()
    // 但 domainExternals 仍按老 path 收集（向后兼容）
    expect(ctx.domainExternals).toBeDefined()
    expect(ctx.domainExternals?.[0]?.domainName).toBe('TrustChain')
  })

  test('boundary: blueprint 引用不存在的 Domain → 该条目被跳过（不抛错）', () => {
    setupWithBlueprints({
      blueprintDomainName: 'NonExistent',
      // domain 文件不写（NonExistent.md 不存在）
    })
    const ctx = buildWorkContext({ projectRoot: tmpDir, workName, assetFormat: 'md', lockCheck: false })
    expect(ctx.blueprintIR).toBeDefined()
    // domainLanguages 跳过 NonExistent → 0 entries → 字段省略（向后兼容）
    expect(ctx.domainLanguages).toBeUndefined()
  })

  test('helper: loadPerWorkBlueprints 直接读取 + 解析 blueprints.json', () => {
    setupWithBlueprints({})
    const idx = loadPerWorkBlueprints(tmpDir, workName)
    expect(idx).not.toBeNull()
    expect(idx?.blueprintCount).toBe(1)
    expect(idx?.blueprints[0]?.name).toBe('oxn-blueprint')
  })

  test('helper: loadPerWorkBlueprints 文件不存在 → 返回 null', () => {
    const workDir = join(tmpDir, '.openxenon', 'works', workName)
    mkdirSync(workDir, { recursive: true })
    // 不写 blueprints.json
    const idx = loadPerWorkBlueprints(tmpDir, workName)
    expect(idx).toBeNull()
  })
})

// ───────── 🆕 v0.7.3 P3: D1+D2 多视角 term 视图 ─────────

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
    // main(1) + 5 backgrounds = 6 views total
    expect(tv.views).toHaveLength(6)
    // bg1, bg2, bg3 = full（desc 完整）
    expect(tv.views.find((v) => v.domain === 'bg1' && v.isNameOnly === false)?.desc).toBe('bg1-X')
    expect(tv.views.find((v) => v.domain === 'bg3' && v.isNameOnly === false)?.desc).toBe('bg3-X')
    // bg4, bg5 = nameOnly（无 desc）
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
      language: null,
    }
    const result = buildTermViews(main, [bgNoLang], { maxBackgroundFull: 3 })
    expect(result.termViews).toHaveLength(1)
    // bg 没 language → 不出现在 views
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
