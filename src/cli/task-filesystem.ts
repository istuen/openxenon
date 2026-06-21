import { appendFileSync, existsSync, readFileSync, renameSync, writeFileSync } from '../infra/filesystem'
import { join } from 'path'
import { URI } from 'langium'
// v0.1-final: task.oxn 直接通过 Langium AST 解析（不再走 bundle）
// 保留 generateOxnAssembly 导入供未来 batch 验证使用
// import { generateOxnAssembly } from '../oxl/generator/oxn-generator'
import { createOxnServices, resetOxnServices } from '../oxl/langium-driver/oxn-services'
import { ensureDirectory } from '../infra/filesystem'
import { type ProbeContext, type ProbeResult, probeHandlers } from '../infra/probes'
import { BOUNDARY_DIR, FROZEN_BLUEPRINT_JSON, TASKS_DIR, TASK_OXN_FILE } from '../kernel/index'
import { buildTraceEvent, type TraceEvent } from '../work/task-trace'
import { evaluateProbe, type ProbeDefinition } from '../work/probe-evaluator'
import { type DagNode, topologicalSort } from '../oxl/validators/blueprint-dag'
import { computeContentHash, type FrozenBlueprint } from '../kernel/index'
import { hashPort } from '../infra/hash'
import type { OxnAssemblySlotBinding } from '../oxl/schemas/oxn-assembly.schema'
import { loadStandardByName } from '../infra/loader'
import { getProjectBoundaryPath } from './project'
import { unifiedTaskSubmit } from './oxn-dual-track'
// import { writeFrozenImmutable } from '../kernel/index'

const TASK_TRACE_FILE = 'task-trace.jsonl'
const STATE_FILE = 'state.json'

export interface TaskState {
  taskId: string
  taskName: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED'
  currentPartId: string | null
  parts: Record<string, PartStateNode>
}

export interface PartStateNode {
  name: string
  status: 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED'
  probeResults?: ProbeResult[]
  duration?: number
}

function validateTaskName(name: string): { valid: boolean; error?: string } {
  if (!name) return { valid: false, error: 'Name is required' }
  if (name.length < 2) return { valid: false, error: 'Name too short (min 2 chars)' }
  if (name.length > 64) return { valid: false, error: 'Name too long (max 64 chars)' }
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    return { valid: false, error: 'Name must be kebab-case' }
  }
  if (name.endsWith('-')) return { valid: false, error: 'Name cannot end with hyphen' }
  return { valid: true }
}

function getTaskDir(cwd: string, taskId: string): string {
  return join(cwd, BOUNDARY_DIR, TASKS_DIR, taskId)
}

function taskDirExists(cwd: string, name: string): boolean {
  return existsSync(join(cwd, BOUNDARY_DIR, TASKS_DIR, name))
}

function getStatePath(cwd: string, taskId: string): string {
  return join(getTaskDir(cwd, taskId), STATE_FILE)
}

function getTracePath(cwd: string, taskId: string): string {
  return join(getTaskDir(cwd, taskId), TASK_TRACE_FILE)
}

function readFrozenBlueprint(cwd: string, taskId: string): FrozenBlueprint | null {
  const path = join(getTaskDir(cwd, taskId), FROZEN_BLUEPRINT_JSON)
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as FrozenBlueprint
  } catch {
    return null
  }
}

function detectLegacyState(state: TaskState): string[] {
  const warnings: string[] = []
  for (const key of Object.keys(state.parts)) {
    if (!/^[a-z][a-z0-9-]*$/.test(key)) {
      warnings.push(`Legacy part key "${key}" detected. Task is readonly.`)
    }
  }
  return warnings
}

function writeState(cwd: string, taskId: string, state: TaskState): void {
  const dir = getTaskDir(cwd, taskId)
  ensureDirectory(dir)
  const path = getStatePath(cwd, taskId)
  const tmpPath = `${path}.tmp`
  writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf-8')
  renameSync(tmpPath, path)
}

function readState(cwd: string, taskId: string): TaskState | null {
  const path = getStatePath(cwd, taskId)
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as TaskState
  } catch {
    return null
  }
}

function appendTraceEvent(cwd: string, taskId: string, event: TraceEvent): void {
  const dir = getTaskDir(cwd, taskId)
  ensureDirectory(dir)
  const line = `${JSON.stringify(event)}\n`
  appendFileSync(getTracePath(cwd, taskId), line, 'utf-8')
}

export interface SubmitResult {
  taskId: string
  blueprintId: string
  blueprintFile: string
  status: string
  partsCount: number
  message: string
}

