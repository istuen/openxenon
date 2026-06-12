// =============================================================================
// proof-stats-e2e.test.ts — v0.1.2 PR-A
//
// 黑盒 E2E：跑真实 `oxn proof run` 后 .openxenon/.cache/probe-stats.json
// 自动累加。
//
// 覆盖：
//   1. 单次 run 后 probe-stats.json 被创建且 verdict 正确
//   2. 多次 run 后 stats 累加（total/pass/fail + targets）
//   3. 连续失败时 consecutiveFails 累加
//   4. 未 init → probe-stats.json 不被创建（run 走 IAP 错误通路）
//   5. run 后 verdict 正常返回（即便 stats 写盘失败也不影响主流程）
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const CLI_PATH = join(import.meta.dir, '..', 'index.ts')

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-proof-stats-e2e-'))
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
 description = "test proof for stats"
${probes}
}
`

async function createAndRunProof(
  name: string,
  probes: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  // 1. create
  const create = await runCli(['proof', 'create', name])
  if (create.exitCode !== 0) {
    throw new Error(`proof create failed: ${create.stderr}`)
  }
  // 2. 覆盖 proof.oxn 模板（含多个 probe）
  const proofPath = join(tmpDir, '.openxenon', 'proofs', name, 'proof.oxn')
  writeFileSync(proofPath, PROOF_OXN_TEMPLATE(name, probes), 'utf-8')
  // 3. run
  return runCli(['proof', 'run', name])
}

function readStatsFile(): any {
  const p = join(tmpDir, '.openxenon', '.cache', 'probe-stats.json')
  if (!existsSync(p)) return null
  return JSON.parse(readFileSync(p, 'utf-8'))
}

describe('oxn proof run → probe-stats.json', () => {
  test('happy path：单次 PASS 写入 stats', async () => {
    await initProject()
    // 用 shell-exec 'true' 保证 PASS
    const r = await createAndRunProof(
      'p-pass',
      ` probe "p1" {
 ref "@oxn/probes/shell-exec"
 params {
 command = "true"
 }
 }`,
    )
    expect(r.exitCode).toBe(0)

    const stats = readStatsFile()
    expect(stats).not.toBeNull()
    expect(stats.schemaVersion).toBe(1)
    // projectRoot 在 cwd 是 /tmp/* 时会被解析到 /private/var/folders/... (macOS)
    // 只断言后缀匹配
    expect(stats.projectRoot.endsWith(tmpDir.slice(tmpDir.lastIndexOf('oxn-proof-stats-e2e-')))).toBe(true)
    expect(stats.proofRuns.length).toBe(1)
    expect(stats.proofRuns[0]?.proofId).toBe('p-pass')
    expect(stats.proofRuns[0]?.verdict).toBe('PASSED')
    expect(stats.probes['shell-exec'].totalCount).toBe(1)
    expect(stats.probes['shell-exec'].passCount).toBe(1)
    expect(stats.probes['shell-exec'].targets['true'].pass).toBe(1)
  })

  test('单次 FAIL → stats 记录失败', async () => {
    await initProject()
    // shell-exec 'false' 一定 FAIL
    const r = await createAndRunProof(
      'p-fail',
      ` probe "p1" {
 ref "@oxn/probes/shell-exec"
 params {
 command = "false"
 }
 }`,
    )
    // 注意：proof run 即便 FAIL 也返回 exit 0（业务结果非异常）
    expect(r.exitCode).toBe(0)

    const stats = readStatsFile()
    expect(stats.proofRuns[0]?.verdict).toBe('FAILED')
    expect(stats.probes['shell-exec'].failCount).toBe(1)
    expect(stats.probes['shell-exec'].targets['false'].consecutiveFails).toBe(1)
  })

  test('多次 run 累加 stats', async () => {
    await initProject()
    for (let i = 0; i < 3; i++) {
      const r = await createAndRunProof(
        `p-multi-${i}`,
        ` probe "p1" {
 ref "@oxn/probes/shell-exec"
 params {
 command = "true"
 }
 }`,
      )
      expect(r.exitCode).toBe(0)
    }

    const stats = readStatsFile()
    expect(stats.proofRuns.length).toBe(3)
    expect(stats.proofRuns.map((r: any) => r.proofId)).toEqual(['p-multi-0', 'p-multi-1', 'p-multi-2'])
    expect(stats.probes['shell-exec'].totalCount).toBe(3)
    expect(stats.probes['shell-exec'].passCount).toBe(3)
    expect(stats.probes['shell-exec'].targets['true'].total).toBe(3)
  })

  test('同一 target 连续失败 → consecutiveFails 累加', async () => {
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

    const stats = readStatsFile()
    expect(stats.probes['shell-exec'].targets['false'].consecutiveFails).toBe(2)
    expect(stats.probes['shell-exec'].targets['false'].fail).toBe(2)
  })

  test('不同 probe type 同时被记录', async () => {
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

    const stats = readStatsFile()
    expect(stats.probes['fs-exists']).toBeDefined()
    expect(stats.probes['shell-exec']).toBeDefined()
    expect(stats.proofRuns[0]?.probeSummary.length).toBe(2)
  })

  test('未 init → proof run 报错，不创建 stats', async () => {
    // 不调 init，直接尝试创建 + 跑 proof
    const create = await runCli(['proof', 'create', 'p-noinit'])
    expect(create.exitCode).toBe(0)
    // 写入有 probe 的 proof.oxn
    const proofPath = join(tmpDir, '.openxenon', 'proofs', 'p-noinit', 'proof.oxn')
    writeFileSync(
      proofPath,
      `proof "p-noinit" {
 probe "p1" { ref "@oxn/probes/shell-exec"; params { command = "true" } }
 }
`,
      'utf-8',
    )
    // run 应该报错（无 .openxenon 边界）
    const run = await runCli(['proof', 'run', 'p-noinit'])
    expect(run.exitCode).not.toBe(0)
    const statsPath = join(tmpDir, '.openxenon', '.cache', 'probe-stats.json')
    expect(existsSync(statsPath)).toBe(false)
  })

  test('statsPath 父目录自动创建', async () => {
    await initProject()
    // 删掉 .cache 目录后跑 proof run
    const cacheDir = join(tmpDir, '.openxenon', '.cache')
    rmSync(cacheDir, { recursive: true, force: true })
    expect(existsSync(cacheDir)).toBe(false)

    const r = await createAndRunProof(
      'p-autodir',
      ` probe "p1" {
 ref "@oxn/probes/shell-exec"
 params {
 command = "true"
 }
 }`,
    )
    expect(r.exitCode).toBe(0)
    expect(existsSync(join(cacheDir, 'probe-stats.json'))).toBe(true)
  })

  test('stats 坏文件（非法 JSON）→ 兜底为空 stats，不影响 verdict', async () => {
    await initProject()
    // 故意写入非法 JSON
    const statsPath = join(tmpDir, '.openxenon', '.cache', 'probe-stats.json')
    mkdirSync(join(tmpDir, '.openxenon', '.cache'), { recursive: true })
    writeFileSync(statsPath, '{ broken json', 'utf-8')

    const r = await createAndRunProof(
      'p-broken-stats',
      ` probe "p1" {
 ref "@oxn/probes/shell-exec"
 params {
 command = "true"
 }
 }`,
    )
    // verdict 正常返回
    expect(r.exitCode).toBe(0)

    // 坏 stats 被覆盖为合法 stats
    const stats = readStatsFile()
    expect(stats).not.toBeNull()
    expect(stats.proofRuns.length).toBe(1)
    expect(stats.probes['shell-exec'].totalCount).toBe(1)
  })
})
