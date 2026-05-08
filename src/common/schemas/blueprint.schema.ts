import { z } from 'zod'

export const ProbeSchema = z.object({
  type: z.enum(['fs_exists', 'fs_content_match', 'fs_not_exists', 'fs_parseable', 'exec_exit_zero']),
  pattern: z.string().optional(),
  patterns: z.array(z.string()).optional(),
  command: z.string().optional(),
  cwd: z.string().optional(),
})

export type Probe = z.infer<typeof ProbeSchema>

export const ProofSchema = z.object({
  target: z.object({
    description: z.string(),
    glob: z.string().optional(),
  }),
  spec: z.object({
    description: z.string(),
    constraints: z.array(z.string()).optional(),
  }),
  action: z.object({
    instruction: z.string().optional(),
    command: z.string().optional(),
  }).optional(),
  probes: z.array(ProbeSchema),
})

export type Proof = z.infer<typeof ProofSchema>

export const StageSchema = z.object({
  id: z.string(),
  name: z.string(),
  deps: z.array(z.string()).default([]),
  proof: ProofSchema,
})

export type Stage = z.infer<typeof StageSchema>

export const BlueprintSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['DRAFT', 'CANONICAL', 'ABANDONED']).default('CANONICAL'),
  stages: z.array(StageSchema).optional(),
  topology: z.array(z.string()).optional(),
  edges: z.array(z.object({ from: z.string(), to: z.string() })).optional(),
  source: z.string().optional(),
})

export type Blueprint = z.infer<typeof BlueprintSchema>

export function parseBlueprint(data: unknown): Blueprint {
  return BlueprintSchema.parse(data)
}

export function safeParseBlueprint(data: unknown): { success: true; data: Blueprint } | { success: false; error: z.ZodError } {
  const result = BlueprintSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}