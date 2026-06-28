/**
 * Asset module — DDD unified entry (v0.6 PR-5a)
 *
 * E1 Asset 硬约束边界。
 * 使用方式：
 *   import { create, validate, list } from '@openxenon/engine/Asset'
 *   await create({ kind: 'domain', name: 'Member', projectRoot })
 *   await validate({ kind: 'domain', name: 'Member', projectRoot })
 *   list({ kind: 'domain', projectRoot })
 */
export { create } from './create'
export { validate } from './validate'
export { list, listAll } from './list'
export * from './domain-manager'
export * from './blueprint-manager'

// types re-export (centralized in ./types)
export type { AssetKind, AssetFormat, CreateInput, CreateResult, ValidateInput, ValidateResult, ListInput, ListResult, CompileInput, CompileResult, SyncInput, SyncResult } from './types'
