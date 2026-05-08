import { existsSync, readFileSync, appendFileSync } from 'fs'
import type { TaskDirectory, TraceEvent, TaskTraceState, StageState } from '../../common/types/task-state'
import type { TaskStatus, StepStatus } from '../../common/enums'

function appendEvent(taskDir: TaskDirectory, event: TraceEvent): void {
  const line = JSON.stringify(event) + '\n'
  appendFileSync(taskDir.tracePath, line, 'utf-8')
}

function readLines(filePath: string): string[] {
  if (!existsSync(filePath)) return []
  const content = readFileSync(filePath, 'utf-8')
  return content.split('\n').filter(line => line.trim())
}

function applyEvent(state: TaskTraceState, event: TraceEvent): void {
  switch (event.type) {
    case 'TASK_START':
      state.taskId = event.taskId
      state.taskName = event.taskName || ''
      state.startedAt = event.timestamp
      state.status = 'RUNNING'
      break

    case 'TASK_STATUS':
      state.status = event.status as 'RUNNING' | 'COMPLETED' | 'FAILED'
      if (event.status !== 'RUNNING') {
        state.completedAt = event.timestamp
      }
      break

    case 'STAGE_START':
      state.stages.set(event.stageId!, {
        stageId: event.stageId!,
        stageName: event.stageName || '',
        status: 'PENDING',
        probes: [],
        startedAt: event.timestamp
      })
      break

    case 'STAGE_COMPLETE': {
      const stage = state.stages.get(event.stageId!)
      if (stage) {
        stage.status = event.status as StepStatus
        stage.completedAt = event.timestamp
      }
      break
    }

    case 'PROBE_RESULT': {
      const stage = state.stages.get(event.stageId!)
      if (stage) {
        stage.probes.push({
          probeType: event.probeType || '',
          success: event.result === 'PASSED',
          output: event.output,
          error: event.error
        })
      }
      break
    }
  }
}

export function createTaskTrace(
  taskDir: TaskDirectory,
  taskId: string,
  taskName: string
): TaskTraceState {
  appendEvent(taskDir, {
    type: 'TASK_START',
    taskId,
    taskName,
    timestamp: Date.now()
  })

  return {
    taskId,
    taskName,
    status: 'RUNNING',
    startedAt: Date.now(),
    stages: new Map()
  }
}

export function readTaskTrace(taskDir: TaskDirectory): TaskTraceState | null {
  if (!existsSync(taskDir.tracePath)) {
    return null
  }

  const lines = readLines(taskDir.tracePath)
  const state: TaskTraceState = {
    taskId: '',
    taskName: '',
    status: 'NOT_FOUND',
    startedAt: 0,
    stages: new Map()
  }

  for (const line of lines) {
    if (!line.trim()) continue
    try {
      const event = JSON.parse(line) as TraceEvent
      applyEvent(state, event)
    } catch {
      // Skip malformed lines
    }
  }

  return state
}

export function appendTaskStatus(taskDir: TaskDirectory, taskId: string, status: TaskStatus): void {
  appendEvent(taskDir, {
    type: 'TASK_STATUS',
    taskId,
    status,
    timestamp: Date.now()
  })
}

export function appendStageStart(
  taskDir: TaskDirectory,
  taskId: string,
  stageId: string,
  stageName: string
): void {
  appendEvent(taskDir, {
    type: 'STAGE_START',
    taskId,
    stageId,
    stageName,
    timestamp: Date.now()
  })
}

export function appendStageComplete(
  taskDir: TaskDirectory,
  taskId: string,
  stageId: string,
  status: StepStatus
): void {
  appendEvent(taskDir, {
    type: 'STAGE_COMPLETE',
    taskId,
    stageId,
    status,
    timestamp: Date.now()
  })
}

export function appendProbeResult(
  taskDir: TaskDirectory,
  taskId: string,
  stageId: string,
  probeType: string,
  result: 'PASSED' | 'FAILED',
  output?: string,
  error?: string
): void {
  appendEvent(taskDir, {
    type: 'PROBE_RESULT',
    taskId,
    stageId,
    probeType,
    result,
    output,
    error,
    timestamp: Date.now()
  })
}

export function getTaskStatus(taskDir: TaskDirectory): TaskStatus | 'NOT_FOUND' {
  const state = readTaskTrace(taskDir)
  if (!state || state.status === 'NOT_FOUND') return 'NOT_FOUND'
  return state.status as TaskStatus
}

export function getNextPendingStage(taskDir: TaskDirectory): StageState | null {
  const state = readTaskTrace(taskDir)
  if (!state) return null

  for (const stage of state.stages.values()) {
    if (stage.status === 'PENDING') {
      return stage
    }
  }
  return null
}

export function getStageState(taskDir: TaskDirectory, stageId: string): StageState | null {
  const state = readTaskTrace(taskDir)
  if (!state) return null
  return state.stages.get(stageId) || null
}