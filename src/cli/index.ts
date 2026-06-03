import { defineCommand, runMain } from 'citty'
import { DAEMON_SOCK_PATH } from '../infra/global'
import { ErrorCategory, OxnErrorCode } from '../kernel/enums'
import { cliContext, detectCliFormat, detectVerbosity } from './context'
import { loadOxnRc, resolveLeaderMode } from './config-loader'

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
    init: () => import('./init').then((m) => m.default),
    task: () => import('./task').then((m) => m.default),
    work: () => import('./work').then((m) => m.default),
    arsenal: () => import('./arsenal').then((m) => m.default),
    export: () => import('./export').then((m) => m.default),
    gc: () => import('./gc').then((m) => m.default),
    cache: () => import('./cache').then((m) => m.default),
    hall: () => import('./hall').then((m) => m.default),
    explore: () => import('./explore-cmd').then((m) => m.default),
    global: () => import('./global').then((m) => m.default),
    config: () => import('./config-cmd').then((m) => m.default),
    compile: () => import('./oxn-compile').then((m) => m.default),
    unpack: () => import('./oxn-unpack').then((m) => m.default),
    validate: () => import('./oxn-validate').then((m) => m.default),
    promote: () => import('./oxn-promote-cmd').then((m) => m.default),
    'migrate-yaml': () => import('./oxn-migrate-cmd').then((m) => m.default),
    'add-probe': () => import('./oxn-add-probe').then((m) => m.default),
    'install-skill': () => import('./install-skill').then((m) => m.default),
    blueprint: () => import('./blueprint').then((m) => m.default),
    leader: () => {
      // Unified leader (single entry — see src/cli/leader.ts).
      //   Subcommands: new | run | submit | status
      //   Aliases (reference compatibility): start | next | list
      // The --leader-mode / OXN_LEADER_MODE / .oxnrc flags are honored for
      // backward compatibility but both modes now resolve to the same
      // unified leader. A warning is printed if a non-default mode is set,
      // so existing scripts keep working without surprises.
      const projectRoot = process.cwd()
      const { config, warning } = loadOxnRc(projectRoot)
      if (warning) console.error(`[config] ${warning}`)
      const cliFlag = process.argv
        .find((a) => a === '--leader-mode' || a.startsWith('--leader-mode='))
        ?.split('=')
        .slice(1)
        .join('=') as string | undefined
      const envValue = process.env.OXN_LEADER_MODE
      const resolved = resolveLeaderMode({ cliFlag, envValue, projectConfig: config })
      if (resolved.source !== 'default' && resolved.mode === 'mvp') {
        // Both modes now use the unified leader. We keep the flag for
        // backward compat but emit a one-time deprecation hint.
        console.error(
          `[config] OXN_LEADER_MODE=mvp is now equivalent to the default; the dual-track canary has been merged into the unified leader.`,
        )
      }
      return import('./leader').then((m) => m.default)
    },
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
