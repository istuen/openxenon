import type { Blueprint, CompiledBlueprint } from '../../kernel/index'
import type { CompileContext } from '../compiler/blueprint-compiler'

export interface IOxnCompiler {
  compile(assembly: Blueprint, ctx: CompileContext): CompiledBlueprint
  compileFrozen(assembly: Record<string, unknown>, ctx: CompileContext): CompiledBlueprint
  compileAssembly(assembly: Blueprint, ctx: CompileContext): Record<string, unknown>
}
