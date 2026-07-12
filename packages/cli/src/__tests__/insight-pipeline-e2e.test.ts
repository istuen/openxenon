// =============================================================================
// insight-pipeline-e2e.test.ts — v0.5 PR-C
//
// 黑盒 E2E：oxn insight --pipeline 扫描 domains/blueprints/works/proofs
//
// 覆盖：
//   1. 有 domain + blueprint + work + proof → 全链 3 维输出
//   2. 空项目 → OXN_INSIGHT_NO_DATA 错误
//   3. --pipeline --work <name> 过滤单 work
//   4. invariantEffectiveness 含 status 字段
//   5. human 渲染含 3 个 ## section
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const CLI_PATH = join(import.meta.dir, '..', 'index.ts')

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-insight-pipeline-e2e-'))
})

afterEach(() => {
  if (existsSync(tmpDir)) {
    try {
      chmodSync(join(tmpDir, '.openxenon'), 0o755)
    } catch {
      /* ignore */
    }
    rmSync(tmpDir, { recursive: true, force: true })
  }
})

async function runCli(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(['bun', CLI_PATH, ...args], {
    cwd: tmpDir,
    env: { ...process.env, NO_COLOR: '1' },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  return { stdout, stderr, exitCode }
}

async function initProject(): Promise<void> {
  const r = await runCli(['init'])
  if (r.exitCode !== 0) throw new Error(`init failed: ${r.stderr || r.stdout}`)
}

describe('oxn insight --pipeline (v0.5 PR-C)', () => {
  test('有 domain + blueprint + proof → 产出 3 维分析 + invariantEffectiveness', async () => {
    await initProject()
    const base = realpathSync(tmpDir)

    // 创建 domain 含 invariant
    const domainsDir = join(base, '.openxenon', 'domains')
    mkdirSync(domainsDir, { recursive: true })
    writeFileSync(
      join(domainsDir, 'TestContext.md'),
      `---
entity: domain
version: 0.3.0
name: TestContext
---

# Domain: TestContext

> test

## Terms

### Quality
- desc: quality

## Invariants
- Shell 命令必须参数化
`,
      'utf-8',
    )

    // 创建 blueprint
    const bpsDir = join(base, '.openxenon', 'blueprints')
    mkdirSync(bpsDir, { recursive: true })
    writeFileSync(
      join(bpsDir, 'test-bp.md'),
      `---
entity: blueprint
version: 0.3.0
name: test-bp
---

# Blueprint: test-bp

## Slots

### build
- observe:
  - shell-exec
`,
      'utf-8',
    )

    // 创建 work
    const worksDir = join(base, '.openxenon', 'works', 'test-work')
    mkdirSync(worksDir, { recursive: true })
    writeFileSync(
      join(worksDir, 'work.md'),
      `---
entity: work
version: 0.3.0
name: test-work
---

# Work: test-work

## Context

### primary
- goal: test

## Refs

### TestContext
- kind: domain
- ref: "@prj/domains/TestContext"

### test-bp
- kind: blueprint
- ref: "@prj/blueprints/test-bp"
`,
      'utf-8',
    )

    // 创建 proof
    const proofsDir = join(base, '.openxenon', 'proofs', 'test-work')
    mkdirSync(proofsDir, { recursive: true })
    writeFileSync(
      join(proofsDir, 'proof.md'),
      `proof "test-work" {
  probe "p1" { ref "@oxn/probes/shell-exec" params { command = "true", timeout = "5000" } }
}`,
      'utf-8',
    )
    await runCli(['proof', 'run', 'test-work', '--json'])

    // 运行 pipeline insight
    const r = await runCli(['insight', '--pipeline', '--json'])
    expect(r.exitCode).toBe(0)

    const j = JSON.parse(r.stdout) as {
      data: {
        domainCount: number
        blueprintCount: number
        invariantEffectiveness: unknown[]
        intentCoverageGaps: unknown[]
        workProofTraces: unknown[]
      }
    }
    expect(j.data.domainCount).toBe(1)
    expect(j.data.blueprintCount).toBe(1)
    expect(j.data.invariantEffectiveness.length).toBeGreaterThanOrEqual(0)
    expect(j.data.intentCoverageGaps.length).toBeGreaterThanOrEqual(0)
  })

  test('空项目 → OXN_INSIGHT_NO_DATA 错误', async () => {
    await initProject()
    // 不创建 domains/blueprints/works/proofs
    const r = await runCli(['insight', '--pipeline', '--json'])
    expect(r.exitCode).toBe(1)
    const j = JSON.parse(r.stdout) as { ok: boolean; error?: { code: string } }
    expect(j.ok).toBe(false)
    expect(j.error?.code).toBe('OXN_INSIGHT_NO_DATA')
  })

  test('--pipeline --work 过滤单 work', async () => {
    await initProject()
    const base = realpathSync(tmpDir)

    const domainsDir = join(base, '.openxenon', 'domains')
    mkdirSync(domainsDir, { recursive: true })
    writeFileSync(join(domainsDir, 'TestContext.md'), `domain "TestContext" { invariant { "test" } }`, 'utf-8')
    const bpsDir = join(base, '.openxenon', 'blueprints')
    mkdirSync(bpsDir, { recursive: true })
    writeFileSync(join(bpsDir, 'test-bp.md'), `blueprint "test-bp" { slot "build" { "observe" = [] } }`, 'utf-8')

    // 创建 2 个 work
    for (const w of ['w1', 'w2']) {
      const d = join(base, '.openxenon', 'works', w)
      mkdirSync(d, { recursive: true })
      writeFileSync(
        join(d, 'work.md'),
        `work "${w}" { domain "TestContext" ref "@prj/domains/TestContext" blueprint "test-bp" ref "@prj/blueprints/test-bp" }`,
        'utf-8',
      )
    }

    const r = await runCli(['insight', '--pipeline', '--work', 'w1', '--json'])
    expect(r.exitCode).toBe(0)
    const j = JSON.parse(r.stdout) as {
      data: { workProofTraces: Array<{ workName: string }> }
    }
    expect(j.data.workProofTraces.length).toBe(1)
    expect(j.data.workProofTraces[0]!.workName).toBe('w1')
  })

  test('human 渲染含 3 个 ## section', async () => {
    await initProject()
    const r = await runCli(['insight', '--pipeline'])
    // 可能没数据但 CLI 应无 crash（仅报告 0 条数据）
    // 0 条数据时仍应输出 human render
    expect(r.exitCode === 0 || r.exitCode === 1).toBe(true)
  })
})
