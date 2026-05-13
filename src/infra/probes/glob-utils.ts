import { readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

export interface ProbeContext {
  projectRoot: string
}

export function matchGlob(pattern: string, baseDir: string): string[] {
  const results: string[] = []

  function walk(dir: string): void {
    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      return
    }
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

export function matchPattern(path: string, pattern: string): boolean {
  if (pattern.includes('*') || pattern.includes('?')) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$')
    return regex.test(path)
  }
  return path === pattern || path.endsWith('/' + pattern) || path === pattern
}

export function parseGlobPattern(fullPattern: string, projectRoot: string): { baseDir: string; globPattern: string } {
  const lastSlash = fullPattern.lastIndexOf('/')
  const baseDir = lastSlash > 0 ? fullPattern.substring(0, lastSlash) : projectRoot
  const globPattern = lastSlash > 0 ? fullPattern.substring(lastSlash + 1) : fullPattern
  return { baseDir, globPattern }
}