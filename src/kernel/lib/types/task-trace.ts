import type { TaskStatus, StepStatus } from './core'

export interface TaskTraceYaml {
  taskId: string
  taskName: string
  status: TaskStatus
  startedAt: string
  completedAt?: string
  parts: PartTrace[]
}

export interface PartTrace {
  partId: string
  partName: string
  status: StepStatus
  probes: ProbeResult[]
  executedAt?: string
  completedAt?: string
}

export interface ProbeResult {
  probeType: string
  params: Record<string, unknown>
  result: 'PASSED' | 'FAILED'
  actual?: unknown
  failureMessage?: string
  duration: number
  output?: string
  error?: string
  executedAt: number
}

export type TraceEventType = 'TASK_START' | 'TASK_STATUS' | 'PART_START' | 'PART_COMPLETE' | 'PROBE_RESULT'

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

export interface PartStartEvent {
  type: 'PART_START'
  taskId: string
  partId: string
  partName: string
  timestamp: number
}

export interface PartCompleteEvent {
  type: 'PART_COMPLETE'
  taskId: string
  partId: string
  status: StepStatus
  timestamp: number
}

export interface ProbeResultEvent {
  type: 'PROBE_RESULT'
  taskId: string
  partId: string
  probeType: string
  params?: Record<string, unknown>
  result: 'PASSED' | 'FAILED'
  actual?: unknown
  failureMessage?: string
  duration?: number
  output?: string
  error?: string
  timestamp: number
}

export type TraceEvent = TaskStartEvent | TaskStatusEvent | PartStartEvent | PartCompleteEvent | ProbeResultEvent

export interface TaskTraceState {
  taskId: string
  taskName: string
  status: TaskStatus | 'NOT_FOUND'
  startedAt: number
  completedAt?: number
  parts: Map<string, PartState>
}

export interface PartState {
  partId: string
  partName: string
  status: StepStatus
  probes: ProbeResult[]
  startedAt?: number
  completedAt?: number
}
