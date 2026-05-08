import { readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

export interface ProbeContext {
  projectRoot: string
}

function matchGlob(pattern: string, baseDir: string): string[] {
  const results: string[] = []

  function walk(dir: string): void {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      const fullPath = join(dir, entry)
      const relativePath = relative(baseDir, fullPath)

      try {
        const stat = statSync(fullPath)
        if (stat.isDirectory()) {
          walk(fullPath)
        } else if (matchPattern(relativePath, pattern)) {
          results.push(fullPath)
        }
      } catch {
        // Skip files we can't access
      }
    }
  }

  walk(baseDir)
  return results
}

function matchPattern(path: string, pattern: string): boolean {
  if (pattern.includes('*')) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$')
    return regex.test(path)
  }
  return path === pattern || path.endsWith(pattern)
}

export async function executeFsNotExists(
  pattern: string,
  context: ProbeContext
): Promise<string[]> {
  const fullPattern = pattern.startsWith('/')
    ? pattern
    : join(context.projectRoot, pattern)

  if (fullPattern.includes('*') || fullPattern.includes('?')) {
    const baseDir = context.projectRoot
    const globPattern = fullPattern.substring(fullPattern.indexOf('/') + 1)
    return matchGlob(globPattern, baseDir)
  }

  try {
    const stat = statSync(fullPattern)
    return stat.isDirectory() || stat.isFile() ? [fullPattern] : []
  } catch {
    return []
  }
}
