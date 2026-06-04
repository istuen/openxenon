// =============================================================================
// Unified OXN DSL barrel.
//
// The unified grammar (see src/oxn-dsl/langium/oxn.langium) is a strict
// superset of the reference grammar and the mvp grammar: it carries both
// reference's Port/Contract compiler stack and mvp's Langium-based skill
// / work-context / loop-policy extensions. This barrel re-exports the
// full surface so callers can pick the API that suits their concern:
//
//   - Port/Contract API (reference's runtime)
//       createOxnCompiler(), createOxnWorkspaceManager(), createOxnAssetLoader()
//   - Langium API (mvp's CLI parsing path)
//       createOxnServices(), getOxnServices(), OxnParser, createOxnParser()
//   - AST type guards and types
//       isWorkDeclaration, isPartDeclaration, isPartSkill, isWorkContext,
//       OXNDocument, WorkDeclaration, PartDeclaration, PartSkill,
//       WorkContext, LoopPolicy, ProbeDeclaration, ...
//   - Validators
//       registerOxnValidators, validateSlotReference
// =============================================================================

// --- Port/Contract API (reference) ---
export type { IOxnCompiler } from './contracts/oxn-compiler-port'
export type { IOxnAssetLoader } from './contracts/oxn-loader-port'
export type { IOxnWorkspaceManager } from './contracts/oxn-workspace-port'

export { createOxnCompiler } from './compiler/blueprint-compiler'
export { createOxnWorkspaceManager } from './scope/oxn-workspace-manager'
export { createOxnAssetLoader } from './loader/oxn-loader'

export { registerOxnValidators } from './validator/oxn-validation'
export { validateWorkTaskReference } from './validator/slot-reference-validator'
export { validateTaskAlign } from './validator/intent-align-validator'

export type {
  OxnAssemblyIR,
  OxnAssemblyPart,
  OxnAssemblyProbe,
  OxnAssemblyProp,
  OxnAssemblySlot,
  OxnDomainIR,
  OxnDomainLanguage,
  OxnDomainRuleBlock,
  OxnContextMap,
  OxnContextMapImport,
  OxnTaskIR,
  OxnTaskContext,
  OxnTaskSlotDecl,
  OxnWorkIR,
  OxnWorkContext,
  OxnTaskRefDecl,
  OxnUseDomainDecl,
  OxnUseBlueprintDecl,
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

export type { CompiledBlueprint } from '../kernel/schemas/validators/compiled-schema'
export type { FrozenBlueprint } from '../kernel/schemas/validators/compiled-schema'

// --- Langium API (mvp) ---
export {
  createOxnServices,
  createOxnSharedServices,
  getOxnServices,
  getOxnSharedServices,
  resetOxnServices,
  createOxnParser,
  OxnParser,
  type OxnParseResult,
} from './langium/oxn-services'

// --- AST types (unified grammar superset) ---
export type {
  OXNDocument,
  WorkDeclaration,
  WorkContext,
  LoopPolicy,
  PartDeclaration,
  PartSkill,
  SlotBinding,
  ProbeDeclaration,
  BlueprintDeclaration,
  PartSlotDeclaration,
  PartProbeDeclaration,
  // v0.1 DDD
  DomainDeclaration,
  DomainLanguage,
  DomainRuleBlock,
  DomainRuleDecl,
  DomainInjectDecl,
  NounDecl,
  VerbDecl,
  ContextMapBlock,
  ContextMapImport,
  TaskDeclaration,
  TaskContext,
  TaskRefDecl,
  UseDomainDecl,
  UseBlueprintDecl,
} from './generated/ast'

// --- AST type guards (mvp) ---
export {
  isWorkDeclaration,
  isPartDeclaration,
  isProbeDeclaration,
  isBlueprintDeclaration,
  isWorkContext,
  isPartSkill,
  // v0.1 DDD
  isDomainDeclaration,
  isDomainLanguage,
  isTaskDeclaration,
  isUseDomainDecl,
  isUseBlueprintDecl,
  isTaskRefDecl,
} from './generated/ast'
