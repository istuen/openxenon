import { z } from 'zod'

export const ProbeTypeSchema = z.enum(['fs_exists', 'fs_not_exists', 'fs_match', 'shell_exec'])

export const FsExistsParamsSchema = z.object({
  pattern: z.string()
})

export const FsNotExistsParamsSchema = z.object({
  pattern: z.string()
})

export const FsMatchParamsSchema = z.object({
  pattern: z.string(),
  contains: z.string().optional()
})

export const ShellExecParamsSchema = z.object({
  command: z.string()
})

export const ProbeParamsSchema = z.union([
  FsExistsParamsSchema,
  FsNotExistsParamsSchema,
  FsMatchParamsSchema,
  ShellExecParamsSchema
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
