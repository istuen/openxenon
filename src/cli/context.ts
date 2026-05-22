import type { OutputFormat } from './output'

export const cliContext = {
  formatMode: 'human' as OutputFormat,
  verbosity: 0,

  setFormatMode(format: OutputFormat) {
    this.formatMode = format
  },

  getFormatMode(): OutputFormat {
    return this.formatMode
  },

  isJsonMode(): boolean {
    return this.formatMode === 'json'
  },

  setVerbosity(level: number) {
    this.verbosity = level
  },

  getVerbosity(): number {
    return this.verbosity
  },
}

export function detectCliFormat(): OutputFormat {
  if (process.argv.includes('--json')) return 'json'
  if (process.argv.includes('--yaml')) return 'yaml'
  if (process.argv.includes('--html')) return 'html'
  if (process.argv.includes('--md')) return 'md'
  return 'human'
}

export function detectVerbosity(): number {
  let count = 0
  for (const arg of process.argv) {
    if (arg === '-v') count++
    if (arg === '-vv' || arg === '-v -v') count += 2
  }
  return count
}
