import type { TaskStatus, StepStatus } from './core'

export interface TaskTraceYaml {
  taskId: string
  taskName: string
  status: TaskStatus
  startedAt: string
  completedAt?: string
  stages: StageTrace[]
}

export interface StageTrace {
  stageId: string
  stageName: string
  status: StepStatus
  probes: ProbeResult[]
  executedAt?: string
  completedAt?: string
}

export interface ProbeResult {
  probeType: string
  result: 'PASSED' | 'FAILED'
  output?: string
  error?: string
  executedAt: string
}