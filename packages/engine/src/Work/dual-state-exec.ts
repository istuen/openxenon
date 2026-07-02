// =============================================================================
// dual-state-exec.ts — v0.1 双层状态机执行器（V1 布局：.run/ 目录）
//
// 把 leader run/submit 拆为 workspace 级 + task 级双层操作：
//   - runWork         → 写 works/<w>/.run/state.json
//   - runTask         → 校验 + 写 works/<w>/.run/tasks/<t>/state.json
//   - submitTask      → 推进 task part，写 task 级 state + 同步 work 索引
//   - writeTaskFrozen → task 终态时生成 .run/tasks/<t>/frozen.json
//   - writeWorkFrozen → work 终态时生成 .run/frozen.json
//
// 命名范式：详见 kernel/constants.ts V1 布局
// =============================================================================

import { existsSync, mkdirSync, renameSync, writeFileSync } from '@openxenon/engine/infra/filesystem'
import { dirname } from 'path'
import {
  createInitialTaskState,
  createInitialWorkspaceState,
  type RoundRecord,
  type TaskState,
  type WorkspaceState,
  type WorkspaceTaskStatus,
} from './dual-state'
import {
  ensureTaskDir,
  getTaskFrozenPath,
  getTaskOxnPath,
  getTaskTracePath,
  getWorkFrozenPath,
  getWorkRunDir,
  getWorkStatePath,
  getWorkTracePath,
  loadTaskState,
  loadWorkState,
  saveTaskState,
  saveWorkState,
} from './dual-state-io'
import { IAPError, IAPAction, type IAPAxis } from '@openxenon/engine/kernel'

// =============================================================================
// 错误码 (v1.1 fix-p1-architecture: 走 IAPError 双轨制, 不再自定义 class)
//
// 7 个原 ExecError 码映射到 IAPError(axis=ALIGN, code=INFRA_FAIL):
//   - 这些都是「业务流预期内阻断」: 状态机前置条件未满足 (work 未 run / task 未 add-task /
//     part 已 done 等), 属于可恢复业务流错误, AI 看到后应决策 (重试 / 改路径 / YIELD_TO_HUMAN)。
//   - 不属于 OXNCrash (引擎崩溃 / 防线被击穿), 也不属于 isCliInputError (用户拼写错)。
//   - 保留 oxnCode 字段让 CLI 输出时维持稳定的 OXN_* 错误码 (向下兼容)。
// =============================================================================

export type ExecErrorCode =
  | 'OXN_WORKSPACE_NOT_FOUND'
  | 'OXN_TASK_NOT_FOUND'
  | 'OXN_TASK_OXN_MISSING'
  | 'OXN_NO_NEXT_PART'
  | 'OXN_PART_ALREADY_DONE'
  | 'OXN_WORKSPACE_ALREADY_RUNNING'
  | 'OXN_WORK_NOT_STARTED'
  | 'OXN_ROUND_ALREADY_PASSED' // v0.6 PR-2: round 已通过，应调 finalize 而非 next-round

/** @deprecated v1.1 起走 IAPError 双轨制; 类名保留仅供类型推断/旧 import 路径, 不再 throw */
export type ExecError = IAPError & { readonly oxnCode: ExecErrorCode }

export function throwExecError(axis: IAPAxis, oxnCode: ExecErrorCode, message: string): never {
  const err = new IAPError(axis, 'INFRA_FAIL', IAPAction.AUTONOMOUS_RETRY, message, { oxnCode })
  ;(err as IAPError & { oxnCode: ExecErrorCode }).oxnCode = oxnCode
  throw err
}

