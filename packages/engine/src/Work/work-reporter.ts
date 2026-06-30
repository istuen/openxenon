import type { WorkContext } from '../oxl'

export type WorkStatus = 'pending' | 'running' | 'passed' | 'failed' | 'error'

export interface DerivedSkillSnapshot {
  lifecycle: string
  objective: string
  acceptance: string[]
  guidance?: string
}

export interface DerivedPartExecution {
  partName: string
  align: string
  status: WorkStatus
  startedAt?: string
  completedAt?: string
  durationMs?: number
  probes: Array<{
    probeName: string
    passed: boolean
    output?: unknown
    errorMessage?: string
    durationMs?: number
    executedAt?: string
  }>
  skill?: DerivedSkillSnapshot
}

export interface DerivedPartSpec {
  partName: string
  align: string
  ref?: string
  skill: DerivedSkillSnapshot
}

export interface DerivedSkillContext {
  overallGoal: string
  constraints: string[]
  maxIterations: number
}

export interface DerivedWorkState {
  workName: string
  status: WorkStatus
  currentPart: string | null
  completedParts: string[]
  loopMeta: { currentIteration: number; maxIterations: number }
  frozenPath: string | null
  createdAt: string
  updatedAt: string
  skillContext?: DerivedSkillContext
  partSpecs?: DerivedPartSpec[]
  partExecutions?: DerivedPartExecution[]
}

export function snapshotContext(
  ctx: WorkContext | undefined,
  maxIters: number,
  loopPolicy: { maxIterations?: number } | undefined,
): DerivedSkillContext {
  return {
    overallGoal: ctx?.goal ?? '',
    constraints: ctx?.constraints ?? [],
    maxIterations: loopPolicy?.maxIterations ?? maxIters,
  }
}

export function partStatus(partName: string, state: DerivedWorkState): 'pending' | 'running' | 'passed' | 'failed' {
  if (state.completedParts.includes(partName)) return 'passed'
  if (state.currentPart === partName) return 'running'
  return 'pending'
}

export function makeContextJson(
  ctx: DerivedSkillContext | undefined,
  currentFocus: string,
  state: DerivedWorkState,
): {
  overallGoal: string
  constraints: string[]
  currentFocus: string
  loopPolicy: { currentIteration: number; maxIterations: number }
} {
  return {
    overallGoal: ctx?.overallGoal ?? '',
    constraints: ctx?.constraints ?? [],
    currentFocus,
    loopPolicy: {
      currentIteration: state.loopMeta.currentIteration,
      maxIterations: state.loopMeta.maxIterations,
    },
  }
}

export function makeReport(state: DerivedWorkState): {
  workName: string
  overallStatus: 'pending' | 'running' | 'passed' | 'failed' | 'error'
  skillContext: {
    overallGoal: string
    constraints: string[]
    currentFocus: string
    loopPolicy: { currentIteration: number; maxIterations: number }
  }
  parts: Array<{
    partName: string
    align: string
    ref?: string
    lifecycle: string
    status: 'pending' | 'running' | 'passed' | 'failed'
    stepSkillContext: { lifecycle: string; objective: string; acceptance: string[]; guidance?: string }
    probeResults: Array<{
      probe: string
      passed: boolean
      output?: unknown
      errorMessage?: string
      durationMs?: number
    }>
  }>
  loopMeta: { isLooping: boolean; iteration: number; maxIterations: number }
  frozen: string | null
} {
  const partSpecs = state.partSpecs ?? []
  const executions = state.partExecutions ?? []
  const execByName = new Map<string, DerivedPartExecution>()
  for (const ex of executions) execByName.set(ex.partName, ex)

  return {
    workName: state.workName,
    overallStatus: state.status,
    skillContext: makeContextJson(state.skillContext, state.currentPart ?? '', state),
    parts: partSpecs.map((p) => {
      const exec = execByName.get(p.partName)
      return {
        partName: p.partName,
        align: p.align,
        ...(p.ref !== undefined ? { ref: p.ref } : {}),
        lifecycle: p.skill.lifecycle,
        status: partStatus(p.partName, state),
        stepSkillContext: {
          lifecycle: p.skill.lifecycle,
          objective: p.skill.objective,
          acceptance: p.skill.acceptance,
          ...(p.skill.guidance !== undefined ? { guidance: p.skill.guidance } : {}),
        },
        probeResults: (exec?.probes ?? []).map((pr) => ({
          probe: pr.probeName,
          passed: pr.passed,
          ...(pr.output !== undefined ? { output: pr.output } : {}),
          ...(pr.errorMessage !== undefined ? { errorMessage: pr.errorMessage } : {}),
          ...(pr.durationMs !== undefined ? { durationMs: pr.durationMs } : {}),
        })),
      }
    }),
    loopMeta: {
      isLooping: state.loopMeta.currentIteration > 0,
      iteration: state.loopMeta.currentIteration,
      maxIterations: state.loopMeta.maxIterations,
    },
    frozen: state.frozenPath,
  }
}
