import { appendFileSync, existsSync, readFileSync } from '@openxenon/engine/infra/filesystem'
import type { StepStatus, TaskStatus } from '@openxenon/engine/kernel/index'
import { type ParsedBlueprint, parseBlueprintYaml } from './blueprint-parser'
import type { TaskDirectory } from '@openxenon/engine/Work/task-directory'
import { buildTraceEvent, readTaskTrace as readTaskTraceFromEngine } from '@openxenon/engine/Work/task-trace'
import type { PartState, TaskTraceState, TraceEvent } from '@openxenon/engine/kernel/index'

function appendEventToFile(tracePath: string, event: TraceEvent): void {
  const line = `${JSON.stringify(event)}\n`
  appendFileSync(tracePath, line, 'utf-8')
}

export function readBlueprint(taskDir: TaskDirectory): ParsedBlueprint | null {
  if (!existsSync(taskDir.blueprintPath)) {
    return null
  }
  const content = readFileSync(taskDir.blueprintPath, 'utf-8')
  return parseBlueprintYaml(content)
}

export function writeTaskStart(taskDir: TaskDirectory, taskId: string, taskName: string): TaskTraceState {
  const event = buildTraceEvent('TASK_START', taskId, { taskName })
  appendEventToFile(taskDir.tracePath, event)

  return {
    taskId,
    taskName,
    status: 'RUNNING',
    startedAt: Date.now(),
    parts: new Map(),
  }
}

export function writeTaskStatus(taskDir: TaskDirectory, taskId: string, status: TaskStatus): void {
  const event = buildTraceEvent('TASK_STATUS', taskId, { status })
  appendEventToFile(taskDir.tracePath, event)
}

export function writePartStart(taskDir: TaskDirectory, taskId: string, partId: string, partName: string): void {
  const event = buildTraceEvent('PART_START', taskId, { partId, partName })
  appendEventToFile(taskDir.tracePath, event)
}

export function writePartComplete(taskDir: TaskDirectory, taskId: string, partId: string, status: StepStatus): void {
  const event = buildTraceEvent('PART_COMPLETE', taskId, { partId, status })
  appendEventToFile(taskDir.tracePath, event)
}

export function createProbeResult(
  probeType: string,
  result: 'COMPLETED' | 'DEVIATED',
  output?: string,
  error?: string,
  params?: Record<string, unknown>,
  actual?: unknown,
  failureMessage?: string,
  duration?: number,
): {
  probeType: string
  params: Record<string, unknown>
  result: 'COMPLETED' | 'DEVIATED'
  actual?: unknown
  failureMessage?: string
  duration: number
  output?: string
  error?: string
  executedAt: number
} {
  return {
    probeType,
    params: params || {},
    result,
    actual,
    failureMessage,
    duration: duration || 0,
    output,
    error,
    executedAt: Date.now(),
  }
}

export function writeProbeResult(
  taskDir: TaskDirectory,
  taskId: string,
  partId: string,
  probeType: string,
  result: 'COMPLETED' | 'DEVIATED',
  output?: string,
  error?: string,
  params?: Record<string, unknown>,
  actual?: unknown,
  failureMessage?: string,
  duration?: number,
): void {
  const event = buildTraceEvent('PROBE_RESULT', taskId, {
    partId,
    probeType,
    result,
    output,
    error,
    params,
    actual,
    failureMessage,
    duration,
  })
  appendEventToFile(taskDir.tracePath, event)
}

export function readTaskTrace(taskDir: TaskDirectory): TaskTraceState | null {
  return readTaskTraceFromEngine(taskDir)
}

export function getTaskStatus(taskDir: TaskDirectory): TaskStatus | 'NOT_FOUND' {
  const state = readTaskTrace(taskDir)
  if (!state || state.status === 'NOT_FOUND') return 'NOT_FOUND'
  return state.status
}

export function getNextPendingPart(taskDir: TaskDirectory): PartState | null {
  const state = readTaskTrace(taskDir)
  if (!state) return null

  for (const part of state.parts.values()) {
    if (part.status === 'PENDING') {
      return part
    }
  }
  return null
}

export function getPartState(taskDir: TaskDirectory, partId: string): PartState | null {
  const state = readTaskTrace(taskDir)
  if (!state) return null
  return state.parts.get(partId) || null
}
