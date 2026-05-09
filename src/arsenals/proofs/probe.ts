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

export const ProbeSchema = z.object({
  type: ProbeTypeSchema,
  params: ProbeParamsSchema
})

export type ProbeType = z.infer<typeof ProbeTypeSchema>
export type Probe = z.infer<typeof ProbeSchema>
export type ProbeParams = z.infer<typeof ProbeParamsSchema>

export function validateProbe(data: unknown): Probe {
  return ProbeSchema.parse(data)
}

export function isValidProbeType(type: string): type is ProbeType {
  return ProbeTypeSchema.safeParse(type).success
}