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
  executedAt: number
}

export type TraceEventType = 'TASK_START' | 'TASK_STATUS' | 'STAGE_START' | 'STAGE_COMPLETE' | 'PROBE_RESULT'

export interface TaskStartEvent {
  type: 'TASK_START'
  taskId: string
  taskName: string
  timestamp: number
}

export interface TaskStatusEvent {
  type: 'TASK_STATUS'
  taskId: string
  status: TaskStatus
  timestamp: number
}

export interface StageStartEvent {
  type: 'STAGE_START'
  taskId: string
  stageId: string
  stageName: string
  timestamp: number
}

export interface StageCompleteEvent {
  type: 'STAGE_COMPLETE'
  taskId: string
  stageId: string
  status: StepStatus
  timestamp: number
}

export interface ProbeResultEvent {
  type: 'PROBE_RESULT'
  taskId: string
  stageId: string
  probeType: string
  result: 'PASSED' | 'FAILED'
  output?: string
  error?: string
  timestamp: number
}

export type TraceEvent =
  | TaskStartEvent
  | TaskStatusEvent
  | StageStartEvent
  | StageCompleteEvent
  | ProbeResultEvent

export interface TaskTraceState {
  taskId: string
  taskName: string
  status: TaskStatus | 'NOT_FOUND'
  startedAt: number
  completedAt?: number
  stages: Map<string, StageState>
}

export interface StageState {
  stageId: string
  stageName: string
  status: StepStatus
  probes: ProbeResult[]
  startedAt?: number
  completedAt?: number
}
