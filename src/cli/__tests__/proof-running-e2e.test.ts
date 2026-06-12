// =============================================================================
// proof-running-e2e.test.ts — v0.1.3 PR-2
//
// 黑盒 E2E：oxn proof run 三阶段协议（.running.json 临时文件）+ --dry-run。
//
// 覆盖：
//   1. 首跑自指 probe PASS：proof 含读 .running.json 的 probe，首次 run 必 PASS
//   2. .running.json 在终态被删：run 完成后只剩 frozen.json
//   3. Phase 2 崩溃恢复：留下 .running.json 时下次 run 覆盖恢复
//   4. --dry-run：写 .running.json 但不跑 probe、不写 frozen.json
//   5. oxn proof list 标记 in-progress
//   6. oxn proof show 警告残留 .running.json
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const CLI_PATH = join(import.meta.dir, '..', 'index.ts')

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-proof-running-e2e-'))
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
  if (r.exitCode !== 0) throw new Error(`init failed: ${r.stderr || r.stdout}`)
}

function proofDir(name: string): string {
  return join(tmpDir, '.openxenon', 'proofs', name)
}
function runningPath(name: string): string {
  return join(proofDir(name), '.running.json')
}
function frozenPath(name: string): string {
  return join(proofDir(name), 'frozen.json')
}
function proofOxnPath(name: string): string {
  return join(proofDir(name), 'proof.oxn')
}

function writeProof(name: string, probes: string): void {
  mkdirSync(proofDir(name), { recursive: true })
  writeFileSync(
    proofOxnPath(name),
    `proof "${name}" {
  description = "v0.1.3 .running.json 协议测试"
${probes}
}
`,
    'utf-8',
  )
}

