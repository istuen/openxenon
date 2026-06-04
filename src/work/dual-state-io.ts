import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { BOUNDARY_DIR } from '../kernel/constants'
import { type TaskState, TaskStateSchema, type WorkspaceState, WorkspaceStateSchema } from './dual-state'

// =============================================================================
// v0.1 双层 state IO
//
// 路径：
//   workspace: .openxenon/works/<work>/state.json
//   task:      .openxenon/works/<work>/tasks/<task>/state.json
//
// 每个文件独立读写，trace 也分层。
// =============================================================================

// ---------- Workspace ----------

export function getWorkspaceDir(projectRoot: string, workName: string): string {
  return join(projectRoot, BOUNDARY_DIR, 'works', workName)
}

export function getWorkspaceStatePath(projectRoot: string, workName: string): string {
  return join(getWorkspaceDir(projectRoot, workName), 'state.json')
}

export function getWorkspaceTracePath(projectRoot: string, workName: string): string {
  return join(getWorkspaceDir(projectRoot, workName), 'work-trace.jsonl')
}

export function ensureWorkspaceDir(projectRoot: string, workName: string): string {
  const dir = getWorkspaceDir(projectRoot, workName)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

export function loadWorkspaceState(projectRoot: string, workName: string): WorkspaceState | null {
  const path = getWorkspaceStatePath(projectRoot, workName)
  if (!existsSync(path)) return null
  try {
    const content = readFileSync(path, 'utf-8')
    const parsed = JSON.parse(content)
    const result = WorkspaceStateSchema.safeParse(parsed)
    if (!result.success) {
      throw new Error(`Invalid workspace state.json: ${result.error.message}`)
    }
    return result.data
  } catch (err) {
    throw new Error(`Failed to load workspace state: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export function saveWorkspaceState(projectRoot: string, workName: string, state: WorkspaceState): void {
  const path = getWorkspaceStatePath(projectRoot, workName)
  ensureWorkspaceDir(projectRoot, workName)
  const dir = dirname(path)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  const tmpPath = `${path}.tmp`
  state.updatedAt = new Date().toISOString()
  writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf-8')
  renameSync(tmpPath, path)
}

export function workspaceStateExists(projectRoot: string, workName: string): boolean {
  return existsSync(getWorkspaceStatePath(projectRoot, workName))
}

// ---------- Task ----------

export function getTaskDir(projectRoot: string, workName: string, taskName: string): string {
  return join(getWorkspaceDir(projectRoot, workName), 'tasks', taskName)
}

export function getTaskStatePath(projectRoot: string, workName: string, taskName: string): string {
  return join(getTaskDir(projectRoot, workName, taskName), 'state.json')
}

export function getTaskTracePath(projectRoot: string, workName: string, taskName: string): string {
  return join(getTaskDir(projectRoot, workName, taskName), 'work-trace.jsonl')
}

export function getTaskOxnPath(projectRoot: string, workName: string, taskName: string): string {
  return join(getTaskDir(projectRoot, workName, taskName), 'task.oxn')
}

export function getTaskFrozenPath(projectRoot: string, workName: string, taskName: string): string {
  return join(getTaskDir(projectRoot, workName, taskName), 'frozen.json')
}

export function ensureTaskDir(projectRoot: string, workName: string, taskName: string): string {
  const dir = getTaskDir(projectRoot, workName, taskName)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

export function loadTaskState(projectRoot: string, workName: string, taskName: string): TaskState | null {
  const path = getTaskStatePath(projectRoot, workName, taskName)
  if (!existsSync(path)) return null
  try {
    const content = readFileSync(path, 'utf-8')
    const parsed = JSON.parse(content)
    const result = TaskStateSchema.safeParse(parsed)
    if (!result.success) {
      throw new Error(`Invalid task state.json: ${result.error.message}`)
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

export function taskStateExists(projectRoot: string, workName: string, taskName: string): boolean {
  return existsSync(getTaskStatePath(projectRoot, workName, taskName))
}

// ---------- Legacy 兼容（v0.1 之前老的 works/<name>/state.json 仍是 workspace 格式） ----------

/**
 * 兼容旧布局：.openxenon/works/<name>/state.json 中存的是单层 WorkState
 * 这个函数检测老格式（顶层有 partExecutions 字段）并返回 null（v0.1 强制升级）
 * 调用方应触发 oxn work migrate
 */
export function isLegacyWorkState(state: unknown): boolean {
  if (typeof state !== 'object' || state === null) return false
  const s = state as Record<string, unknown>
  return 'partSpecs' in s || 'partExecutions' in s
}
