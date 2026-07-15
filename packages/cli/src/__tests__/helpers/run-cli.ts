/**
 * 共享 CLI E2E helpers —— 给 packages/cli/src/__tests__/*-e2e.test.ts 用。
 *
 * 封装 `Bun.spawn` + tmpDir 隔离 + afterEach chmod+rm 的黑盒调用样板。
 *
 * 推荐用法：
 *
 *   import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
 *   import { setupCliEnv, type CliEnv } from './helpers/run-cli'
 *
 *   const CLI_PATH = join(import.meta.dir, '..', 'index.ts')
 *   let env: CliEnv
 *
 *   beforeEach(() => { env = setupCliEnv(CLI_PATH) })
 *   afterEach(() => env.cleanup())
 *
 *   test('...', async () => {
 *     await env.initProject()
 *     const r = await env.runCli(['proof', 'create', 'p1'])
 *     expect(r.exitCode).toBe(0)
 *   })
 */

import { chmodSync, existsSync, mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

export interface CliRunResult {
  stdout: string
  stderr: string
  exitCode: number
}

export interface CliEnv {
  /** 临时工作目录；所有 runCli 默认 cwd=这里。 */
  tmpDir: string
  /** 跑 `bun <cliPath> <args>`，cwd=tmpDir，禁用 ANSI 颜色。 */
  runCli: (args: string[]) => Promise<CliRunResult>
  /** `oxn init` 速记；非 0 退出码抛错。 */
  initProject: () => Promise<void>
  /** rmSync tmpDir，兼容 .openxenon 0o444 子目录（chmod+rm）。 */
  cleanup: () => void
}

export function setupCliEnv(cliPath: string): CliEnv {
  const tmpDir = mkdtempSync(join(tmpdir(), `oxn-cli-e2e-${Date.now()}-`))

  async function runCli(args: string[]): Promise<CliRunResult> {
    const proc = Bun.spawn(['bun', cliPath, ...args], {
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

  function cleanup(): void {
    if (!existsSync(tmpDir)) return
    try {
      chmodSync(join(tmpDir, '.openxenon'), 0o755)
    } catch {
      /* ignore */
    }
    rmSync(tmpDir, { recursive: true, force: true })
  }

  return { tmpDir, runCli, initProject, cleanup }
}
