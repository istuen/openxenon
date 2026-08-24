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
import { IAPError, IAPAction, type IAPAxis, type StackToolInfo } from '@openxenon/engine/kernel'
import { readTaskFile } from '@openxenon/engine/oxl/summary-extractors'
import { executeProbe, type ProofProbeIR } from '@openxenon/engine/infra/probes/execute-probe'
import { buildWorkContext } from './work-context-builder'

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
  | 'IAP_ALIGN_ROUND_MAX_EXCEEDED' // 🆕 v0.6.1-alpha.5 Phase A.2: 超过 maxIterations 硬限制

/** @deprecated v1.1 起走 IAPError 双轨制; 类名保留仅供类型推断/旧 import 路径, 不再 throw */
export type ExecError = IAPError & { readonly oxnCode: ExecErrorCode }

export function throwExecError(axis: IAPAxis, oxnCode: ExecErrorCode, message: string): never {
  const err = new IAPError(axis, 'INFRA_FAIL_STATE_LOAD', IAPAction.AUTONOMOUS_RETRY, message, { oxnCode })
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
        finalOutcome: 'COMPLETED',
        totalRounds: workState.roundHistory.length,
        roundHistory: workState.roundHistory,
        taskFrozenPaths: workState.tasks
          .map((t) => getTaskFrozenPath(params.projectRoot, params.workName, t.taskName))
          .filter((p) => existsSync(p)),
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

/**
 * v0.6.1-alpha.5 Phase A.3: submitTask 接入真实 Probe 执行（闭合 ADR-0058 D2 验证层）
 *
 * 与 submitTask（sync，合成 state-machine 假结果）不同：本函数在推进 part 状态机之后，
 * 从 task.md 读取真实 probe 声明（顶层 ## Probes 或 part 内联 - probe: @oxn/probes/...），
 * 调 Proof/runner.executeProbe 执行，用真实 FrozenProofProbeResult 覆盖 probeResults，
 * 并在 task 终态时重写 .run/tasks/<t>/frozen.json 写入真实 verdict。
 *
 * 信任后果：Engine 的公证权就位——"OXN Engine 出证明"不再是谎言。
 */
export async function submitTaskWithProbes(params: SubmitTaskParams): Promise<SubmitTaskResult> {
  // 1. 推进 part 状态机（sync，保留合成占位，稍后覆盖）
  const base = submitTask({ ...params, runProbes: false })

  // 2. 收集 task.md 中的真实 probe 声明
  const taskFile = getTaskOxnPath(params.projectRoot, params.workName, params.taskName)
  const decls = collectTaskProbeDecls(existsSync(taskFile) ? readTaskFile(taskFile) : null)
  if (decls.length === 0) {
    return base // 无真实 probe → 退回合成行为
  }

  // 🆕 v0.7.3 P6 (ADR-0061 §D5): 从 work-context 加载 stackTools 透传给 ProbeRunner
  //   - lock 前/老 Work / 无 Blueprint → 退回 undefined（向后兼容）
  //   - work-context-builder 内部已处理 lock hash drift
  let stackTools: StackToolInfo[] | undefined
  try {
    const ctx = buildWorkContext({
      projectRoot: params.projectRoot,
      workName: params.workName,
      taskName: params.taskName,
      assetFormat: 'md', // v0.7.3 默认 .md（向后兼容）
      lockCheck: false, // submit 流程不阻塞 lock 检查（前面已 verifyPlanLock 过）
    })
    stackTools = ctx.stackTools
  } catch {
    stackTools = undefined // 兼容 lock hash drift / 老 Work 缺 blueprints.json
  }

  // 3. 并发执行所有真实 probe
  const realResults = await Promise.all(
    decls.map(async (d) => {
      const ir: ProofProbeIR = {
        probeName: d.name,
        ref: d.ref ?? `@oxn/probes/${d.name}`,
        params: d.params ?? {},
      }
      const r = await executeProbe(ir, {
        projectRoot: params.projectRoot,
        ...(stackTools ? { stackTools } : {}),
      })
      return {
        probe: d.name,
        passed: r.passed,
        output: r.output,
        errorMessage: r.errorMessage,
        durationMs: r.durationMs,
      }
    }),
  )

  // 4. task 终态 → 重写 frozen.json 写入真实 verdict
  if (base.frozen) {
    writeTaskFrozen(params.projectRoot, params.workName, params.taskName, {
      taskName: params.taskName,
      workName: params.workName,
      blueprint: base.taskState.blueprint,
      completedAt: new Date().toISOString(),
      trace: base.taskState.completedParts,
      probeResults: realResults.map((p) => ({
        probe: p.probe,
        passed: p.passed,
        output: p.output,
      })),
    })
  }

  return { ...base, probeResults: realResults }
}

/** 从 TaskFileSummary 收集真实 probe 声明（顶层 ## Probes + part 内联带 ref 的 probe） */
function collectTaskProbeDecls(
  task: import('@openxenon/engine/oxl/summary-extractors').TaskFileSummary | null,
): import('@openxenon/engine/oxl/summary-extractors').TaskProbeDecl[] {
  if (!task) return []
  const decls: import('@openxenon/engine/oxl/summary-extractors').TaskProbeDecl[] = []
  if (task.probes) decls.push(...task.probes)
  for (const p of task.parts) {
    for (const pr of p.probes) {
      if (pr.ref) decls.push({ name: pr.name, ref: pr.ref, ...(pr.params ? { params: pr.params } : {}) })
    }
  }
  return decls
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
  /** A1 (D3): 最终裁决（PASSED/FAILED/INCONCLUSIVE/PENDING） */
  finalOutcome: 'COMPLETED' | 'DEVIATED' | 'INCONCLUSIVE' | 'PENDING'
  /** A1 (D3): round 总数 */
  totalRounds: number
  /** A1 (D3): 所有 round 摘要（含每轮 verdict/failures） */
  roundHistory: RoundRecord[]
  /** A1 (D3): 每个 task frozen.json 路径索引 */
  taskFrozenPaths: string[]
  /** A2 (D4): 边界违反记录（finalizeWorkDomains 注入；无则省略） */
  boundaryViolations?: Array<{
    domain: string
    invariant: string
    outcome: string
    failureMessage?: string
  }>
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
// 校验：work.md 声明的 task 是否都已建 task.md
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
// no-op probe (v0.1 保持状态机可观察，v0.2 接 task.md observe)
// =============================================================================

export function runNoopProbe(partName: string, partAlign: string): { probe: string; passed: boolean; output: unknown } {
  return {
    probe: 'part-reachable',
    passed: true,
    output: { partName, align: partAlign, mode: 'v0.1-noop' },
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
  /** 最终裁决（默认用最后 closed round 的 outcome） */
  outcome?: 'COMPLETED' | 'DEVIATED' | 'INCONCLUSIVE'
  notes?: string
  /** A2 (D4): 由调用方预计算的 Domain 边界违反记录（finalizeWorkDomains 结果注入） */
  boundaryViolations?: Array<{
    domain: string
    invariant: string
    outcome: string
    failureMessage?: string
  }>
}

export interface FinalizeResult {
  workspace: WorkspaceState
  finalOutcome: 'COMPLETED' | 'DEVIATED' | 'INCONCLUSIVE' | 'PENDING'
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
  let finalOutcome: 'COMPLETED' | 'DEVIATED' | 'INCONCLUSIVE' | 'PENDING' = 'PENDING'

  if (lastRecord && !lastRecord.endedAt) {
    const outcome = params.outcome ?? 'DEVIATED' // 默认 DEVIATED（用户主动收口）
    state.roundHistory[state.roundHistory.length - 1] = {
      ...lastRecord,
      endedAt: nowIso,
      outcome,
      ...(params.notes ? { notes: params.notes } : {}),
    }
    finalOutcome = outcome
  } else if (lastRecord) {
    // 最后一条已 endedAt
    finalOutcome = lastRecord.outcome
  }

  // 标记 work 终态
  if (finalOutcome === 'COMPLETED') {
    state.status = 'passed'
  } else if (finalOutcome === 'DEVIATED') {
    state.status = 'failed'
  } else {
    // INCONCLUSIVE / PENDING → 用 'error'（未达 PASSED 状态但已收口）
    state.status = 'error'
  }
  state.updatedAt = nowIso
  saveWorkState(params.projectRoot, params.workName, state)

  // A1 (D3): 写 work-level .run/frozen.json（含所有 round 摘要 + task frozen 索引）
  // 失败路径（verdict=FAILED/INCONCLUSIVE）也写，使 Insight pipeline 可读失败工作
  const taskFrozenPaths: string[] = []
  for (const t of state.tasks) {
    const p = getTaskFrozenPath(params.projectRoot, params.workName, t.taskName)
    if (existsSync(p)) taskFrozenPaths.push(p)
  }
  writeWorkFrozen(params.projectRoot, params.workName, {
    workName: params.workName,
    completedAt: nowIso,
    tasks: state.tasks.map((t) => ({
      taskName: t.taskName,
      status: t.status,
      completedAt: t.completedAt ?? null,
    })),
    finalOutcome,
    totalRounds: state.roundHistory.length,
    roundHistory: state.roundHistory,
    taskFrozenPaths,
    ...(params.boundaryViolations && params.boundaryViolations.length > 0
      ? { boundaryViolations: params.boundaryViolations }
      : {}),
  })

  // 写 trace
  appendWorkTrace(params.projectRoot, params.workName, {
    event: 'finalize',
    workName: params.workName,
    finalOutcome,
    totalRounds: state.roundHistory.length,
    at: nowIso,
  })

  return {
    workspace: state,
    finalOutcome,
    totalRounds: state.roundHistory.length,
    finalizedAt: nowIso,
  }
}

/**
 * 🆕 v0.6.1-alpha.5 Phase A.1: 重置当前 Round 的 task 状态。
 *
 * 用于 Round 2+ re-run 场景（work run 在 state.status=running 时可重新调用）：
 * - 保留已 passed 的 task（passed 不可重跑）
 * - failed → pending（重跑机会）
 * - running → pending（避免状态卡死）
 *
 * @param state - 当前的 WorkspaceState（会被原地修改）
 */
export function resetCurrentRoundTasks(state: WorkspaceState): void {
  for (const task of state.tasks) {
    if (task.status === 'failed' || task.status === 'running') {
      task.status = 'pending'
    }
    // passed 任务保留 passed（不重跑）
  }
  state.updatedAt = new Date().toISOString()
}
