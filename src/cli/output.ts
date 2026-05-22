import { stringify as yamlStringify } from 'yaml'

export type OutputFormat = 'human' | 'json' | 'yaml' | 'html' | 'md'

export interface OutputOptions {
  data?: unknown
  error?: { code: string; message: string; suggestion?: string }
  format?: OutputFormat
  human?: string | ((data: unknown) => string)
}

function detectFormat(args: Record<string, unknown>): OutputFormat {
  if (args['--json'] || args['json']) return 'json'
  if (args['--yaml'] || args['yaml']) return 'yaml'
  if (args['--html'] || args['html']) return 'html'
  if (args['--md'] || args['md']) return 'md'
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
    case 'human':
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

export function outputError(
  error: { code: string; message: string; suggestion?: string },
  format: OutputFormat = 'human',
): void {
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
    case 'human':
    default:
      console.log(JSON.stringify(errorObj, null, 2))
  }
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
