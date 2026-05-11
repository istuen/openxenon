import { z } from 'zod'

export const ProbeTypeSchema = z.enum(['fs_exists', 'fs_content_match', 'exec_exit_zero'])

export const FsExistsParamsSchema = z.object({
  path: z.string()
})

export const FsContentMatchParamsSchema = z.object({
  path: z.string(),
  pattern: z.string()
})

export const ExecExitZeroParamsSchema = z.object({
  command: z.string()
})

export const ProbeParamsSchema = z.union([
  FsExistsParamsSchema,
  FsContentMatchParamsSchema,
  ExecExitZeroParamsSchema
])

export const ParameterDefSchema = z.object({
  name: z.string(),
  type: z.enum(['string', 'number', 'boolean']),
  required: z.boolean().optional().default(false),
  default: z.unknown().optional(),
  description: z.string()
})

export const SemanticsSchema = z.object({
  intent: z.string(),
  useWhen: z.string().optional()
})

export const ProbeInvocationSchema = z.object({
  type: ProbeTypeSchema,
  params: ProbeParamsSchema
})

export type ProbeInvocation = z.infer<typeof ProbeInvocationSchema>
export type ProbeParams = z.infer<typeof ProbeParamsSchema>

export function validateProbeInvocation(data: unknown): ProbeInvocation {
  return ProbeInvocationSchema.parse(data)
}

export function isValidProbeType(type: string): type is ProbeType {
  return ProbeTypeSchema.safeParse(type).success
}

export const ProbeDefinitionSchema = z.object({
  type: ProbeTypeSchema,
  description: z.string(),
  parameters: z.array(ParameterDefSchema),
  semantics: SemanticsSchema.optional()
})

export type ProbeDefinition = z.infer<typeof ProbeDefinitionSchema>

export function validateProbeDefinition(data: unknown): ProbeDefinition {
  return ProbeDefinitionSchema.parse(data)
}

export type ProbeType = z.infer<typeof ProbeTypeSchema>
export type Probe = z.infer<typeof ProbeInvocationSchema>

export function validateProbe(data: unknown): Probe {
  return ProbeInvocationSchema.parse(data)
}
