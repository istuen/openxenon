// =============================================================================
// dual-state-exec.ts — v0.1 双层状态机执行器
//
// 把 leader run/submit 拆为 workspace 级 + task 级双层操作：
//   - runWork        → 写 works/<w>/work-state.json
//   - runTask        → 校验 + 写 works/<w>/tasks/<t>/task-state.json
//   - submitTask     → 推进 task part，写 task 级 state + 同步 work 索引
//   - writeTaskFrozen → task 终态时生成 tasks/<t>/task-frozen.json
//   - writeWorkFrozen → work 终态时生成 works/<w>/work-frozen.json
//
// 命名范式: {entity}-{aspect}.{ext}（详见 kernel/constants.ts）
// =============================================================================

import { existsSync, mkdirSync, renameSync, writeFileSync } from 'fs'
import {
  createInitialTaskState,
  createInitialWorkspaceState,
  type TaskState,
  type WorkspaceState,
  type WorkspaceTaskStatus,
} from './dual-state'
import {
  getTaskDir,
  getTaskFrozenPath,
  getTaskTracePath,
  getWorkDir,
  getWorkFrozenPath,
  getWorkStatePath,
  getWorkTracePath,
  loadTaskState,
  loadWorkState,
  saveTaskState,
  saveWorkState,
} from './dual-state-io'

// =============================================================================
// 错误码
// =============================================================================

export class ExecError extends Error {
  constructor(
    public readonly code:
      | 'OXN_WORKSPACE_NOT_FOUND'
      | 'OXN_TASK_NOT_FOUND'
      | 'OXN_TASK_OXN_MISSING'
      | 'OXN_NO_NEXT_PART'
      | 'OXN_PART_ALREADY_DONE'
      | 'OXN_WORKSPACE_ALREADY_RUNNING'
      | 'OXN_WORK_NOT_STARTED',
    message: string,
  ) {
    super(message)
    this.name = 'ExecError'
  }
}

// =============================================================================
// Work 启动（启动 work 状态机，落 work-state.json）
// =============================================================================

export interface RunWorkParams {
  projectRoot: string
  workName: string
  blueprintNames: string[]
  domainNames: string[]
  tasks: Array<{ taskName: string; blueprint: string; injects: string[] }>
  goal?: string
  constraints?: string[]
  maxIterations?: number
}

export function runWork(params: RunWorkParams): WorkspaceState {
  const state = createInitialWorkspaceState({
    workName: params.workName,
    domains: params.domainNames,
    blueprints: params.blueprintNames,
    tasks: params.tasks,
    overallGoal: params.goal,
    constraints: params.constraints,
    maxIterations: params.maxIterations,
  })
  saveWorkState(params.projectRoot, params.workName, state)
  appendWorkTrace(params.projectRoot, params.workName, {
    event: 'work-started',
    workName: params.workName,
    domains: params.domainNames,
    blueprints: params.blueprintNames,
    tasks: params.tasks.map((t) => t.taskName),
    at: new Date().toISOString(),
  })
  return state
}

// =============================================================================
// Task 启动（落 tasks/<t>/task-state.json）
// =============================================================================

export interface RunTaskParams {
  projectRoot: string
  workName: string
  taskName: string
  blueprint: string
  injects: string[]
  partNames: string[]
  objective?: string
  constraints?: string[]
  maxIterations?: number
}

export function runTask(params: RunTaskParams): TaskState {
  const workState = loadWorkState(params.projectRoot, params.workName)
  if (!workState) {
    throw new ExecError(
      'OXN_WORK_NOT_STARTED',
      `work-state.json not found for "${params.workName}". Run \`oxn work run <name>\` first.`,
    )
  }

  const taskIndex = workState.tasks.find((t) => t.taskName === params.taskName)
  if (!taskIndex) {
    throw new ExecError(
      'OXN_TASK_NOT_FOUND',
      `task "${params.taskName}" is not declared in work "${params.workName}". add it via \`oxn work add-task\`.`,
    )
  }

  const taskState = createInitialTaskState({
    workName: params.workName,
    taskName: params.taskName,
    blueprint: params.blueprint,
    injects: params.injects,
    partNames: params.partNames,
    objective: params.objective,
    constraints: params.constraints,
    maxIterations: params.maxIterations,
  })
  saveTaskState(params.projectRoot, params.workName, params.taskName, taskState)

  taskIndex.status = 'running'
  taskIndex.startedAt = taskState.createdAt
  saveWorkState(params.projectRoot, params.workName, workState)

  appendWorkTrace(params.projectRoot, params.workName, {
    event: 'task-started',
    workName: params.workName,
    taskName: params.taskName,
    blueprint: params.blueprint,
    injects: params.injects,
    at: new Date().toISOString(),
  })
  appendTaskTrace(params.projectRoot, params.workName, params.taskName, {
    event: 'task-started',
    taskName: params.taskName,
    partNames: params.partNames,
    at: new Date().toISOString(),
  })

  return taskState
}

