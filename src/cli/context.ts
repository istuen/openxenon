import type { OutputFormat } from './output'

export const cliContext = {
  formatMode: 'human' as OutputFormat,

  setFormatMode(format: OutputFormat) {
    this.formatMode = format
  },

  getFormatMode(): OutputFormat {
    return this.formatMode
  },

  isJsonMode(): boolean {
    return this.formatMode === 'json'
  }
}

export function detectCliFormat(): OutputFormat {
  if (process.argv.includes('--json')) return 'json'
  if (process.argv.includes('--yaml')) return 'yaml'
  if (process.argv.includes('--html')) return 'html'
  if (process.argv.includes('--md')) return 'md'
  return 'human'
}
