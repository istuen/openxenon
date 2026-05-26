import { readFileSync } from 'fs'
import { join } from 'path'
import type { ProbeContextBase } from '../../kernel/contracts/probe-port'

export interface ProbeContext extends ProbeContextBase {}

export interface FsMatchParams {
  pattern?: string
  contains?: string
  path?: string
}

export async function executeFsMatch(
  params: FsMatchParams,
  context: ProbeContext,
): Promise<{ matched: boolean; content?: string; error?: string }> {
  const filePath = params.path || params.pattern || ''
  const regexStr = params.contains || (params.pattern && params.path ? params.pattern : undefined)

  const fullPath = filePath.startsWith('/') ? filePath : join(context.projectRoot, filePath)

  try {
    const content = readFileSync(fullPath, 'utf-8')

    if (regexStr) {
      const regex = new RegExp(regexStr)
      const matched = regex.test(content)
      return { matched, content: matched ? 'Pattern matched' : 'Pattern not found' }
    }

    return { matched: true, content }
  } catch (error) {
    return {
      matched: false,
      error: error instanceof Error ? error.message : 'Failed to read file',
    }
  }
}
