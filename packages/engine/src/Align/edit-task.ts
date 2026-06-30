/**
 * Align module — edit-task use case (v0.6 PR-5b实现)
 *
 * Edit task.oxn content via filesystem write.
 */
import { readFileSync, writeFileSync, existsSync } from '@openxenon/engine/infra/filesystem'
import { loadWorkState } from '@openxenon/engine/Work/dual-state-io'
import { getTaskOxnPath, loadTaskState } from '@openxenon/engine/Work/dual-state-io'
import { IAPError, IAPAction } from '@openxenon/engine/errors'

export function editTask(
  projectRoot: string, workName: string, taskName: string,
  objective?: string, constraints?: string[], maxIterations?: number,
): { ok: boolean } {
  const path = getTaskOxnPath(projectRoot, workName, taskName)
  if (!existsSync(path)) {
    throw new IAPError('ALIGN', 'CHECKLIST_MISSING', IAPAction.YIELD_TO_HUMAN, `task.oxn not found: ${path}`)
  }
  const content = readFileSync(path, 'utf-8')
  let updated = content
  if (objective) updated = updated.replace(/skill_context\s*=\s*"[^"]*"/, `skill_context = "${objective}"`)
  if (maxIterations) updated = updated.replace(/max_iterations\s*=\s*\d+/, `max_iterations = ${maxIterations}`)
  writeFileSync(path, updated, 'utf-8')
  return { ok: true }
}
