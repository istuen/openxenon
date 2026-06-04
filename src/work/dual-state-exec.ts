// =============================================================================
// dual-state-exec.ts — v0.1 双层状态机执行器
//
// 把 leader run/submit 拆为 workspace 级 + task 级双层操作：
//   - runWorkSpace  → 写 works/<w>/state.json
//   - runTask       → 校验 + 写 works/<w>/tasks/<t>/state.json
//   - submitTask    → 推进 task part，写 task 级 state + 同步 workspace 索引
//   - freezeTask    → 验证通过后生成 tasks/<t>/frozen.json
//
// v0.1 限制：
//   - 探针保持 no-op 状态机探针（v0.2 接入 task.oxn 的 observe 字段）
//   - 单层 trace 写入 workspace 级 + task 级两条 JSONL
// =============================================================================

import { existsSync, writeFileSync, mkdirSync, renameSync } from 'fs'
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
  getTaskOxnPath,
  getTaskTracePath,
  getWorkspaceDir,
  getWorkspaceTracePath,
  loadTaskState,
  loadWorkspaceState,
  saveTaskState,
  saveWorkspaceState,
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
      | 'OXN_WORKSPACE_ALREADY_RUNNING',
    message: string,
  ) {
    super(message)
    this.name = 'ExecError'
  }
}

// =============================================================================
// Workspace 初始化
// =============================================================================

export interface RunWorkspaceParams {
  projectRoot: string
  workName: string
  blueprintNames: string[]
  domainNames: string[]
  tasks: Array<{ taskName: string; blueprint: string; injects: string[] }>
  goal?: string
  constraints?: string[]
  maxIterations?: number
}

export function runWorkSpace(params: RunWorkspaceParams): WorkspaceState {
  const state = createInitialWorkspaceState({
    workName: params.workName,
    domains: params.domainNames,
    blueprints: params.blueprintNames,
    tasks: params.tasks,
    overallGoal: params.goal,
    constraints: params.constraints,
    maxIterations: params.maxIterations,
  })
  saveWorkspaceState(params.projectRoot, params.workName, state)
  appendWorkspaceTrace(params.projectRoot, params.workName, {
    event: 'workspace-started',
    workName: params.workName,
    domains: params.domainNames,
    blueprints: params.blueprintNames,
    tasks: params.tasks.map((t) => t.taskName),
    at: new Date().toISOString(),
  })
  return state
}

