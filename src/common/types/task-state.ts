export interface TaskDirectory {
  root: string
  taskId: string
  blueprintPath: string
  tracePath: string
  manifestPath: string
}

export interface ProbeResult {
  probeType: string
  success: boolean
  output?: string
  error?: string
  executedAt?: number
}

export interface TraceEvent {
  type: 'TASK_START' | 'TASK_STATUS' | 'STAGE_START' | 'STAGE_COMPLETE' | 'PROBE_RESULT'
  taskId: string
  taskName?: string
  stageId?: string
  stageName?: string
  status?: string
  probeType?: string
  result?: 'PASSED' | 'FAILED'
  output?: string
  error?: string
  timestamp: number
}

export interface StageState {
  stageId: string
  stageName: string
  status: 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED'
  probes: ProbeResult[]
  startedAt: number
  completedAt?: number
}

export interface TaskTraceState {
  taskId: string
  taskName: string
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'NOT_FOUND'
  startedAt: number
  completedAt?: number
  stages: Map<string, StageState>
}