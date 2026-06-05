// =============================================================================
// Unified OXN DSL barrel (v0.1-final)
//
// The unified grammar (see src/oxn-dsl/langium/oxn.langium) defines:
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
  OxnContextMap,
  OxnContextMapImport,
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

export type { CompiledBlueprint } from '../kernel/schemas/validators/compiled-schema'
export type { FrozenBlueprint } from '../kernel/schemas/validators/compiled-schema'

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
} from './langium/oxn-services'

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
  ContextMapBlock,
  ContextMapImport,
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
} from './generated/ast'

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
} from './generated/ast'
