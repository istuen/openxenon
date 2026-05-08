import type {
  TaskTraceYaml,
  ProbeResult,
  TraceEvent,
  TaskTraceState,
  StageState
} from './types/task-trace'
import type { TaskStatus } from './types/core'

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

function parseEventsFromContent(content: string): TraceEvent[] {
  if (isOldFormat(content)) {
    const oldTrace = parseOldFormat(content)
    if (oldTrace) {
      return migrateFromOldFormatToEvents(oldTrace)
    }
  }

  const lines = content.split('\n').filter(line => line.trim())
  const events: TraceEvent[] = []

  for (const line of lines) {
    if (!line.trim()) continue
    try {
      events.push(JSON.parse(line) as TraceEvent)
    } catch {
      // Skip malformed lines
    }
  }

  return events
}

function migrateFromOldFormatToEvents(oldTrace: TaskTraceYaml): TraceEvent[] {
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

  return events
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

export function reduceTraceEvents(events: TraceEvent[]): TaskTraceState {
  const state: TaskTraceState = {
    taskId: '',
    taskName: '',
    status: 'NOT_FOUND',
    startedAt: 0,
    stages: new Map()
  }

  for (const event of events) {
    applyEvent(state, event)
  }

  return state
}

export function readTaskTraceFromContent(content: string): TaskTraceState | null {
  if (!content.trim()) {
    return null
  }

  const events = parseEventsFromContent(content)

  if (events.length === 0) {
    return null
  }

  return reduceTraceEvents(events)
}

export function getTaskStatus(state: TaskTraceState | null): TaskStatus | 'NOT_FOUND' {
  if (!state || state.status === 'NOT_FOUND') return 'NOT_FOUND'
  return state.status
}

export function getNextPendingStage(state: TaskTraceState | null): StageState | null {
  if (!state) return null

  for (const stage of state.stages.values()) {
    if (stage.status === 'PENDING') {
      return stage
    }
  }
  return null
}

export function getStageState(state: TaskTraceState | null, stageId: string): StageState | null {
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

export function buildTraceEvent(
  type: TraceEvent['type'],
  taskId: string,
  payload: Partial<TraceEvent>
): TraceEvent {
  return {
    type,
    taskId,
    timestamp: Date.now(),
    ...payload
  } as TraceEvent
}

export type { TaskTraceState, StageState, TraceEvent, ProbeResult }
