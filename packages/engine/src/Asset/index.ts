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
export { validate, validateAssetReferences, validateAssetPaper4Fields } from './validate'
export { list, listAll } from './list'
export { checkAssetDAG } from './dag-validator'
export { archive } from './archive'
export { unarchive } from './unarchive'
export { deleteAsset } from './delete'
export { evolve } from './evolve'
export { tree } from './tree'
export * from './domain-manager'
export * from './blueprint-manager'

// types re-export (centralized in ./types)
export type {
  AssetKind,
  AssetFormat,
  CreateInput,
  CreateResult,
  ValidateInput,
  ValidateResult,
  ListInput,
  ListResult,
  CompileInput,
  CompileResult,
  SyncInput,
  SyncResult,
  ArchiveInput,
  ArchiveResult,
  UnarchiveInput,
  UnarchiveResult,
  DeleteInput,
  DeleteResult,
  EvolveInput,
  EvolveResult,
  TreeInput,
  TreeResult,
  TreeNode,
} from './types'

export type { AssetPaper4Fields, AssetPaperValidationResult } from './validate'
export type { AssetNode, DagValidationResult } from './dag-validator'
export type { AssetReferenceEntry } from './internal/reference-checker'
export { isAssetReferenced, listAssetReferences } from './internal/reference-checker'
export {
  resolveArchivedAssetFile,
  resolveArchivedMetadataFile,
  getArchivedAssetDir,
} from './internal/archived-resolver'
