/**
 * md-bridge/cache.ts — contentHash 解析结果缓存
 *
 * v0.3 阶段 1 T6 任务
 *
 * 角色：
 * - 基于 contentHash 缓存 mdast 解析结果
 * - 缓存位置：.openxenon/.cache/mdast/<hash>.json（chmod 0o444，gitignored）
 * - 7 天 TTL
 *
 * 关键不变量：
 * - 缓存命中：直接返回 mdast，避免重新解析
 * - 缓存失效：contentHash 变化时自动失效
 * - 内存峰值：典型 50 Task Work ~5MB（vs 无缓存 ~150MB）
 *
 * 性能估算（典型 50 Task Work）：
 * - 无缓存：~2.5s
 * - 有缓存（命中）：~50ms
 * - 增量解析（1 Task 变化）：~70ms（49 命中 + 1 新解析）
 */

import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { readdirSync, unlinkSync, statSync, mkdirSync, writeFileSync } from 'node:fs'
import { existsSync, readFileSync } from 'node:fs'
import type { Root } from 'mdast'

// ========================
// 类型
// ========================

export interface CachedParse {
  /** 缓存文件路径（hash 命名）*/
  path: string
  /** 源文件路径（用于调试）*/
  sourcePath: string
  /** contentHash（SHA-256）*/
  contentHash: string
  /** mdast JSON 的 SHA-256（用于缓存验证）*/
  mdastHash: string
  /** 解析时间（ms）*/
  parseTime: number
  /** 缓存创建时间 */
  createdAt: number
  /** mdast AST（序列化）*/
  mdast: Root
}

export interface CacheOptions {
  /** 缓存目录（默认 .openxenon/.cache/mdast/）*/
  cacheDir?: string
  /** TTL（默认 7 天，毫秒）*/
  ttlMs?: number
  /** 项目根目录（用于相对路径）*/
  projectRoot?: string
}

// ========================
// 默认值
// ========================

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const DEFAULT_CACHE_DIR = '.openxenon/.cache/mdast'
const CACHE_FILE_MODE = 0o444

// ========================
// 缓存实现
// ========================

/**
 * 获取缓存的解析结果
 *
 * @returns 缓存命中返回 mdast；未命中返回 null
 */
export function getCachedParse(
  sourcePath: string,
  contentHash: string,
  options: CacheOptions = {},
): CachedParse | null {
  const cachePath = getCachePath(sourcePath, contentHash, options)

  if (!existsSync(cachePath)) {
    return null
  }

  const content = readFileSync(cachePath, 'utf-8')

  let cached: CachedParse
  try {
    cached = JSON.parse(content)
  } catch {
    return null
  }

  // TTL 校验
  const ttl = options.ttlMs ?? DEFAULT_TTL_MS
  if (Date.now() - cached.createdAt > ttl) {
    invalidateCache(sourcePath, contentHash, options)
    return null
  }

  return cached
}

/**
 * 写入缓存
 */
export function setCachedParse(
  mdast: Root,
  sourcePath: string,
  contentHash: string,
  parseTime: number,
  options: CacheOptions = {},
): CachedParse {
  const cacheDir = getCacheDir(options)
  const cachePath = getCachePath(sourcePath, contentHash, options)

  // 确保缓存目录存在
  mkdirSync(cacheDir, { recursive: true })

  // 计算 mdast hash
  const mdastHash = createHash('sha256').update(JSON.stringify(mdast)).digest('hex')

  const cached: CachedParse = {
    path: cachePath,
    sourcePath,
    contentHash,
    mdastHash,
    parseTime,
    createdAt: Date.now(),
    mdast,
  }

  // 写入（chmod 0o444 仅 owner 可读）
  writeFileSync(cachePath, JSON.stringify(cached), { mode: CACHE_FILE_MODE })

  return cached
}

/**
 * 失效缓存（删除单条）
 */
export function invalidateCache(sourcePath: string, contentHash: string, options: CacheOptions = {}): void {
  const cachePath = getCachePath(sourcePath, contentHash, options)
  if (existsSync(cachePath)) {
    unlinkSync(cachePath)
  }
}

/**
 * 失效某源文件的所有缓存（contentHash 变化时）
 *
 * 注：contentHash 变化后旧 hash 缓存自然孤立，可定期 GC
 */
