/**
 * Align module — DDD unified entry (v0.6 PR-5b续)
 *
 * E2 Work · Align 阶段。
 * import { computeWorkStatus } from '@openxenon/engine/Align'
 */

// Use cases
export { computeWorkStatus } from './status'
export { computeListTasks } from './list-tasks'
export type { TaskSummary } from './list-tasks'
export { computeTaskMeta } from './task-status'
export type { TaskMeta } from './task-status'

// Types
export type {
  RunWorkInput, RunWorkResult,
  SubmitPartInput, SubmitPartResult,
  WorkStatusResult,
  FinalizeInput, FinalizeResult,
} from './types'
