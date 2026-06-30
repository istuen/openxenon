/**
 * Align module — list-tasks compute (v0.6 阶段2: 渲染分离)
 *
 * Pure compute function. Returns task summaries without rendering.
 */
import { readdirSync, existsSync, readFileSync } from '@openxenon/engine/infra/filesystem'
import { join } from 'path'
import { TASK_OXN_FILE } from '@openxenon/engine/kernel'
import { getTasksDir } from '@openxenon/engine/Work/dual-state-io'

export interface TaskSummary {
  name: string
  file: string
  blueprint?: string
  domain?: string
}

export function computeListTasks(projectRoot: string, workName: string): TaskSummary[] {
  const tasksDir = getTasksDir(projectRoot, workName)
  if (!existsSync(tasksDir)) return []

  const dirs = readdirSync(tasksDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)

  return dirs
    .map((name) => {
      const file = join(tasksDir, name, TASK_OXN_FILE)
      if (!existsSync(file)) return null
      const content = readFileSync(file, 'utf-8')
      const blueprintMatch = content.match(/blueprint\s+"([^"]+)"/)
      const domainMatch = content.match(/domain\s+"([^"]+)"/)
      return { name, file, blueprint: blueprintMatch?.[1], domain: domainMatch?.[1] } as TaskSummary
    })
    .filter((t): t is TaskSummary => t !== null)
}
