import { z } from 'zod'

export const StageInvocationSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  proof: z.string(),
  deps: z.array(z.string()).optional()
}).strict()

export const StageDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  proof: z.string(),
  deps: z.array(z.string()).optional()
}).strict()

export type StageInvocation = z.infer<typeof StageInvocationSchema>
export type StageDefinition = z.infer<typeof StageDefinitionSchema>

export function validateStageInvocation(data: unknown): StageInvocation {
  return StageInvocationSchema.parse(data)
}

export function validateStageDefinition(data: unknown): StageDefinition {
  return StageDefinitionSchema.parse(data)
}

export type Stage = z.infer<typeof StageInvocationSchema>

export function validateStage(data: unknown): Stage {
  return StageInvocationSchema.parse(data)
}