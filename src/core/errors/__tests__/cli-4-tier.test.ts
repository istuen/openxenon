// =============================================================================
// CLI 4-Tier catch block tests (v1.0 — Phase 3/4)
//
// 验证：
//   1. isCliInputError 正确识别各种 CLI 输入错
//      - 库层: commander./citty./cli.
//      - 自定义: OXN_INVALID_CLI_*, OXN_INVALID_*, OXN_PROOF_*, OXN_PROBE_*,
//                OXN_INPUT_*, OXN_OUTPUT_*
//   2. 4 档分类器 classifyError 正确分流
//   3. 档 1 (IAPError) → 输出 stdout JSON + exit 1
//   4. 档 2 (OXNCrash) → 输出 stderr + exit 2
//   5. 档 3 (CliInput) → 输出 stdout JSON + exit 1
//   6. 档 4 (兜底) → 输出 stderr + exit 2
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { IAPError, IAPAction, OXNCrash, isCliInputError } from '../index'

// -----------------------------------------------------------------------------
// 守卫：isCliInputError
// -----------------------------------------------------------------------------

describe('isCliInputError', () => {
  test('null / undefined / 非对象 → false', () => {
    expect(isCliInputError(null)).toBe(false)
    expect(isCliInputError(undefined)).toBe(false)
    expect(isCliInputError('string error')).toBe(false)
    expect(isCliInputError(42)).toBe(false)
  })

  test('code 以 commander. 开头 → true', () => {
    expect(isCliInputError({ code: 'commander.missingArgument', message: 'foo' })).toBe(true)
  })

  test('code 以 citty. 开头 → true', () => {
    expect(isCliInputError({ code: 'citty.invalidArgument', message: 'foo' })).toBe(true)
  })

  test('code 以 cli. 开头 → true', () => {
    expect(isCliInputError({ code: 'cli.parseError', message: 'foo' })).toBe(true)
  })

  test('code === OXN_INVALID_CLI_ARGS → true', () => {
    expect(isCliInputError({ code: 'OXN_INVALID_CLI_ARGS', message: 'foo' })).toBe(true)
  })

  test('code 以 OXN_INVALID_CLI_ 开头 → true', () => {
    expect(isCliInputError({ code: 'OXN_INVALID_CLI_FOO', message: 'foo' })).toBe(true)
  })

  // ---- Phase 4: 扩展子命令级 CLI 输入错前缀 ----

  test('Phase 4: code 以 OXN_PROOF_ 开头 → true', () => {
    expect(isCliInputError({ code: 'OXN_PROOF_NOT_FOUND', message: 'foo' })).toBe(true)
    expect(isCliInputError({ code: 'OXN_PROOF_PARSE_FAILED', message: 'foo' })).toBe(true)
    expect(isCliInputError({ code: 'OXN_PROOF_EMPTY', message: 'foo' })).toBe(true)
    expect(isCliInputError({ code: 'OXN_PROOF_NOT_RUN', message: 'foo' })).toBe(true)
  })

  test('Phase 4: code 以 OXN_PROBE_ 开头 → true', () => {
    expect(isCliInputError({ code: 'OXN_PROBE_UNKNOWN', message: 'foo' })).toBe(true)
  })

  test('Phase 4: code 以 OXN_INPUT_ 开头 → true', () => {
    expect(isCliInputError({ code: 'OXN_INPUT_JSON_INVALID', message: 'foo' })).toBe(true)
  })

  test('Phase 4: code 以 OXN_OUTPUT_ 开头 → true', () => {
    expect(isCliInputError({ code: 'OXN_OUTPUT_FILE_EXISTS', message: 'foo' })).toBe(true)
    expect(isCliInputError({ code: 'OXN_OUTPUT_DIR_EXISTS', message: 'foo' })).toBe(true)
  })

  test('Phase 4: code 以 OXN_INVALID_ 开头（除 OXN_INVALID_CLI_*） → true', () => {
    expect(isCliInputError({ code: 'OXN_INVALID_NAME', message: 'foo' })).toBe(true)
    expect(isCliInputError({ code: 'OXN_INVALID_WORK_NAME', message: 'foo' })).toBe(true)
  })

  test('message 包含 "Missing required argument" → true', () => {
    expect(isCliInputError({ message: 'Missing required argument: NAME' })).toBe(true)
  })

  test('message 包含 "Missing required option" → true', () => {
    expect(isCliInputError({ message: 'Missing required option --foo' })).toBe(true)
  })

  test('message 包含 "Unknown command" → true', () => {
    expect(isCliInputError({ message: "Unknown command 'xyz'" })).toBe(true)
  })

  test('message 包含 "Unknown option" → true', () => {
    expect(isCliInputError({ message: "Unknown option '--foo'" })).toBe(true)
  })

  test('message 包含 "Unknown argument" → true', () => {
    expect(isCliInputError({ message: "Unknown argument 'bar'" })).toBe(true)
  })

  test('message 包含 "Too many arguments" → true', () => {
    expect(isCliInputError({ message: 'Too many arguments' })).toBe(true)
  })

  test('message 包含 "Too few arguments" → true', () => {
    expect(isCliInputError({ message: 'Too few arguments' })).toBe(true)
  })

  test('message 包含 "Invalid argument" / "Invalid option" → true', () => {
    expect(isCliInputError({ message: 'Invalid argument' })).toBe(true)
    expect(isCliInputError({ message: 'Invalid option' })).toBe(true)
  })

  test('普通 Error 不被误判', () => {
    expect(isCliInputError(new Error('some random error'))).toBe(false)
  })

  test('IAPError / OXNCrash 不被误判（应由对应守卫识别）', () => {
    const iap = new IAPError('PROOF', 'INFRA_FAIL', IAPAction.YIELD_TO_HUMAN, 'msg')
    const crash = new OXNCrash('STATE_CORRUPT', 'msg')
    expect(isCliInputError(iap)).toBe(false)
    expect(isCliInputError(crash)).toBe(false)
  })
})