export function taskSubmit(taskId: string, cwd: string, params?: Record<string, unknown>): SubmitResult {
  const taskDir = getTaskDir(cwd, taskId)
  const taskOxnPath = join(taskDir, TASK_OXN_FILE)

  if (!existsSync(taskOxnPath)) {
    throw new Error(`Task file not found: ${taskOxnPath}. Use 'oxn work add-task' to create a task first.`)
  }

  const taskOxnContent = readFileSync(taskOxnPath, 'utf-8')

  // Parse task.oxn with Langium to extract slotBindings
  const slotBindings: OxnAssemblySlotBinding[] = []
  let extractedTaskId: string | undefined
  let blueprintName: string | undefined

  try {
    const services = createOxnServices()
    const shared = services.shared
    shared.ServiceRegistry.register(services)

    const factory = shared.workspace.LangiumDocumentFactory
    const uri = URI.file(taskOxnPath)
    const doc = factory.fromString(taskOxnContent, uri, undefined)

    if (doc.parseResult?.value && doc.state > 1) {
      // v0.1-final: task.oxn 是一个独立 task 实体（含 blueprint + parts）
      const taskNode = (doc.parseResult.value as any).entities?.find((e: any) => e.$type === 'TaskDeclaration')
      if (taskNode) {
        extractedTaskId = taskNode.name
        blueprintName = taskNode.blueprint
        for (const part of taskNode.parts ?? []) {
          slotBindings.push({
            slot: part.name,
            props: {},
            probeBindings: [],
          })
        }
      }
    } else {
      throw new Error(
        `Parse state ${doc.state}, lexer errors: ${doc.parseResult?.lexerErrors?.length}, parser errors: ${doc.parseResult?.parserErrors?.length}`,
      )
    }
    resetOxnServices()
  } catch (_err) {
    resetOxnServices()
    // Fallback to regex parsing if Langium fails
    const taskNameMatch = taskOxnContent.match(/task\s+"([^"]+)"/)
    extractedTaskId = taskNameMatch?.[1]
    // v0.1: 只支持 blueprint "name" 语法（旧的 use "@prj/blueprints/name" 已废弃）
    const blueprintMatch = taskOxnContent.match(/blueprint\s+"([^"]+)"/)
    blueprintName = blueprintMatch?.[1]

    // Extract slotBindings from task.oxn content using regex fallback
    // Match: slot "name" { deps = [...] }
    const slotBindingRegex = /slot\s+"([^"]+)"\s*\{([^}]*)\}/g
    let match
    while ((match = slotBindingRegex.exec(taskOxnContent)) !== null) {
      const slotName = match[1] ?? ''
      slotBindings.push({
        slot: slotName,
        props: {},
        probeBindings: [],
      })
    }
  }

  if (!extractedTaskId) {
    throw new Error('Invalid task.oxn: missing task name')
  }

  let blueprintPath: string
  let frozenFromTaskOxn: FrozenBlueprint

  if (blueprintName) {
    const projectBoundary = getProjectBoundaryPath(cwd)
    const blueprintAsset = loadStandardByName('project', projectBoundary, blueprintName, 'blueprints')
    if (!blueprintAsset) {
      throw new Error(`Blueprint "${blueprintName}" not found in arsenal`)
    }
    blueprintPath = blueprintAsset.path

    const tempResult = unifiedTaskSubmit(blueprintPath, cwd, taskId, extractedTaskId, {
      params,
      taskBinding: slotBindings,
    })
    frozenFromTaskOxn = tempResult.frozen
  } else {
    throw new Error('task.oxn must reference a blueprint. Add: blueprint "<name>"')
  }

  const frozenPath = join(taskDir, FROZEN_BLUEPRINT_JSON)
  const existingFrozen = existsSync(frozenPath)

  if (existingFrozen) {
    const existingContent = readFileSync(frozenPath, 'utf-8')
    const existingHash = computeContentHash(existingContent, hashPort)
    const newHash = computeContentHash(JSON.stringify(frozenFromTaskOxn, null, 2), hashPort)

    if (existingHash !== newHash) {
      const taskOxnHash = computeContentHash(taskOxnContent, hashPort)
      const existingMeta = JSON.parse(existingContent)
      const frozenMetaHash = existingMeta._xenon_meta?.content_hash

      if (taskOxnHash !== frozenMetaHash) {
        throw new Error(
          `Inconsistency detected: task.oxn has been modified since last submit. ` +
            `Expected frozen.json to match task.oxn (hash: ${taskOxnHash}), ` +
            `but it doesn't. Please resubmit with 'oxn work submit --work <w> --task ${taskId}'.`,
        )
      }
    }
  }

  const result = unifiedTaskSubmit(blueprintPath, cwd, taskId, extractedTaskId, { params, taskBinding: slotBindings })

  const parts: Record<string, PartStateNode> = {}
  if (result.frozen.parts) {
    for (const part of result.frozen.parts) {
      const partId = part.id || part.name
      parts[partId] = {
        name: part.name,
        status: 'PENDING',
      }
    }
  }

  // v0.1.2: task-frozen.json 不带 top-level _xenon_meta（meta 在 parts/probes 层级）。
  // 共享的 frozen-immutable writer 用于 proof-frozen.json（顶层带 _xenon_meta）。
  // 此处保留旧 write 路径；统一签名/chmod 是 P+ 演进目标。
  writeFileSync(frozenPath, JSON.stringify(result.frozen, null, 2), 'utf-8')

  const state: TaskState = {
    taskId,
    taskName: extractedTaskId,
    status: 'RUNNING',
    currentPartId: null,
    parts,
  }

  const traceEvent = buildTraceEvent('TASK_START', taskId, { taskName: extractedTaskId })
  appendTraceEvent(cwd, taskId, traceEvent)
  writeState(cwd, taskId, state)

  return {
    taskId,
    blueprintId: result.frozen.id,
    blueprintFile: `${TASKS_DIR}/${taskId}/${FROZEN_BLUEPRINT_JSON}`,
    status: 'RUNNING',
    partsCount: result.frozen.parts.length,
    message: 'Task submitted successfully',
  }
}

