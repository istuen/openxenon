import { stringify as yamlStringify } from 'yaml'

export type OutputFormat = 'human' | 'json' | 'yaml' | 'html' | 'md'

export interface OutputOptions {
  data?: unknown
  error?: { code: string; message: string; suggestion?: string }
  format?: OutputFormat
  human?: string | ((data: unknown) => string)
}

function detectFormat(args: Record<string, unknown>): OutputFormat {
  if (args['--json'] || args.json) return 'json'
  if (args['--yaml'] || args.yaml) return 'yaml'
  if (args['--html'] || args.html) return 'html'
  if (args['--md'] || args.md) return 'md'
  return 'human'
}

export function getFormatFromArgs(args: Record<string, unknown>): OutputFormat {
  return detectFormat(args)
}

export function outputSuccess(data: unknown, format: OutputFormat = 'human'): void {
  switch (format) {
    case 'json':
      console.log(JSON.stringify({ ok: true, data }, null, 2))
      break
    case 'yaml':
      console.log(yamlStringify({ ok: true, data }))
      break
    case 'html':
      console.log(`<pre>${escapeHtml(JSON.stringify({ ok: true, data }, null, 2))}</pre>`)
      break
    case 'md':
      console.log('```json')
      console.log(JSON.stringify({ ok: true, data }, null, 2))
      console.log('```')
      break
    default:
      if (typeof data === 'object' && data !== null) {
        console.log(JSON.stringify({ ok: true, data }, null, 2))
      } else {
        console.log(data)
      }
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// v1.0 (Phase 3): outputError 自动设 process.exitCode = 1
//   解决历史问题：subcommand 通过 return outputError() 报错时，process 仍 exit 0
//   现在任何 outputError() 调用都标记 exit 1，让 Node 在 runMain 完成后正确退出
//   顶层 catch 块对 IAPError 仍显式 process.exit(1) (双重保险)
export function outputError(
  error: {
    code: string
    message: string
    suggestion?: string
    axis?: string
    action?: string
    context?: Readonly<Record<string, unknown>>
    [key: string]: unknown
  },
  format: OutputFormat = 'human',
): void {
  // v1.0 Phase 3: 标记进程退出码为 1（不立即 exit，让 catch 块或 runMain 决定时机）
  process.exitCode = 1
  const errorObj = { ok: false, error }

  switch (format) {
    case 'json':
      console.log(JSON.stringify(errorObj, null, 2))
      break
    case 'yaml':
      console.log(yamlStringify(errorObj))
      break
    case 'html':
      console.log(`<div class="error">${escapeHtml(JSON.stringify(errorObj, null, 2))}</div>`)
      break
    case 'md':
      console.log('```json')
      console.log(JSON.stringify(errorObj, null, 2))
      console.log('```')
      break
    default:
      console.log(JSON.stringify(errorObj, null, 2))
  }
}

// v1.0 (Phase 4): 用户输入错快捷输出器
//   用途：subcommand 报告"用户输错东西"（既不是 IAPError 业务流，也不是 OXNCrash 引擎崩溃）
//   错误码命名规范：OXN_PROOF_* / OXN_INPUT_* / OXN_OUTPUT_* / OXN_INVALID_*
//   这些前缀会被 isCliInputError 识别（CLI 4 档 catch 块档 3）
//
//   行为契约：
//     - exit code: 1（业务流阻断，可恢复）
//     - 输出通道: stdout JSON / YAML / HTML / MD（与用户期望的输出格式一致）
//     - 进程退出: 立即 return（subcommand handler return 即可，不需 process.exit）
export function outputUserInputError(
  code: string,
  message: string,
  options: { suggestion?: string; format?: OutputFormat } = {},
): void {
  outputError({ code, message, suggestion: options.suggestion }, options.format ?? 'human')
}

export function output(options: OutputOptions): void
export function output(data: unknown, format?: OutputFormat): void
export function output(optionsOrData: OutputOptions | unknown, format?: OutputFormat): void {
  if (typeof optionsOrData === 'object' && optionsOrData !== null && 'data' in optionsOrData) {
    const options = optionsOrData as OutputOptions
    const fmt = format || options.format || 'human'
    const { data, error, human } = options

    if (error) {
      return outputError(error, fmt)
    }

    if (fmt === 'human' && human) {
      if (typeof human === 'function') {
        console.log(human(data))
      } else {
        console.log(human)
      }
      return
    }

    if (fmt === 'human') {
      if (typeof data === 'object' && data !== null) {
        console.log(JSON.stringify({ ok: true, data }, null, 2))
      } else {
        console.log(data)
      }
      return
    }

    outputSuccess(data, fmt)
    return
  }

  const data = optionsOrData
  const fmt = format || 'human'

  if (fmt === 'human') {
    if (typeof data === 'object' && data !== null) {
      console.log(JSON.stringify({ ok: true, data }, null, 2))
    } else {
      console.log(data)
    }
    return
  }

  outputSuccess(data, fmt)
}

export function addFormatArgs(argsDef: Record<string, any>): Record<string, any> {
  return {
    '--json': {
      type: 'boolean',
      description: 'JSON 格式输出',
    },
    '--yaml': {
      type: 'boolean',
      description: 'YAML 格式输出',
    },
    '--html': {
      type: 'boolean',
      description: 'HTML 格式输出',
    },
    '--md': {
      type: 'boolean',
      description: 'Markdown 格式输出',
    },
    ...argsDef,
  }
}
