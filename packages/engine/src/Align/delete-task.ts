/**
 * Align module — delete-task use case (v0.6 PR-5b实现)
 */
import { existsSync, rmdirSync, unlinkSync, readdirSync } from '@openxenon/engine/infra/filesystem'
import { join } from 'path'
import { getTasksDir } from '@openxenon/engine/Work/dual-state-io'
import { IAPError, IAPAction } from '@openxenon/engine/errors'

export function deleteTask(projectRoot: string, workName: string, taskName: string): { ok: boolean } {
  const tasksDir = getTasksDir(projectRoot, workName)
  const taskDir = join(tasksDir, taskName)
  if (!existsSync(taskDir)) {
    throw new IAPError('ALIGN', 'CHECKLIST_MISSING', IAPAction.YIELD_TO_HUMAN, `task dir not found: ${taskDir}`)
  }
  // Remove all files in task dir, then remove the dir
  const entries = readdirSync(taskDir)
  for (const f of entries) unlinkSync(join(taskDir, f))
  rmdirSync(taskDir)
  return { ok: true }
}
