/**
 * Align module — shared types (v0.6 PR-5b)
 *
 * E2 Work · Align 阶段（AI 多轮对齐 Round + Tasks 执行 + 状态机）
 */
export interface RunWorkInput {
  workName: string
  projectRoot: string
  force?: boolean
}

export interface RunWorkResult {
  ok: boolean
  status: 'running' | 'passed' | 'failed'
  currentRound: number
}

export interface SubmitPartInput {
  workName: string
  taskName: string
  partName: string
  projectRoot: string
}

export interface SubmitPartResult {
  taskState: unknown
  nextPart: string | null
  frozen: boolean
}

export interface WorkStatusResult {
  workName: string
  status: string
  currentRound: number
  roundHistory: unknown[]
  tasks: Array<{ taskName: string; status: string }>
}

export interface FinalizeInput {
  workName: string
  projectRoot: string
}

export interface FinalizeResult {
  ok: boolean
  frozenPath: string
  verdict: string
}
