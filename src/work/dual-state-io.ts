import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import {
  BOUNDARY_DIR,
  TASK_FROZEN_JSON,
  TASK_OXN_FILE,
  TASK_STATE_JSON,
  TASK_TRACE_JSONL,
  WORK_FROZEN_JSON,
  WORK_OXN_FILE,
  WORK_STATE_JSON,
  WORK_TRACE_JSONL,
} from '../kernel/constants'
import { type TaskState, TaskStateSchema, type WorkspaceState, WorkspaceStateSchema } from './dual-state'

// =============================================================================
// v0.1 双层 state IO（合并了原 state-io.ts 的 legacy 符号）
//
// 路径约定（命名范式: {entity}-{aspect}.{ext}）:
//
//   work 根目录 (works/<work>/)
//     work.oxn               [Intent]  图纸
//     work-state.json        [Align]   进度条
//     work-trace.jsonl       [Align]   日志流
//     work-frozen.json       [Align]   交付快照（终态）
//
//   task 子目录 (works/<work>/tasks/<task>/)
//     task.oxn               [Intent]  图纸
//     task-state.json        [Align]   进度条
//     task-trace.jsonl       [Align]   日志流
//     task-frozen.json       [Align]   交付快照（终态）
//
// 所有路径函数同时返回"路径字符串"和"文件存在性"，命名风格统一：
//   get*Path()       — 返回绝对路径
//   load* / save*    — 读写并校验
//   ensure*Dir()     — 建父目录
// =============================================================================

// ---------- Work 根目录 ----------

export function getWorkDir(projectRoot: string, workName: string): string {
  return join(projectRoot, BOUNDARY_DIR, 'works', workName)
}

export function getWorkOxnPath(projectRoot: string, workName: string): string {
  return join(getWorkDir(projectRoot, workName), WORK_OXN_FILE)
}

export function getWorkStatePath(projectRoot: string, workName: string): string {
  return join(getWorkDir(projectRoot, workName), WORK_STATE_JSON)
}

export function getWorkTracePath(projectRoot: string, workName: string): string {
  return join(getWorkDir(projectRoot, workName), WORK_TRACE_JSONL)
}

export function getWorkFrozenPath(projectRoot: string, workName: string): string {
  return join(getWorkDir(projectRoot, workName), WORK_FROZEN_JSON)
}

export function ensureWorkDir(projectRoot: string, workName: string): string {
  const dir = getWorkDir(projectRoot, workName)
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
      throw new Error(`Invalid work-state.json: ${result.error.message}`)
    }
    return result.data
  } catch (err) {
    throw new Error(`Failed to load work state: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export function saveWorkState(projectRoot: string, workName: string, state: WorkspaceState): void {
  const path = getWorkStatePath(projectRoot, workName)
  ensureWorkDir(projectRoot, workName)
  const dir = dirname(path)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  const tmpPath = `${path}.tmp`
  state.updatedAt = new Date().toISOString()
  writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf-8')
  renameSync(tmpPath, path)
}

// ---------- Task 子目录 ----------

export function getTaskDir(projectRoot: string, workName: string, taskName: string): string {
  return join(getWorkDir(projectRoot, workName), 'tasks', taskName)
}

export function getTaskOxnPath(projectRoot: string, workName: string, taskName: string): string {
  return join(getTaskDir(projectRoot, workName, taskName), TASK_OXN_FILE)
}

export function getTaskStatePath(projectRoot: string, workName: string, taskName: string): string {
  return join(getTaskDir(projectRoot, workName, taskName), TASK_STATE_JSON)
}

export function getTaskTracePath(projectRoot: string, workName: string, taskName: string): string {
  return join(getTaskDir(projectRoot, workName, taskName), TASK_TRACE_JSONL)
}

export function getTaskFrozenPath(projectRoot: string, workName: string, taskName: string): string {
  return join(getTaskDir(projectRoot, workName, taskName), TASK_FROZEN_JSON)
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
      throw new Error(`Invalid task-state.json: ${result.error.message}`)
    }
    return result.data
  } catch (err) {
    throw new Error(`Failed to load task state: ${err instanceof Error ? err.message : String(err)}`)
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
