// =============================================================================
// `oxn` CLI 入口 (v1.0 — Phase 4 完成版)
//
// 4 档 CLI 错误出口（顶层 try/catch 分类）：
//   档 1 (IAPError)         → stdout JSON + process.exit(1)   ← AI 消费
//   档 2 (OXNCrash)         → stderr + process.exit(2)        ← 人类消费（AI 看不到）
//   档 3 (isCliInputError) → stdout JSON + process.exit(1)   ← 用户输入错，AI/人都能消费
//   档 4 (兜底)            → stderr + process.exit(2)        ← 未知异常 = 引擎崩溃
//
// 进程退出码语义（Unix 哲学）：
//   0 = 成功
//   1 = 业务流阻断（IAPError / 用户输入错）       — 可恢复
//   2 = 引擎崩溃（OXNCrash / 未知异常）            — 不可恢复
//
// 注意事项：
//   - citty 对自身 CLI 错（缺 positional / 未知子命令）不 throw，直接 process.exit(1)
//   - 顶层 catch 主要兜住：subcommand 漏 catch 的 IAPError / OXNCrash / 其他 Error
//   - subcommand 通过 `return outputError(...)` / `outputUserInputError(...)` 报错时，
//     outputError 内部已设 process.exitCode = 1
//   - unhandledRejection 也走 4 档分类（防止 Bug 掩盖）
//
// Phase 4 完成：
//   - socket-client.ts 已 throw IAPError('PROOF','INFRA_FAIL',...) 替代 OS 错透传
//   - 7 个用户输入错（OXN_PROOF_*/OXN_PROBE_*/OXN_INPUT_*/OXN_OUTPUT_*/OXN_INVALID_*）
//     已迁移至 outputUserInputError helper
//   - handleLegacyDaemonError 已删除（IAPError catch 块天然处理）
// =============================================================================

import { defineCommand, runMain } from 'citty'
import pkg from '../../package.json' with { type: 'json' }
import { t } from '../infra/i18n'
import { IAPError, OXNCrash, isCliInputError } from '../core/errors'
import { cliContext, detectCliFormat, detectVerbosity } from './context'

// =============================================================================
// 4 档分类器
// =============================================================================

/**
 * 4 档分类器：把任意 thrown value 归到 4 档之一。
 * 不会抛错，所有分支都返回结构化结果。
 */
type Tier =
  | { kind: 'IAPError'; err: IAPError }
  | { kind: 'OXNCrash'; err: OXNCrash }
  | { kind: 'CliInput'; err: Error; code: string; message: string }
  | { kind: 'Crash'; err: unknown }

function classifyError(err: unknown): Tier {
  if (err instanceof IAPError) return { kind: 'IAPError', err }
  if (err instanceof OXNCrash) return { kind: 'OXNCrash', err }
  if (isCliInputError(err)) {
    const e = err as { code?: string; message?: string }
    return {
      kind: 'CliInput',
      err: err instanceof Error ? err : new Error(String(err)),
      code: e.code ?? 'OXN_INVALID_CLI_ARGS',
      message: e.message ?? String(err),
    }
  }
  return { kind: 'Crash', err }
}

// =============================================================================
// 4 档处理函数
// =============================================================================

/**
 * 档 1：IAPError（业务流） → stdout JSON + exit 1
 */
function handleIAPError(tier: Extract<Tier, { kind: 'IAPError' }>): never {
  const { err } = tier
  const json = JSON.stringify(
    {
      ok: false,
      error: {
        code: err.name, // 'IAP_<AXIS>_<CODE>'
        axis: err.axis,
        action: err.action,
        message: err.message,
        context: err.context,
      },
    },
    null,
    2,
  )
  console.log(json)
  process.exit(1)
}

/**
 * 档 2：OXNCrash（引擎崩溃） → stderr stack + exit 2
 */
function handleOXNCrash(tier: Extract<Tier, { kind: 'OXNCrash' }>): never {
  const { err } = tier
  console.error(`\n=== OXN ENGINE CRASH: ${err.name} ===`)
  console.error(err.message)
  if (err.cause) {
    console.error('Caused by:')
    console.error(err.cause instanceof Error ? (err.cause.stack ?? err.cause) : String(err.cause))
  }
  process.exit(2)
}

