import { defineCommand, runMain } from 'citty'
import { cliContext } from './cli-context'
import { OxnErrorCode, ErrorCategory } from './kernel/enums'
import { DAEMON_SOCK_PATH } from './infra/global'

function formatError(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    return JSON.stringify({ ok: false, error: err })
  }

  const errObj = err instanceof Error ? err : new Error(String(err))

  if (errObj.message.includes('ECONNREFUSED') || errObj.message.includes('ENOENT') || errObj.message.includes('connect')) {
    return JSON.stringify({
      ok: false,
      error: {
        code: OxnErrorCode.SOCKET_REFUSED,
        message: 'Daemon 未运行',
        category: ErrorCategory.INFRA,
        recoverable: true,
        suggestion: `请先执行 oxn daemon start 启动 Daemon（socket: ${DAEMON_SOCK_PATH}）`
      }
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
        suggestion: '等 5 秒后重试，或执行 oxn daemon stop && oxn daemon start'
      }
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
      debug: process.env.OXN_DEBUG ? errObj.stack?.split('\n').slice(0, 5).join('\n') : undefined
    }
  })
}

const main = defineCommand({
  meta: {
    name: 'oxn',
    version: '1.0.0',
    description: 'OpenXenon CLI - 面向大语言模型的工程化控制引擎'
  },
  subCommands: {
    init: () => import('./cli/init').then(m => m.default),
    daemon: () => import('./cli/daemon').then(m => m.default),
    task: () => import('./cli/task').then(m => m.default),
    arsenal: () => import('./cli/arsenal').then(m => m.default),
    export: () => import('./cli/export').then(m => m.default),
    gc: () => import('./cli/gc').then(m => m.default),
    forge: () => import('./cli/forge').then(m => m.default),
    explore: () => import('./cli/explore').then(m => m.default),
  },
  args: {
    verbose: {
      alias: 'v',
      type: 'boolean',
      description: 'Enable verbose output',
      default: false
    },
    json: {
      alias: 'j',
      type: 'boolean',
      description: 'Output in JSON format',
      default: false
    }
  },
  async run({ args }) {
    cliContext.setJsonMode(args.json as boolean)
    if (!cliContext.isJsonMode()) {
      console.log('OpenXenon CLI')
      console.log('Run `oxn --help` for usage information')
    }
  }
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
