import { createHash } from 'node:crypto'
import { join } from 'path'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from './filesystem'
import { BOUNDARY_DIR } from './paths'

function computeContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

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
  data: Record<string, unknown>
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

  /**
   * v1.1 fix-p2-robustness compile-cache-mtime: 用 mtime + size 生成
   * 一个 16 字符 fingerprint, 比 SHA-256 整文件快得多 (O(1) stat vs 整文件读 + hash).
   * 不用于主 cache key (主 key 仍是 content hash), 仅用于 invalidateByPath
   * 阶段的 fingerprint 快速比对, 确认文件未变则跳过整文件读.
   */
  private getStatFingerprint(stat: { mtimeMs: number; size: number }): string {
    return `${stat.mtimeMs.toFixed(0)}-${stat.size}`
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
    data: Record<string, unknown>,
    dependencyHashes: Record<string, string> = {},
    options: { blueprintPath?: string; fingerprint?: string } = {},
  ): CacheEntry {
    const hash = this.getCacheKey(blueprintContent)
    const entry: CacheEntry = {
      hash,
      data,
      timestamp: Date.now(),
      dependencyHashes,
      blueprintPath: options.blueprintPath,
    }
    // 存 fingerprint (mtime+size) 到 dependencyHashes 旁路, 用 synthetic key
    if (options.fingerprint) {
      const deps = entry.dependencyHashes as Record<string, string>
      deps.__fingerprint__ = options.fingerprint
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
      const fingerprint = this.getStatFingerprint(stat)

      // mtime 不可靠 (如某些 FS / docker bind mount) → fingerprint 包含 NaN 时
      // 回退 content hash. 此分支只覆盖极少数边角情况, 主流 FS (ext4/apfs/...) 走
      // 快速路径.
      const mtimeUsable = Number.isFinite(stat.mtimeMs) && stat.mtimeMs > 0

      // 走 cache 目录快速扫描: 找带 blueprintPath 字段匹配的 entry
      const files = readdirSync(this.cacheDir).filter((f) => f.endsWith('.json'))
      for (const file of files) {
        const filePath = join(this.cacheDir, file)
        let entry: CacheEntry
        try {
          entry = JSON.parse(readFileSync(filePath, 'utf-8')) as CacheEntry
        } catch {
          continue
        }
        if (entry.blueprintPath !== blueprintPath) continue

        if (mtimeUsable) {
          // 快速路径: 比对 fingerprint, 一致则缓存仍 valid, 跳过整文件读
          const storedFp = (entry.dependencyHashes as Record<string, string>).__fingerprint__
          if (storedFp === fingerprint) {
            continue
          }
          // fingerprint 变化 → 比 mtime (entry.timestamp vs file mtime)
          if (entry.timestamp >= stat.mtimeMs) {
            continue
          }
        } else {
          // Fallback: 整文件读算 content hash 比对 (极慢路径)
          const currentHash = computeContentHash(readFileSync(blueprintPath, 'utf-8'))
          if (entry.hash === currentHash) {
            continue
          }
        }

        // 失效
        this.memoryCache.delete(entry.hash)
        try {
          unlinkSync(filePath)
        } catch {
          // Ignore
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
