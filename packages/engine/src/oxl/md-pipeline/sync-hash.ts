/**
 * md-pipeline/sync-hash.ts — v0.4 Phase 1 同步元数据
 *
 * 角色：.oxn ↔ .md 双向同步的 hash + cache 工具
 *   - computeSha256(content): SHA-256 hex 摘要
 *   - readSyncMetadata(mdPath): 从 .md frontmatter 读 oxn-source-sha + md-sha + synced-at
 *   - writeSyncMetadata(mdPath, meta): 写 frontmatter 元数据
 *   - readCacheSha / writeCacheSha: 读 .cache/<name>.hash 内容
 *
 * 关键不变量：
 *   - SHA-256 hex (与 frozen.json / work-hash.txt 一致)
 *   - .md frontmatter 新增字段: oxn-source-sha / md-self-sha / synced-at
 *   - .cache/<name>.hash 文件是 .md 的 SHA-256 (idempotent 比对源)
 *
 * L0–L3 兼容性：
 *   - L1-OXL 层
 *   - 不 import L0-Processor / L1-Infra / L2-Work / L3
 */

import { createHash } from 'crypto'
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
} from '@openxenon/engine/infra/filesystem'
import { dirname, join } from 'path'

/** 同步元数据 (写 .md frontmatter) */
export interface SyncMetadata {
  /** 最近一次 sync 时 .oxn 的 SHA-256 (64-hex) */
  oxnSourceSha: string
  /** 最近一次 sync 时 .md 自身的 SHA-256 (idempotent 比对) */
  mdSelfSha: string
  /** 最近 sync 时间 (ISO 8601) */
  syncedAt: string
}

/** 计算 SHA-256 hex */
export function computeSha256(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex')
}

/** 从 md 文本提取 yaml frontmatter (```---\n...\n---``` 块) */
function extractFrontmatter(mdContent: string): { key: string; value: string; raw: string }[] {
  const m = mdContent.match(/^---\n([\s\S]*?)\n---/)
  if (!m) return []
  return m[1]!
    .split('\n')
    .filter((line) => /^\w/.test(line))
    .map((line) => {
      const kv = line.match(/^([\w-]+):\s*(.*)$/)
      if (kv) return { key: kv[1]!, value: kv[2]!.trim(), raw: line }
      return { key: '', value: '', raw: line }
    })
    .filter((x) => x.key)
}

/** 从 .md frontmatter 读 sync 元数据 (无则返回 null) */
export function readSyncMetadata(mdPath: string): SyncMetadata | null {
  if (!existsSync(mdPath)) return null
  const mdContent = readFileSync(mdPath, 'utf-8')
  const fm = extractFrontmatter(mdContent)
  const oxnSourceSha = fm.find((x) => x.key === 'oxn-source-sha')?.value
  const syncedAt = fm.find((x) => x.key === 'synced-at')?.value
  if (!oxnSourceSha || !syncedAt) return null
  return { oxnSourceSha, mdSelfSha: '', syncedAt }
}

