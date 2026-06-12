// =============================================================================
// outputUserInputError helper tests (v1.0 — Phase 4)
//
// 验证：
//   1. outputUserInputError 自动设 process.exitCode = 1
//   2. 输出 JSON 包含 code / message / suggestion
//   3. 默认 format = human（也是 JSON，因为 human 走 JSON.stringify 路径）
//   4. format = 'json' 显式 JSON
//   5. 缺 suggestion 时 JSON 不含 suggestion 字段
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { outputUserInputError, outputError } from '../output'

describe('outputUserInputError (Phase 4)', () => {
  let exitCode: number | null = null
  let stdoutBuf = ''
  const origExit = process.exit
  const origLog = console.log
  const origCode = process.exitCode ?? 0

  beforeEach(() => {
    exitCode = null
    stdoutBuf = ''
    process.exit = ((code?: number) => {
      exitCode = code ?? 0
      throw new Error(`_intercepted_exit_${exitCode}`)
    }) as never
    process.exitCode = 0
    console.log = (...args: unknown[]) => {
      stdoutBuf += args.join(' ') + '\n'
    }
  })

  afterEach(() => {
    process.exit = origExit
    console.log = origLog
    process.exitCode = origCode
  })

  test('设置 process.exitCode = 1', () => {
    outputUserInputError('OXN_INVALID_NAME', 'bad name', { format: 'json' })
    expect(process.exitCode).toBe(1)
  })

  test('输出 JSON 含 code + message + suggestion', () => {
    outputUserInputError('OXN_OUTPUT_FILE_EXISTS', 'proof already exists: /tmp/x', {
      suggestion: 'use --force to overwrite',
      format: 'json',
    })
    const parsed = JSON.parse(stdoutBuf)
    expect(parsed.ok).toBe(false)
    expect(parsed.error.code).toBe('OXN_OUTPUT_FILE_EXISTS')
    expect(parsed.error.message).toBe('proof already exists: /tmp/x')
    expect(parsed.error.suggestion).toBe('use --force to overwrite')
  })

  test('缺 suggestion 时 JSON 不含 suggestion 字段', () => {
    outputUserInputError('OXN_INPUT_JSON_INVALID', 'parse failed', { format: 'json' })
    const parsed = JSON.parse(stdoutBuf)
    expect(parsed.error.code).toBe('OXN_INPUT_JSON_INVALID')
    expect(parsed.error.suggestion).toBeUndefined()
  })

  test('human format 默认走 JSON.stringify（与 v1.0 outputError 一致）', () => {
    outputUserInputError('OXN_PROBE_UNKNOWN', 'unknown probe: foo')
    const parsed = JSON.parse(stdoutBuf)
    expect(parsed.error.code).toBe('OXN_PROBE_UNKNOWN')
  })

  test('OXN_PROOF_* 前缀被 isCliInputError 识别（一致性）', async () => {
    const { isCliInputError } = await import('../../core/errors')
    outputUserInputError('OXN_PROOF_NOT_FOUND', 'not found', { format: 'json' })
    const parsed = JSON.parse(stdoutBuf)
    expect(isCliInputError(parsed.error)).toBe(true)
  })
})
