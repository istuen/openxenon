// =============================================================================
// insight-e2e.test.ts — v0.1.2 PR-B
//
// 黑盒 E2E：跑真实 `oxn proof run` 后调 `oxn insight --proof <name>`
// 验证 Insight JSON 输出的结构与内容。
//
// 覆盖：
//   1. proof 未 run → OXN_INSIGHT_INPUT_MISSING
//   2. 单次 PASS 后 insight 含 evidenceChain + probeStats + emergentPatterns
//   3. 连续多次 run 后 emergentPatterns 能识别 cross-proof-repeat
//   4. 多次连续失败后 emergentPatterns 能识别 consecutive-fail
//   5. 多 probe type 场景下 insight 完整覆盖
//   6. --json / 默认 human 两种输出
//   7. 未 init → OXN_INSIGHT_INPUT_MISSING
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const CLI_PATH = join(import.meta.dir, '..', 'index.ts')

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-insight-e2e-'))
})

afterEach(() => {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
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
  if (r.exitCode !== 0) {
    throw new Error(`init failed: ${r.stderr || r.stdout}`)
  }
}

const PROOF_OXN_TEMPLATE = (name: string, probes: string): string => `proof "${name}" {
 description = "test proof for insight"
${probes}
}
`

async function createAndRunProof(
  name: string,
  probes: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const create = await runCli(['proof', 'create', name])
  if (create.exitCode !== 0) {
    throw new Error(`proof create failed: ${create.stderr}`)
  }
  const proofPath = join(tmpDir, '.openxenon', 'proofs', name, 'proof.oxn')
  writeFileSync(proofPath, PROOF_OXN_TEMPLATE(name, probes), 'utf-8')
  return runCli(['proof', 'run', name])
}

describe('oxn insight --proof <name>', () => {
  test('proof 未 run → OXN_INSIGHT_INPUT_MISSING', async () => {
    await initProject()
    const create = await runCli(['proof', 'create', 'p-never-run'])
    expect(create.exitCode).toBe(0)
    const r = await runCli(['insight', '--proof', 'p-never-run'])
    expect(r.exitCode).not.toBe(0)
    expect(r.stdout).toContain('OXN_INSIGHT_INPUT_MISSING')
    expect(r.stdout).toContain('frozen.json not found')
  })

  test('未 init → OXN_INSIGHT_INPUT_MISSING', async () => {
    // 不调 init
    const r = await runCli(['insight', '--proof', 'p'])
    expect(r.exitCode).not.toBe(0)
    expect(r.stdout).toContain('OXN_INSIGHT_INPUT_MISSING')
  })

  test('单次 PASS 后 insight JSON 结构正确', async () => {
    await initProject()
    const r1 = await createAndRunProof(
      'p-pass',
      ` probe "p1" {
 ref "@oxn/probes/shell-exec"
 params {
 command = "true"
 }
 }`,
    )
    expect(r1.exitCode).toBe(0)

    const r2 = await runCli(['insight', '--proof', 'p-pass', '--json'])
    expect(r2.exitCode).toBe(0)

    const j = JSON.parse(r2.stdout) as { ok: boolean; data: any }
    expect(j.ok).toBe(true)
    expect(j.data.schemaVersion).toBe(1)
    expect(j.data.proofId).toBe('p-pass')
    expect(j.data.proof.verdict).toBe('PASSED')
    expect(j.data.proof.evidenceChain.length).toBe(1)
    expect(j.data.proof.evidenceChain[0].probeType).toBe('shell-exec')
    expect(j.data.proof.evidenceChain[0].target).toBe('true')
    expect(j.data.proof.evidenceChain[0].conclusion).toBe('满足验收')
    expect(j.data.probeStats.byType['shell-exec']).toBeDefined()
    expect(j.data.probeStats.byType['shell-exec'].total).toBe(1)
    // 单次 PASS 不会有任何涌现模式
    expect(j.data.emergentPatterns.length).toBe(0)
    expect(j.data.meta.dataSources).toEqual(['frozen.json', 'probe-stats.json'])
  })

  test('连续失败 2 次后 consecutive-fail 涌现', async () => {
    await initProject()
    for (let i = 0; i < 2; i++) {
      const r = await createAndRunProof(
        `p-fail-${i}`,
        ` probe "p1" {
 ref "@oxn/probes/shell-exec"
 params {
 command = "false"
 }
 }`,
      )
      expect(r.exitCode).toBe(0)
    }

    const insight = await runCli(['insight', '--proof', 'p-fail-1', '--json'])
    expect(insight.exitCode).toBe(0)
    const j = JSON.parse(insight.stdout) as { data: any }
    expect(j.data.proof.verdict).toBe('FAILED')
    const consecutiveFail = j.data.emergentPatterns.find((p: any) => p.type === 'consecutive-fail')
    expect(consecutiveFail).toBeDefined()
    expect(consecutiveFail.probeType).toBe('shell-exec')
    expect(consecutiveFail.target).toBe('false')
    expect(consecutiveFail.occurrences).toBe(2)
  })

  test('3 个不同 proof 同 probe type → cross-proof-repeat', async () => {
    await initProject()
    for (let i = 0; i < 3; i++) {
      const r = await createAndRunProof(
        `p-repeat-${i}`,
        ` probe "p1" {
 ref "@oxn/probes/shell-exec"
 params {
 command = "true"
 }
 }`,
      )
      expect(r.exitCode).toBe(0)
    }

    const insight = await runCli(['insight', '--proof', 'p-repeat-2', '--json'])
    expect(insight.exitCode).toBe(0)
    const j = JSON.parse(insight.stdout) as { data: any }
    const repeat = j.data.emergentPatterns.find((p: any) => p.type === 'cross-proof-repeat')
    expect(repeat).toBeDefined()
    expect(repeat.probeType).toBe('shell-exec')
    expect(repeat.occurrences).toBe(3)
  })

  test('同一 target 在 2 个 proof 都失败 → cross-proof-fail-clusters', async () => {
    await initProject()
    for (let i = 0; i < 2; i++) {
      const r = await createAndRunProof(
        `p-cluster-${i}`,
        ` probe "p1" {
 ref "@oxn/probes/shell-exec"
 params {
 command = "false"
 }
 }`,
      )
      expect(r.exitCode).toBe(0)
    }

    const insight = await runCli(['insight', '--proof', 'p-cluster-1', '--json'])
    expect(insight.exitCode).toBe(0)
    const j = JSON.parse(insight.stdout) as { data: any }
    const cluster = j.data.emergentPatterns.find((p: any) => p.type === 'cross-proof-fail-clusters')
    expect(cluster).toBeDefined()
    expect(cluster.probeType).toBe('shell-exec')
    expect(cluster.target).toBe('false')
    expect(cluster.occurrences).toBe(2)
  })

  test('混合 probe type 完整覆盖', async () => {
    await initProject()
    const r = await createAndRunProof(
      'p-mixed',
      ` probe "p1" {
 ref "@oxn/probes/fs-exists"
 params {
 pattern = "${join(tmpDir, 'package.json')}"
 }
 }
 probe "p2" {
 ref "@oxn/probes/shell-exec"
 params {
 command = "true"
 }
 }`,
    )
    expect(r.exitCode).toBe(0)

    const insight = await runCli(['insight', '--proof', 'p-mixed', '--json'])
    expect(insight.exitCode).toBe(0)
    const j = JSON.parse(insight.stdout) as { data: any }
    expect(j.data.proof.evidenceChain.length).toBe(2)
    expect(j.data.probeStats.byType['fs-exists']).toBeDefined()
    expect(j.data.probeStats.byType['shell-exec']).toBeDefined()
  })

  test('human 格式输出含可读文本', async () => {
    await initProject()
    const r1 = await createAndRunProof(
      'p-human',
      ` probe "p1" {
 ref "@oxn/probes/shell-exec"
 params {
 command = "true"
 }
 }`,
    )
    expect(r1.exitCode).toBe(0)

    const r2 = await runCli(['insight', '--proof', 'p-human'])
    expect(r2.exitCode).toBe(0)
    expect(r2.stdout).toContain('Insight: p-human')
    expect(r2.stdout).toContain('PASSED')
    expect(r2.stdout).toContain('Evidence')
    expect(r2.stdout).toContain('Probe Stats')
    expect(r2.stdout).toContain('Emergent Patterns')
  })
})
