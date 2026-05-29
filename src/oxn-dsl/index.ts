export type { IOxnCompiler } from './contracts/oxn-compiler-port'
export type { IOxnAssetLoader } from './contracts/oxn-loader-port'
export type { IOxnWorkspaceManager } from './contracts/oxn-workspace-port'

export { createOxnCompiler } from './compiler/blueprint-compiler'
export { createOxnWorkspaceManager } from './scope/oxn-workspace-manager'
export { createOxnAssetLoader } from './loader/oxn-loader'

export { registerOxnValidators } from './validator/oxn-validation'
export { validateSlotReference } from './validator/slot-reference-validator'

export type {
  OxnAssemblyIR,
  OxnAssemblyPart,
  OxnAssemblyProbe,
  OxnAssemblyProp,
  OxnAssemblySlot,
} from './schemas/oxn-assembly.schema'

export type { CompileContext, CompileDependencies } from './compiler/blueprint-compiler'
export type { OxnScope, OxnAssetType, ResolvedOxnAsset } from './scope/oxn-scope'
export type { OxnLoadResult } from './loader/oxn-loader'
export type { ValidationError, CoverageResult, TypeCheckResult } from './evaluator/param-evaluator'

export type { CompiledBlueprint } from '../kernel/schemas/validators/compiled-schema'
export type { FrozenBlueprint } from '../kernel/schemas/validators/compiled-schema'
