// =============================================================================
// work-context-builder.test.ts — External 注入到 Work 上下文覆盖
//
// 覆盖本会话新增的两层注入模型（Work 消化，Task 自包含）在 context builder 的落点：
//   1. renderContextHuman 渲染 "## External References (read during Intent)"
//   2. 无 domainExternals 时不渲染 External 段
//   3. buildWorkContext（Work 级，无 --task）从引用 Domain 收集 domainExternals
//   4. Domain 无 externals → domainExternals 省略
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { buildWorkContext, renderContextHuman } from '../work-context-builder'

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