/** 把 sync 元数据写入 .md frontmatter (保留其它字段) */
export function writeSyncMetadata(mdPath: string, meta: SyncMetadata): void {
  const mdContent = readFileSync(mdPath, 'utf-8')
  const fm = extractFrontmatter(mdContent)

  // 移除旧的 sync 字段 (准备重写)
  const cleanedFm = fm.filter((x) => x.key !== 'oxn-source-sha' && x.key !== 'md-self-sha' && x.key !== 'synced-at')
  const cleanedContent = mdContent.replace(/^---\n[\s\S]*?\n---\n/, '')

  // 构造新 frontmatter (md-self-sha 不写 — 仅 .cache 持有)
  const lines = ['---']
  for (const { key, value } of cleanedFm) {
    lines.push(`${key}: ${value}`)
  }
  lines.push(`oxn-source-sha: ${meta.oxnSourceSha}`)
  lines.push(`synced-at: ${meta.syncedAt}`)
  lines.push('---')

  const newContent = `${lines.join('\n')}\n${cleanedContent}`
  const dir = dirname(mdPath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(mdPath, newContent, 'utf-8')
}

/**
 * 构造最终的 .md 内容（含 sync frontmatter），返回 finalContent
 * 注意：md-self-sha 不写在 frontmatter (鸡生蛋问题), 只存于 .cache/<name>.hash
 */
export function composeSyncContent(rawMdContent: string, meta: { oxnSourceSha: string; syncedAt: string }): string {
  const fmEndMatch = rawMdContent.match(/^---\n[\s\S]*?\n---(\n+)/)
  const separator = fmEndMatch?.[1] ? fmEndMatch[1] : '\n'

  const fm = extractFrontmatter(rawMdContent)
  const cleanedFm = fm.filter((x) => x.key !== 'oxn-source-sha' && x.key !== 'md-self-sha' && x.key !== 'synced-at')
  const cleanedContent = rawMdContent.replace(/^---\n[\s\S]*?\n---\n+/, '')

  const lines = ['---']
  for (const { key, value } of cleanedFm) {
    lines.push(`${key}: ${value}`)
  }
  lines.push(`oxn-source-sha: ${meta.oxnSourceSha}`)
  lines.push(`synced-at: ${meta.syncedAt}`)
  lines.push('---')

  return lines.join('\n') + separator + cleanedContent
}

/** 读 .cache/<name>.hash 文件 */
export function readCacheSha(cachePath: string): string | null {
  if (!existsSync(cachePath)) return null
  return readFileSync(cachePath, 'utf-8').trim()
}

/** 写 .cache/<name>.hash 文件 */
export function writeCacheSha(cachePath: string, sha: string): void {
  const dir = dirname(cachePath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(cachePath, `${sha}\n`, 'utf-8')
}

/** 取得 .cache/<name>.hash 路径 (Phase 1 helper)
 * v0.6.1-alpha.0 #1-2: 跟随 .md 镜像路径，cache 在同目录的 .cache/ 下
 * 用 v0.6 默认布局 assets/<plural>-md/.cache/
 */
export function getCachePath(rootDir: string, entity: 'domain' | 'blueprint' | 'work', name: string): string {
  if (entity === 'work') {
    return join(rootDir, '.openxenon', 'works', '.cache', `${name}.hash`)
  }
  // v0.6 默认: assets/domains-md/.cache/X.hash (assetFormat='oxn' 时)
  // v0.5 fallback: domains-md/.cache/X.hash
  // 用 config.assetRoot 决定
  const configPath = join(rootDir, '.openxenon', 'config.json')
  let assetRoot = 'assets'
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs')
    const raw = fs.readFileSync(configPath, 'utf-8')
    const config = JSON.parse(raw)
    if (config.assetRoot) assetRoot = config.assetRoot
  } catch {
    // ignore
  }
  // v0.6.1-alpha.0 #1-7: cache 与主目录同级
  const plural = entity === 'domain' ? 'domains' : entity === 'blueprint' ? 'blueprints' : 'stack'
  return join(rootDir, '.openxenon', assetRoot, plural, '.cache', `${name}.hash`)
}

/** 取得 Phase 2 .cache/<name>.md-hash 路径 (用于 .md → .oxn 方向 idempotent 比对)
 * v0.6.1-alpha.0 #1-2: 与 getCachePath 一致
 */
export function getCacheMdPath(rootDir: string, entity: 'domain' | 'blueprint' | 'work', name: string): string {
  if (entity === 'work') {
    return join(rootDir, '.openxenon', 'works', '.cache', `${name}.md-hash`)
  }
  const configPath = join(rootDir, '.openxenon', 'config.json')
  let assetRoot = 'assets'
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs')
    const raw = fs.readFileSync(configPath, 'utf-8')
    const config = JSON.parse(raw)
    if (config.assetRoot) assetRoot = config.assetRoot
  } catch {
    // ignore
  }
  // v0.6.1-alpha.0 #1-7: cache 与主目录同级（v0.5 双轨同目录语义）
  const plural = entity === 'domain' ? 'domains' : entity === 'blueprint' ? 'blueprints' : 'stack'
  return join(rootDir, '.openxenon', assetRoot, plural, '.cache', `${name}.md-hash`)
}

/** v0.6.1-alpha.0 #1-16: 清理 entity 的 .cache/ 目录下所有 hash 文件
 * 返回清理的文件数（包括 .hash + .md-hash）
 *
 * 路径：
 *   - entity='work'    → .openxenon/works/.cache/*.hash, *.md-hash
 *   - entity 其它      → .openxenon/{config.assetRoot}/{plural}/.cache/*.hash, *.md-hash
 *
 * 注：仅删 .hash 与 .md-hash 文件，保留 .cache 目录本身（下次 sync 会复用）
 */
export function clearCacheForEntity(
  rootDir: string,
  entity: 'domain' | 'blueprint' | 'work',
): {
  removed: number
  cacheDir: string | null
  paths: string[]
} {
  let cacheDir: string
  if (entity === 'work') {
    cacheDir = join(rootDir, '.openxenon', 'works', '.cache')
  } else {
    // v0.6.1-alpha.0 #1-7: 与 getCachePath 一致 (复用 assetRoot 读 config)
    const configPath = join(rootDir, '.openxenon', 'config.json')
    let assetRoot = 'assets'
    try {
      const raw = readFileSync(configPath, 'utf-8')
      const config = JSON.parse(raw)
      if (config.assetRoot) assetRoot = config.assetRoot
    } catch {
      // ignore
    }
    const plural = entity === 'domain' ? 'domains' : entity === 'blueprint' ? 'blueprints' : 'stack'
    cacheDir = join(rootDir, '.openxenon', assetRoot, plural, '.cache')
  }
  if (!existsSync(cacheDir)) {
    return { removed: 0, cacheDir: null, paths: [] }
  }
  const paths: string[] = []
  for (const f of readdirSync(cacheDir)) {
    if (f.endsWith('.hash') || f.endsWith('.md-hash')) {
      paths.push(join(cacheDir, f))
    }
  }
  for (const p of paths) {
    try {
      unlinkSync(p)
    } catch {
      // ignore per-file errors (e.g. perm denied; skip but continue)
    }
  }
  return { removed: paths.length, cacheDir, paths }
}
