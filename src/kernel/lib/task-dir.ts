import { join } from 'path'

export const TASK_DIR_NAME = 'tasks'
export const TASK_BLUEPRINT_FILE = 'blueprint.oxn'
export const TASK_TRACE_FILE = 'task-trace.jsonl'

export interface TaskDirectory {
  root: string
  taskId: string
  blueprintPath: string
  tracePath: string
}

export function getTaskDirectory(projectRoot: string, taskId: string): TaskDirectory {
  const root = join(projectRoot, '.openxenon', TASK_DIR_NAME, taskId)
  return {
    root,
    taskId,
    blueprintPath: join(root, TASK_BLUEPRINT_FILE),
    tracePath: join(root, TASK_TRACE_FILE),
  }
}

export function validateTaskId(taskId: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(taskId) && taskId.length > 0 && taskId.length <= 255
}
