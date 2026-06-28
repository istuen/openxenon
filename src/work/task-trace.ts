import type { TaskStatus } from '@openxenon/engine/kernel'
import type { PartState, ProbeResult, TaskTraceState, TaskTraceYaml, TraceEvent } from '@openxenon/engine/kernel'

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

  const lines = content.split('\n').filter((line) => line.trim())
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
    timestamp: new Date(oldTrace.startedAt).getTime(),
  })

  if (oldTrace.status !== 'RUNNING') {
    events.push({
      type: 'TASK_STATUS',
      taskId: oldTrace.taskId,
      status: oldTrace.status,
      timestamp: oldTrace.completedAt ? new Date(oldTrace.completedAt).getTime() : now,
    })
  }

  for (const part of oldTrace.parts) {
    if (part.executedAt) {
      events.push({
        type: 'PART_START',
        taskId: oldTrace.taskId,
        partId: part.partId,
        partName: part.partName,
        timestamp: new Date(part.executedAt).getTime(),
      })
    }

    if (part.completedAt || part.status !== 'PENDING') {
      events.push({
        type: 'PART_COMPLETE',
        taskId: oldTrace.taskId,
        partId: part.partId,
        status: part.status,
        timestamp: part.completedAt ? new Date(part.completedAt).getTime() : now,
      })
    }

    for (const probe of part.probes) {
      events.push({
        type: 'PROBE_RESULT',
        taskId: oldTrace.taskId,
        partId: part.partId,
        probeType: probe.probeType,
        result: probe.result,
        output: probe.output,
        error: probe.error,
        timestamp: new Date(probe.executedAt).getTime(),
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

    case 'PART_START':
      state.parts.set(event.partId, {
        partId: event.partId,
        partName: event.partName,
        status: 'PENDING',
        probes: [],
        startedAt: event.timestamp,
      })
      break

    case 'PART_COMPLETE': {
      const part = state.parts.get(event.partId)
      if (part) {
        part.status = event.status
        part.completedAt = event.timestamp
      }
      break
    }

    case 'PROBE_RESULT': {
      const part = state.parts.get(event.partId)
      if (part) {
        part.probes.push({
          probeType: event.probeType,
          params: event.params || {},
          result: event.result,
          duration: event.duration || 0,
          output: event.output,
          error: event.error,
          executedAt: event.timestamp,
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
    parts: new Map(),
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

export function getNextPendingPart(state: TaskTraceState | null): PartState | null {
  if (!state) return null

  for (const part of state.parts.values()) {
    if (part.status === 'PENDING') {
      return part
    }
  }
  return null
}

export function getPartState(state: TaskTraceState | null, partId: string): PartState | null {
  if (!state) return null
  return state.parts.get(partId) || null
}

export function createProbeResult(
  probeType: string,
  result: 'PASSED' | 'FAILED',
  output?: string,
  error?: string,
): ProbeResult {
  return {
    probeType,
    params: {},
    result,
    duration: 0,
    output,
    error,
    executedAt: Date.now(),
  }
}

export function createPartState(partId: string, partName: string): PartState {
  return {
    partId,
    partName,
    status: 'PENDING',
    probes: [],
    startedAt: Date.now(),
  }
}

export function buildTraceEvent(
  type: TraceEvent['type'],
  taskId: string,
  payload: Record<string, unknown>,
): TraceEvent {
  return {
    type,
    taskId,
    timestamp: Date.now(),
    ...payload,
  } as TraceEvent
}

export type { PartState, ProbeResult, TaskTraceState, TraceEvent }
