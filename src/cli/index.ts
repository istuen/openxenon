import { defineCommand, runMain } from 'citty'
import { DAEMON_SOCK_PATH } from '../infra/global'
import { ErrorCategory, OxnErrorCode } from '../kernel/enums'
import { cliContext, detectCliFormat, detectVerbosity } from './context'

function formatError(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    return JSON.stringify({ ok: false, error: err })
  }

  const errObj = err instanceof Error ? err : new Error(String(err))

  if (
    errObj.message.includes('ECONNREFUSED') ||
    errObj.message.includes('ENOENT') ||
    errObj.message.includes('connect')
  ) {
    return JSON.stringify({
      ok: false,
      error: {
        code: OxnErrorCode.SOCKET_REFUSED,
        message: 'Daemon 未运行',
        category: ErrorCategory.INFRA,
        recoverable: true,
        suggestion: `请先执行 oxn global daemon start 启动 Daemon（socket: ${DAEMON_SOCK_PATH}）`,
      },
    })
  }

  if (errObj.message.includes('timed out') || errObj.message.includes('ETIMEDOUT')) {
    return JSON.stringify({
      ok: false,
      error: {
        code: OxnErrorCode.SOCKET_TIMEOUT,
        message: 'Daemon 响应超时',
        category: ErrorCategory.INFRA,
        recoverable: true,
        suggestion: '等 5 秒后重试，或执行 oxn global daemon stop && oxn global daemon start',
      },
    })
  }

  return JSON.stringify({
    ok: false,
    error: {
      code: OxnErrorCode.UNKNOWN,
      message: errObj.message,
      category: ErrorCategory.SYSTEM,
      recoverable: false,
      suggestion: '这是 OpenXenon 内部错误，请将 debug 信息报告给工程师',
      debug: process.env.OXN_DEBUG ? errObj.stack?.split('\n').slice(0, 5).join('\n') : undefined,
    },
  })
}

const main = defineCommand({
  meta: {
    name: 'oxn',
    version: '1.0.0',
    description: 'OpenXenon CLI - 面向大语言模型的工程化控制引擎',
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
      description: 'JSON 格式输出',
      default: false,
    },
    '--yaml': {
      type: 'boolean',
      description: 'YAML 格式输出',
      default: false,
    },
    '--html': {
      type: 'boolean',
      description: 'HTML 格式输出',
      default: false,
    },
    '--md': {
      type: 'boolean',
      description: 'Markdown 格式输出',
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

try {
  runMain(main)
} catch (err) {
  console.log(formatError(err))
  process.exit(1)
}

process.on('unhandledRejection', (reason) => {
  console.log(formatError(reason))
  process.exit(1)
})
