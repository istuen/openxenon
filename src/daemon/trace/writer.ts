import { existsSync, readFileSync, appendFileSync } from 'fs'
import type { TaskDirectory } from '../../kernel/lib/task-dir'
import type { TraceEvent, TaskTraceState, StageState } from '../../kernel/lib/types/task-state'
import type { TaskStatus, StepStatus } from '../../kernel/enums'
import { buildTraceEvent, reduceTraceEvents } from '../../kernel/lib/task-trace'
import { parseBlueprintYaml, type ParsedBlueprint } from '../../kernel/lib/blueprint-parser'

function appendEventToFile(tracePath: string, event: TraceEvent): void {
  const line = JSON.stringify(event) + '\n'
  appendFileSync(tracePath, line, 'utf-8')
}

function readContent(tracePath: string): string | null {
  if (!existsSync(tracePath)) {
    return null
  }
  return readFileSync(tracePath, 'utf-8')
}

export function readBlueprint(taskDir: TaskDirectory): ParsedBlueprint | null {
  if (!existsSync(taskDir.blueprintPath)) {
    return null
  }
  const content = readFileSync(taskDir.blueprintPath, 'utf-8')
  return parseBlueprintYaml(content)
}

export function writeTaskStart(
  taskDir: TaskDirectory,
  taskId: string,
  taskName: string
): TaskTraceState {
  const event = buildTraceEvent('TASK_START', taskId, { taskName })
  appendEventToFile(taskDir.tracePath, event)

  return {
    taskId,
    taskName,
    status: 'RUNNING',
    startedAt: Date.now(),
    stages: new Map()
  }
}

export function writeTaskStatus(
  taskDir: TaskDirectory,
  taskId: string,
  status: TaskStatus
): void {
  const event = buildTraceEvent('TASK_STATUS', taskId, { status })
  appendEventToFile(taskDir.tracePath, event)
}

export function writeStageStart(
  taskDir: TaskDirectory,
  taskId: string,
  stageId: string,
  stageName: string
): void {
  const event = buildTraceEvent('STAGE_START', taskId, { stageId, stageName })
  appendEventToFile(taskDir.tracePath, event)
}

export function writeStageComplete(
  taskDir: TaskDirectory,
  taskId: string,
  stageId: string,
  status: StepStatus
): void {
  const event = buildTraceEvent('STAGE_COMPLETE', taskId, { stageId, status })
  appendEventToFile(taskDir.tracePath, event)
}

export function createProbeResult(
  probeType: string,
  result: 'PASSED' | 'FAILED',
  output?: string,
  error?: string,
  params?: Record<string, unknown>,
  actual?: unknown,
  failureMessage?: string,
  duration?: number
): { probeType: string; params: Record<string, unknown>; result: 'PASSED' | 'FAILED'; actual?: unknown; failureMessage?: string; duration: number; output?: string; error?: string; executedAt: number } {
  return {
    probeType,
    params: params || {},
    result,
    actual,
    failureMessage,
    duration: duration || 0,
    output,
    error,
    executedAt: Date.now()
  }
}

export function writeProbeResult(
  taskDir: TaskDirectory,
  taskId: string,
  stageId: string,
  probeType: string,
  result: 'PASSED' | 'FAILED',
  output?: string,
  error?: string,
  params?: Record<string, unknown>,
  actual?: unknown,
  failureMessage?: string,
  duration?: number
): void {
  const event = buildTraceEvent('PROBE_RESULT', taskId, {
    stageId,
    probeType,
    result,
    output,
    error,
    params,
    actual,
    failureMessage,
    duration
  })
  appendEventToFile(taskDir.tracePath, event)
}

export function readTaskTrace(taskDir: TaskDirectory): TaskTraceState | null {
  const content = readContent(taskDir.tracePath)
  if (!content) {
    return null
  }
  return readTaskTraceFromContent(content)
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

function readTaskTraceFromContent(content: string): TaskTraceState | null {
  if (!content.trim()) {
    return null
  }
  return reduceTraceEventsFromString(content)
}

function reduceTraceEventsFromString(content: string): TaskTraceState {
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

  return reduceTraceEvents(events)
}
