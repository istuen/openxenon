import { z } from 'zod'
import { StageDefinitionSchema } from './stage-asset'
import { StageInvocationSchema } from './blueprint.schema'

export {
  StageDefinitionSchema,
  StageInvocationSchema
}

export type StageDefinition = z.infer<typeof StageDefinitionSchema>
export type StageInvocation = z.infer<typeof StageInvocationSchema>

export function validateStageDefinition(data: unknown): StageDefinition {
  return StageDefinitionSchema.parse(data)
}

export function validateStageInvocation(data: unknown): StageInvocation {
  return StageInvocationSchema.parse(data)
}

export type Stage = StageInvocation

export function validateStage(data: unknown): Stage {
  return StageInvocationSchema.parse(data)
}