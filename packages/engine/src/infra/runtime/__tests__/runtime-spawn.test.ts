// =============================================================================
// runtime-spawn.test.ts (v0.1.6)
//
// 设计依据：.openxenon/forges/2026-06-11-runtime-adapter-design.v0.3.md §10.3
// 5 个测：echo / exit 1 / timeout / cwd / env
// =============================================================================

import { describe, expect, test } from 'bun:test'
import { spawn } from '../index'

describe('runtime/spawn', () => {
  test('echo 命令成功 + stdout 缓冲为 string', async () => {
    const result = await spawn(['echo', 'hello from runtime'])
    expect(result.exitCode).toBe(0)
    expect(result.stdout.trim()).toBe('hello from runtime')
    expect(result.stderr).toBe('')
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })

  test('exit 1 命令：exitCode=1, stdout 含错误', async () => {
    const result = await spawn(['sh', '-c', 'echo error_msg 1>&2; exit 1'])
    expect(result.exitCode).toBe(1)
    expect(result.stderr.trim()).toBe('error_msg')
  })

  test('timeout 触发：进程被 SIGKILL（exitCode=137）', async () => {
    const result = await spawn(['sleep', '5'], { timeout: 200 })
    // timeout 后 SIGKILL → Unix 退出码 = 128 + 9 = 137；spawn signal 字段会被设置
    // 注：v0.1.6 接受两种语义：exitCode=null（被信号）或 137（Unix 风格退出码）
    const killed = result.exitCode === null || result.exitCode === 137
    expect(killed).toBe(true)
    expect(result.durationMs).toBeLessThan(2000)
  })

  test('cwd 选项生效', async () => {
    const result = await spawn(['pwd'], { cwd: '/tmp' })
    expect(result.exitCode).toBe(0)
    // macOS 解析 /tmp 为 /private/tmp；Linux 直接 /tmp
    expect(result.stdout.trim().replace('/private/tmp', '/tmp')).toBe('/tmp')
  })

  test('env 选项覆盖', async () => {
    const result = await spawn(['sh', '-c', 'echo $MY_TEST_VAR'], {
      env: { MY_TEST_VAR: 'adapter_env_works', PATH: process.env.PATH ?? '' },
    })
    expect(result.exitCode).toBe(0)
    expect(result.stdout.trim()).toBe('adapter_env_works')
  })
})
