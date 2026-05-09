import type { Blueprint, Stage } from '../../kernel/schemas/blueprint.schema'
import { getProbeHandler, type ProbeResult, type ProbeContext } from '../../infra/probes'
import { evaluateProbe, reduceProbeResults, type ProbeDefinition } from '../../kernel/probes/evaluator'

export interface ExecutorOptions {
  projectRoot: string
  taskId: string
  blueprint: Blueprint
}

export interface ExecuteStageResult {
  success: boolean
  stageId: string
  probeResults: ProbeResult[]
}

export async function executeStage(
  stage: Stage,
  options: ExecutorOptions
): Promise<ExecuteStageResult> {
  const { id: stageId, name, proof } = stage
  const context: ProbeContext = { projectRoot: options.projectRoot }

  console.log(`[Executor] Executing stage: ${stageId} (${name})`)

  const probeResults: ProbeResult[] = []

  for (const probe of proof.probes || []) {
    console.log(`[Executor] Running probe: ${probe.type}`)

    const handler = getProbeHandler(probe.type)
    if (!handler) {
      probeResults.push({
        probeType: probe.type,
        result: 'FAILED',
        error: `Unknown probe type: ${probe.type}`,
        executedAt: Date.now()
      })
      continue
    }

    try {
      const probeParams = {
        pattern: probe.pattern,
        patterns: probe.patterns,
        command: probe.command,
        cwd: probe.cwd
      }
      const actualResult = await handler(probeParams, context) as ProbeResult

      const definition: ProbeDefinition = {
        type: probe.type,
        params: { pattern: probe.pattern, patterns: probe.patterns, command: probe.command, cwd: probe.cwd }
      }
      evaluateProbe(definition, actualResult)

      probeResults.push(actualResult)
    } catch (error) {
      probeResults.push({
        probeType: probe.type,
        result: 'FAILED',
        error: error instanceof Error ? error.message : String(error),
        executedAt: Date.now()
      })
    }
  }

  const verdict = reduceProbeResults(probeResults, 'AND')

  return {
    success: verdict.passed,
    stageId,
    probeResults
  }
}

export function buildDag(stages: Stage[]): { order: string[] } {
  const order: string[] = []

  const inDegree = new Map<string, number>()
  const adjList = new Map<string, string[]>()

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
  const { blueprint } = options
  const stages = blueprint.stages || []

  const { order } = buildDag(stages)
  const results: ExecuteStageResult[] = []

  for (const stageId of order) {
    const stage = stages.find(s => s.id === stageId)
    if (!stage) continue

    const result = await executeStage(stage, options)
    results.push(result)

    if (!result.success && blueprint.status === 'ABANDONED') {
      break
    }
  }

  const success = results.every(r => r.success)
  return { success, results }
}
