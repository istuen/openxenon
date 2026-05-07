import { existsSync, readFileSync, appendFileSync, writeFileSync, renameSync, unlinkSync } from 'fs'
import type {
  TaskTraceYaml,
  ProbeResult,
  TraceEvent,
  TaskTraceState,
  StageState
} from '../types/task-trace'
import type { TaskStatus, StepStatus } from '../types/core'
import type { TaskDirectory } from './task-dir'

function atomicWrite(filePath: string, data: string): void {
  const tmpPath = filePath + '.tmp'
  writeFileSync(tmpPath, data, 'utf-8')
  if (process.platform === 'win32' && existsSync(filePath)) {
    unlinkSync(filePath)
  }
  renameSync(tmpPath, filePath)
}

function appendEvent(taskDir: TaskDirectory, event: TraceEvent): void {
  const line = JSON.stringify(event) + '\n'
  appendFileSync(taskDir.tracePath, line, 'utf-8')
}

function isOldFormat(content: string): boolean {
  const trimmed = content.trim()
  if (!trimmed) return false
  return trimmed.startsWith('{')
}

function parseOldFormat(content: string): TaskTraceYaml | null {
  try {
    return JSON.parse(content) as TaskTraceYaml
  } catch {
    return null
  }
}

function migrateFromOldFormat(taskDir: TaskDirectory, oldTrace: TaskTraceYaml): void {
  const now = Date.now()
  const events: TraceEvent[] = []

  events.push({
    type: 'TASK_START',
    taskId: oldTrace.taskId,
    taskName: oldTrace.taskName,
    timestamp: new Date(oldTrace.startedAt).getTime()
  })

  if (oldTrace.status !== 'RUNNING') {
    events.push({
      type: 'TASK_STATUS',
      taskId: oldTrace.taskId,
      status: oldTrace.status,
      timestamp: oldTrace.completedAt
        ? new Date(oldTrace.completedAt).getTime()
        : now
    })
  }

  for (const stage of oldTrace.stages) {
    if (stage.executedAt) {
      events.push({
        type: 'STAGE_START',
        taskId: oldTrace.taskId,
        stageId: stage.stageId,
        stageName: stage.stageName,
        timestamp: new Date(stage.executedAt).getTime()
      })
    }

    if (stage.completedAt || stage.status !== 'PENDING') {
      events.push({
        type: 'STAGE_COMPLETE',
        taskId: oldTrace.taskId,
        stageId: stage.stageId,
        status: stage.status,
        timestamp: stage.completedAt
          ? new Date(stage.completedAt).getTime()
          : now
      })
    }

    for (const probe of stage.probes) {
      events.push({
        type: 'PROBE_RESULT',
        taskId: oldTrace.taskId,
        stageId: stage.stageId,
        probeType: probe.probeType,
        result: probe.result,
        output: probe.output,
        error: probe.error,
        timestamp: new Date(probe.executedAt).getTime()
      })
    }
  }

  const lines = events.map(e => JSON.stringify(e)).join('\n') + '\n'
  atomicWrite(taskDir.tracePath, lines)
}

function readLines(filePath: string): string[] {
  if (!existsSync(filePath)) return []
  const content = readFileSync(filePath, 'utf-8')
  return content.split('\n').filter(line => line.trim())
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

  const content = readFileSync(taskDir.tracePath, 'utf-8')

  if (isOldFormat(content)) {
    const oldTrace = parseOldFormat(content)
    if (oldTrace) {
      migrateFromOldFormat(taskDir, oldTrace)
    }
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

function applyEvent(state: TaskTraceState, event: TraceEvent): void {
  switch (event.type) {
    case 'TASK_START':
      state.taskId = event.taskId
      state.taskName = event.taskName
      state.startedAt = event.timestamp
      state.status = 'RUNNING'
      break

    case 'TASK_STATUS':
      state.status = event.status
      if (event.status !== 'RUNNING') {
        state.completedAt = event.timestamp
      }
      break

    case 'STAGE_START':
      state.stages.set(event.stageId, {
        stageId: event.stageId,
        stageName: event.stageName,
        status: 'PENDING',
        probes: [],
        startedAt: event.timestamp
      })
      break

    case 'STAGE_COMPLETE': {
      const stage = state.stages.get(event.stageId)
      if (stage) {
        stage.status = event.status
        stage.completedAt = event.timestamp
      }
      break
    }

    case 'PROBE_RESULT': {
      const stage = state.stages.get(event.stageId)
      if (stage) {
        stage.probes.push({
          probeType: event.probeType,
          result: event.result,
          output: event.output,
          error: event.error,
          executedAt: event.timestamp
        })
      }
      break
    }
  }
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
  return state.status
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

export function createProbeResult(
  probeType: string,
  result: 'PASSED' | 'FAILED',
  output?: string,
  error?: string
): ProbeResult {
  return {
    probeType,
    result,
    output,
    error,
    executedAt: Date.now()
  }
}

export function createStageState(stageId: string, stageName: string): StageState {
  return {
    stageId,
    stageName,
    status: 'PENDING',
    probes: [],
    startedAt: Date.now()
  }
}
