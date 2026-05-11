import { randomUUID } from 'crypto'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'fs'
import { BOUNDARY_DIR, BLUEPRINT_FILE, TASKS_DIR, STEP_MANIFEST_FILE } from '../kernel/constants'
import { ensureDirectory } from '../infra/fs'
import { parse as parseYaml } from 'yaml'
import { probeHandlers, type ProbeResult, type ProbeContext } from '../infra/probes'
import { evaluateProbe, type ProbeDefinition } from '../kernel/probes/evaluator'
import type { ProbeInvocation } from '../kernel/schemas/probe'
import { buildTraceEvent, type TraceEvent } from '../kernel/lib/task-trace'
import type { StageDefinition } from '../kernel/schemas/stage'

const TASK_TRACE_FILE = 'task-trace.yaml'
const STATE_FILE = 'state.json'

export interface TaskState {
  taskId: string
  taskName: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED'
  currentStage: string | null
  stages: Record<string, 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED'>
}

export interface ParsedBlueprint {
  name?: string
  id?: string
  stages: StageDefinition[]
}

function getTaskDir(cwd: string, taskId: string): string {
  return join(cwd, BOUNDARY_DIR, TASKS_DIR, taskId)
}

function getBlueprintPath(cwd: string, taskId: string): string {
  return join(getTaskDir(cwd, taskId), BLUEPRINT_FILE)
}

function getStatePath(cwd: string, taskId: string): string {
  return join(getTaskDir(cwd, taskId), STATE_FILE)
}

function getTracePath(cwd: string, taskId: string): string {
  return join(getTaskDir(cwd, taskId), TASK_TRACE_FILE)
}

function getStepManifestPath(cwd: string, taskId: string): string {
  return join(getTaskDir(cwd, taskId), STEP_MANIFEST_FILE)
}

function readBlueprint(cwd: string, taskId: string): ParsedBlueprint | null {
  const path = getBlueprintPath(cwd, taskId)
  if (!existsSync(path)) return null
  try {
    const content = readFileSync(path, 'utf-8')
    return parseYaml(content) as ParsedBlueprint
  } catch {
    return null
  }
}

function writeState(cwd: string, taskId: string, state: TaskState): void {
  const path = getStatePath(cwd, taskId)
  ensureDirectory(join(cwd, BOUNDARY_DIR, TASKS_DIR, taskId))
  writeFileSync(path, JSON.stringify(state, null, 2), 'utf-8')
}

function readState(cwd: string, taskId: string): TaskState | null {
  const path = getStatePath(cwd, taskId)
  if (!existsSync(path)) return null
  try {
    const content = readFileSync(path, 'utf-8')
    return JSON.parse(content) as TaskState
  } catch {
    return null
  }
}

function appendTraceEvent(cwd: string, taskId: string, event: TraceEvent): void {
  const path = getTracePath(cwd, taskId)
  ensureDirectory(join(cwd, BOUNDARY_DIR, TASKS_DIR, taskId))
  const line = JSON.stringify(event) + '\n'
  appendFileSync(path, line, 'utf-8')
}

export interface SubmitResult {
  taskId: string
  blueprintId: string
  blueprintFile: string
  status: string
  stagesCount: number
  message: string
}

export function taskSubmit(blueprintPath: string, cwd: string): SubmitResult {
  if (!existsSync(blueprintPath)) {
    throw new Error(`Blueprint file not found: ${blueprintPath}`)
  }

  const content = readFileSync(blueprintPath, 'utf-8')
  const parsed = parseYaml(content) as ParsedBlueprint

  if (!parsed.name && !parsed.id) {
    throw new Error('Blueprint must have name or id field')
  }

  const taskId = randomUUID().slice(0, 8)
  const taskDir = getTaskDir(cwd, taskId)
  ensureDirectory(taskDir)

  const blueprintDestPath = getBlueprintPath(cwd, taskId)
  writeFileSync(blueprintDestPath, content, 'utf-8')

  const stages: Record<string, 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED'> = {}
  if (parsed.stages) {
    for (const stage of parsed.stages) {
      stages[stage.name] = 'PENDING'
    }
  }

  const state: TaskState = {
    taskId,
    taskName: parsed.name || parsed.id || 'unnamed',
    status: 'RUNNING',
    currentStage: null,
    stages
  }
  writeState(cwd, taskId, state)

  const traceEvent = buildTraceEvent('TASK_START', taskId, {
    taskName: state.taskName
  })
  appendTraceEvent(cwd, taskId, traceEvent)

  return {
    taskId,
    blueprintId: taskId,
    blueprintFile: `${TASKS_DIR}/${taskId}/${BLUEPRINT_FILE}`,
    status: 'RUNNING',
    stagesCount: parsed.stages?.length || 0,
    message: 'Task created successfully'
  }
}

export interface NextResult {
  stageId: string | null
  name?: string
  proof?: string
  status?: string
  message?: string
}

