/**
 * Align module — task-status compute (v0.6 阶段2: 渲染分离)
 *
 * Pure compute function. Returns task metadata without rendering.
 */
import { existsSync, readFileSync } from '@openxenon/engine/infra/filesystem'
import { join } from 'path'

export interface TaskMeta {
  taskName: string
  blueprint?: string
  domain?: string
  file: string
  exists: boolean
}

export function computeTaskMeta(projectRoot: string, workName: string, taskName: string): TaskMeta {
  const file = join(projectRoot, '.openxenon', 'works', workName, 'tasks', taskName, 'task.oxn')
  if (!existsSync(file)) {
    return { taskName, file, exists: false }
  }
  const content = readFileSync(file, 'utf-8')
  const blueprint = content.match(/blueprint\s+"([^"]+)"/)?.[1]
  const domain = content.match(/domain\s+"([^"]+)"/)?.[1]
  const parsed = content.match(/task\s+"([^"]+)"/)?.[1]
  return { taskName: parsed ?? taskName, blueprint, domain, file, exists: true }
}