/**
 * 档 3：用户输入错 → stdout JSON + exit 1
 */
function handleCliInput(tier: Extract<Tier, { kind: 'CliInput' }>): never {
  const json = JSON.stringify(
    {
      ok: false,
      error: {
        code: tier.code,
        message: tier.message,
      },
    },
    null,
    2,
  )
  console.log(json)
  process.exit(1)
}

/**
 * 档 4：兜底（未知异常 = 引擎崩溃） → stderr stack + exit 2
 *
 * 哲学：任何不属于 IAPError / OXNCrash / CLI 输入错的异常，都是 OXN 自身 Bug。
 * 严禁让 AI 看到这种 stack（AI 会试图 FIX_CODE 掩盖 Bug）。
 */
function handleCrash(tier: Extract<Tier, { kind: 'Crash' }>): never {
  const { err } = tier
  console.error('\n=== OXN UNEXPECTED CRASH ===')
  if (err instanceof Error) {
    console.error(err.stack ?? err.message)
  } else {
    console.error(err)
  }
  process.exit(2)
}

// =============================================================================
// CLI 命令定义
// =============================================================================

const main = defineCommand({
  meta: {
    name: 'oxn',
    version: pkg.version,
    description: t('cli.description'),
  },
  subCommands: {
    // ---- Meta / project setup ----
    init: () => import('./init').then((m) => m.default),
    config: () => import('./config-cmd').then((m) => m.default),
    'install-skill': () => import('./install-skill').then((m) => m.default),

    // ---- Intent entities ----
    domain: () => import('./domain').then((m) => m.default),
    blueprint: () => import('./blueprint').then((m) => m.default),

    // ---- Align runtime (work + task + state machine) ----
    work: () => import('./work').then((m) => m.default),

    // ---- Proof axis (v0.1.2: Proof-First 入口，独立运作) ----
    proof: () => import('./proof').then((m) => m.default),
    insight: () => import('./insight').then((m) => m.default),

    // ---- v0.2 T7: 第三方 Probe Provider (sandbox-validated) ----
    probe: () => import('./probe').then((m) => m.default),
    // ---- v0.2 T13: Intent Pool v3 ----
    pool: () => import('./pool').then((m) => m.default),

    // ---- Dev namespace (DSL 内部工具) ----
    dev: () => import('./dev').then((m) => m.default),
  },
  args: {
    verbose: {
      alias: 'v',
      type: 'boolean',
      description: 'Enable verbose output',
      default: false,
    },
    '--leader-mode': {
      type: 'string',
      description: 'Override leader track: "reference" or "mvp" (overrides env + .oxnrc)',
    },
    '--json': {
      type: 'boolean',
      description: t('format.json'),
      default: false,
    },
    '--yaml': {
      type: 'boolean',
      description: t('format.yaml'),
      default: false,
    },
    '--html': {
      type: 'boolean',
      description: t('format.html'),
      default: false,
    },
    '--md': {
      type: 'boolean',
      description: t('format.markdown'),
      default: false,
    },
  },
  async run() {
    const format = detectCliFormat()
    const verbosity = detectVerbosity()
    cliContext.setFormatMode(format)
    cliContext.setVerbosity(verbosity)
    if (verbosity > 0) {
      console.error(`[DEBUG] Verbosity level: ${verbosity}`)
    }
    if (format === 'human') {
      console.log('OpenXenon CLI')
      console.log('Run `oxn --help` for usage information')
    }
  },
})

// =============================================================================
// 顶层 try/catch + unhandledRejection 4 档分流
// =============================================================================

try {
  runMain(main)
} catch (err) {
  const tier = classifyError(err)
  switch (tier.kind) {
    case 'IAPError':
      handleIAPError(tier)
      break
    case 'OXNCrash':
      handleOXNCrash(tier)
      break
    case 'CliInput':
      handleCliInput(tier)
      break
    case 'Crash':
      handleCrash(tier)
      break
  }
}

process.on('unhandledRejection', (reason) => {
  const tier = classifyError(reason)
  switch (tier.kind) {
    case 'IAPError':
      handleIAPError(tier)
      break
    case 'OXNCrash':
      handleOXNCrash(tier)
      break
    case 'CliInput':
      handleCliInput(tier)
      break
    case 'Crash':
      handleCrash(tier)
      break
  }
})