// =============================================================================
// Task 推进（submit one part）
// =============================================================================

export interface SubmitTaskParams {
  projectRoot: string
  workName: string
  taskName: string
  runProbes?: boolean
  evidence?: Record<string, unknown>
}

export interface SubmitTaskResult {
  taskState: TaskState
  nextPart: string | null
  status: WorkspaceTaskStatus
  probeResults: Array<{
    probe: string
    passed: boolean
    output?: unknown
    errorMessage?: string
    durationMs?: number
  }>
  frozen: boolean
}

export function submitTask(params: SubmitTaskParams): SubmitTaskResult {
  const taskState = loadTaskState(params.projectRoot, params.workName, params.taskName)
  if (!taskState) {
    throw new ExecError(
      'OXN_TASK_NOT_FOUND',
      `task "${params.taskName}" not started. Run \`oxn work run <name>\` first.`,
    )
  }

  const probeResults: SubmitTaskResult['probeResults'] = []

  if (taskState.currentPart) {
    if (!taskState.completedParts.includes(taskState.currentPart)) {
      taskState.completedParts.push(taskState.currentPart)
    }
    probeResults.push({
      probe: 'state-machine',
      passed: true,
      output: { advanced: true, part: taskState.currentPart },
    })

    const exec = taskState.partExecutions.find((e) => e.partName === taskState.currentPart)
    if (exec) {
      exec.completedAt = new Date().toISOString()
      exec.status = 'passed'
    }
  }

  const allParts = taskState.partExecutions.map((e) => e.partName)
  const nextIdx = taskState.completedParts.length
  const nextPart = nextIdx < allParts.length ? (allParts[nextIdx] ?? null) : null
  taskState.currentPart = nextPart

  taskState.loopMeta.currentIteration += 1

  let status: WorkspaceTaskStatus = 'running'
  let frozen = false
  if (nextPart === null) {
    status = 'passed'
    frozen = true
    taskState.status = 'passed'
    writeTaskFrozen(params.projectRoot, params.workName, params.taskName, {
      taskName: params.taskName,
      workName: params.workName,
      blueprint: taskState.blueprint,
      completedAt: new Date().toISOString(),
      trace: taskState.completedParts,
      probeResults: probeResults.map((p) => ({
        probe: p.probe,
        passed: p.passed,
        output: p.output,
      })),
    })
  } else {
    taskState.status = 'running'
  }

  saveTaskState(params.projectRoot, params.workName, params.taskName, taskState)

  // 同步 work 索引 + 推算 work 整体状态
  const workState = loadWorkState(params.projectRoot, params.workName)
  if (workState) {
    const taskIndex = workState.tasks.find((t) => t.taskName === params.taskName)
    if (taskIndex) {
      taskIndex.status = status
      if (frozen) {
        taskIndex.completedAt = new Date().toISOString()
      }
    }
    const allTasksDone = workState.tasks.every((t) => t.status === 'passed' || t.status === 'failed')
    let workFrozen = false
    if (allTasksDone && workState.tasks.every((t) => t.status === 'passed')) {
      workState.status = 'passed'
      workFrozen = true
    } else if (workState.tasks.some((t) => t.status === 'failed')) {
      workState.status = 'failed'
    } else {
      workState.status = 'running'
    }
    saveWorkState(params.projectRoot, params.workName, workState)

    if (workFrozen) {
      writeWorkFrozen(params.projectRoot, params.workName, {
        workName: params.workName,
        completedAt: new Date().toISOString(),
        tasks: workState.tasks.map((t) => ({
          taskName: t.taskName,
          status: t.status,
          completedAt: t.completedAt ?? null,
        })),
      })
    }
  }

  appendTaskTrace(params.projectRoot, params.workName, params.taskName, {
    event: 'submit',
    iteration: taskState.loopMeta.currentIteration,
    completedParts: taskState.completedParts,
    nextPart: nextPart,
    status,
    at: new Date().toISOString(),
  })
  appendWorkTrace(params.projectRoot, params.workName, {
    event: 'task-submit',
    workName: params.workName,
    taskName: params.taskName,
    status,
    nextPart: nextPart,
    at: new Date().toISOString(),
  })

  return {
    taskState,
    nextPart,
    status,
    probeResults,
    frozen,
  }
}

