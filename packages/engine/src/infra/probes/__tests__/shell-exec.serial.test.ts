// =============================================================================
// probes-shell-exec.test.ts (v0.1.6)
//
// 设计依据：.openxenon/forges/2026-06-11-runtime-adapter-design.v0.3.md §10.3
// 3 个端到端测：success / failure / timeout
// =============================================================================

import { describe, expect, test } from 'bun:test'
import { executeShellExec } from '../shell-exec'
import type { ProbeContext } from '../shell-exec'

const ctx: ProbeContext = { projectRoot: process.cwd() }

describe.serial('probes/shell-exec', () => {
  test('success: echo 成功 + exitCode 0', async () => {
    const result = await executeShellExec('echo hello_probe', ctx, 5000)
    expect(result.success).toBe(true)
    expect(result.exitCode).toBe(0)
    expect(result.stdout.trim()).toBe('hello_probe')
    expect(result.stderr).toBe('')
  })

  test('failure: exit 1 + stderr 含错误', async () => {
    const result = await executeShellExec('sh -c "echo error_msg 1>&2; exit 1"', ctx, 5000)
    expect(result.success).toBe(false)
    expect(result.exitCode).toBe(1)
    expect(result.stderr.trim()).toBe('error_msg')
  })

  test('timeout: 5s sleep + 200ms timeout → exitCode=137 (SIGKILL)', async () => {
    const result = await executeShellExec('sleep 5', ctx, 200)
    const killed = result.exitCode === null || result.exitCode === 137
    expect(killed).toBe(true)
    expect(result.durationMs).toBeLessThan(2000)
  })
})
