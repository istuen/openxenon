/**
 * Asset module — shared types (v0.6 PR-5a)
 *
 * Entity: E1 Asset 硬约束边界 (Domain / Blueprint / Stack)
 * Module: packages/engine/src/Asset/
 */
import type { AssetFormat, AssetKind } from '@openxenon/engine/infra/paths'

export type { AssetKind, AssetFormat }

export interface CreateInput {
  kind: AssetKind
  name: string
  format?: AssetFormat
  projectRoot: string
  /** v0.6.1-alpha.1 Batch 2: 可选 slots 列表（仅 blueprint 生效）*/
  slots?: string[]
  /** v0.6.1-alpha.1 Batch 2: 覆盖已存在文件（默认 false）*/
  force?: boolean
}

export interface CreateResult {
  assetPath: string
  content: string
  createdAt: string
}

export interface ValidateInput {
  kind: AssetKind
  name: string
  projectRoot: string
}

export interface ValidateResult {
  ok: boolean
  errors: string[]
  ast?: unknown
  domain?: unknown
  blueprint?: unknown
  stack?: unknown
}

export interface ListInput {
  kind: AssetKind
  projectRoot: string
}

export interface ListResult {
  assets: Array<{
    kind: AssetKind
    name: string
    path: string
    format: AssetFormat
  }>
}

export interface CompileInput {
  kind: AssetKind
  name: string
  target: 'md' | 'ir'
  projectRoot: string
}

export interface CompileResult {
  ok: boolean
  output: string
  errors: string[]
}

export interface SyncInput {
  kind: AssetKind
  name: string
  direction: 'oxn-to-md' | 'md-to-oxn' | 'auto'
  force?: boolean
  projectRoot: string
}

export interface SyncResult {
  ok: boolean
  direction: string
  sourceHash: string
  targetHash: string
  changed: boolean
}

// =============================================================================
// v0.6.1-alpha.1 Asset Lifecycle: archive / delete / evolve
// =============================================================================

export interface ArchiveInput {
  kind: AssetKind
  name: string
  /** 归档原因（必填，用于审计） */
  reason: string
  projectRoot: string
}

export interface ArchiveResult {
  ok: boolean
  /** 幂等操作（资产已归档） */
  idempotent: boolean
  /** 归档后 .md 路径 */
  archivedPath: string
  /** 归档 metadata.json 路径 */
  metadataPath?: string
  message: string
}

export interface DeleteInput {
  kind: AssetKind
  name: string
  /** 强制删除（无此 flag → YIELD_TO_HUMAN） */
  force: boolean
  projectRoot: string
}

export interface DeleteResult {
  ok: boolean
  /** 幂等操作（资产不存在） */
  idempotent: boolean
  /** 删除路径（用于审计） */
  deletedPath: string
  /** 删除日志路径 */
  logPath?: string
  message: string
}

export interface EvolveInput {
  kind: AssetKind
  name: string
  /** 新版本 name */
  newName: string
  projectRoot: string
}

export interface EvolveResult {
  ok: boolean
  oldName: string
  newName: string
  oldPath: string
  newPath: string
  evolvedAt: string
  message: string
}

// =============================================================================
// Unarchive — archive 的反向操作 (v0.6.2-alpha.0)
// =============================================================================

export interface UnarchiveInput {
  kind: AssetKind
  name: string
  projectRoot: string
}

export interface UnarchiveResult {
  ok: boolean
  /** 幂等操作（资产未归档） */
  idempotent: boolean
  /** 恢复后 .md 路径 */
  restoredPath: string
  message: string
}

// =============================================================================
// Tree — 依赖图展示 (v0.6.2-alpha.0)
// =============================================================================

export interface TreeInput {
  projectRoot: string
  /** 起点（kind+name），不指定则扫所有 root（无任何反向引用的 Asset） */
  root?: { kind: AssetKind; name: string }
  /** 最大深度（默认 3，防止循环引用栈溢出） */
  depth?: number
  /** 方向：forward=我引用了谁 / reverse=谁引用了我 / both=双向 */
  direction?: 'forward' | 'reverse' | 'both'
  /** 按 kind 过滤（默认 5 类全扫） */
  kind?: AssetKind
}

export interface TreeNode {
  kind: AssetKind
  name: string
  references: string[]
  referencedBy: Array<{ kind: AssetKind; name: string }>
}

export interface TreeResult {
  ok: boolean
  nodes: TreeNode[]
  humanTree: string
  message: string
}