export interface NewResult {
  taskId: string
  taskName: string
  status: string
  message: string
}

export function taskNew(taskId: string, taskName: string, cwd: string, blueprintName?: string): NewResult {
  if (taskDirExists(cwd, taskId)) {
    throw new Error(`Task "${taskId}" already exists. Choose a different name.`)
  }

  const validation = validateTaskName(taskId)
  if (!validation.valid) {
    throw new Error(`Invalid task name: ${validation.error}`)
  }

  const taskDir = getTaskDir(cwd, taskId)
  ensureDirectory(taskDir)

  const taskOxnContent = blueprintName
    ? `task "${taskId}" blueprint "${blueprintName}" {\n}\n`
    : `task "${taskId}" {\n  // Empty task, waiting for developer to fill in\n}\n`

  writeFileSync(join(taskDir, TASK_OXN_FILE), taskOxnContent, 'utf-8')

  const state: TaskState = {
    taskId,
    taskName: taskName || taskId,
    status: 'PENDING',
    currentPartId: null,
    parts: {},
  }

  const traceEvent = buildTraceEvent('TASK_START', taskId, { taskName: state.taskName })
  appendTraceEvent(cwd, taskId, traceEvent)
  writeState(cwd, taskId, state)

  return {
    taskId,
    taskName: state.taskName,
    status: 'PENDING',
    message: `Task created successfully. Use oxn work submit --work <w> --task ${taskId} to submit.`,
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

  const legacyWarnings = detectLegacyState(state)
  if (legacyWarnings.length > 0) {
    throw new Error(`Legacy task detected (non-kebab part keys). Task is readonly.\n${legacyWarnings.join('\n')}`)
  }

  if (state.status === 'COMPLETED') {
    return { taskId, partId: null, status: 'COMPLETED', message: 'Task already completed' }
  }

  const frozenBlueprint = readFrozenBlueprint(cwd, taskId)
  if (!frozenBlueprint?.parts || frozenBlueprint.parts.length === 0) {
    throw new Error('No parts defined in frozen blueprint')
  }

  const dagNodes: DagNode[] = frozenBlueprint.parts.map((p) => ({
    id: p.id || p.name,
    deps: p.deps || [],
  }))
  const executionOrder = topologicalSort(dagNodes)

  for (const partId of executionOrder) {
    const partNode = state.parts[partId]
    if (!partNode) continue

    if (partNode.status === 'FAILED') {
      throw new Error(`Part "${partNode.name}" verification failed. Abort or retry.`)
    }

    const frozenPart = frozenBlueprint.parts.find((p) => (p.id || p.name) === partId)
    const deps = frozenPart?.deps || []
    const depsSatisfied = deps.every((depId) => state.parts[depId]?.status === 'PASSED')

    if (depsSatisfied && partNode.status === 'PENDING') {
      state.parts[partId] = { ...partNode, status: 'RUNNING' }
      state.currentPartId = partId

      const traceEvent = buildTraceEvent('PART_START', taskId, { partId, partName: partNode.name })
      appendTraceEvent(cwd, taskId, traceEvent)
      writeState(cwd, taskId, state)

      const target = (frozenPart?.target as { description?: string; glob?: string } | undefined) || {
        description: partNode.name,
      }
      const action = (frozenPart?.action as { instruction?: string; command?: string } | undefined) || {}

      return {
        taskId,
        partId,
        name: partNode.name,
        target: { description: target.description || partNode.name, glob: target.glob },
        action: { instruction: action.instruction, command: action.command },
        message: 'Part started',
      }
    }
  }

  state.status = 'COMPLETED'
  state.currentPartId = null

  const completedEvent = buildTraceEvent('TASK_STATUS', taskId, { status: 'COMPLETED' })
  appendTraceEvent(cwd, taskId, completedEvent)
  writeState(cwd, taskId, state)

  return { taskId, partId: null, status: 'COMPLETED', message: 'All parts completed' }
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
  if (!frozenBlueprint?.parts) {
    throw new Error('No frozen blueprint or parts found')
  }

  const part = frozenBlueprint.parts.find((p) => p.id === partId || p.name === partId)
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
        const result: ProbeResult = {
          probeType,
          result: 'FAILED',
          error: `Unknown probe type: ${probeType}`,
          executedAt: Date.now(),
        }
        probeResults.push(result)
        const traceEvent = buildTraceEvent('PROBE_RESULT', taskId, {
          partId,
          probeType,
          result: 'FAILED',
          error: result.error,
        })
        appendTraceEvent(cwd, taskId, traceEvent)
        continue
      }

      try {
        const rawResult = await handler(params, context)
        const probeResult = rawResult as ProbeResult

        const probeDef: ProbeDefinition = { type: probeType, params: probe.params || {} }
        const verdict = evaluateProbe(probeDef, probeResult)

        const fullResult: ProbeResult = {
          ...probeResult,
          result: verdict.passed ? 'PASSED' : 'FAILED',
          error: verdict.passed ? undefined : verdict.message,
          params: probe.params || {},
          actual: verdict.actual,
          failureMessage: verdict.failureMessage,
          duration: verdict.duration,
        }
        probeResults.push(fullResult)

        const traceEvent = buildTraceEvent('PROBE_RESULT', taskId, {
          partId,
          probeType,
          result: fullResult.result,
          output: probeResult.output,
          error: verdict.message,
          params: probe.params || {},
          actual: verdict.actual,
          failureMessage: verdict.failureMessage,
          duration: verdict.duration,
        })
        appendTraceEvent(cwd, taskId, traceEvent)
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        const failResult: ProbeResult = {
          probeType,
          result: 'FAILED',
          error: errorMsg,
          executedAt: Date.now(),
          params: probe.params || {},
          duration: 0,
          failureMessage: errorMsg,
        }
        probeResults.push(failResult)
        appendTraceEvent(
          cwd,
          taskId,
          buildTraceEvent('PROBE_RESULT', taskId, {
            partId,
            probeType,
            result: 'FAILED',
            error: errorMsg,
            duration: 0,
            failureMessage: errorMsg,
          }),
        )
      }
    }
  }

  const allPassed = probeResults.every((r) => r.result === 'PASSED')
  const partStatus: 'PASSED' | 'FAILED' = allPassed ? 'PASSED' : 'FAILED'
  const duration = Date.now() - startTime

  state.parts[partId] = {
    name: state.parts[partId]?.name || part.name,
    status: partStatus,
    probeResults,
    duration,
  }
  state.currentPartId = null

  if (Object.values(state.parts).every((s) => s.status === 'PASSED' || s.status === 'FAILED')) {
    state.status = 'COMPLETED'
  }

  const traceEvent = buildTraceEvent('PART_COMPLETE', taskId, { partId, status: partStatus })
  appendTraceEvent(cwd, taskId, traceEvent)
  writeState(cwd, taskId, state)

  return {
    passed: allPassed,
    partId,
    results: probeResults,
    message: allPassed
      ? 'All probes passed'
      : `${probeResults.filter((r) => r.result === 'FAILED').length}/${probeResults.length} probes failed`,
  }
}

export interface StatusResult {
  taskId: string
  taskName: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED'
  currentPartId: string | null
  parts: Record<string, PartStateNode>
}

export function taskStatus(taskId: string, cwd: string): StatusResult {
  const state = readState(cwd, taskId)
  if (!state) {
    throw new Error(`Task not found: ${taskId}`)
  }

  return {
    taskId: state.taskId,
    taskName: state.taskName,
    status: state.status,
    currentPartId: state.currentPartId,
    parts: state.parts,
  }
}
