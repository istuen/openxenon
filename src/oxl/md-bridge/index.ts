/**
 * md-bridge 内部 barrel（v0.3 阶段 1+2）
 *
 * 阶段：v0.3.0 Step 1.2 + 阶段 1
 * 角色：md-bridge 子目录统一出口
 *
 * 关键导出：
 * - MdastOxlDriver：mdast 驱动的 OXL 入口
 * - driverRegistry：driver 注册表
 * - getActiveDriver / setActiveDriver：driver 选择 API
 * - pipeline / remark-to-mdast / mdast-validator / mdast-to-kernel
 *   / cache / reference-checker：md-bridge 核心 API
 */

export { MdastOxlDriver } from './mdast-oxl-driver.js'
export type { MdastRoot, MdastNode } from './mdast-oxl-driver.js'

export {
  driverRegistry,
  getActiveDriver,
  setActiveDriver,
} from './driver-registry.js'

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
