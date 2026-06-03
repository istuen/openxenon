import { z } from 'zod'

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
  skillContext: SkillContextSnapshotSchema.optional(),
  partSpecs: z.array(PartSpecSchema).optional(),
})

export type WorkStatus = z.infer<typeof WorkStatusSchema>
export type LoopMeta = z.infer<typeof LoopMetaSchema>
export type PartSkillSnapshot = z.infer<typeof PartSkillSnapshotSchema>
export type PartSpec = z.infer<typeof PartSpecSchema>
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
  }
}

export function isWorkState(value: unknown): value is WorkState {
  return WorkStateSchema.safeParse(value).success
}
