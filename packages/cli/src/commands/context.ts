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
  return countVerbosity(process.argv)
}

/**
 * v1.1 fix-p2-robustness vv-arg-parsing: 解析详细度等级。
 *
 * 规则:
 *   - `-v` / `--verbose` → +1
 *   - `-vv` → +2
 *   - `-vvv` → +3
 *   - `-vN` (N>=4 个 v) → +N
 *   - `-v -v` 拆成两个 argv token → 各 +1, 合计 +2
 *
 * 反模式: 不再有 `arg === '-v -v'` 字符串匹配 (argv 永远拆分为独立 token).
 *          不再有 `if/if` 重复触发 (单 token 只走一支).
 */
export function countVerbosity(argv: readonly string[]): number {
  let count = 0
  for (const arg of argv) {
    if (arg === '-v' || arg === '--verbose') {
      count++
    } else if (/^-+v+$/.test(arg)) {
      // -v / -vv / -vvv / -vvvv... 一律按 v 字符数累加 (跳过前缀 '-')
      count += arg.length - 1
    }
  }
  return count
}
