/**
 * Asset module — shared types (v0.6 PR-5a)
 *
 * Entity: E1 Asset 硬约束边界 (Domain / Blueprint / Stack)
 * Module: packages/engine/src/Asset/
 */
import type { AssetFormat, AssetKind } from '@openxenon/engine/infra/paths'

export type { AssetKind, AssetFormat }

/** v0.6.2 I-4: Asset 来源 scope — builtin (@oxn) 或项目 (@prj) */
export type AssetScope = 'oxn' | 'prj'

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
  /** v0.6.2 I-4: 列举范围
   *  - 'prj'（默认）：仅项目内
   *  - 'oxn'：仅 builtin（@oxn scope）
   *  - 'effective'：项目 + builtin-only（项目同名覆盖 builtin）
   */
  scope?: AssetScope | 'effective'
}

export interface ListResult {
  assets: Array<{
    kind: AssetKind
    name: string
    path: string
    format: AssetFormat
    scope: AssetScope
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
// v0.6.2-alpha.0 I-5b: Asset Diff use case
// =============================================================================

export interface DiffInput {
  kind: AssetKind
  name: string
  projectRoot: string
  /** 'unified'（默认）或 'json'（结构化差异） */
  format?: 'unified' | 'json'
}

export interface DiffResult {
  ok: boolean
  /** 项目 Asset 是否覆盖了 builtin 默认 */
  hasOverride: boolean
  /** builtin 是否存在对应默认 Asset */
  hasBuiltin: boolean
  /** 'unified' 模式为文本 diff 字符串；'json' 模式为结构化对象 */
  diff: string | object
  message: string
}

// =============================================================================
// v0.6.2-alpha.0 I-5b: Asset Migrate use case
// =============================================================================

export interface MigrateInput {
  kind: AssetKind
  name: string
  /** 目标 schema 版本号 (semver) */
  targetVersion: string
  projectRoot: string
}

export interface MigrateResult {
  ok: boolean
  /** 幂等操作（资产已在目标版本） */
  idempotent: boolean
  oldVersion: string
  newVersion: string
  message: string
  /** 迁移后 .md 路径 */
  path: string
}

// =============================================================================
// v0.6.2-alpha.0 I-5: Asset Tree use case
// =============================================================================

export interface TreeInput {
  projectRoot: string
  /** 默认 3（防止循环引用栈溢出） */
  depth?: number
  /** 'forward'（默认） | 'reverse' | 'both' */
  direction?: 'forward' | 'reverse' | 'both'
  /** 指定 root 节点；不指定则用"无 referencedBy"的节点集合 */
  root?: { kind: AssetKind; name: string }
}

export interface TreeNode {
  kind: AssetKind
  name: string
  /** 该 Asset 引用的其他 Asset 名列表 */
  references: string[]
  /** 引用该 Asset 的 (kind, name) 列表 */
  referencedBy: Array<{ kind: AssetKind; name: string }>
}

export interface TreeResult {
  ok: boolean
  nodes: TreeNode[]
  /** 人类可读的文本树 */
  humanTree: string
  message: string
}

// =============================================================================
// v0.6.2-alpha.0 I-5: Asset Unarchive use case（archive 的反向操作）
// =============================================================================

export interface UnarchiveInput {
  kind: AssetKind
  name: string
  projectRoot: string
}

export interface UnarchiveResult {
  ok: boolean
  /** 幂等操作（资产不在归档状态） */
  idempotent: boolean
  message: string
  /** 还原后 .md 路径（idempotent 时为空字符串） */
  restoredPath: string
}