describe('oxn proof run — .running.json 三阶段协议 (v0.1.3 PR-2)', () => {
  test('Phase 1+2+3 happy path：自指 probe 首跑 PASS，.running.json 在终态被删', async () => {
    await initProject()
    const name = 'self-ref-pass'

    // 写一个 inline shell 探测：.running.json 存在 → exit 0
    const probe = `  probe "p1-self-ref" {
    ref "@oxn/probes/shell-exec"
    params { command = "if [ -f .openxenon/proofs/${name}/.running.json ]; then echo in-progress; exit 0; else echo no-running; exit 1; fi", timeout = "5000" }
  }
  probe "p2-trivial-pass" {
    ref "@oxn/probes/shell-exec"
    params { command = "true", timeout = "5000" }
  }`
    writeProof(name, probe)

    const r = await runCli(['proof', 'run', name, '--json'])
    expect(r.exitCode).toBe(0)

    // verdict = PASSED（自指 probe 在 .running.json 存在时 PASS）
    const j = JSON.parse(r.stdout) as { data: { verdict: string; passedCount: number; totalCount: number } }
    expect(j.data.verdict).toBe('PASSED')
    expect(j.data.passedCount).toBe(2)
    expect(j.data.totalCount).toBe(2)

    // 终态：frozen.json 存在，.running.json 已被删
    expect(existsSync(frozenPath(name))).toBe(true)
    expect(existsSync(runningPath(name))).toBe(false)
  })

  test('第二次 run 仍然 PASS：自指 probe 看到 fresh .running.json（Phase 1 写入）', async () => {
    await initProject()
    const name = 'self-ref-second-run'

    const probe = `  probe "p1-self-ref" {
    ref "@oxn/probes/shell-exec"
    params { command = "if [ -f .openxenon/proofs/${name}/.running.json ]; then echo in-progress; exit 0; else echo no-running; exit 1; fi", timeout = "5000" }
  }
  probe "p2-trivial-pass" {
    ref "@oxn/probes/shell-exec"
    params { command = "true", timeout = "5000" }
  }`
    writeProof(name, probe)

    // 第一次
    const r1 = await runCli(['proof', 'run', name, '--json'])
    expect(JSON.parse(r1.stdout).data.verdict).toBe('PASSED')

    // 第二次（frozen.json 已存在，.running.json 不存在 → 第一次 helper 模式走老路；这里自指 probe 仍走新协议）
    const r2 = await runCli(['proof', 'run', name, '--json'])
    expect(JSON.parse(r2.stdout).data.verdict).toBe('PASSED')

    expect(existsSync(runningPath(name))).toBe(false)
  })

  test('Phase 2 崩溃恢复：人工留下 .running.json，下次 run 覆盖后正常 PASS', async () => {
    await initProject()
    const name = 'crash-recovery'

    // 模拟"上次 Phase 2 崩了"：手工写 .running.json（不写 frozen.json）
    mkdirSync(proofDir(name), { recursive: true })
    writeFileSync(
      runningPath(name),
      JSON.stringify(
        {
          name,
          runAt: '2024-01-01T00:00:00.000Z',
          verdict: 'FAILED',
          totalCount: 1,
          passedCount: 0,
          failedCount: 1,
          probes: [{ probeName: 'p1', ref: 'r', passed: false, durationMs: 0, errorMessage: 'pending' }],
        },
        null,
        2,
      ),
      'utf-8',
    )
    expect(existsSync(runningPath(name))).toBe(true)
    expect(existsSync(frozenPath(name))).toBe(false)

    const probe = `  probe "p1-self-ref" {
    ref "@oxn/probes/shell-exec"
    params { command = "if [ -f .openxenon/proofs/${name}/.running.json ]; then echo recovered; exit 0; else echo no-running; exit 1; fi", timeout = "5000" }
  }
  probe "p2-trivial-pass" {
    ref "@oxn/probes/shell-exec"
    params { command = "true", timeout = "5000" }
  }`
    writeProof(name, probe)

    const r = await runCli(['proof', 'run', name, '--json'])
    expect(r.exitCode).toBe(0)
    const j = JSON.parse(r.stdout) as { data: { verdict: string } }
    expect(j.data.verdict).toBe('PASSED')

    // 终态：frozen.json 新写、.running.json 被删
    expect(existsSync(frozenPath(name))).toBe(true)
    expect(existsSync(runningPath(name))).toBe(false)
  })

  test('--dry-run：写 .running.json 但不写 frozen.json', async () => {
    await initProject()
    const name = 'dry-run'

    const probe = `  probe "p1-fail-on-purpose" {
    ref "@oxn/probes/shell-exec"
    params { command = "false", timeout = "5000" }
  }`
    writeProof(name, probe)

    const r = await runCli(['proof', 'run', name, '--dry-run', '--json'])
    expect(r.exitCode).toBe(0)

    // .running.json 存在
    expect(existsSync(runningPath(name))).toBe(true)
    const running = JSON.parse(readFileSync(runningPath(name), 'utf-8'))
    expect(running.name).toBe(name)
    expect(running.totalCount).toBe(1)
    expect(running.failedCount).toBe(1)
    expect(running.probes[0].errorMessage).toBe('pending')

    // frozen.json 不存在
    expect(existsSync(frozenPath(name))).toBe(false)

    // output 标识 dryRun: true
    const j = JSON.parse(r.stdout) as { data: { dryRun: boolean; runningPath: string } }
    expect(j.data.dryRun).toBe(true)
    // macOS resolves /var → /private/var via realpath; align expectations
    expect(j.data.runningPath).toBe(realpathSync(runningPath(name)))
  })

  test('oxn proof list 在 .running.json 存在时输出 [in-progress] 标记', async () => {
    await initProject()
    const name = 'list-flag'

    // 手工建 proof space + 写 .running.json（模拟运行中）
    mkdirSync(proofDir(name), { recursive: true })
    writeFileSync(runningPath(name), JSON.stringify({ name, verdict: 'FAILED', probes: [] }), 'utf-8')
    // 写一个最小 proof.oxn（list 不需要，但 create 流程需要它存在；这里手工建避开 create 流程）
    writeFileSync(proofOxnPath(name), `proof "${name}" { description = "x" }`, 'utf-8')

    const r = await runCli(['proof', 'list'])
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('[in-progress]')
    expect(r.stdout).toContain(name)
  })

  test('oxn proof show 在 .running.json 残留时输出 ⚠️ 警告 + data.inProgress: true', async () => {
    await initProject()
    const name = 'show-warn'

    // 先跑一次正常 run（写 frozen.json + 删 .running.json）
    const probe = `  probe "p1" {
    ref "@oxn/probes/shell-exec"
    params { command = "true", timeout = "5000" }
  }`
    writeProof(name, probe)
    const r1 = await runCli(['proof', 'run', name])
    expect(r1.exitCode).toBe(0)

    // 模拟"run 完成后删 .running.json 失败"：手工写一份 .running.json
    writeFileSync(runningPath(name), JSON.stringify({ name, verdict: 'FAILED', probes: [] }), 'utf-8')

    // show 应能正常读 frozen.json + 报告 .running.json 残留
    const r2 = await runCli(['proof', 'show', name, '--json'])
    expect(r2.exitCode).toBe(0)
    const j = JSON.parse(r2.stdout) as { data: { inProgress: boolean; verdict: string } }
    expect(j.data.verdict).toBe('PASSED')
    expect(j.data.inProgress).toBe(true)

    // 人类可读输出含警告
    const r2h = await runCli(['proof', 'show', name])
    expect(r2h.stdout).toContain('⚠️')
    expect(r2h.stdout).toContain('.running.json')
  })
})
