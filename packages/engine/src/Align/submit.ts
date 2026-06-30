/**
 * Align module — submit-task use case (v0.6 阶段3)
 */
import { submitTask as execSubmit } from '@openxenon/engine/Work/dual-state-exec'
import type { SubmitPartInput, SubmitPartResult } from './types'

export function submitPart(input: SubmitPartInput): SubmitPartResult {
  const result = execSubmit({
    projectRoot: input.projectRoot,
    workName: input.workName,
    taskName: input.taskName,
    partName: input.partName,
  })
  return {
    taskState: result.taskState,
    nextPart: result.nextPart,
    frozen: result.frozen,
  }
}
