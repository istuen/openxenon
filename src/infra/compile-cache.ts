import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, statSync } from './filesystem'
import { join } from 'path'
// eslint-disable-next-line no-restricted-imports -- TODO(Phase-3): FrozenBlueprint type + computeContentHash are pure; move to shared or accept
import { computeContentHash, type FrozenBlueprint } from '../kernel/schemas/frozen-schema'
import { BOUNDARY_DIR } from './paths'

export function readCacheManifest(projectBoundary?: string): Record<string, Record<string, string>> {
  const base = projectBoundary || join(process.cwd(), BOUNDARY_DIR)
  const manifestPath = join(base, 'cache', 'manifest.json')
  if (!existsSync(manifestPath)) return {}
  try {
    return JSON.parse(readFileSync(manifestPath, 'utf-8'))
  } catch {
    return {}
  }
}

export function getCompiledHash(name: string, type: string, projectBoundary?: string): string | null {
  const manifest = readCacheManifest(projectBoundary)
  return manifest[type]?.[name] || null
}

export interface CacheEntry {
  hash: string
  frozenBlueprint: FrozenBlueprint
  timestamp: number
  blueprintPath?: string
  dependencyHashes: Record<string, string>
}

export class CompileCache {
  private cacheDir: string
  private memoryCache: Map<string, CacheEntry> = new Map()

  constructor(cacheDir?: string) {
    const baseDir = cacheDir || join(process.cwd(), BOUNDARY_DIR, 'cache', 'compile')
    this.cacheDir = baseDir
    this.ensureCacheDir()
  }

  private ensureCacheDir(): void {
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true })
    }
  }

  private getCacheKey(blueprintContent: string): string {
    return computeContentHash(blueprintContent)
  }

  private getCacheFilePath(hash: string): string {
    return join(this.cacheDir, `${hash}.json`)
  }

  get(blueprintContent: string): CacheEntry | null {
    const hash = this.getCacheKey(blueprintContent)

    if (this.memoryCache.has(hash)) {
      return this.memoryCache.get(hash)!
    }

    const filePath = this.getCacheFilePath(hash)
    if (!existsSync(filePath)) {
      return null
    }

    try {
      const content = readFileSync(filePath, 'utf-8')
      const entry = JSON.parse(content) as CacheEntry
      this.memoryCache.set(hash, entry)
      return entry
    } catch {
      return null
    }
  }

  set(
    blueprintContent: string,
    frozenBlueprint: FrozenBlueprint,
    dependencyHashes: Record<string, string> = {},
  ): CacheEntry {
    const hash = this.getCacheKey(blueprintContent)
    const entry: CacheEntry = {
      hash,
      frozenBlueprint,
      timestamp: Date.now(),
      dependencyHashes,
    }

    this.memoryCache.set(hash, entry)

    const filePath = this.getCacheFilePath(hash)
    try {
      writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf-8')
    } catch (error) {
      console.warn(`Failed to write cache file: ${error}`)
    }

    return entry
  }

  invalidate(hash: string): void {
    this.memoryCache.delete(hash)
    const filePath = this.getCacheFilePath(hash)
    if (existsSync(filePath)) {
      try {
        unlinkSync(filePath)
      } catch {
        // Ignore errors
      }
    }
  }

  invalidateByPath(blueprintPath: string): void {
    try {
      const stat = statSync(blueprintPath)
      const mtime = stat.mtimeMs
      const content = readFileSync(blueprintPath, 'utf-8')
      const hash = this.getCacheKey(content)

      const filePath = this.getCacheFilePath(hash)
      if (existsSync(filePath)) {
        const raw = readFileSync(filePath, 'utf-8')
        const entry = JSON.parse(raw) as CacheEntry
        if (entry.blueprintPath === blueprintPath && entry.timestamp < mtime) {
          this.invalidate(hash)
        }
      }
    } catch {
      // File doesn't exist or can't be read
    }
  }

  clear(): void {
    this.memoryCache.clear()
    try {
      const files = readdirSync(this.cacheDir)
      for (const file of files) {
        if (file.endsWith('.json')) {
          unlinkSync(join(this.cacheDir, file))
        }
      }
    } catch {
      // Ignore errors
    }
  }

  stats(): { count: number; size: number; oldest: number; newest: number } {
    let count = 0
    let totalSize = 0
    let oldest = Date.now()
    let newest = 0

    try {
      const files = readdirSync(this.cacheDir)
      count = files.filter((f) => f.endsWith('.json')).length

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = join(this.cacheDir, file)
          const stat = statSync(filePath)
          totalSize += stat.size
          const raw = readFileSync(filePath, 'utf-8')
          const entry = JSON.parse(raw) as CacheEntry
          if (entry.timestamp < oldest) oldest = entry.timestamp
          if (entry.timestamp > newest) newest = entry.timestamp
        }
      }
    } catch {
      // Ignore errors
    }

    return { count, size: totalSize, oldest, newest }
  }

  isValid(entry: CacheEntry, dependencyHashes?: Record<string, string>): boolean {
    if (!entry) return false

    if (dependencyHashes) {
      for (const [path, expectedHash] of Object.entries(dependencyHashes)) {
        if (entry.dependencyHashes[path] !== expectedHash) {
          return false
        }
      }
    }

    return true
  }
}

export const compileCache = new CompileCache()
