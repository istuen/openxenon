/**
 * md-bridge/oxl-md-source-hash.ts — .md ↔ .oxn source hash 管理
 *
 * v0.3 阶段 2 T9 任务（路线 C v3.2 + Intent 边界）
 *
 * 角色：
 * - 维护 .md ↔ .oxn 之间的 source hash 映射表
 * - 检测 hash mismatch（双轨制关键守卫）
 * - 防止手工编辑 .oxn（pre-commit hook 配合）
 *
 * 关键不变量：
 * - .md = 唯一写入入口（A1 v3.1 §11.2 锁定）
 * - .oxn 自动编译生成（sourceHash = mdContentHash）
 * - 任何 .oxn 漂移 = sourceHash 校验失败
 *
 * 数据结构：
 * - 存储位置：.openxenon/.oxn-md-mapping.json
 * - 格式：{ "blueprints/dev-workflow.md": { mdPath, oxnPath, sourceHash, lastSyncedAt } }
 */

import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'

// ========================
// 类型
// ========================

/**
 * 单个 .md ↔ .oxn 映射记录
 */
export interface SourceHashMapping {
  /** .md 文件绝对路径 */
  mdPath: string
  /** .oxn 文件绝对路径 */
  oxnPath: string
  /** .md contentHash（被 .oxn sourceHash 引用）*/
  mdContentHash: string
  /** .oxn sourceHash（来自 frontmatter，编译时写入）*/
  oxnSourceHash: string
  /** 上次同步时间（ms timestamp）*/
  lastSyncedAt: number
  /** 同步次数（用于审计）*/
  syncCount: number
}

/**
 * 映射表（key: mdPath 规范化路径）
 */
export type SourceHashTable = Record<string, SourceHashMapping>

// ========================
// 路径工具
// ========================

/** 映射表默认路径 */
const DEFAULT_MAPPING_PATH = '.openxenon/.oxn-md-mapping.json'

function getMappingPath(projectRoot?: string): string {
  const root = projectRoot ?? process.cwd()
  return join(root, DEFAULT_MAPPING_PATH)
}

/** 规范化路径作为 key（统一分隔符 + 去尾斜杠）*/
function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/$/, '')
}

// ========================
// 映射表读写
// ========================

/**
 * 读取映射表（不存在返回空表）
 */
export function readMappingTable(projectRoot?: string): SourceHashTable {
  const path = getMappingPath(projectRoot)

  if (!existsSync(path)) {
    return {}
  }

  try {
    const content = readFileSync(path, 'utf-8')
    const table = JSON.parse(content) as SourceHashTable
    return table
  } catch {
    return {}
  }
}

/**
 * 写入映射表
 */
export function writeMappingTable(table: SourceHashTable, projectRoot?: string): void {
  const path = getMappingPath(projectRoot)
  const dir = join(path, '..')

  // 确保目录存在
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  // 写入（0o644 测试更宽容；生产可 chmod 0o444）
  writeFileSync(path, JSON.stringify(table, null, 2), { mode: 0o644 })
}

// ========================
// 单条记录操作
// ========================

/**
 * 读取单条记录
 */
export function readMapping(mdPath: string, projectRoot?: string): SourceHashMapping | null {
  const table = readMappingTable(projectRoot)
  return table[normalizePath(mdPath)] ?? null
}

/**
 * 写入单条记录
 */
export function writeMapping(mapping: SourceHashMapping, projectRoot?: string): void {
  const table = readMappingTable(projectRoot)
  const key = normalizePath(mapping.mdPath)

  table[key] = {
    ...mapping,
    lastSyncedAt: Date.now(),
  }

  writeMappingTable(table, projectRoot)
}

/**
 * 删除单条记录
 */
export function deleteMapping(mdPath: string, projectRoot?: string): boolean {
  const table = readMappingTable(projectRoot)
  const key = normalizePath(mdPath)

  if (!(key in table)) return false

  delete table[key]
  writeMappingTable(table, projectRoot)
  return true
}

