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
