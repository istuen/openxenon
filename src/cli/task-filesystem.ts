import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'fs'
import { BOUNDARY_DIR, BLUEPRINT_FILE, TASKS_DIR, STEP_MANIFEST_FILE, FROZEN_BLUEPRINT_FILE } from '../kernel/constants'
import { ensureDirectory } from '../infra/fs'
import { parse as parseYaml } from 'yaml'
import { probeHandlers, type ProbeResult, type ProbeContext } from '../infra/probes'
import { evaluateProbe, type ProbeDefinition } from '../kernel/probes/evaluator'
import { topologicalSort, validateDagTopology, type DagNode } from '../kernel/schemas/dag-validator'
import { buildTraceEvent, type TraceEvent } from '../kernel/lib/task-trace'
import { compileBlueprint } from '../kernel/compiler/blueprint-compiler'
import type { Blueprint } from '../kernel/schemas/blueprint.schema'
import type { FrozenBlueprint } from '../kernel/schemas/frozen-schema'
import { stringify as stringifyYaml } from 'yaml'

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
  stages?: Array<Record<string, unknown>>
}

function validateTaskName(name: string): { valid: boolean; error?: string } {
  if (!name) return { valid: false, error: 'Name is required' }
  if (name.length < 2) return { valid: false, error: 'Name too short (min 2 chars)' }
  if (name.length > 64) return { valid: false, error: 'Name too long (max 64 chars)' }
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    return { valid: false, error: 'Name must be kebab-case (lowercase letter, lowercase letters/numbers, hyphens)' }
  }
  if (name.endsWith('-')) return { valid: false, error: 'Name cannot end with hyphen' }
  return { valid: true }
}

function getTaskDir(cwd: string, taskId: string): string {
  return join(cwd, BOUNDARY_DIR, TASKS_DIR, taskId)
}

