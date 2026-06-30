// =============================================================================
// Unified OXL barrel (v0.1-final)
//
// The unified grammar (see src/oxl/langium-driver/oxn.langium) defines:
//   - Probe / Part / Blueprint — asset declarations (global directory)
//   - Domain — DDD bounded context (term/ban/invariant)
//   - Work — workspace orchestrator (resource pool + task DAG)
//   - Task — align executor (domain/blueprint/part/probe declarations)
// =============================================================================

// --- Port/Contract API ---
export type { IOxnCompiler } from './contracts/oxn-compiler-port'
export type { IOxnAssetLoader } from './contracts/oxn-loader-port'
export type { IOxnWorkspaceManager } from './contracts/oxn-workspace-port'

export { createOxnCompiler } from './compiler/blueprint-compiler'
export { createOxnWorkspaceManager } from './scope/oxn-workspace-manager'
export { createOxnAssetLoader } from './loader/oxn-loader'

export { registerOxnValidators } from './validator/oxn-validation'
export { validateWorkTaskReference } from './validator/slot-reference-validator'
export { validateTaskAlign } from './validator/intent-align-validator'

// --- Schema types ---
export type {
  OxnAssemblyIR,
  OxnAssemblyPart,
  OxnAssemblyProbe,
  OxnAssemblyProp,
  OxnAssemblySlot,
  OxnDomainIR,
  OxnDomainLanguage,
  OxnTermDecl,
  OxnInvariantDecl,
  OxnTaskIR,
  OxnTaskPartDecl,
  OxnWorkIR,
  OxnWorkContext,
  OxnWorkResourceRef,
} from './schemas/oxn-assembly.schema'

export {
  createOxnDomainIR,
  createOxnTaskIR,
  createOxnWorkIR,
  validateOxnDomainIR,
  safeValidateOxnDomainIR,
  validateOxnTaskIR,
  safeValidateOxnTaskIR,
  validateOxnWorkIR,
  safeValidateOxnWorkIR,
} from './schemas/oxn-assembly.schema'

export type { CompileContext, CompileDependencies } from './compiler/blueprint-compiler'
export type { OxnScope, OxnAssetType, ResolvedOxnAsset } from './scope/oxn-scope'
export type { OxnLoadResult } from './loader/oxn-loader'
export type { ValidationError, CoverageResult, TypeCheckResult } from './evaluator/param-evaluator'

export type { CompiledBlueprint } from '@openxenon/engine/kernel/index'
export type { FrozenBlueprint } from '@openxenon/engine/kernel/index'

// --- Langium API ---
export {
  createOxnServices,
  createOxnSharedServices,
  getOxnServices,
  getOxnSharedServices,
  resetOxnServices,
  createOxnParser,
  OxnParser,
  type OxnParseResult,
} from './langium-driver/oxn-services'

// --- OxlDriver 抽象（v0.3 Step 1.2 路线 C v3）---
// 统一入口：langium + mdast 双 driver 切换
// 默认 driver：langium（向后兼容 v0.2.0）
// 切换方式：driverRegistry.setDefault('mdast') 或 OXL_DRIVER=mdast 环境变量
export type {
  OxlDriver,
  OxlDocument,
  OxlParseOptions,
  OxlDriverName,
  OxlDriverMetadata,
  OxlAstElement,
} from './contracts/oxl-driver'

// v0.4 PR-C4: driverRegistry 迁出 md-bridge → driver.ts
// compat: import { getActiveDriver, setActiveDriver } from './driver.js'
export { MdastOxlDriver } from './md-bridge'
export { LangiumOxlDriver } from './langium-driver/langium-oxl-driver'

// --- AST types (v0.1-final grammar) ---
export type {
  OXNDocument,
  WorkDeclaration,
  WorkContext,
  LoopPolicy,
  PartDeclaration,
  PartSkill,
  ProbeDeclaration,
  BlueprintDeclaration,
  PartSlotDeclaration,
  PartProbeDeclaration,
  // v0.1-final DDD
  DomainDeclaration,
  TermBlock,
  TermDecl,
  BanBlock,
  InvariantBlock,
  InvariantDecl,
  // v0.1-final Work
  DomainRefDecl,
  BlueprintRefDecl,
  PartRefDecl,
  ProbeRefDecl,
  // v0.1-final Task
  TaskDeclaration,
  TaskPartDecl,
  TaskProbeDecl,
  TaskDeps,
  // v0.1.2 Proof-First
  ProofDeclaration,
  ProofProbeDecl,
} from './langium-driver/generated/ast'

// --- AST type guards ---
export {
  isWorkDeclaration,
  isPartDeclaration,
  isProbeDeclaration,
  isBlueprintDeclaration,
  isWorkContext,
  isPartSkill,
  // v0.1-final DDD
  isDomainDeclaration,
  isTaskDeclaration,
  isDomainRefDecl,
  isBlueprintRefDecl,
  isPartRefDecl,
  isProbeRefDecl,
  isTaskPartDecl,
  isTaskProbeDecl,
  // v0.1.2 Proof-First
  isProofDeclaration,
  isProofProbeDecl,
} from './langium-driver/generated/ast'

// =============================================================================
// v0.0.28 兼容层：OpenXenon Language (OXL) 品牌升级
// 历史 API 仍以 `Oxn*` 名字导出（@deprecated）；新代码请用 `Oxl*`
// 计划下个版本（v0.1.x）批量移除
// =============================================================================

/** @deprecated brand upgrade: use OxlParser */
export { createOxnParser as createOxlParser } from './langium-driver/oxn-services'
/** @deprecated brand upgrade: use OxlAssetLoader */
export { createOxnAssetLoader as createOxlAssetLoader } from './loader/oxn-loader'
/** @deprecated brand upgrade: use OxlCompiler */
export { createOxnCompiler as createOxlCompiler } from './compiler/blueprint-compiler'
/** @deprecated brand upgrade: use OxlWorkspaceManager */
export { createOxnWorkspaceManager as createOxlWorkspaceManager } from './scope/oxn-workspace-manager'
/** @deprecated brand upgrade: use OxlValidatorRegistry */
export { registerOxnValidators as registerOxlValidators } from './validator/oxn-validation'
/** @deprecated brand upgrade: use OxlIR */
export type { OxnAssemblyIR as OxlAssemblyIR } from './schemas/oxn-assembly.schema'
/** @deprecated brand upgrade: use OxlAssetType */
export type {
  OxnAssetType as OxlAssetType,
  OxnScope as OxlScope,
  ResolvedOxnAsset as ResolvedOxlAsset,
} from './scope/oxn-scope'
/** @deprecated brand upgrade: use OxlLoadResult */
export type { OxnLoadResult as OxlLoadResult } from './loader/oxn-loader'
