import { z } from 'zod'

// =============================================================================
// Unified WorkState schema (decision B1: mvp schema + PartExecution/probes).
//
// The shape is the mvp's WorkState with two additions:
//   - partExecutions[]: per-part execution rows carrying probe results
//     (so that reference's "客观判决" path is preserved end-to-end)
//   - skill / partSpecs are unchanged from the mvp schema
// =============================================================================

export const WorkStatusSchema = z.enum(['pending', 'running', 'passed', 'failed', 'error'])

export const LoopMetaSchema = z.object({
  currentIteration: z.number().int().min(0),
  maxIterations: z.number().int().min(1),
})

export const PartSkillSnapshotSchema = z.object({
  lifecycle: z.string(),
  objective: z.string(),
  acceptance: z.array(z.string()),
  guidance: z.string().optional(),
})

export const PartSpecSchema = z.object({
  partName: z.string().min(1),
  align: z.string(),
  ref: z.string().optional(),
  skill: PartSkillSnapshotSchema,
})

// New: probe execution row for reference-style verification
export const ProbeResultSchema = z.object({
  probeName: z.string(),
  probeRef: z.string().optional(),
  params: z.record(z.string(), z.unknown()).optional(),
  passed: z.boolean(),
  output: z.unknown().optional(),
  errorMessage: z.string().optional(),
  durationMs: z.number().optional(),
  executedAt: z.string().optional(),
})

export const PartExecutionSchema = z.object({
  partName: z.string().min(1),
  align: z.string(),
  status: z.enum(['pending', 'running', 'passed', 'failed', 'error']),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  durationMs: z.number().optional(),
  probes: z.array(ProbeResultSchema).default([]),
  // Optional skill snapshot (filled in if the part carried a skill block)
  skill: PartSkillSnapshotSchema.optional(),
})

export const SkillContextSnapshotSchema = z.object({
  overallGoal: z.string(),
  constraints: z.array(z.string()),
  maxIterations: z.number().int().min(1),
})

export const WorkStateSchema = z.object({
  workName: z.string().min(1),
  status: WorkStatusSchema,
  currentPart: z.string().nullable(),
  completedParts: z.array(z.string()),
  loopMeta: LoopMetaSchema,
  frozenPath: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  // mvp's mvp-style state
  skillContext: SkillContextSnapshotSchema.optional(),
  partSpecs: z.array(PartSpecSchema).optional(),
  // New: probe-driven execution rows
  partExecutions: z.array(PartExecutionSchema).optional(),
})

export type WorkStatus = z.infer<typeof WorkStatusSchema>
export type LoopMeta = z.infer<typeof LoopMetaSchema>
export type PartSkillSnapshot = z.infer<typeof PartSkillSnapshotSchema>
export type PartSpec = z.infer<typeof PartSpecSchema>
export type ProbeResult = z.infer<typeof ProbeResultSchema>
export type PartExecution = z.infer<typeof PartExecutionSchema>
export type SkillContextSnapshot = z.infer<typeof SkillContextSnapshotSchema>
export type WorkState = z.infer<typeof WorkStateSchema>

export function createInitialState(workName: string, parts: string[], maxIterations: number = 3): WorkState {
  const now = new Date().toISOString()
  return {
    workName,
    status: 'running',
    currentPart: parts[0] ?? null,
    completedParts: [],
    loopMeta: { currentIteration: 0, maxIterations },
    frozenPath: null,
    createdAt: now,
    updatedAt: now,
    partExecutions: parts.map((p) => ({
      partName: p,
      align: p,
      status: 'pending' as const,
      probes: [],
    })),
  }
}

export function isWorkState(value: unknown): value is WorkState {
  return WorkStateSchema.safeParse(value).success
}