function resolveTaskName(
  content: string,
  nameOverride?: string
): string {
  const candidate = nameOverride || content.match(/^name:\s*["']?([a-z][a-z0-9-]*)/m)?.[1]

  if (!candidate) {
    throw new Error(
      'Task name required. Use --name or ensure blueprint has a name field.'
    )
  }

  const validation = validateTaskName(candidate)
  if (!validation.valid) {
    throw new Error(`Invalid task name: ${validation.error}`)
  }

  return candidate
}

function taskDirExists(cwd: string, name: string): boolean {
  return existsSync(join(cwd, BOUNDARY_DIR, TASKS_DIR, name))
}

function getBlueprintPath(cwd: string, taskId: string): string {
  return join(getTaskDir(cwd, taskId), BLUEPRINT_FILE)
}

function getFrozenBlueprintPath(cwd: string, taskId: string): string {
  return join(getTaskDir(cwd, taskId), FROZEN_BLUEPRINT_FILE)
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

function readFrozenBlueprint(cwd: string, taskId: string): FrozenBlueprint | null {
  const path = getFrozenBlueprintPath(cwd, taskId)
  if (!existsSync(path)) return null
  try {
    const content = readFileSync(path, 'utf-8')
    return parseYaml(content) as FrozenBlueprint
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

export function taskSubmit(blueprintPath: string, cwd: string, nameOverride?: string): SubmitResult {
  if (!existsSync(blueprintPath)) {
    throw new Error(`Blueprint file not found: ${blueprintPath}`)
  }

  const content = readFileSync(blueprintPath, 'utf-8')
  const rawParsed = parseYaml(content) as ParsedBlueprint

  if (!rawParsed.name && !rawParsed.id) {
    throw new Error('Blueprint must have name or id field')
  }

  const taskId = resolveTaskName(content, nameOverride)

  if (taskDirExists(cwd, taskId)) {
    throw new Error(`Task "${taskId}" already exists. Choose a different name with --name.`)
  }

  const dagNodes: DagNode[] = (rawParsed.stages || []).map(s => ({
    id: String(s.id || s.name),
    deps: (s.deps || []) as string[]
  }))
  const dagValidation = validateDagTopology(dagNodes)
  if (!dagValidation.valid) {
    throw new Error(`Invalid DAG: ${dagValidation.errors.join(', ')}`)
  }

  const parsed = rawParsed as unknown as Blueprint

  const taskDir = getTaskDir(cwd, taskId)
  ensureDirectory(taskDir)

  const blueprintDestPath = getBlueprintPath(cwd, taskId)
  writeFileSync(blueprintDestPath, content, 'utf-8')

  const frozenBlueprint = compileBlueprint(parsed, {
    taskId,
    taskName: parsed.name || parsed.id || taskId,
    params: {}
  })
  const frozenDestPath = getFrozenBlueprintPath(cwd, taskId)
  writeFileSync(frozenDestPath, stringifyYaml(frozenBlueprint), 'utf-8')

  const stages: Record<string, 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED'> = {}
  if (frozenBlueprint.stages) {
    for (const stage of frozenBlueprint.stages) {
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
    blueprintId: frozenBlueprint.id,
    blueprintFile: `${TASKS_DIR}/${taskId}/${FROZEN_BLUEPRINT_FILE}`,
    status: 'RUNNING',
    stagesCount: frozenBlueprint.stages.length,
    message: 'Task created successfully'
  }
}

export interface NextResult {
  taskId: string
  stageId: string | null
  name?: string
  target?: { description: string; glob?: string }
  action?: { instruction?: string; command?: string }
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
      taskId,
      stageId: null,
      status: 'COMPLETED',
      message: 'Task already completed'
    }
  }

  const frozenBlueprint = readFrozenBlueprint(cwd, taskId)
  if (!frozenBlueprint || !frozenBlueprint.stages || frozenBlueprint.stages.length === 0) {
    throw new Error('No stages defined in frozen blueprint')
  }

  const dagNodes: DagNode[] = frozenBlueprint.stages.map(s => ({
    id: s.id || s.name,
    deps: s.deps || []
  }))
  const executionOrder = topologicalSort(dagNodes)

  const stageNameById: Record<string, string> = {}
  for (const stage of frozenBlueprint.stages) {
    stageNameById[stage.id || stage.name] = stage.name
  }

  for (const stageId of executionOrder) {
    const stageName = stageNameById[stageId]
    if (!stageName) continue

    const stageStatus = state.stages[stageName]

    if (stageStatus === 'FAILED') {
      throw new Error(`Stage "${stageName}" verification failed. Abort or retry.`)
    }

    const deps = frozenBlueprint.stages.find(s => (s.id || s.name) === stageId)?.deps || []
    const depsSatisfied = deps.every(depId => {
      const depName = stageNameById[depId] || depId
      return state.stages[depName] === 'PASSED'
    })

    if (depsSatisfied && (!stageStatus || stageStatus === 'PENDING')) {
      state.stages[stageName] = 'RUNNING'
      state.currentStage = stageName
      writeState(cwd, taskId, state)

      const traceEvent = buildTraceEvent('STAGE_START', taskId, {
        stageId,
        stageName
      })
      appendTraceEvent(cwd, taskId, traceEvent)

      const stage = frozenBlueprint.stages.find(s => (s.id || s.name) === stageId)

      const target = (stage?.target as { description?: string; glob?: string } | undefined) || { description: stageName }
      const action = (stage?.action as { instruction?: string; command?: string } | undefined) || {}

      return {
        taskId,
        stageId,
        name: stageName,
        target: { description: target.description || stageName, glob: target.glob },
        action: { instruction: action.instruction, command: action.command },
        message: 'Stage started'
      }
    }
  }

  state.status = 'COMPLETED'
  state.currentStage = null
  writeState(cwd, taskId, state)

  const completedEvent = buildTraceEvent('TASK_STATUS', taskId, { status: 'COMPLETED' })
  appendTraceEvent(cwd, taskId, completedEvent)

  return {
    taskId,
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

  const frozenBlueprint = readFrozenBlueprint(cwd, taskId)
  if (!frozenBlueprint || !frozenBlueprint.stages) {
    throw new Error('No frozen blueprint or stages found')
  }

  const stage = frozenBlueprint.stages.find(s => s.id === stageId || s.name === stageId)
  if (!stage) {
    throw new Error(`Stage not found: ${stageId}`)
  }

  const probeResults: ProbeResult[] = []
  const startTime = Date.now()

  const probes = stage.probes || []
  if (probes.length > 0) {
    const context: ProbeContext = { projectRoot: cwd }

    for (const probe of probes) {
      const probeType = probe.type
      if (!probeType) continue

      const params: Record<string, unknown> = {}
      if (probe.params) {
        Object.assign(params, probe.params)
      } else {
        if (probe.pattern) params.pattern = probe.pattern
        if (probe.command) params.command = probe.command
      }

      const handler = probeHandlers[probeType]
      if (!handler) {
        probeResults.push({
          probeType,
          result: 'FAILED',
          output: undefined,
          error: `Unknown probe type: ${probeType}`,
          executedAt: Date.now()
        })
        continue
      }

      try {
        const result = await handler(params, context)
        const probeResult = result as ProbeResult

        const probeDef: ProbeDefinition = {
          type: probeType,
          params: probe.params || {}
        }

        const verdict = evaluateProbe(probeDef, probeResult)

        probeResults.push({
          ...probeResult,
          result: verdict.passed ? 'PASSED' : 'FAILED',
          error: verdict.passed ? undefined : verdict.message
        })

        const traceEvent = buildTraceEvent('PROBE_RESULT', taskId, {
          stageId,
          probeType,
          result: verdict.passed ? 'PASSED' : 'FAILED',
          output: probeResult.output,
          error: verdict.message
        })
        appendTraceEvent(cwd, taskId, traceEvent)
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        probeResults.push({
          probeType,
          result: 'FAILED',
          output: undefined,
          error: errorMsg,
          executedAt: Date.now()
        })

        const traceEvent = buildTraceEvent('PROBE_RESULT', taskId, {
          stageId,
          probeType,
          result: 'FAILED',
          output: undefined,
          error: errorMsg
        })
        appendTraceEvent(cwd, taskId, traceEvent)
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