// =============================================================================
// frozen.json writers
// =============================================================================

interface TaskFrozenSnapshot {
  taskName: string
  workName: string
  blueprint: string
  completedAt: string
  trace: string[]
  probeResults: Array<{ probe: string; passed: boolean; output?: unknown }>
}

interface WorkFrozenSnapshot {
  workName: string
  completedAt: string
  tasks: Array<{ taskName: string; status: WorkspaceTaskStatus; completedAt: string | null }>
}

function writeTaskFrozen(projectRoot: string, workName: string, taskName: string, snapshot: TaskFrozenSnapshot): void {
  const path = getTaskFrozenPath(projectRoot, workName, taskName)
  writeFrozen(path, snapshot)
}

function writeWorkFrozen(projectRoot: string, workName: string, snapshot: WorkFrozenSnapshot): void {
  const path = getWorkFrozenPath(projectRoot, workName)
  writeFrozen(path, snapshot)
}

function writeFrozen(path: string, snapshot: unknown): void {
  const dir = path.substring(0, path.lastIndexOf('/'))
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  const tmpPath = `${path}.tmp`
  writeFileSync(tmpPath, JSON.stringify(snapshot, null, 2), 'utf-8')
  renameSync(tmpPath, path)
}

// =============================================================================
// Trace append（work + task 双层）
// =============================================================================

function appendWorkTrace(projectRoot: string, workName: string, event: Record<string, unknown>): void {
  const dir = getWorkDir(projectRoot, workName)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const path = getWorkTracePath(projectRoot, workName)
  const line = `${JSON.stringify({ ...event, at: event.at ?? new Date().toISOString() })}\n`
  try {
    writeFileSync(path, line, { flag: 'a', encoding: 'utf-8' })
  } catch {
    // ignore
  }
}

function appendTaskTrace(
  projectRoot: string,
  workName: string,
  taskName: string,
  event: Record<string, unknown>,
): void {
  const dir = getWorkDir(projectRoot, workName) + `/tasks/${taskName}`
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const path = getTaskTracePath(projectRoot, workName, taskName)
  const line = `${JSON.stringify({ ...event, at: event.at ?? new Date().toISOString() })}\n`
  try {
    writeFileSync(path, line, { flag: 'a', encoding: 'utf-8' })
  } catch {
    // ignore
  }
}

// =============================================================================
// 状态读取辅助
// =============================================================================

export function getWorkStatusSnapshot(
  projectRoot: string,
  workName: string,
): {
  workspace: WorkspaceState | null
  tasks: Array<{ taskName: string; state: TaskState | null; indexStatus: WorkspaceTaskStatus }>
} {
  const workspace = loadWorkState(projectRoot, workName)
  if (!workspace) return { workspace: null, tasks: [] }
  const tasks = workspace.tasks.map((idx) => ({
    taskName: idx.taskName,
    state: loadTaskState(projectRoot, workName, idx.taskName),
    indexStatus: idx.status,
  }))
  return { workspace, tasks }
}

// =============================================================================
// 校验：work.oxn 声明的 task 是否都已建 task.oxn
// =============================================================================

export function validateTasksPresent(
  projectRoot: string,
  workName: string,
  declaredTaskNames: string[],
): { ok: boolean; missing: string[] } {
  const missing: string[] = []
  for (const name of declaredTaskNames) {
    const path = getTaskOxnPath(projectRoot, workName, name)
    if (!existsSync(path)) missing.push(name)
  }
  return { ok: missing.length === 0, missing }
}

function getTaskOxnPath(projectRoot: string, workName: string, taskName: string): string {
  return getTaskDir(projectRoot, workName, taskName) + '/task.oxn'
}

// =============================================================================
// 重复定义 Work 状态存在性（用于 NV-1 守卫）
// =============================================================================

export function isWorkStarted(projectRoot: string, workName: string): boolean {
  return existsSync(getWorkStatePath(projectRoot, workName))
}

// =============================================================================
// no-op probe (v0.1 保持状态机可观察，v0.2 接 task.oxn observe)
// =============================================================================

export function runNoopProbe(partName: string, partAlign: string): { probe: string; passed: boolean; output: unknown } {
  return {
    probe: 'part-reachable',
    passed: true,
    output: { partName, align: partAlign, mode: 'v0.1-noop' },
  }
}
