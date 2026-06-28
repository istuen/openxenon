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
import { readFileSync, writeFileSync, existsSync, mkdirSync } from '@openxenon/engine/infra/filesystem'
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

/** 取得 .cache/<name>.hash 路径 (Phase 1 helper) */
export function getCachePath(rootDir: string, entity: 'domain' | 'blueprint' | 'work', name: string): string {
  return join(rootDir, '.openxenon', entity === 'work' ? 'works' : `${entity}s-md`, '.cache', `${name}.hash`)
}

/** 取得 Phase 2 .cache/<name>.md-hash 路径 (用于 .md → .oxn 方向 idempotent 比对) */
export function getCacheMdPath(rootDir: string, entity: 'domain' | 'blueprint' | 'work', name: string): string {
  return join(rootDir, '.openxenon', entity === 'work' ? 'works' : `${entity}s-md`, '.cache', `${name}.md-hash`)
}
