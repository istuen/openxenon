import { readFileSync } from 'fs'
import { join } from 'path'
import type { ProbeContextBase } from '../../kernel/index'
import { isSafeRegex } from './regex-safety'

export interface ProbeContext extends ProbeContextBase {}

export interface FsMatchParams {
  pattern?: string
  contains?: string
  path?: string
}

export interface FsMatchResult {
  /** Whether the regex matched the file content */
  matched: boolean
  /** The actual file content (undefined if file not found) */
  content?: string
  /** Error message if read failed */
  error?: string
  /** The regex pattern used (for Kernel verdict) */
  pattern?: string
}

export async function executeFsMatch(params: FsMatchParams, context: ProbeContext): Promise<FsMatchResult> {
  const filePath = params.path || params.pattern || ''
  const regexStr = params.contains || (params.pattern && params.path ? params.pattern : undefined)

  const fullPath = filePath.startsWith('/') ? filePath : join(context.projectRoot, filePath)

  try {
    const content = readFileSync(fullPath, 'utf-8')

    if (regexStr) {
      // C4 P0 fix: ReDoS guard. Reject unsafe patterns BEFORE invoking
      // the RegExp engine to prevent catastrophic backtracking attacks
      // (e.g. (a+)+b on a long 'aaaa...aaa!' input hangs the process).
      if (!isSafeRegex(regexStr)) {
        return {
          matched: false,
          error: `unsafe regex pattern rejected by ReDoS guard: ${regexStr.slice(0, 64)}`,
          pattern: regexStr,
        }
      }
      const regex = new RegExp(regexStr)
      const matched = regex.test(content)
      return { matched, content, pattern: regexStr }
    }

    // No pattern → just check file exists & non-empty
    return { matched: content.length > 0, content, pattern: regexStr }
  } catch (error) {
    return {
      matched: false,
      error: error instanceof Error ? error.message : 'Failed to read file',
      pattern: regexStr,
    }
  }
}
