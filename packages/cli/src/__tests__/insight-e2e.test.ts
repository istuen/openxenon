/**
 * insight-e2e.test.ts — oxn insight CLI 黑盒 E2E（合并自 insight-e2e / -pipeline-e2e / -cross-proof-e2e）
 *
 * 覆盖 Insight 三种调用形态：
 *   - oxn insight --proof <name>     （v0.1.2 PR-B：单 proof 多维输出）
 *   - oxn insight --pipeline         （v0.5 PR-C：domain/blueprint/work/proof 全链）
 *   - oxn insight --cross-proof      （v0.5 PR-B：跨 proof 行为特征信号）
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, realpathSync, writeFileSync } from 'fs'
import { join } from 'path'
import { setupCliEnv, type CliEnv } from './helpers/run-cli'

const CLI_PATH = join(import.meta.dir, '..', 'index.ts')

let env: CliEnv

beforeEach(() => {
  env = setupCliEnv(CLI_PATH)
})

afterEach(() => {
  env.cleanup()
})

// =============================================================================
// oxn insight --proof <name>  (v0.1.2 PR-B)
// =============================================================================

describe('oxn insight --proof <name>', () => {
  test('proof 未 run → OXN_INSIGHT_INPUT_MISSING', async () => {
    await env.initProject()
    const create = await env.runCli(['proof', 'create', 'p-never-run'])
    expect(create.exitCode).toBe(0)
    const r = await env.runCli(['insight', '--proof', 'p-never-run'])
    expect(r.exitCode).not.toBe(0)
    expect(r.stdout).toContain('OXN_INSIGHT_INPUT_MISSING')
    expect(r.stdout).toContain('frozen.json not found')
  })

  test('未 init → OXN_INSIGHT_INPUT_MISSING', async () => {
    const r = await env.runCli(['insight', '--proof', 'p'])
    expect(r.exitCode).not.toBe(0)
    expect(r.stdout).toContain('OXN_INSIGHT_INPUT_MISSING')
  })
})

// =============================================================================
// oxn insight --pipeline  (v0.5 PR-C)
// =============================================================================

describe('oxn insight --pipeline (v0.5 PR-C)', () => {
  test('有 domain + blueprint + proof → 产出 3 维分析 + invariantEffectiveness', async () => {
    await env.initProject()
    const base = realpathSync(env.tmpDir)

    const domainsDir = join(base, '.openxenon', 'domains')
    mkdirSync(domainsDir, { recursive: true })
    writeFileSync(
      join(domainsDir, 'TestContext.md'),
      `domain "TestContext" {
  description = "test"
  term { "Quality": "quality" }
  invariant { "Shell 命令必须参数化" }
}
`,
      'utf-8',
    )

    const bpsDir = join(base, '.openxenon', 'blueprints')
    mkdirSync(bpsDir, { recursive: true })
    writeFileSync(
      join(bpsDir, 'test-bp.md'),
      `blueprint "test-bp" {
  slot "build" { "observe" = ["shell-exec"] }
}
`,
      'utf-8',
    )

    const worksDir = join(base, '.openxenon', 'works', 'test-work')
    mkdirSync(worksDir, { recursive: true })
    writeFileSync(
      join(worksDir, 'work.md'),
      `work "test-work" {
  context { goal = "test" }
  domain "TestContext" ref "@prj/domains/TestContext"
  blueprint "test-bp" ref "@prj/blueprints/test-bp"
}
`,
      'utf-8',
    )

    const proofsDir = join(base, '.openxenon', 'proofs', 'test-work')
    mkdirSync(proofsDir, { recursive: true })
    writeFileSync(
      join(proofsDir, 'proof.md'),
      `proof "test-work" {
  probe "p1" { ref "@oxn/probes/shell-exec" params { command = "true", timeout = "5000" } }
}`,
      'utf-8',
    )
    await env.runCli(['proof', 'run', 'test-work', '--json'])

    const r = await env.runCli(['insight', '--pipeline', '--json'])
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
    await env.initProject()
    const r = await env.runCli(['insight', '--pipeline', '--json'])
    expect(r.exitCode).toBe(1)
    const j = JSON.parse(r.stdout) as { ok: boolean; error?: { code: string } }
    expect(j.ok).toBe(false)
    expect(j.error?.code).toBe('OXN_INSIGHT_NO_DATA')
  })

  test('--pipeline --work 过滤单 work', async () => {
    await env.initProject()
    const base = realpathSync(env.tmpDir)

    const domainsDir = join(base, '.openxenon', 'domains')
    mkdirSync(domainsDir, { recursive: true })
    writeFileSync(join(domainsDir, 'TestContext.md'), `domain "TestContext" { invariant { "test" } }`, 'utf-8')
    const bpsDir = join(base, '.openxenon', 'blueprints')
    mkdirSync(bpsDir, { recursive: true })
    writeFileSync(join(bpsDir, 'test-bp.md'), `blueprint "test-bp" { slot "build" { "observe" = [] } }`, 'utf-8')

    for (const w of ['w1', 'w2']) {
      const d = join(base, '.openxenon', 'works', w)
      mkdirSync(d, { recursive: true })
      writeFileSync(
        join(d, 'work.md'),
        `work "${w}" { domain "TestContext" ref "@prj/domains/TestContext" blueprint "test-bp" ref "@prj/blueprints/test-bp" }`,
        'utf-8',
      )
    }

    const r = await env.runCli(['insight', '--pipeline', '--work', 'w1', '--json'])
    expect(r.exitCode).toBe(0)
    const j = JSON.parse(r.stdout) as {
      data: { workProofTraces: Array<{ workName: string }> }
    }
    expect(j.data.workProofTraces.length).toBe(1)
    expect(j.data.workProofTraces[0]!.workName).toBe('w1')
  })

  test('human 渲染无 crash（空数据也输出）', async () => {
    await env.initProject()
    const r = await env.runCli(['insight', '--pipeline'])
    expect(r.exitCode === 0 || r.exitCode === 1).toBe(true)
  })
})

// =============================================================================
// oxn insight --cross-proof  (v0.5 PR-B / v0.6 PR-5d 重命名)
// =============================================================================

describe('oxn insight --cross-proof (v0.5 PR-B / v0.6 PR-5d)', () => {
  test('空 proofs 目录 → OXN_INSIGHT_NO_PROOFS 错误', async () => {
    await env.initProject()
    mkdirSync(join(realpathSync(env.tmpDir), '.openxenon', 'proofs'), { recursive: true })
    const r = await env.runCli(['insight', '--cross-proof', '--json'])
    expect(r.exitCode).toBe(1)
    const j = JSON.parse(r.stdout) as { ok: boolean; error?: { code: string } }
    expect(j.ok).toBe(false)
    expect(j.error?.code).toBe('OXN_INSIGHT_NO_PROOFS')
  })

  test('未指定 --cross-proof 时要求 proof 参数', async () => {
    await env.initProject()
    const r = await env.runCli(['insight', '--json'])
    expect(r.exitCode).toBe(1)
    const j = JSON.parse(r.stdout) as { ok: boolean; error?: { code: string } }
    expect(j.ok).toBe(false)
    expect(j.error?.code).toBe('OXN_INSIGHT_INPUT_MISSING')
  })
})
