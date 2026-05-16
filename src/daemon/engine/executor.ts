import type { Blueprint, Stage } from '../../kernel/schemas/blueprint.schema'
import { getProbeHandler, type ProbeResult, type ProbeContext } from '../../infra/probes'
import { evaluateProbe, reduceProbeResults, type ProbeDefinition } from '../../kernel/probes/evaluator'
import { radarClock } from '../radar/clock'
import { processManager } from '../process-manager'
import { hallEmitter } from '../hall'
import { daemonLogger } from '../logger'

export interface ExecutorOptions {
  projectRoot: string
  taskId: string
  taskName: string
  blueprint: Blueprint
  timeoutMs?: number
}

export interface ExecuteStageResult {
  success: boolean
  stageId: string
  stageName: string
  probeResults: ProbeResult[]
  timedOut?: boolean
}

const DEFAULT_TIMEOUT_MS = 300000

export async function executeStage(
  stage: Stage,
  options: ExecutorOptions
): Promise<ExecuteStageResult> {
  const { id: stageId, name, probes, action } = stage
  const context: ProbeContext = { projectRoot: options.projectRoot }
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS

  hallEmitter.emitStageStarted(options.taskId, stageId, name)
  radarClock.startMonitor(options.taskId, stageId, timeoutMs)

  daemonLogger.info(`[Executor] Executing stage: ${stageId} (${name})`)

  if (action?.command) {
    const proc = processManager.spawn(options.taskId, stageId, 'bash', ['-c', action.command])
    if (proc) {
      daemonLogger.info(`[Executor] Spawned AI process ${proc.pid} for stage ${stageId}`)
    }
  }

  const probeResults: ProbeResult[] = []

  try {
    for (const probe of probes || []) {
      if (radarClock.isTimeout(options.taskId, stageId)) {
        handleTimeout(stageId, name, options.taskId)
        return {
          success: false,
          stageId,
          stageName: name,
          probeResults,
          timedOut: true
        }
      }

      daemonLogger.info(`[Executor] Running probe: ${probe.type}`)

      const handler = getProbeHandler(probe.type)
      if (!handler) {
        probeResults.push({
          probeType: probe.type,
          result: 'FAILED',
          error: `Unknown probe type: ${probe.type}`,
          executedAt: Date.now()
        })
        hallEmitter.emitProbeResult(options.taskId, stageId, probe.type, 'FAILED')
        continue
      }

      try {
        const probeParams = {
          pattern: probe.pattern,
          command: probe.command,
          cwd: probe.cwd
        }
        const actualResult = await handler(probeParams, context) as ProbeResult

        const definition: ProbeDefinition = {
          type: probe.type,
          params: { pattern: probe.pattern, command: probe.command, cwd: probe.cwd }
        }
        evaluateProbe(definition, actualResult)

        probeResults.push(actualResult)
        hallEmitter.emitProbeResult(options.taskId, stageId, probe.type, actualResult.result)
      } catch (error) {
        probeResults.push({
          probeType: probe.type,
          result: 'FAILED',
          error: error instanceof Error ? error.message : String(error),
          executedAt: Date.now()
        })
        hallEmitter.emitProbeResult(options.taskId, stageId, probe.type, 'FAILED')
      }
    }
  } finally {
    radarClock.stopMonitor(options.taskId, stageId)
    processManager.remove(options.taskId, stageId)
  }

  const verdict = reduceProbeResults(probeResults, 'AND')

  if (verdict.passed) {
    hallEmitter.emitStageCompleted(options.taskId, stageId, name, { probeCount: probeResults.length })
  } else {
    hallEmitter.emitStageFailed(options.taskId, stageId, name, { probeCount: probeResults.length })
  }

  return {
    success: verdict.passed,
    stageId,
    stageName: name,
    probeResults
  }
}

function handleTimeout(stageId: string, stageName: string, taskId: string): void {
  daemonLogger.warn(`[Executor] Stage ${stageId} timed out`)
  processManager.markTimeout(taskId, stageId)
  radarClock.stopMonitor(taskId, stageId)
  hallEmitter.emitStageTimeout(taskId, stageId, stageName)
}

export function buildDag(stages: Stage[]): { order: string[] } {
  const order: string[] = []

  const inDegree = new Map<string, number>()
  const adjList = new Map<string, string[]()

  for (const stage of stages) {
    inDegree.set(stage.id, 0)
    adjList.set(stage.id, [])
  }

  for (const stage of stages) {
    for (const dep of stage.deps || []) {
      adjList.get(dep)?.push(stage.id)
      inDegree.set(stage.id, (inDegree.get(stage.id) || 0) + 1)
    }
  }

  const queue: string[] = []
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id)
  }

  while (queue.length > 0) {
    const current = queue.shift()!
    order.push(current)

    const successors = adjList.get(current) || []
    for (const succ of successors) {
      const newDegree = (inDegree.get(succ) || 0) - 1
      inDegree.set(succ, newDegree)
      if (newDegree === 0) queue.push(succ)
    }
  }

  return { order }
}

export async function executeBlueprint(options: ExecutorOptions): Promise<{ success: boolean; results: ExecuteStageResult[] }> {
  const { blueprint, taskId, taskName } = options
  const stages = blueprint.stages || []

  hallEmitter.emitTaskRunning(taskId, taskName)

  const { order } = buildDag(stages)
  const results: ExecuteStageResult[] = []

  const stageMap = new Map<string, Stage>(stages.map(s => [s.id, s]))

  for (const stageId of order) {
    const stage = stageMap.get(stageId)
    if (!stage) continue

    if (radarClock.isTimeout(taskId, stageId)) {
      handleTimeout(stageId, stage.name || stageId, taskId)
      break
    }

    const result = await executeStage(stage, options)
    results.push(result)

    if (!result.success) {
      if (blueprint.status === 'ABANDONED') {
        hallEmitter.emitTaskFailed(taskId, taskName)
        break
      }
    }
  }

  const success = results.every(r => r.success)

  if (success) {
    hallEmitter.emitTaskCompleted(taskId, taskName)
  } else {
    hallEmitter.emitTaskFailed(taskId, taskName)
  }

  return { success, results }
}

export function initExecutorTimeoutHandling(): void {
  radarClock.onTimeout((taskId, stageId, elapsed) => {
    daemonLogger.warn(`[Executor] Timeout detected for ${taskId}:${stageId} after ${elapsed}ms`)
    const proc = processManager.get(taskId, stageId)
    if (proc) {
      processManager.markTimeout(taskId, stageId)
    }
  })

  radarClock.startScheduler(1000)
  daemonLogger.info('[Executor] Timeout monitoring started')
}

export function stopExecutorTimeoutHandling(): void {
  radarClock.stopScheduler()
  processManager.killAll()
  daemonLogger.info('[Executor] Timeout monitoring stopped')
}