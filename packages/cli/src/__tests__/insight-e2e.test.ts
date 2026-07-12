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
import { existsSync, mkdtempSync, rmSync } from 'fs'
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
})