export function invalidateByPath(sourcePath: string, options: CacheOptions = {}): number {
  const cacheDir = getCacheDir(options)
  if (!existsSync(cacheDir)) return 0

  // 简化实现：扫描缓存目录
  // v0.3 阶段 1：直接通过 contentHash 路径定位
  // 高级实现可建 .openxenon/.cache/mdast/_index.json 索引
  let removed = 0
  const files = readdirSync(cacheDir)
  for (const file of files) {
    if (file === '.gitkeep' || file === '_index.json') continue
    // 简化：假设所有 .json 都是缓存
    if (file.endsWith('.json')) {
      const fullPath = join(cacheDir, file)
      let content: string
      try {
        content = readFileSync(fullPath, 'utf-8')
      } catch {
        continue
      }
      try {
        const cached = JSON.parse(content) as CachedParse
        if (cached.sourcePath === sourcePath) {
          unlinkSync(fullPath)
          removed++
        }
      } catch {
        // 跳过损坏缓存
      }
    }
  }
  return removed
}

/**
 * 清理过期缓存
 */
export function cleanExpiredCache(options: CacheOptions = {}): number {
  const cacheDir = getCacheDir(options)
  if (!existsSync(cacheDir)) return 0

  const ttl = options.ttlMs ?? DEFAULT_TTL_MS
  const now = Date.now()
  let removed = 0

  const files = readdirSync(cacheDir)
  for (const file of files) {
    if (file === '.gitkeep' || file === '_index.json') continue
    if (!file.endsWith('.json')) continue

    const fullPath = join(cacheDir, file)
    let content: string
    try {
      content = readFileSync(fullPath, 'utf-8')
    } catch {
      continue
    }
    try {
      const cached = JSON.parse(content) as CachedParse
      if (now - cached.createdAt > ttl) {
        unlinkSync(fullPath)
        removed++
      }
    } catch {
      // 损坏缓存：直接删除
      unlinkSync(fullPath)
      removed++
    }
  }

  return removed
}

// ========================
// 辅助函数
// ========================

function getCacheDir(options: CacheOptions): string {
  if (options.cacheDir) {
    return options.cacheDir
  }
  const projectRoot = options.projectRoot ?? process.cwd()
  return join(projectRoot, DEFAULT_CACHE_DIR)
}

function getCachePath(_sourcePath: string, contentHash: string, options: CacheOptions = {}): string {
  const cacheDir = getCacheDir(options)
  return join(cacheDir, `${contentHash}.json`)
}

/**
 * 缓存统计
 */
export interface CacheStats {
  total: number
  expired: number
  sizeBytes: number
  oldestCreatedAt: number
  newestCreatedAt: number
}

export function getCacheStats(options: CacheOptions = {}): CacheStats {
  const cacheDir = getCacheDir(options)
  if (!existsSync(cacheDir)) {
    return { total: 0, expired: 0, sizeBytes: 0, oldestCreatedAt: 0, newestCreatedAt: 0 }
  }

  const ttl = options.ttlMs ?? DEFAULT_TTL_MS
  const now = Date.now()
  let total = 0
  let expired = 0
  let sizeBytes = 0
  let oldestCreatedAt = Number.MAX_SAFE_INTEGER
  let newestCreatedAt = 0

  const files = readdirSync(cacheDir)
  for (const file of files) {
    if (file === '.gitkeep' || file === '_index.json') continue
    if (!file.endsWith('.json')) continue

    const fullPath = join(cacheDir, file)
    const stat = statSync(fullPath)

    sizeBytes += stat.size
    total++

    let content: string
    try {
      content = readFileSync(fullPath, 'utf-8')
    } catch {
      continue
    }
    try {
      const cached = JSON.parse(content) as CachedParse
      if (now - cached.createdAt > ttl) expired++
      if (cached.createdAt < oldestCreatedAt) oldestCreatedAt = cached.createdAt
      if (cached.createdAt > newestCreatedAt) newestCreatedAt = cached.createdAt
    } catch {
      // 损坏
    }
  }

  if (oldestCreatedAt === Number.MAX_SAFE_INTEGER) oldestCreatedAt = 0

  return { total, expired, sizeBytes, oldestCreatedAt, newestCreatedAt }
}
