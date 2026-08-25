import type { StepStatus, TaskStatus } from '../enums'

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
  result: 'COMPLETED' | 'DEVIATED'
  actual?: unknown
  failureMessage?: string
  duration: number
  output?: string
  error?: string
  executedAt: number
}

export type TraceEventType =
  | 'TASK_START'
  | 'TASK_STATUS'
  | 'PART_START'
  | 'PART_COMPLETE'
  | 'PROBE_RESULT'
  // RFC-0033 D3/D4：submit 时刻算 workMdHash 指纹 + drift 可观测
  | 'SUBMIT'
  | 'ASSET_DRIFT'

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
  result: 'COMPLETED' | 'DEVIATED'
  actual?: unknown
  failureMessage?: string
  duration?: number
  output?: string
  error?: string
  timestamp: number
}

// RFC-0033 D3：submit 时刻算 workMdHash，记入完成指纹
export interface SubmitEvent {
  type: 'SUBMIT'
  workName: string
  taskName: string
  partName: string
  probeResult: 'COMPLETED' | 'DEVIATED'
  /** 本次 submit 时 work.md 的 sha256 hex（前缀 "sha256:" 可选） */
  workMdHash: string
  timestamp: number
}

// RFC-0033 D4：workMd 漂移可观测，不阻断 submit
export interface AssetDriftEvent {
  type: 'ASSET_DRIFT'
  workName: string
  /** 漂移组件（当前仅 workMd，因 Tasks 全在 work.md） */
  component: 'workMd'
  /** 上次 SUBMIT 的 hash */
  previousHash: string
  /** 本次 submit 的 hash */
  currentHash: string
  /** 第几次 submit 检测到漂移（1-based） */
  submitIndex: number
  timestamp: number
}

export type TraceEvent =
  | TaskStartEvent
  | TaskStatusEvent
  | PartStartEvent
  | PartCompleteEvent
  | ProbeResultEvent
  | SubmitEvent
  | AssetDriftEvent

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
