import { existsSync, readFileSync, writeFileSync } from 'fs'
import type { TaskTraceYaml, StageTrace, ProbeResult } from '../types/task-trace'
import type { TaskStatus, StepStatus } from '../types/core'
import { getTaskDirectory, type TaskDirectory } from './task-dir'

export function createTaskTrace(
  taskDir: TaskDirectory,
  taskId: string,
  taskName: string
): TaskTraceYaml {
  const trace: TaskTraceYaml = {
    taskId,
    taskName,
    status: 'RUNNING',
    startedAt: new Date().toISOString(),
    stages: []
  }
  writeTaskTrace(taskDir, trace)
  return trace
}

export function readTaskTrace(taskDir: TaskDirectory): TaskTraceYaml | null {
  if (!existsSync(taskDir.tracePath)) {
    return null
  }
  try {
    const content = readFileSync(taskDir.tracePath, 'utf-8')
    if (content.trim().startsWith('#')) {
      return null
    }
    return JSON.parse(content) as TaskTraceYaml
  } catch {
    return null
  }
}

export function writeTaskTrace(taskDir: TaskDirectory, trace: TaskTraceYaml): void {
  writeFileSync(taskDir.tracePath, JSON.stringify(trace, null, 2), 'utf-8')
}

export function updateTaskStatus(taskDir: TaskDirectory, status: TaskStatus): void {
  const trace = readTaskTrace(taskDir)
  if (!trace) return

  trace.status = status
  if (status === 'COMPLETED' || status === 'FAILED' || status === 'ESCAPED') {
    trace.completedAt = new Date().toISOString()
  }
  writeTaskTrace(taskDir, trace)
}

export function addStageTrace(taskDir: TaskDirectory, stage: StageTrace): void {
  const trace = readTaskTrace(taskDir)
  if (!trace) return

  trace.stages.push(stage)
  writeTaskTrace(taskDir, trace)
}

export function updateStageTrace(taskDir: TaskDirectory, stageId: string, updates: Partial<StageTrace>): void {
  const trace = readTaskTrace(taskDir)
  if (!trace) return

  const stageIndex = trace.stages.findIndex(s => s.stageId === stageId)
  if (stageIndex === -1) return

  trace.stages[stageIndex] = { ...trace.stages[stageIndex], ...updates }
  writeTaskTrace(taskDir, trace)
}

export function getTaskStatus(taskDir: TaskDirectory): TaskStatus | 'NOT_FOUND' {
  const trace = readTaskTrace(taskDir)
  if (!trace) return 'NOT_FOUND'
  return trace.status
}

export function getNextPendingStage(taskDir: TaskDirectory): StageTrace | null {
  const trace = readTaskTrace(taskDir)
  if (!trace) return null

  return trace.stages.find(s => s.status === 'PENDING') || null
}

export function createStageTrace(stageId: string, stageName: string): StageTrace {
  return {
    stageId,
    stageName,
    status: 'PENDING',
    probes: []
  }
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
    executedAt: new Date().toISOString()
  }
}