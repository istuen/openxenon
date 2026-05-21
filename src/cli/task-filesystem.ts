import { join, dirname } from 'path'
import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'fs'
import { BOUNDARY_DIR, BLUEPRINT_FILE, BLUEPRINT_OXN_FILE, TASKS_DIR, STEP_MANIFEST_FILE, FROZEN_BLUEPRINT_FILE, FROZEN_BLUEPRINT_JSON, ASSEMBLY_JSON } from '../kernel/constants'
import { ensureDirectory } from '../infra/fs'
import { parse as parseYaml } from 'yaml'
import { probeHandlers, type ProbeResult, type ProbeContext } from '../infra/probes'
import { evaluateProbe, type ProbeDefinition } from '../kernel/probes/evaluator'
import { topologicalSort, validateDagTopology, type DagNode } from '../kernel/schemas/dag-validator'
import { buildTraceEvent, type TraceEvent } from '../kernel/lib/task-trace'
import { compileBlueprint, compileFrozen } from '../kernel/compiler/blueprint-compiler'
import { preloadCompileDependencies } from '../infra/loader'
import type { Blueprint } from '../kernel/schemas/blueprint.schema'
import type { FrozenBlueprint } from '../kernel/schemas/frozen-schema'
import { stringify as stringifyYaml } from 'yaml'
import { unifiedTaskSubmit } from './oxn-dual-track'

const TASK_TRACE_FILE = 'task-trace.yaml'
const STATE_FILE = 'state.json'

export interface TaskState {
  taskId: string
  taskName: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED'
  currentPart: string | null
  parts: Record<string, 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED'>
}

export interface ParsedBlueprint {
  name?: string
  id?: string
  parts?: Array<Record<string, unknown>>
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
  partsCount: number
  message: string
}

