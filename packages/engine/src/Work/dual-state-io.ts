import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from '@openxenon/engine/infra/filesystem'
import { dirname, join } from 'path'
import {
  BOUNDARY_DIR,
  WORK_FILE,
  RUN_DIR,
  RUN_TASKS_SUBDIR,
  TASK_OXN_FILE,
  TASK_RUN_FROZEN_JSON,
  TASK_RUN_STATE_JSON,
  TASK_RUN_TRACE_JSONL,
  WORK_OXN_FILE,
  WORK_RUN_FROZEN_JSON,
  WORK_RUN_STATE_JSON,
  WORK_RUN_TRACE_JSONL,
} from '@openxenon/engine/kernel'
import { IAPError, IAPAction } from '@openxenon/engine/kernel'
import { type TaskState, TaskStateSchema, type WorkspaceState, WorkspaceStateSchema } from './dual-state'

// =============================================================================
// v0.1 双层 state IO（V1 布局：.run/ 目录）
//
// 路径约定（V1）：
//
//   work 根目录 (works/<work>/)
//     work.oxn               [Intent]  图纸
//     .work                  [CLI]     静态门禁卡
//     .run/state.json        [Align]   进度条
//     .run/trace.jsonl       [Align]   日志流
//     .run/frozen.json       [Align]   交付快照（终态）
//
//   task 子运行时 (works/<work>/.run/tasks/<task>/)
//     state.json
//     trace.jsonl
//     frozen.json
//
//   task 图纸：works/<work>/tasks/<task>/task.oxn  （planning 阶段产物，仍在原位）
//
// V0 → V1 迁移由 PR-10 `oxn work migrate` 处理（用户决策 M3：硬切 + 脚本）
// =============================================================================

// ───────── Work 根目录 ─────────

export function getWorkDir(projectRoot: string, workName: string): string {
  return join(projectRoot, BOUNDARY_DIR, 'works', workName)
}

export function getWorkOxnPath(projectRoot: string, workName: string): string {
  return join(getWorkDir(projectRoot, workName), WORK_OXN_FILE)
}

export function getWorkRunDir(projectRoot: string, workName: string): string {
  return join(getWorkDir(projectRoot, workName), RUN_DIR)
}

export function getWorkStatePath(projectRoot: string, workName: string): string {
  return join(getWorkRunDir(projectRoot, workName), WORK_RUN_STATE_JSON)
}

export function getWorkTracePath(projectRoot: string, workName: string): string {
  return join(getWorkRunDir(projectRoot, workName), WORK_RUN_TRACE_JSONL)
}

export function getWorkFrozenPath(projectRoot: string, workName: string): string {
  return join(getWorkRunDir(projectRoot, workName), WORK_RUN_FROZEN_JSON)
}