// =============================================================================
// Work 启动（启动 work 状态机，落 .run/state.json）
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
  /** PR-14c: 软警告（域/蓝图 ref 解析失败等），持久化到 .run/state.json */
  diagnostics?: Array<{
    code: string
    severity: 'warn' | 'error'
    ref: string
    type: 'domain' | 'blueprint'
    message: string
    suggestion: string
  }>
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
    ...(params.diagnostics && params.diagnostics.length > 0 ? { diagnostics: params.diagnostics } : {}),
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
// Task 启动（落 .run/tasks/<t>/state.json）
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
    throwExecError(
      'ALIGN',
      'OXN_WORK_NOT_STARTED',
      `work .run/state.json not found for "${params.workName}". Run \`oxn work run <name>\` first.`,
    )
  }

  const taskIndex = workState.tasks.find((t) => t.taskName === params.taskName)
  if (!taskIndex) {
    throwExecError(
      'ALIGN',
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
    throwExecError(
      'ALIGN',
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
  // v1.1 fix-p3-refactor path-dirname: 改用 dirname(path) 替代 substring+lastIndexOf('/'),
  // 兼容 Windows 路径分隔符 (path.sep 在 win32 是 '\\', POSIX 是 '/')
  const dir = dirname(path)
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
  const dir = getWorkRunDir(projectRoot, workName)
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
  // task trace 落到 .run/tasks/<t>/trace.jsonl（V1 布局）
  ensureTaskDir(projectRoot, workName, taskName)
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

// =============================================================================
// v0.6 PR-2: Round 多轮 IAP 循环
//
// 设计要点：
//   - 手动触发（`oxn work next-round`），不自动循环（避免无限循环）
//   - 上一轮 verdict 与 failures 写入 roundHistory
//   - currentRound 自增 1
//   - 任务 DAG 状态保留（taskIndex 不重置；新一轮跑时按 task 实际状态推进）
//   - finalize 时汇总所有 round 给 E4 Insight 消费
// =============================================================================

export interface NextRoundParams {
  projectRoot: string
  workName: string
  /** 本轮最终 verdict（调用方从 frozen.json.verdict 读取后传入） */
  verdict: 'PASSED' | 'FAILED' | 'INCONCLUSIVE'
  /** 本轮失败的 task 名列表（调用方从 taskState 收集） */
  failures?: string[]
  /** 可选本轮总结 */
  notes?: string
}

export interface NextRoundResult {
  workspace: WorkspaceState
  /** 新开的 round 编号 */
  round: number
  /** 上一轮（即本函数关闭的）的 verdict */
  previousVerdict: 'PASSED' | 'FAILED' | 'INCONCLUSIVE'
  /** roundHistory 长度（含已关闭的上一轮） */
  historyLength: number
}

export function nextRoundWork(params: NextRoundParams): NextRoundResult {
  const state = loadWorkState(params.projectRoot, params.workName)
  if (!state) {
    throwExecError(
      'ALIGN',
      'OXN_WORK_NOT_STARTED',
      `work .run/state.json not found for "${params.workName}". Run \`oxn work run <name>\` first.`,
    )
  }

  // 关闭当前 round
  const nowIso = new Date().toISOString()
  const closedRound: RoundRecord = {
    round: state.currentRound,
    startedAt: state.roundHistory.at(-1)?.startedAt ?? state.createdAt,
    endedAt: nowIso,
    verdict: params.verdict,
    failures: params.failures ?? [],
    ...(params.notes ? { notes: params.notes } : {}),
  }

  // 防御：避免重复关闭同一 round（重复 next-round 会 push 重复记录）
  const lastOpen = state.roundHistory.at(-1)
  if (!lastOpen || lastOpen.endedAt) {
    state.roundHistory.push(closedRound)
  } else {
    // 替换最后一条（避免 next-round 失败造成的 partially-closed 状态）
    state.roundHistory[state.roundHistory.length - 1] = closedRound
  }

  // 若上一轮 PASSED，不应继续 next-round（应调 finalize）
  if (params.verdict === 'PASSED') {
    throwExecError(
      'ALIGN',
      'OXN_ROUND_ALREADY_PASSED',
      `Work "${params.workName}" round ${state.currentRound} already PASSED. Run \`oxn work finalize\` instead of \`oxn work next-round\`.`,
    )
  }

  // 开启新 round
  state.currentRound = state.currentRound + 1
  state.roundHistory.push({
    round: state.currentRound,
    startedAt: nowIso,
    verdict: 'PENDING',
    failures: [],
  })

  state.updatedAt = nowIso
  saveWorkState(params.projectRoot, params.workName, state)
  appendWorkTrace(params.projectRoot, params.workName, {
    event: 'next-round',
    workName: params.workName,
    newRound: state.currentRound,
    previousVerdict: params.verdict,
    at: nowIso,
  })

  return {
    workspace: state,
    round: state.currentRound,
    previousVerdict: params.verdict,
    historyLength: state.roundHistory.length,
  }
}

/**
 * v0.6 PR-2: 读取工作区的 round 状态快照
 */
export interface RoundStatus {
  currentRound: number
  totalRounds: number
  history: ReadonlyArray<RoundRecord>
}

export function getRoundStatus(projectRoot: string, workName: string): RoundStatus | null {
  const state = loadWorkState(projectRoot, workName)
  if (!state) return null
  return {
    currentRound: state.currentRound,
    totalRounds: state.roundHistory.length,
    history: state.roundHistory,
  }
}

/**
 * v0.6.1-alpha.0 #3-1: 收口 work（汇总所有 round → 写最终 frozen.json）
 *
 * 行为：
 *   - 关闭当前 active round（追加 endedAt + 最终 verdict）
 *   - 标记 work status = 'finalized' 或 'passed'/'failed'（看最后 verdict）
 *   - 写 .run/frozen.json（含所有 round summary）
 *   - 追加 trace event
 *   - 清 planLock（避免后续 run 误判）
 *
 * finalize 不应依赖当前 round 已 PASSED（允许「总结失败 + 收档」语义）
 */
export interface FinalizeParams {
  projectRoot: string
  workName: string
  /** 最终裁决（默认用最后 closed round 的 verdict） */
  verdict?: 'PASSED' | 'FAILED' | 'INCONCLUSIVE'
  notes?: string
}

export interface FinalizeResult {
  workspace: WorkspaceState
  finalVerdict: 'PASSED' | 'FAILED' | 'INCONCLUSIVE' | 'PENDING'
  totalRounds: number
  finalizedAt: string
}

export function finalizeWork(params: FinalizeParams): FinalizeResult {
  const state = loadWorkState(params.projectRoot, params.workName)
  if (!state) {
    throwExecError(
      'ALIGN',
      'OXN_WORK_NOT_STARTED',
      `work .run/state.json not found for "${params.workName}". Run \`oxn work run <name>\` first.`,
    )
  }

  const nowIso = new Date().toISOString()

  // 关闭当前 active round（若有）
  const lastRecord = state.roundHistory.at(-1)
  let finalVerdict: 'PASSED' | 'FAILED' | 'INCONCLUSIVE' | 'PENDING' = 'PENDING'

  if (lastRecord && !lastRecord.endedAt) {
    const verdict = params.verdict ?? 'FAILED' // 默认 FAILED（用户主动收口）
    state.roundHistory[state.roundHistory.length - 1] = {
      ...lastRecord,
      endedAt: nowIso,
      verdict,
      ...(params.notes ? { notes: params.notes } : {}),
    }
    finalVerdict = verdict
  } else if (lastRecord) {
    // 最后一条已 endedAt
    finalVerdict = lastRecord.verdict
  }

  // 标记 work 终态
  if (finalVerdict === 'PASSED') {
    state.status = 'passed'
  } else if (finalVerdict === 'FAILED') {
    state.status = 'failed'
  } else {
    // INCONCLUSIVE / PENDING → 用 'error'（未达 PASSED 状态但已收口）
    state.status = 'error'
  }
  state.updatedAt = nowIso
  saveWorkState(params.projectRoot, params.workName, state)

  // 写 trace
  appendWorkTrace(params.projectRoot, params.workName, {
    event: 'finalize',
    workName: params.workName,
    finalVerdict,
    totalRounds: state.roundHistory.length,
    at: nowIso,
  })

  return {
    workspace: state,
    finalVerdict,
    totalRounds: state.roundHistory.length,
    finalizedAt: nowIso,
  }
}