export function taskSubmit(blueprintPath: string, cwd: string, nameOverride?: string, existingTaskId?: string, params?: Record<string, unknown>): SubmitResult {
  if (!existsSync(blueprintPath)) {
    throw new Error(`Blueprint file not found: ${blueprintPath}`)
  }

  const content = readFileSync(blueprintPath, 'utf-8')

  // === OXN DSL 管线 ===
  if (blueprintPath.endsWith('.oxn')) {
    const oxnNameMatch = content.match(/blueprint\s+"([^"]+)"/)
    const bpName = nameOverride || oxnNameMatch?.[1]

    if (!bpName && !existingTaskId) {
      throw new Error('OXN Blueprint must have a name (blueprint "name" { ... }) or use --name')
    }

    const taskId = existingTaskId || bpName!

    if (!existingTaskId && taskDirExists(cwd, taskId)) {
      throw new Error(`Task "${taskId}" already exists. Choose a different name with --name.`)
    }

    if (!existingTaskId) {
      const validation = validateTaskName(taskId)
      if (!validation.valid) {
        throw new Error(`Invalid task name: ${validation.error}`)
      }
    }

    const taskName = nameOverride || bpName || taskId

    const result = unifiedTaskSubmit(blueprintPath, cwd, taskId, taskName, { params })

    const taskDir = getTaskDir(cwd, taskId)
    ensureDirectory(taskDir)

    writeFileSync(join(taskDir, BLUEPRINT_OXN_FILE), content, 'utf-8')

    writeFileSync(join(taskDir, FROZEN_BLUEPRINT_FILE), stringifyYaml(result.frozen), 'utf-8')

    writeFileSync(join(taskDir, FROZEN_BLUEPRINT_JSON), JSON.stringify(result.frozen, null, 2), 'utf-8')

    if (result.assembly) {
      writeFileSync(join(taskDir, ASSEMBLY_JSON), JSON.stringify(result.assembly, null, 2), 'utf-8')
    }

    const parts: Record<string, 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED'> = {}
    if (result.frozen.parts) {
      for (const part of result.frozen.parts) {
        parts[part.name] = 'PENDING'
      }
    }

    const state: TaskState = {
      taskId,
      taskName: result.frozen.name || bpName || 'unnamed',
      status: 'RUNNING',
      currentPart: null,
      parts
    }
    writeState(cwd, taskId, state)

    const traceEvent = buildTraceEvent('TASK_START', taskId, {
      taskName: state.taskName
    })
    appendTraceEvent(cwd, taskId, traceEvent)

    return {
      taskId,
      blueprintId: result.frozen.id,
      blueprintFile: `${TASKS_DIR}/${taskId}/${FROZEN_BLUEPRINT_FILE}`,
      status: 'RUNNING',
      partsCount: result.frozen.parts.length,
      message: 'Task created successfully'
    }
  }

  // === YAML 管线（保持不变） ===
  const rawParsed = parseYaml(content) as ParsedBlueprint

  if (!rawParsed.name && !rawParsed.id && !existingTaskId) {
    throw new Error('Blueprint must have name or id field')
  }

  const taskId = existingTaskId || resolveTaskName(content, nameOverride)

  if (!existingTaskId && taskDirExists(cwd, taskId)) {
    throw new Error(`Task "${taskId}" already exists. Choose a different name with --name.`)
  }

  const dagNodes: DagNode[] = (rawParsed.parts || []).map(p => ({
    id: String(p.id || p.name),
    deps: (p.deps || []) as string[]
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

  const bpProps = (rawParsed as any).props || {}
  const propDefaults: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(bpProps as Record<string, any>)) {
    if (val && val.default !== undefined) {
      propDefaults[key] = val.default
    }
  }

  const compileCtx = {
    taskId,
    taskName: parsed.name || parsed.id || taskId,
    params: { ...propDefaults, ...(params || {}) }
  }

  let frozenBlueprint: FrozenBlueprint

  const bpDir = dirname(blueprintPath)
  const assemblyPath = join(bpDir, 'blueprint.assembly.json')
  if (existsSync(assemblyPath)) {
    const assembly = JSON.parse(readFileSync(assemblyPath, 'utf-8'))
    frozenBlueprint = compileFrozen(assembly, compileCtx)
  } else {
    frozenBlueprint = compileBlueprint(parsed, {
      ...compileCtx,
      dependencies: preloadCompileDependencies(join(cwd, BOUNDARY_DIR))
    })
  }
  const frozenDestPath = getFrozenBlueprintPath(cwd, taskId)
  writeFileSync(frozenDestPath, stringifyYaml(frozenBlueprint), 'utf-8')

  const parts: Record<string, 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED'> = {}
  if (frozenBlueprint.parts) {
    for (const part of frozenBlueprint.parts) {
      parts[part.name] = 'PENDING'
    }
  }

  const state: TaskState = {
    taskId,
    taskName: parsed.name || parsed.id || 'unnamed',
    status: 'RUNNING',
    currentPart: null,
    parts
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
    partsCount: frozenBlueprint.parts.length,
    message: 'Task created successfully'
  }
}

export interface NewResult {
  taskId: string
  taskName: string
  status: string
  message: string
}

export function taskNew(taskId: string, taskName: string, cwd: string): NewResult {
  if (taskDirExists(cwd, taskId)) {
    throw new Error(`Task "${taskId}" already exists. Choose a different name.`)
  }

  const validation = validateTaskName(taskId)
  if (!validation.valid) {
    throw new Error(`Invalid task name: ${validation.error}`)
  }

  const taskDir = getTaskDir(cwd, taskId)
  ensureDirectory(taskDir)

  const state: TaskState = {
    taskId,
    taskName: taskName || taskId,
    status: 'PENDING',
    currentPart: null,
    parts: {}
  }
  writeState(cwd, taskId, state)

  const traceEvent = buildTraceEvent('TASK_CREATED', taskId, {
    taskName: state.taskName
  })
  appendTraceEvent(cwd, taskId, traceEvent)

  return {
    taskId,
    taskName: state.taskName,
    status: 'PENDING',
    message: 'Task created successfully. Use oxn task submit --blueprint <path> --task-id ' + taskId + ' to add a blueprint.'
  }
}

export interface NextResult {
  taskId: string
  partId: string | null
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
      partId: null,
      status: 'COMPLETED',
      message: 'Task already completed'
    }
  }

  const frozenBlueprint = readFrozenBlueprint(cwd, taskId)
  if (!frozenBlueprint || !frozenBlueprint.parts || frozenBlueprint.parts.length === 0) {
    throw new Error('No parts defined in frozen blueprint')
  }

  const dagNodes: DagNode[] = frozenBlueprint.parts.map(p => ({
    id: p.id || p.name,
    deps: p.deps || []
  }))
  const executionOrder = topologicalSort(dagNodes)

  const partNameById: Record<string, string> = {}
  for (const part of frozenBlueprint.parts) {
    partNameById[part.id || part.name] = part.name
  }

  for (const partId of executionOrder) {
    const partName = partNameById[partId]
    if (!partName) continue

    const partStatus = state.parts[partName]

    if (partStatus === 'FAILED') {
      throw new Error(`Part "${partName}" verification failed. Abort or retry.`)
    }

    const deps = frozenBlueprint.parts.find(p => (p.id || p.name) === partId)?.deps || []
    const depsSatisfied = deps.every(depId => {
      const depName = partNameById[depId] || depId
      return state.parts[depName] === 'PASSED'
    })

    if (depsSatisfied && (!partStatus || partStatus === 'PENDING')) {
      state.parts[partName] = 'RUNNING'
      state.currentPart = partName
      writeState(cwd, taskId, state)

      const traceEvent = buildTraceEvent('PART_START', taskId, {
        partId,
        partName
      })
      appendTraceEvent(cwd, taskId, traceEvent)

      const part = frozenBlueprint.parts.find(p => (p.id || p.name) === partId)

      const target = (part?.target as { description?: string; glob?: string } | undefined) || { description: partName }
      const action = (part?.action as { instruction?: string; command?: string } | undefined) || {}

      return {
        taskId,
        partId,
        name: partName,
        target: { description: target.description || partName, glob: target.glob },
        action: { instruction: action.instruction, command: action.command },
        message: 'Part started'
      }
    }
  }

  state.status = 'COMPLETED'
  state.currentPart = null
  writeState(cwd, taskId, state)

  const completedEvent = buildTraceEvent('TASK_STATUS', taskId, { status: 'COMPLETED' })
  appendTraceEvent(cwd, taskId, completedEvent)

  return {
    taskId,
    partId: null,
    status: 'COMPLETED',
    message: 'All parts completed'
  }
}

