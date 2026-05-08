import { readFileSync } from 'fs'
import { join } from 'path'

export interface ProbeContext {
  projectRoot: string
}

export interface FsMatchParams {
  pattern: string
  contains?: string
}

export async function executeFsMatch(
  params: FsMatchParams,
  context: ProbeContext
): Promise<{ matched: boolean; content?: string; error?: string }> {
  const { pattern, contains } = params

  const fullPath = pattern.startsWith('/')
    ? pattern
    : join(context.projectRoot, pattern)

  try {
    const content = readFileSync(fullPath, 'utf-8')

    if (contains) {
      const regex = new RegExp(contains)
      const matched = regex.test(content)
      return { matched, content: matched ? 'Pattern matched' : 'Pattern not found' }
    }

    return { matched: true, content }
  } catch (error) {
    return {
      matched: false,
      error: error instanceof Error ? error.message : 'Failed to read file'
    }
  }
}