export function ensureWorkDir(projectRoot: string, workName: string): string {
  const dir = getWorkDir(projectRoot, workName)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

export function ensureWorkRunDir(projectRoot: string, workName: string): string {
  const dir = getWorkRunDir(projectRoot, workName)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

export function workStateExists(projectRoot: string, workName: string): boolean {
  return existsSync(getWorkStatePath(projectRoot, workName))
}

export function loadWorkState(projectRoot: string, workName: string): WorkspaceState | null {
  const path = getWorkStatePath(projectRoot, workName)
  if (!existsSync(path)) return null
  try {
    const content = readFileSync(path, 'utf-8')
    const parsed = JSON.parse(content)
    const result = WorkspaceStateSchema.safeParse(parsed)
    if (!result.success) {
      throw new IAPError(
        'ALIGN',
        'INFRA_FAIL',
        IAPAction.YIELD_TO_HUMAN,
        `Invalid work state.json: ${result.error.message}`,
        { path },
      )
    }
    return result.data
  } catch (err) {
    if (err instanceof IAPError) throw err
    const cause = err instanceof Error ? err.message : String(err)
    throw new IAPError('ALIGN', 'INFRA_FAIL', IAPAction.YIELD_TO_HUMAN, `Failed to load work state: ${cause}`, {
      path,
      cause,
    })
  }
}

export function saveWorkState(projectRoot: string, workName: string, state: WorkspaceState): void {
  const path = getWorkStatePath(projectRoot, workName)
  ensureWorkRunDir(projectRoot, workName)
  const dir = dirname(path)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  const tmpPath = `${path}.tmp`
  state.updatedAt = new Date().toISOString()
  writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf-8')
  renameSync(tmpPath, path)
}

// ───────── Task 子运行时 ─────────

export function getTaskDir(projectRoot: string, workName: string, taskName: string): string {
  return join(getWorkDir(projectRoot, workName), RUN_DIR, RUN_TASKS_SUBDIR, taskName)
}

export function getTaskOxnPath(projectRoot: string, workName: string, taskName: string): string {
  return join(getWorkDir(projectRoot, workName), 'tasks', taskName, TASK_OXN_FILE)
}

export function getTaskStatePath(projectRoot: string, workName: string, taskName: string): string {
  return join(getTaskDir(projectRoot, workName, taskName), TASK_RUN_STATE_JSON)
}

export function getTaskTracePath(projectRoot: string, workName: string, taskName: string): string {
  return join(getTaskDir(projectRoot, workName, taskName), TASK_RUN_TRACE_JSONL)
}

export function getTaskFrozenPath(projectRoot: string, workName: string, taskName: string): string {
  return join(getTaskDir(projectRoot, workName, taskName), TASK_RUN_FROZEN_JSON)
}

export function ensureTaskDir(projectRoot: string, workName: string, taskName: string): string {
  const dir = getTaskDir(projectRoot, workName, taskName)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

export function taskStateExists(projectRoot: string, workName: string, taskName: string): boolean {
  return existsSync(getTaskStatePath(projectRoot, workName, taskName))
}

export function loadTaskState(projectRoot: string, workName: string, taskName: string): TaskState | null {
  const path = getTaskStatePath(projectRoot, workName, taskName)
  if (!existsSync(path)) return null
  try {
    const content = readFileSync(path, 'utf-8')
    const parsed = JSON.parse(content)
    const result = TaskStateSchema.safeParse(parsed)
    if (!result.success) {
      throw new IAPError(
        'ALIGN',
        'INFRA_FAIL',
        IAPAction.YIELD_TO_HUMAN,
        `Invalid task state.json: ${result.error.message}`,
        { path },
      )
    }
    return result.data
  } catch (err) {
    if (err instanceof IAPError) throw err
    const cause = err instanceof Error ? err.message : String(err)
    throw new IAPError('ALIGN', 'INFRA_FAIL', IAPAction.YIELD_TO_HUMAN, `Failed to load task state: ${cause}`, {
      path,
      cause,
    })
  }
}

export function saveTaskState(projectRoot: string, workName: string, taskName: string, state: TaskState): void {
  const path = getTaskStatePath(projectRoot, workName, taskName)
  ensureTaskDir(projectRoot, workName, taskName)
  const dir = dirname(path)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  const tmpPath = `${path}.tmp`
  state.updatedAt = new Date().toISOString()
  writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf-8')
  renameSync(tmpPath, path)
}

// v0.6 阶段1: 路径解耦 — 补充缺失的公共路径工具
export function getWorkGatePath(projectRoot: string, workName: string): string {
  return join(getWorkDir(projectRoot, workName), WORK_FILE)
}

export function getTasksDir(projectRoot: string, workName: string): string {
  return join(getWorkDir(projectRoot, workName), 'tasks')
}

export function getWorksDir(projectRoot: string): string {
  return join(projectRoot, BOUNDARY_DIR, 'works')
}

export function getWorkMdPath(projectRoot: string, workName: string): string {
  return join(getWorkDir(projectRoot, workName), 'work.md')
}

export function getTaskRunDir(projectRoot: string, workName: string, taskName: string): string {
  return join(getWorkRunDir(projectRoot, workName), RUN_TASKS_SUBDIR, taskName)
}
