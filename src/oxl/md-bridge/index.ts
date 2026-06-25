/**
 * md-bridge 内部 barrel (v0.3 阶段 1+2, v0.4 PR-C4 收口中)
 *
 * 阶段：v0.3.0 Step 1.2 + 阶段 1 + 阶段 2
 * 角色：md-bridge 子目录统一出口 (兼容期, v0.5 完全切到 md-pipeline)
 *
 * v0.4 PR-C4 移除:
 * - driverRegistry / getActiveDriver / setActiveDriver → 改用 ../driver.ts
 *
 * 关键导出 (compat 期间保留):
 * - MdastOxlDriver: mdast 驱动的 OXL 入口
 * - Pipeline / Validator / mdast-to-kernel: 阶段 1 核心
 * - source-hash / compiler / adapter: 阶段 2 双轨制
 */

export { MdastOxlDriver } from './mdast-oxl-driver.js'
export type { MdastRoot, MdastNode } from './mdast-oxl-driver.js'

// v0.4 PR-C4: driverRegistry 已迁出 → ../../../driver.ts
// compat: import { getActiveDriver, setActiveDriver } from '../driver.js'

// Pipeline
export { runMdPipeline } from './pipeline.js'
export type {
  PipelineInput,
  PipelineOutput,
  PipelineError,
  Frontmatter,
  IntentBlock,
  IntentEntityType,
} from './pipeline.js'

// remark-to-mdast
export {
  remarkToMdast,
  parseDomainMd,
  parseBlueprintMd,
  parseWorkMd,
  MdastParseError,
} from './remark-to-mdast.js'
export type {
  MdastConversionResult,
  DomainParseResult,
  BlueprintParseResult,
  WorkParseResult,
} from './remark-to-mdast.js'

// mdast-validator
export {
  validateMdast,
  validateMdastStrict,
  ValidationError,
} from './mdast-validator.js'
export type {
  ValidationContext,
  ValidationResult,
  ValidationIssue,
  E_MD_xxx,
} from './mdast-validator.js'

// mdast-to-kernel（核心）
export { mdastToKernel, MdastToKernelError } from './mdast-to-kernel.js'
export type { MdastToKernelContext, MdastToKernelResult } from './mdast-to-kernel.js'

// cache
export {
  getCachedParse,
  setCachedParse,
  invalidateCache,
  invalidateByPath,
  cleanExpiredCache,
  getCacheStats,
} from './cache.js'
export type { CachedParse, CacheOptions, CacheStats } from './cache.js'

// reference-checker
export {
  parseReferenceTarget,
  checkReference,
  checkReferences,
} from './reference-checker.js'
export type {
  ReferenceTarget,
  ReferenceSeverity,
  ReferenceCheckResult,
  ReferenceCheckOptions,
} from './reference-checker.js'

// ========================
// 阶段 2：双轨制
// ========================

// source-hash
export {
  readMapping,
  writeMapping,
  deleteMapping,
  listMappings,
  readMappingTable,
  writeMappingTable,
  detectHashMismatch,
  detectAllMismatches,
  computeContentHash,
  createMapping,
  updateMappingAfterSync,
} from './oxl-md-source-hash.js'
export type {
  SourceHashMapping,
  SourceHashTable,
  HashMismatchResult,
  HashMismatchReason,
  HashMismatchEntry,
} from './oxl-md-source-hash.js'

// compiler（.md → .oxn）
export { compileMdToOxn, compileAndWriteMdToOxn } from './oxl-md-compiler.js'
export type {
  CompileOptions,
  CompileResult,
  CompileAndWriteOptions,
  CompileAndWriteResult,
} from './oxl-md-compiler.js'

// adapter（.oxn ↔ .md）
export { adaptOxlMd, OxlMdAdapterError, compileMdFile } from './oxl-md-adapter.js'
export type {
  OxlMdAdapterInput,
  OxlMdAdapterResult,
  PreferredFormat,
} from './oxl-md-adapter.js'

// decompiler（.oxn → .md）
export { compileOxnToMd, DecompilerParseError } from './oxl-md-decompiler.js'
export type {
  DecompileOptions,
  DecompileResult,
  IntentEntityType as DecompileEntityType,
} from './oxl-md-decompiler.js'
