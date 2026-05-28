import type { Blueprint } from '../../kernel/schemas/validators/blueprint.schema'
import type { CompileContext } from '../compiler/blueprint-compiler'
import type { CompiledBlueprint } from '../../kernel/schemas/validators/compiled-schema'

export interface IOxnCompiler {
  compile(assembly: Blueprint, ctx: CompileContext): CompiledBlueprint
  compileFrozen(assembly: Record<string, unknown>, ctx: CompileContext): CompiledBlueprint
  compileAssembly(assembly: Blueprint, ctx: CompileContext): Record<string, unknown>
}
