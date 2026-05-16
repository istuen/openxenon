import { statSync } from 'fs'
import { join } from 'path'
import { matchGlob, parseGlobPattern } from './glob-utils'

export interface ProbeContext {
  projectRoot: string
}

export async function executeFsNotExists(
  pattern: string,
  context: ProbeContext
): Promise<string[]> {
  const fullPattern = pattern.startsWith('/')
    ? pattern
    : join(context.projectRoot, pattern)

  if (fullPattern.includes('*') || fullPattern.includes('?')) {
    const { baseDir, globPattern } = parseGlobPattern(fullPattern, context.projectRoot)
    return matchGlob(globPattern, baseDir)
  }

  try {
    const stat = statSync(fullPattern)
    return stat.isDirectory() || stat.isFile() ? [fullPattern] : []
  } catch {
    return []
  }
}