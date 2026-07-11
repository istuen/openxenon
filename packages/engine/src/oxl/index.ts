// =============================================================================
// Unified OXL barrel (v0.1-final)
//
// v0.7.0: Langium driver removed; all parsing is md-native
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

// --- OxlDriver abstract (v0.7.0: mdast only, no langium) ---
export type {
  OxlDriver,
  OxlDocument,
  OxlParseOptions,
  OxlDriverMetadata,
  OxlAstElement,
} from './contracts/oxl-driver'

export { MdastOxlDriver } from './md-bridge'

// --- AST types (v0.7.0: md-native only, no langium) ---
// AST types are now defined in md-pipeline/transformers
export type {
  DomainIR as DomainDeclaration,
  BlueprintIR as BlueprintDeclaration,
  WorkIR as WorkDeclaration,
  TaskIR as TaskDeclaration,
  ProofIR as ProofDeclaration,
} from './md-pipeline/transformers'

// =============================================================================
// v0.0.28 兼容层：OpenXenon Language (OXL) 品牌升级
// =============================================================================

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