// -----------------------------------------------------------------------------
// 4 档 catch 块：实测 process.exit / stdout / stderr 行为
// -----------------------------------------------------------------------------

describe('4-tier CLI catch block (process.exit/stdout/stderr)', () => {
  let exitCode: number | null = null
  let exitCalled = false
  const origExit = process.exit
  const origLog = console.log
  const origErr = console.error
  let stdoutBuf = ''
  let stderrBuf = ''

  beforeEach(() => {
    exitCode = null
    exitCalled = false
    stdoutBuf = ''
    stderrBuf = ''
    process.exit = ((code?: number) => {
      exitCode = code ?? 0
      exitCalled = true
      // 抛错中断当前控制流（模拟 process.exit 行为）
      throw new Error(`_intercepted_exit_${exitCode}`)
    }) as never
    console.log = (...args: unknown[]) => {
      stdoutBuf += args.join(' ') + '\n'
    }
    console.error = (...args: unknown[]) => {
      stderrBuf += args.join(' ') + '\n'
    }
  })

  afterEach(() => {
    process.exit = origExit
    console.log = origLog
    console.error = origErr
  })

  // 模拟 src/cli/index.ts 的 4 档 catch
  function runTieredCatch(err: unknown) {
    try {
      if (err instanceof IAPError) {
        // 档 1
        console.log(
          JSON.stringify(
            {
              ok: false,
              error: {
                code: err.name,
                axis: err.axis,
                action: err.action,
                message: err.message,
                context: err.context,
              },
            },
            null,
            2,
          ),
        )
        process.exit(1)
        return
      }
      if (err instanceof OXNCrash) {
        // 档 2
        console.error(`\n=== OXN ENGINE CRASH: ${err.name} ===`)
        console.error(err.message)
        if (err.cause) {
          console.error('Caused by:')
          console.error(err.cause instanceof Error ? (err.cause.stack ?? err.cause) : String(err.cause))
        }
        process.exit(2)
        return
      }
      if (isCliInputError(err)) {
        // 档 3
        const e = err as { code?: string; message?: string }
        console.log(
          JSON.stringify(
            {
              ok: false,
              error: {
                code: e.code ?? 'OXN_INVALID_CLI_ARGS',
                message: e.message ?? String(err),
              },
            },
            null,
            2,
          ),
        )
        process.exit(1)
        return
      }
      // 档 4 (兜底 = 引擎崩溃)
      console.error('\n=== OXN UNEXPECTED CRASH ===')
      if (err instanceof Error) {
        console.error(`${err.name}: ${err.message}`)
        if (err.stack) console.error(err.stack)
      } else {
        console.error(err)
      }
      process.exit(2)
    } catch (intercepted) {
      // 期望 process.exit 抛 _intercepted_exit_N
      if (intercepted instanceof Error && intercepted.message.startsWith('_intercepted_exit_')) {
        return
      }
      throw intercepted
    }
  }

  function safeRunTieredCatch(err: unknown) {
    runTieredCatch(err)
  }

  test('档 3: CliInput (commander code) → stdout JSON + exit 1', () => {
    const err = Object.assign(new Error('Missing required argument: NAME'), {
      code: 'commander.missingArgument',
    })
    safeRunTieredCatch(err)
    expect(exitCode).toBe(1)
    expect(stdoutBuf).toContain('commander.missingArgument')
    expect(stdoutBuf).toContain('Missing required argument: NAME')
    expect(stderrBuf).toBe('')
  })

  test('档 3: CliInput (citty code) → stdout JSON + exit 1', () => {
    const err = Object.assign(new Error("Unknown command 'xyz'"), {
      code: 'citty.unknownCommand',
    })
    safeRunTieredCatch(err)
    expect(exitCode).toBe(1)
    expect(stdoutBuf).toContain('citty.unknownCommand')
  })

  test('档 1: IAPError → stdout JSON + exit 1', () => {
    const err = new IAPError('PROOF', 'INFRA_FAIL', IAPAction.YIELD_TO_HUMAN, 'fs 失败', {
      path: './dist',
    })
    safeRunTieredCatch(err)
    expect(exitCode).toBe(1)
    expect(stdoutBuf).toContain('IAP_PROOF_INFRA_FAIL')
    expect(stdoutBuf).toContain('"axis": "PROOF"')
    expect(stdoutBuf).toContain('"action": "YIELD_TO_HUMAN"')
    expect(stderrBuf).toBe('')
  })

  test('档 1: IAPError action = AUTONOMOUS_RETRY 也走 stdout', () => {
    const err = new IAPError('ALIGN', 'TIMEOUT', IAPAction.AUTONOMOUS_RETRY, 'task 跑超时')
    safeRunTieredCatch(err)
    expect(exitCode).toBe(1)
    expect(stdoutBuf).toContain('IAP_ALIGN_TIMEOUT')
    expect(stdoutBuf).toContain('"action": "AUTONOMOUS_RETRY"')
  })

  test('档 2: OXNCrash → stderr stack + exit 2', () => {
    const err = new OXNCrash('SIGNATURE_MISMATCH', 'frozen.json 签名被外部篡改')
    safeRunTieredCatch(err)
    expect(exitCode).toBe(2)
    expect(stderrBuf).toContain('OXN ENGINE CRASH: OXN_CRASH_SIGNATURE_MISMATCH')
    expect(stderrBuf).toContain('frozen.json 签名被外部篡改')
    expect(stdoutBuf).toBe('') // 不进 stdout（AI 看不到）
  })

  test('档 2: OXNCrash with cause → stderr 含 cause', () => {
    const cause = new Error('原始 IO 错误')
    const err = new OXNCrash('INTERNAL_ERROR', 'verdict logic 崩了', cause)
    safeRunTieredCatch(err)
    expect(exitCode).toBe(2)
    expect(stderrBuf).toContain('Caused by:')
    expect(stderrBuf).toContain('原始 IO 错误')
  })

  test('档 4: 兜底 (普通 Error) → stderr + exit 2', () => {
    const err = new TypeError('cannot read property x of undefined')
    safeRunTieredCatch(err)
    expect(exitCode).toBe(2)
    expect(stderrBuf).toContain('OXN UNEXPECTED CRASH')
    expect(stderrBuf).toContain('TypeError')
    expect(stdoutBuf).toBe('') // AI 看不到
  })

  test('档 4: 兜底 (string 异常) → stderr + exit 2', () => {
    safeRunTieredCatch('plain string error')
    expect(exitCode).toBe(2)
    expect(stderrBuf).toContain('OXN UNEXPECTED CRASH')
  })

  test('档 4: 兜底 (null 异常) → stderr + exit 2', () => {
    safeRunTieredCatch(null)
    expect(exitCode).toBe(2)
    expect(stderrBuf).toContain('OXN UNEXPECTED CRASH')
  })
})