export interface VerifyResult {
  passed: boolean
  partId: string
  results: ProbeResult[]
  message: string
}

export async function taskVerify(taskId: string, partId: string, cwd: string): Promise<VerifyResult> {
  const state = readState(cwd, taskId)
  if (!state) {
    throw new Error(`Task not found: ${taskId}`)
  }

  const frozenBlueprint = readFrozenBlueprint(cwd, taskId)
  if (!frozenBlueprint || !frozenBlueprint.parts) {
    throw new Error('No frozen blueprint or parts found')
  }

  const part = frozenBlueprint.parts.find(p => p.id === partId || p.name === partId)
  if (!part) {
    throw new Error(`Part not found: ${partId}`)
  }

  const probeResults: ProbeResult[] = []
  const startTime = Date.now()

  const probes = part.probes || []
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
          error: verdict.passed ? undefined : verdict.message,
          params: probe.params || {},
          actual: verdict.actual,
          failureMessage: verdict.failureMessage,
          duration: verdict.duration
        })

        const traceEvent = buildTraceEvent('PROBE_RESULT', taskId, {
          partId,
          probeType,
          result: verdict.passed ? 'PASSED' : 'FAILED',
          output: probeResult.output,
          error: verdict.message,
          params: probe.params || {},
          actual: verdict.actual,
          failureMessage: verdict.failureMessage,
          duration: verdict.duration
        })
        appendTraceEvent(cwd, taskId, traceEvent)
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        probeResults.push({
          probeType,
          result: 'FAILED',
          output: undefined,
          error: errorMsg,
          executedAt: Date.now(),
          params: probe.params || {},
          duration: 0,
          failureMessage: errorMsg
        })

        const traceEvent = buildTraceEvent('PROBE_RESULT', taskId, {
          partId,
          probeType,
          result: 'FAILED',
          output: undefined,
          error: errorMsg,
          params: probe.params || {},
          duration: 0,
          failureMessage: errorMsg
        })
        appendTraceEvent(cwd, taskId, traceEvent)
      }
    }
  }

  const allPassed = probeResults.every(r => r.result === 'PASSED')
  const partStatus: 'PASSED' | 'FAILED' = allPassed ? 'PASSED' : 'FAILED'

  state.parts[part.name] = partStatus
  state.currentPart = null

  if (Object.values(state.parts).every(s => s === 'PASSED' || s === 'FAILED')) {
    state.status = 'COMPLETED'
  }
  writeState(cwd, taskId, state)

  const traceEvent = buildTraceEvent('PART_COMPLETE', taskId, {
    partId,
    status: partStatus
  })
  appendTraceEvent(cwd, taskId, traceEvent)

  const stepManifest = {
    taskId,
    parts: {
      [part.name]: {
        status: partStatus,
        probeResults,
        duration: Date.now() - startTime
      }
    }
  }
  const manifestPath = getStepManifestPath(cwd, taskId)
  writeFileSync(manifestPath, JSON.stringify(stepManifest, null, 2), 'utf-8')

  return {
    passed: allPassed,
    partId,
    results: probeResults,
    message: allPassed ? 'All probes passed' : `${probeResults.filter(r => r.result === 'FAILED').length}/${probeResults.length} probes failed`
  }
}

export interface StatusResult {
  taskId: string
  taskName: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED'
  currentPart: string | null
  parts: Record<string, 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED'>
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
    currentPart: state.currentPart,
    parts: state.parts,
    stepManifest
  }
}