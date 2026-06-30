import type { z } from 'zod'
import { PartInvocationSchema } from './blueprint.schema'
import { PartDefinitionSchema } from './part-asset'

export { PartDefinitionSchema, PartInvocationSchema }

export type PartDefinition = z.infer<typeof PartDefinitionSchema>
export type PartInvocation = z.infer<typeof PartInvocationSchema>

export function validatePartDefinition(data: unknown): PartDefinition {
  return PartDefinitionSchema.parse(data)
}

export function validatePartInvocation(data: unknown): PartInvocation {
  return PartInvocationSchema.parse(data)
}

export type Part = PartInvocation

export function validatePart(data: unknown): Part {
  return PartInvocationSchema.parse(data)
}
