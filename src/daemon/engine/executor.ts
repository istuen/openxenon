import type { Blueprint, Part } from '../../kernel/schemas/blueprint.schema'
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

export interface ExecutePartResult {
  success: boolean
  partId: string
  partName: string
  probeResults: ProbeResult[]
  timedOut?: boolean
}

const DEFAULT_TIMEOUT_MS = 300000

export async function executePart(
  part: Part,
  options: ExecutorOptions
): Promise<ExecutePartResult> {
  const { id: partId, name, probes, action } = part
  const context: ProbeContext = { projectRoot: options.projectRoot }
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS

  hallEmitter.emitPartStarted(options.taskId, partId, name)
  radarClock.startMonitor(options.taskId, partId, timeoutMs)

  daemonLogger.info(`[Executor] Executing part: ${partId} (${name})`)

  if (action?.command) {
    const proc = processManager.spawn(options.taskId, partId, 'bash', ['-c', action.command])
    if (proc) {
      daemonLogger.info(`[Executor] Spawned AI process ${proc.pid} for part ${partId}`)
    }
  }

  const probeResults: ProbeResult[] = []

  try {
    for (const probe of probes || []) {
      if (radarClock.isTimeout(options.taskId, partId)) {
        handleTimeout(partId, name, options.taskId)
        return {
          success: false,
          partId,
          partName: name,
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
        hallEmitter.emitProbeResult(options.taskId, partId, probe.type, 'FAILED')
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
        hallEmitter.emitProbeResult(options.taskId, partId, probe.type, actualResult.result)
      } catch (error) {
        probeResults.push({
          probeType: probe.type,
          result: 'FAILED',
          error: error instanceof Error ? error.message : String(error),
          executedAt: Date.now()
        })
        hallEmitter.emitProbeResult(options.taskId, partId, probe.type, 'FAILED')
      }
    }
  } finally {
    radarClock.stopMonitor(options.taskId, partId)
    processManager.remove(options.taskId, partId)
  }

  const verdict = reduceProbeResults(probeResults, 'AND')

  if (verdict.passed) {
    hallEmitter.emitPartCompleted(options.taskId, partId, name, { probeCount: probeResults.length })
  } else {
    hallEmitter.emitPartFailed(options.taskId, partId, name, { probeCount: probeResults.length })
  }

  return {
    success: verdict.passed,
    partId,
    partName: name,
    probeResults
  }
}

function handleTimeout(partId: string, partName: string, taskId: string): void {
  daemonLogger.warn(`[Executor] Part ${partId} timed out`)
  processManager.markTimeout(taskId, partId)
  radarClock.stopMonitor(taskId, partId)
  hallEmitter.emitPartTimeout(taskId, partId, partName)
}

export function buildDag(parts: Part[]): { order: string[] } {
  const order: string[] = []

  const inDegree = new Map<string, number>()
  const adjList = new Map<string, string[]>()

  for (const part of parts) {
    inDegree.set(part.id, 0)
    adjList.set(part.id, [])
  }

  for (const part of parts) {
    for (const dep of part.deps || []) {
      adjList.get(dep)?.push(part.id)
      inDegree.set(part.id, (inDegree.get(part.id) || 0) + 1)
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

export async function executeBlueprint(options: ExecutorOptions): Promise<{ success: boolean; results: ExecutePartResult[] }> {
  const { blueprint, taskId, taskName } = options
  const parts = blueprint.parts || []

  hallEmitter.emitTaskRunning(taskId, taskName)

  const { order } = buildDag(parts)
  const results: ExecutePartResult[] = []

  const partMap = new Map<string, Part>(parts.map(p => [p.id, p]))

  for (const partId of order) {
    const part = partMap.get(partId)
    if (!part) continue

    if (radarClock.isTimeout(taskId, partId)) {
      handleTimeout(partId, part.name || partId, taskId)
      break
    }

    const result = await executePart(part, options)
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
  radarClock.onTimeout((taskId, partId, elapsed) => {
    daemonLogger.warn(`[Executor] Timeout detected for ${taskId}:${partId} after ${elapsed}ms`)
    const proc = processManager.get(taskId, partId)
    if (proc) {
      processManager.markTimeout(taskId, partId)
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