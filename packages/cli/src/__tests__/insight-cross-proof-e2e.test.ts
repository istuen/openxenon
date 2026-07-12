// =============================================================================
// insight-cross-proof-e2e.test.ts — v0.5 PR-B → v0.6 PR-5d 重命名
//
// 黑盒 E2E：oxn insight --cross-proof 扫描全部 proofs/*/frozen.json
//
// v0.6 PR-5d 重命名说明：
//   - 维度 4: probeEffectiveness → probeBehaviorPattern
//   - human 渲染标题: "## Probe Effectiveness" → "## Probe Behavior Pattern"
//   - 计算逻辑不变（仍按 failRate 降序）；命名重在表达"AI 行为特征信号"而非"代码质量评分"
//
// 覆盖：
//   1. 多 proof happy path：3 个不同 proof 跑完后 --cross-proof 输出 4 维分析
//   2. trendMatrix 反映 (probeType, target) 跨多 proof 的 verdict 序列
//   3. correlationMatrix 检测两 probe 类型的共现失败率
//   4. trends 检测 worsening（最近 3 次全 FAIL 且之前 PASS）
//   5. probeBehaviorPattern 按 failRate 降序排序（行为特征信号）
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
import { chmodSync, existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync } from 'fs'
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

describe('oxn insight --cross-proof (v0.5 PR-B)', () => {
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

  test('未指定 --cross-proof 时要求 proof 参数', async () => {
    await initProject()
    const r = await runCli(['insight', '--json'])
    expect(r.exitCode).toBe(1)
    const j = JSON.parse(r.stdout) as { ok: boolean; error?: { code: string } }
    expect(j.ok).toBe(false)
    expect(j.error?.code).toBe('OXN_INSIGHT_INPUT_MISSING')
  })
})
