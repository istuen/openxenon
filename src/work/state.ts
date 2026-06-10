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

/**
 * v1.2: Git Workspace 状态（PoC: git-workflow Blueprint 写入）
 *
 * 设计哲学：
 *   - OXN **不替人 commit / merge**——只观察 git 物理世界，记录客观状态
 *   - failedBranch 记录失败时保留的分支名（让工程师手动决定 cherry-pick / 删 / 重跑）
 *   - mergeFeasibility 是 PoC 核心：让工程师在不实际 merge 的情况下看到冲突证据
 *
 * 与 frozen.json 的关系：frozen.json 记录 verdict（已 PASSED/FAILED），
 * state.json 记录 git 物理状态（即使 work 失败也保留，可读）。
 */
export const MergeFeasibilitySchema = z.enum([
  'unknown',
  'can_ff_merge',
  'can_merge_clean',
  'has_conflicts',
  'dirty_worktree',
])

export const GitWorkspaceSchema = z.object({
  strategy: z.enum(['none', 'branch', 'worktree']),
  baseBranch: z.string(),
  workBranch: z.string().nullable(),
  worktreePath: z.string().nullable(),
  mergeFeasibility: MergeFeasibilitySchema.nullable(),
  conflictFiles: z.array(z.string()).default([]),
  finalizedAt: z.string().nullable(),
  failedBranch: z.string().nullable(),
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
  // v1.2: git workspace 状态（PoC: git-workflow Blueprint 用）
  gitWorkspace: GitWorkspaceSchema.optional(),
})

export type WorkStatus = z.infer<typeof WorkStatusSchema>
export type LoopMeta = z.infer<typeof LoopMetaSchema>
export type PartSkillSnapshot = z.infer<typeof PartSkillSnapshotSchema>
export type PartSpec = z.infer<typeof PartSpecSchema>
export type ProbeResult = z.infer<typeof ProbeResultSchema>
export type PartExecution = z.infer<typeof PartExecutionSchema>
export type SkillContextSnapshot = z.infer<typeof SkillContextSnapshotSchema>
export type MergeFeasibility = z.infer<typeof MergeFeasibilitySchema>
export type GitWorkspace = z.infer<typeof GitWorkspaceSchema>
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