// =============================================================================
// Task 启动
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
  // 校验 task.oxn 存在
  const taskOxnPath = getTaskOxnPath(params.projectRoot, params.workName, params.taskName)
  if (!existsSync(taskOxnPath)) {
    throw new ExecError(
      'OXN_TASK_OXN_MISSING',
      `task.oxn not found at ${taskOxnPath}. Run \`oxn work task new --work ${params.workName} --task ${params.taskName} --blueprint ${params.blueprint}\` first.`,
    )
  }

  // 校验 workspace 存在
  const workspace = loadWorkspaceState(params.projectRoot, params.workName)
  if (!workspace) {
    throw new ExecError(
      'OXN_WORKSPACE_NOT_FOUND',
      `workspace state.json not found for "${params.workName}". Run \`oxn leader run --work-file <work.oxn>\` first.`,
    )
  }

  // 校验 task 已在 workspace 索引里
  const taskIndex = workspace.tasks.find((t) => t.taskName === params.taskName)
  if (!taskIndex) {
    throw new ExecError(
      'OXN_TASK_NOT_FOUND',
      `task "${params.taskName}" is not declared in work "${params.workName}". add it via \`oxn work task new\`.`,
    )
  }

  // 创建 task 级 state
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

  // 同步 workspace 索引
  taskIndex.status = 'running'
  taskIndex.startedAt = taskState.createdAt
  saveWorkspaceState(params.projectRoot, params.workName, workspace)

  // trace
  appendWorkspaceTrace(params.projectRoot, params.workName, {
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
// Task 推进 (submit one part)
// =============================================================================

export interface SubmitTaskPartParams {
  projectRoot: string
  workName: string
  taskName: string
  runProbes?: boolean
  evidence?: Record<string, unknown>
}

export interface SubmitTaskPartResult {
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

export function submitTaskPart(params: SubmitTaskPartParams): SubmitTaskPartResult {
  const taskState = loadTaskState(params.projectRoot, params.workName, params.taskName)
  if (!taskState) {
    throw new ExecError(
      'OXN_TASK_NOT_FOUND',
      `task "${params.taskName}" not started. Run \`oxn leader run --work-file <work.oxn>\` first.`,
    )
  }

  const probeResults: SubmitTaskPartResult['probeResults'] = []

  // 推进 currentPart
  if (taskState.currentPart) {
    if (!taskState.completedParts.includes(taskState.currentPart)) {
      taskState.completedParts.push(taskState.currentPart)
    }
    probeResults.push({
      probe: 'state-machine',
      passed: true,
      output: { advanced: true, part: taskState.currentPart },
    })

    // 标记对应 partExecution
    const exec = taskState.partExecutions.find((e) => e.partName === taskState.currentPart)
    if (exec) {
      exec.completedAt = new Date().toISOString()
      exec.status = 'passed'
    }
  }

  // 选择下一 part
  const allParts = taskState.partExecutions.map((e) => e.partName)
  const nextIdx = taskState.completedParts.length
  const nextPart = nextIdx < allParts.length ? (allParts[nextIdx] ?? null) : null
  taskState.currentPart = nextPart

  // iteration 递增
  taskState.loopMeta.currentIteration += 1

  // 状态判定
  let status: WorkspaceTaskStatus = 'running'
  let frozen = false
  if (nextPart === null) {
    status = 'passed'
    frozen = true
    taskState.status = 'passed'
    // 写 task 级 frozen.json
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

  // 同步 workspace 索引
  const workspace = loadWorkspaceState(params.projectRoot, params.workName)
  if (workspace) {
    const taskIndex = workspace.tasks.find((t) => t.taskName === params.taskName)
    if (taskIndex) {
      taskIndex.status = status
      if (frozen) {
        taskIndex.completedAt = new Date().toISOString()
      }
    }
    // 判定 workspace 整体状态
    const allTasksDone = workspace.tasks.every((t) => t.status === 'passed' || t.status === 'failed')
    if (allTasksDone && workspace.tasks.every((t) => t.status === 'passed')) {
      workspace.status = 'passed'
    } else if (workspace.tasks.some((t) => t.status === 'failed')) {
      workspace.status = 'failed'
    } else {
      workspace.status = 'running'
    }
    saveWorkspaceState(params.projectRoot, params.workName, workspace)
  }

  // trace
  appendTaskTrace(params.projectRoot, params.workName, params.taskName, {
    event: 'submit',
    iteration: taskState.loopMeta.currentIteration,
    completedParts: taskState.completedParts,
    nextPart: nextPart,
    status,
    at: new Date().toISOString(),
  })
  appendWorkspaceTrace(params.projectRoot, params.workName, {
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
// Task 级 frozen.json
// =============================================================================

interface TaskFrozenSnapshot {
  taskName: string
  workName: string
  blueprint: string
  completedAt: string
  trace: string[]
  probeResults: Array<{ probe: string; passed: boolean; output?: unknown }>
}

function writeTaskFrozen(projectRoot: string, workName: string, taskName: string, snapshot: TaskFrozenSnapshot): void {
  const dir = getTaskDir(projectRoot, workName, taskName)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  const path = getTaskFrozenPath(projectRoot, workName, taskName)
  const tmpPath = `${path}.tmp`
  writeFileSync(tmpPath, JSON.stringify(snapshot, null, 2), 'utf-8')
  renameSync(tmpPath, path)
}

// =============================================================================
// Trace append (workspace + task 双层)
// =============================================================================

function appendWorkspaceTrace(projectRoot: string, workName: string, event: Record<string, unknown>): void {
  const dir = getWorkspaceDir(projectRoot, workName)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const path = getWorkspaceTracePath(projectRoot, workName)
  const line = `${JSON.stringify({ ...event, at: event.at ?? new Date().toISOString() })}\n`
  try {
    writeFileSync(path, line, { flag: 'a', encoding: 'utf-8' })
  } catch {
    // 首次写入可能路径不存在
  }
}

function appendTaskTrace(
  projectRoot: string,
  workName: string,
  taskName: string,
  event: Record<string, unknown>,
): void {
  const dir = getTaskDir(projectRoot, workName, taskName)
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

export function getTaskStatusSnapshot(
  projectRoot: string,
  workName: string,
): {
  workspace: WorkspaceState | null
  tasks: Array<{ taskName: string; state: TaskState | null; indexStatus: WorkspaceTaskStatus }>
} {
  const workspace = loadWorkspaceState(projectRoot, workName)
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

// =============================================================================
// no-op probe (v0.1 保持状态机可观察，v0.2 接 task.oxn observe)
// =============================================================================

export function runNoopProbe(partName: string, partAlign: string): { probe: string; passed: boolean; output: unknown } {
  // v0.1 占位 — 实际触发由调用方决定（leader --run-probes）
  return {
    probe: 'part-reachable',
    passed: true,
    output: { partName, align: partAlign, mode: 'v0.1-noop' },
  }
}
void runNoopProbe
