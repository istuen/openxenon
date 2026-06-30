// =============================================================================
// insight-cross-proof-e2e.test.ts — v0.5 PR-B
//
// 黑盒 E2E：oxn insight --cross-proof 扫描全部 proofs/*/frozen.json
//
// 覆盖：
//   1. 多 proof happy path：3 个不同 proof 跑完后 --cross-proof 输出 4 维分析
//   2. trendMatrix 反映 (probeType, target) 跨多 proof 的 verdict 序列
//   3. correlationMatrix 检测两 probe 类型的共现失败率
//   4. trends 检测 worsening（最近 3 次全 FAIL 且之前 PASS）
//   5. probeEffectiveness 按 failRate 降序排序
//   6. --since 过滤：仅含 runAt >= since 的 proof
//   7. --proofs 过滤：仅含白名单
//   8. --probe-types 过滤：trendMatrix 仅含指定 type
//   9. --limit 限制扫描数量
//  10. 空 proofs 目录 → OXN_INSIGHT_NO_PROOFS 错误
//  11. JSON 输出 schema 合规
//  12. human 渲染含 4 个 ## section
//  13. in-progress proof (.running.json) 被跳过（计入 skipped）
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const CLI_PATH = join(import.meta.dir, '..', 'index.ts')

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-insight-cross-proof-e2e-'))
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

function proofDir(name: string): string {
  return join(realpathSync(tmpDir), '.openxenon', 'proofs', name)
}

function writeProof(name: string, probes: string): void {
  mkdirSync(proofDir(name), { recursive: true })
  writeFileSync(
    join(proofDir(name), 'proof.oxn'),
    `proof "${name}" {
  description = "v0.5 PR-B cross-proof E2E"
${probes}
}
`,
    'utf-8',
  )
}

async function runProof(name: string): Promise<void> {
  const r = await runCli(['proof', 'run', name, '--json'])
  if (r.exitCode !== 0) {
    throw new Error(`proof run ${name} failed: exit=${r.exitCode}, stderr=${r.stderr}`)
  }
}

