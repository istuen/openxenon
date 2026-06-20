import { readdirSync, statSync } from '../filesystem'
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
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*').replace(/\?/g, '.')}$`)
    return regex.test(path)
  }
  return path === pattern || path.endsWith(`/${pattern}`) || path === pattern
}

export function parseGlobPattern(fullPattern: string, projectRoot: string): { baseDir: string; globPattern: string } {
  const isAbsolute = fullPattern.startsWith('/')
  const normalizedPattern = isAbsolute ? fullPattern.substring(1) : fullPattern

  const firstGlobIndex = Math.min(
    normalizedPattern.indexOf('*') === -1 ? Infinity : normalizedPattern.indexOf('*'),
    normalizedPattern.indexOf('?') === -1 ? Infinity : normalizedPattern.indexOf('?'),
  )

  let splitIndex: number
  if (firstGlobIndex === Infinity) {
    splitIndex = normalizedPattern.lastIndexOf('/')
  } else {
    const slashBeforeGlob = normalizedPattern.lastIndexOf('/', firstGlobIndex - 1)
    splitIndex = slashBeforeGlob
  }

  if (splitIndex <= 0) {
    return { baseDir: projectRoot, globPattern: normalizedPattern }
  }

  const baseDir = (isAbsolute ? '/' : '') + normalizedPattern.substring(0, splitIndex)
  const globPattern = normalizedPattern.substring(splitIndex + 1)
  return { baseDir, globPattern }
}