export function taskNext(taskId: string, cwd: string): NextResult {
  const state = readState(cwd, taskId)
  if (!state) {
    throw new Error(`Task not found: ${taskId}`)
  }

  if (state.status === 'COMPLETED') {
    return {
      stageId: null,
      status: 'COMPLETED',
      message: 'Task already completed'
    }
  }

  const blueprint = readBlueprint(cwd, taskId)
  if (!blueprint || !blueprint.stages || blueprint.stages.length === 0) {
    throw new Error('No stages defined in blueprint')
  }

  for (const stage of blueprint.stages) {
    const stageStatus = state.stages[stage.name]
    if (!stageStatus || stageStatus === 'PENDING') {
      state.stages[stage.name] = 'RUNNING'
      state.currentStage = stage.name
      writeState(cwd, taskId, state)

      const traceEvent = buildTraceEvent('STAGE_START', taskId, {
        stageId: stage.id || stage.name,
        stageName: stage.name
      })
      appendTraceEvent(cwd, taskId, traceEvent)

      return {
        stageId: stage.id || stage.name,
        name: stage.name,
        proof: stage.proof,
        message: 'Stage started'
      }
    }
  }

  state.status = 'COMPLETED'
  state.currentStage = null
  writeState(cwd, taskId, state)

  return {
    stageId: null,
    status: 'COMPLETED',
    message: 'All stages completed'
  }
}

export interface VerifyResult {
  passed: boolean
  stageId: string
  results: ProbeResult[]
  message: string
}

export async function taskVerify(taskId: string, stageId: string, cwd: string): Promise<VerifyResult> {
  const state = readState(cwd, taskId)
  if (!state) {
    throw new Error(`Task not found: ${taskId}`)
  }

  const blueprint = readBlueprint(cwd, taskId)
  if (!blueprint || !blueprint.stages) {
    throw new Error('No blueprint or stages found')
  }

  const stage = blueprint.stages.find(s => s.id === stageId || s.name === stageId)
  if (!stage) {
    throw new Error(`Stage not found: ${stageId}`)
  }

  const probeResults: ProbeResult[] = []
  const startTime = Date.now()

  if (stage.proof) {
    const proofConfig = stage.proof
    if (typeof proofConfig === 'object' && proofConfig !== null) {
      const proof = proofConfig as unknown as { probeRefs?: ProbeInvocation[] }
      if (proof.probeRefs && Array.isArray(proof.probeRefs)) {
        const context: ProbeContext = { projectRoot: cwd }

        for (const probeRef of proof.probeRefs) {
          const handler = probeHandlers[probeRef.type]
          if (!handler) {
            probeResults.push({
              probeType: probeRef.type,
              result: 'FAILED',
              output: undefined,
              error: `Unknown probe type: ${probeRef.type}`,
              executedAt: Date.now()
            })
            continue
          }

          try {
            const result = await handler(probeRef.params as Record<string, unknown>, context)
            const probeResult = result as ProbeResult

            const probeDef: ProbeDefinition = {
              type: probeRef.type,
              params: probeRef.params as Record<string, unknown>
            }

            const verdict = evaluateProbe(probeDef, probeResult)

            probeResults.push({
              ...probeResult,
              result: verdict.passed ? 'PASSED' : 'FAILED',
              error: verdict.passed ? undefined : verdict.message
            })

            const traceEvent = buildTraceEvent('PROBE_RESULT', taskId, {
              stageId,
              probeType: probeRef.type,
              result: verdict.passed ? 'PASSED' : 'FAILED',
              output: probeResult.output,
              error: verdict.message
            })
            appendTraceEvent(cwd, taskId, traceEvent)
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err)
            probeResults.push({
              probeType: probeRef.type,
              result: 'FAILED',
              output: undefined,
              error: errorMsg,
              executedAt: Date.now()
            })

            const traceEvent = buildTraceEvent('PROBE_RESULT', taskId, {
              stageId,
              probeType: probeRef.type,
              result: 'FAILED',
              output: undefined,
              error: errorMsg
            })
            appendTraceEvent(cwd, taskId, traceEvent)
          }
        }
      }
    }
  }

  const allPassed = probeResults.every(r => r.result === 'PASSED')
  const stageStatus: 'PASSED' | 'FAILED' = allPassed ? 'PASSED' : 'FAILED'

  state.stages[stage.name] = stageStatus
  state.currentStage = null

  if (Object.values(state.stages).every(s => s === 'PASSED' || s === 'FAILED')) {
    state.status = 'COMPLETED'
  }
  writeState(cwd, taskId, state)

  const traceEvent = buildTraceEvent('STAGE_COMPLETE', taskId, {
    stageId,
    status: stageStatus
  })
  appendTraceEvent(cwd, taskId, traceEvent)

  const stepManifest = {
    taskId,
    stages: {
      [stage.name]: {
        status: stageStatus,
        probeResults,
        duration: Date.now() - startTime
      }
    }
  }
  const manifestPath = getStepManifestPath(cwd, taskId)
  writeFileSync(manifestPath, JSON.stringify(stepManifest, null, 2), 'utf-8')

  return {
    passed: allPassed,
    stageId,
    results: probeResults,
    message: allPassed ? 'All probes passed' : `${probeResults.filter(r => r.result === 'FAILED').length}/${probeResults.length} probes failed`
  }
}

export interface StatusResult {
  taskId: string
  taskName: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED'
  currentStage: string | null
  stages: Record<string, 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED'>
  stepManifest?: Record<string, unknown>
}

export function taskStatus(taskId: string, cwd: string): StatusResult {
  const state = readState(cwd, taskId)
  if (!state) {
    throw new Error(`Task not found: ${taskId}`)
  }

  const manifestPath = getStepManifestPath(cwd, taskId)
  let stepManifest: Record<string, unknown> | undefined
  if (existsSync(manifestPath)) {
    try {
      const content = readFileSync(manifestPath, 'utf-8')
      stepManifest = JSON.parse(content)
    } catch {
      // ignore parse errors
    }
  }

  return {
    taskId: state.taskId,
    taskName: state.taskName,
    status: state.status,
    currentStage: state.currentStage,
    stages: state.stages,
    stepManifest
  }
}