/**
 * 列出所有记录
 */
export function listMappings(projectRoot?: string): SourceHashMapping[] {
  return Object.values(readMappingTable(projectRoot))
}

// ========================
// Hash mismatch 检测
// ========================

/**
 * 检测 hash mismatch
 *
 * 判定规则：
 * - 记录不存在 → 无 mismatch（首次同步）
 * - mdContentHash 变化 → mismatch（.md 改了未重新编译 .oxn）
 * - oxnSourceHash 与 mdContentHash 不一致 → mismatch（.oxn 漂移或手工编辑）
 */
export function detectHashMismatch(mapping: SourceHashMapping, currentMdContentHash: string): HashMismatchResult {
  if (mapping.mdContentHash !== currentMdContentHash) {
    return {
      mismatch: true,
      reason: 'md_content_changed',
      detail: `.md content hash changed: stored=${mapping.mdContentHash.slice(0, 8)}..., current=${currentMdContentHash.slice(0, 8)}...`,
    }
  }

  if (mapping.oxnSourceHash !== mapping.mdContentHash) {
    return {
      mismatch: true,
      reason: 'oxn_drifted',
      detail: `.oxn source hash drifted: oxn=${mapping.oxnSourceHash.slice(0, 8)}..., md=${mapping.mdContentHash.slice(0, 8)}...`,
    }
  }

  return { mismatch: false }
}

/**
 * Hash mismatch 详情
 */
export type HashMismatchReason =
  | 'md_content_changed' // .md 改了
  | 'oxn_drifted' // .oxn 漂移
  | 'oxn_missing' // .oxn 文件不存在
  | 'md_missing' // .md 文件不存在

export interface HashMismatchResult {
  mismatch: boolean
  reason?: HashMismatchReason
  detail?: string
}

// ========================
// 批量检测
// ========================

/**
 * 批量检测 hash mismatch
 *
 * 扫描映射表，对每条记录检测当前 .md contentHash 是否一致
 */
export function detectAllMismatches(
  currentHashes: Record<string, string>, // mdPath → currentMdContentHash
  projectRoot?: string,
): HashMismatchEntry[] {
  const table = readMappingTable(projectRoot)
  const results: HashMismatchEntry[] = []

  for (const [mdPath, mapping] of Object.entries(table)) {
    const currentHash = currentHashes[mdPath]
    if (!currentHash) {
      results.push({ mdPath, mapping, mismatch: { mismatch: true, reason: 'md_missing' } })
      continue
    }

    const result = detectHashMismatch(mapping, currentHash)
    results.push({ mdPath, mapping, mismatch: result })
  }

  return results
}

export interface HashMismatchEntry {
  mdPath: string
  mapping: SourceHashMapping
  mismatch: HashMismatchResult
}

// ========================
// 工具函数
// ========================

/**
 * 计算 contentHash（SHA-256）
 */
export function computeContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

/**
 * 创建新映射记录
 */
export function createMapping(
  mdPath: string,
  oxnPath: string,
  mdContent: string,
  _projectRoot?: string,
): SourceHashMapping {
  const mdContentHash = computeContentHash(mdContent)
  return {
    mdPath: normalizePath(mdPath),
    oxnPath: normalizePath(oxnPath),
    mdContentHash,
    oxnSourceHash: mdContentHash, // 初始与 mdContentHash 一致
    lastSyncedAt: Date.now(),
    syncCount: 1,
  }
}

/**
 * 更新 mapping（同步后）
 */
export function updateMappingAfterSync(mapping: SourceHashMapping, newMdContent: string): SourceHashMapping {
  const newHash = computeContentHash(newMdContent)
  return {
    ...mapping,
    mdContentHash: newHash,
    oxnSourceHash: newHash,
    lastSyncedAt: Date.now(),
    syncCount: mapping.syncCount + 1,
  }
}