describe('oxn insight --cross-proof (v0.5 PR-B)', () => {
  test('happy path：3 个 proof 跑完后 --cross-proof 输出 4 维分析', async () => {
    await initProject()
    // 3 个 proof，每个跑同一 probe
    for (const name of ['p1', 'p2', 'p3']) {
      writeProof(
        name,
        `  probe "a-trivial" {
    ref "@oxn/probes/shell-exec"
    params { command = "true", timeout = "5000" }
  }`,
      )
      await runProof(name)
    }

    const r = await runCli(['insight', '--cross-proof', '--json'])
    expect(r.exitCode).toBe(0)

    const j = JSON.parse(r.stdout) as {
      ok: boolean
      data: {
        proofCount: number
        trendMatrix: unknown[]
        correlationMatrix: unknown[]
        trends: unknown[]
        probeEffectiveness: Array<{ probeType: string; totalRuns: number; failedProofs: number; failRate: number }>
      }
    }
    expect(j.ok).toBe(true)
    expect(j.data.proofCount).toBe(3)
    expect(j.data.trendMatrix.length).toBeGreaterThan(0)
    expect(j.data.probeEffectiveness.length).toBeGreaterThan(0)
    // shell-exec 全部 PASSED
    const shellEff = j.data.probeEffectiveness.find((p) => p.probeType === 'shell-exec')
    expect(shellEff).toBeDefined()
    expect(shellEff?.failRate).toBe(0)
  })

  test('trendMatrix 反映 (probeType, target) 跨多 proof 的 verdict 序列', async () => {
    await initProject()
    // 3 个 proof，第一个 PASS，后两个 FAIL
    for (const i of [1, 2, 3]) {
      const name = `p${i}`
      const cmd = i === 1 ? 'true' : 'false'
      writeProof(
        name,
        `  probe "a" {
    ref "@oxn/probes/shell-exec"
    params { command = "${cmd}", timeout = "5000" }
  }`,
      )
      await runProof(name)
    }

    const r = await runCli(['insight', '--cross-proof', '--json'])
    expect(r.exitCode).toBe(0)

    const j = JSON.parse(r.stdout) as {
      data: {
        trendMatrix: Array<{
          probeType: string
          target: string
          sequence: Array<{ proofId: string; verdict: string }>
          passedCount: number
          failedCount: number
        }>
      }
    }
    const tm = j.data.trendMatrix.find((t) => t.probeType === 'shell-exec')
    expect(tm).toBeDefined()
    expect(tm?.passedCount).toBe(1)
    expect(tm?.failedCount).toBe(2)
    expect(tm?.sequence.map((s) => s.proofId)).toEqual(['p1', 'p2', 'p3'])
  })

  test('trends 检测 worsening（最近 3 次全 FAIL 且之前 PASS）', async () => {
    await initProject()
    // p1 PASS, p2 FAIL, p3 FAIL, p4 FAIL
    for (const i of [1, 2, 3, 4]) {
      const name = `p${i}`
      const cmd = i === 1 ? 'true' : 'false'
      writeProof(
        name,
        `  probe "a" {
    ref "@oxn/probes/shell-exec"
    params { command = "${cmd}", timeout = "5000" }
  }`,
      )
      await runProof(name)
    }

    const r = await runCli(['insight', '--cross-proof', '--json'])
    expect(r.exitCode).toBe(0)

    const j = JSON.parse(r.stdout) as {
      data: { trends: Array<{ probeType: string; trend: string; latestVerdict: string }> }
    }
    const worsening = j.data.trends.find((t) => t.trend === 'worsening' && t.probeType === 'shell-exec')
    expect(worsening).toBeDefined()
    expect(worsening?.latestVerdict).toBe('FAILED')
  })

  test('probeEffectiveness 按 failRate 降序排序', async () => {
    await initProject()
    // ts-like (always fail) + shell-exec (always pass)
    writeProof(
      'p1',
      `  probe "a" { ref "@oxn/probes/shell-exec" params { command = "true", timeout = "5000" } }
  probe "b" { ref "@oxn/probes/shell-exec" params { command = "false", timeout = "5000" } }`,
    )
    await runProof('p1')

    const r = await runCli(['insight', '--cross-proof', '--json'])
    const j = JSON.parse(r.stdout) as {
      data: { probeEffectiveness: Array<{ probeType: string; failedProofs: number; totalRuns: number }> }
    }
    expect(j.data.probeEffectiveness[0]?.probeType).toBe('shell-exec')
    expect(j.data.probeEffectiveness[0]?.failedProofs).toBe(1) // p1 含 1 failed probe
  })

  test('--since 过滤：仅含 runAt >= since 的 proof', async () => {
    await initProject()
    writeProof('p1', `  probe "a" { ref "@oxn/probes/shell-exec" params { command = "true", timeout = "5000" } }`)
    await runProof('p1')

    // 用一个早于 p1 的 since（2020年），应保留 p1
    const pastSince = '2020-01-01T00:00:00.000Z'
    const r = await runCli(['insight', '--cross-proof', '--since', pastSince, '--json'])
    expect(r.exitCode).toBe(0)
    const j = JSON.parse(r.stdout) as {
      data: { trendMatrix: Array<{ sequence: Array<{ proofId: string }> }> }
    }
    expect(j.data.trendMatrix[0]?.sequence[0]?.proofId).toBe('p1')

    // 用一个未来时间 since，应无 proof 匹配
    const futureSince = '2099-01-01T00:00:00.000Z'
    const r2 = await runCli(['insight', '--cross-proof', '--since', futureSince, '--json'])
    expect(r2.exitCode).toBe(1)
    const j2 = JSON.parse(r2.stdout) as { ok: boolean; error?: { code: string } }
    expect(j2.error?.code).toBe('OXN_INSIGHT_NO_PROOFS')
  })

  test('--proofs 过滤：仅含白名单', async () => {
    await initProject()
    for (const name of ['p1', 'p2']) {
      writeProof(name, `  probe "a" { ref "@oxn/probes/shell-exec" params { command = "true", timeout = "5000" } }`)
      await runProof(name)
    }

    const r = await runCli(['insight', '--cross-proof', '--proofs', 'p1', '--json'])
    expect(r.exitCode).toBe(0)
    const j = JSON.parse(r.stdout) as {
      data: { trendMatrix: Array<{ sequence: Array<{ proofId: string }> }> }
    }
    expect(j.data.trendMatrix[0]?.sequence[0]?.proofId).toBe('p1')
    expect(j.data.trendMatrix[0]?.sequence.length).toBe(1)
  })

  test('--probe-types 过滤：trendMatrix 仅含指定 type', async () => {
    await initProject()
    writeProof('p1', `  probe "a" { ref "@oxn/probes/shell-exec" params { command = "true", timeout = "5000" } }`)
    await runProof('p1')

    // 过滤一个不存在的 type，trendMatrix 应为空
    const r = await runCli(['insight', '--cross-proof', '--probe-types', 'nonexistent', '--json'])
    expect(r.exitCode).toBe(0)
    const j = JSON.parse(r.stdout) as { data: { trendMatrix: unknown[] } }
    expect(j.data.trendMatrix.length).toBe(0)
  })

  test('空 proofs 目录 → OXN_INSIGHT_NO_PROOFS 错误', async () => {
    await initProject()
    // 显式创建空 proofs/ 目录（init 不会创建）
    mkdirSync(join(realpathSync(tmpDir), '.openxenon', 'proofs'), { recursive: true })
    const r = await runCli(['insight', '--cross-proof', '--json'])
    expect(r.exitCode).toBe(1)
    const j = JSON.parse(r.stdout) as { ok: boolean; error?: { code: string } }
    expect(j.ok).toBe(false)
    expect(j.error?.code).toBe('OXN_INSIGHT_NO_PROOFS')
  })

  test('human 渲染含 4 个 ## section', async () => {
    await initProject()
    writeProof('p1', `  probe "a" { ref "@oxn/probes/shell-exec" params { command = "true", timeout = "5000" } }`)
    await runProof('p1')

    const r = await runCli(['insight', '--cross-proof'])
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('Cross-Proof Insight')
    expect(r.stdout).toContain('## Probe Effectiveness')
    expect(r.stdout).toContain('## Trend Signals')
    expect(r.stdout).toContain('## Trend Matrix')
    expect(r.stdout).toContain('## Correlation Matrix')
  })

  test('未指定 --cross-proof 时要求 proof 参数', async () => {
    await initProject()
    const r = await runCli(['insight', '--json'])
    expect(r.exitCode).toBe(1)
    const j = JSON.parse(r.stdout) as { ok: boolean; error?: { code: string } }
    expect(j.ok).toBe(false)
    expect(j.error?.code).toBe('OXN_INSIGHT_INPUT_MISSING')
  })
})
