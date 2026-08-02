// =============================================================================
// work-context-builder-externals.test.ts — Work 上下文 External / BlueprintIR / Domain language 注入
//
// 覆盖：
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
// ADR-0088 P6 (2026-08-02 phase 3.4)：从 work-context-builder.test.ts 拆出 P0/P1 部分
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { buildWorkContext, renderContextHuman, loadPerWorkBlueprints } from '../work-context-builder'

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
    blueprintDomainName?: string
    blueprintDomainContent?: string
    includeBlueprintsJson?: boolean
  }): void {
    const { blueprintDomainName = 'TrustChain', blueprintDomainContent = '', includeBlueprintsJson = true } = opts
    const workDir = join(tmpDir, '.openxenon', 'works', workName)
    mkdirSync(workDir, { recursive: true })

    writeFileSync(
      join(workDir, 'work.md'),
      `---\nentity: work\nversion: 0.7.0\nname: ${workName}\n---\n` +
        `# Work: ${workName}\n\n` +
        `## Context\n### main\n- goal: demo\n- constraints: []\n\n` +
        `## Refs\n### TrustChain\n- kind: domain\n- ref: @prj/domains/TrustChain\n\n` +
        `## Tasks\n### step1\n- domain: TrustChain\n`,
    )

    const domainsDir = join(tmpDir, '.openxenon', 'domains')
    mkdirSync(domainsDir, { recursive: true })
    writeFileSync(
      join(domainsDir, `${blueprintDomainName}.md`),
      blueprintDomainContent ||
        `# Domain: ${blueprintDomainName}\n> 信任链\n\n## Externals\n### adr-0057\n- path: a.md\n- kind: adr\n`,
    )

    if (includeBlueprintsJson) {
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
                ref: `@prj/domains/${blueprintDomainName}`,
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
    expect(ctx.domainExternals).toBeDefined()
    expect(ctx.domainExternals?.[0]?.domainName).toBe('TrustChain')
  })

  test('boundary: blueprint 引用不存在的 Domain → 该条目被跳过（不抛错）', () => {
    setupWithBlueprints({
      blueprintDomainName: 'NonExistent',
    })
    const ctx = buildWorkContext({ projectRoot: tmpDir, workName, assetFormat: 'md', lockCheck: false })
    expect(ctx.blueprintIR).toBeDefined()
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
    const idx = loadPerWorkBlueprints(tmpDir, workName)
    expect(idx).toBeNull()
  })
})
