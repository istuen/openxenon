/**
 * Intent module — DDD unified entry (v0.6 PR-5b续)
 *
 * E2 Work · Intent 阶段。
 * import { createWork, computeWorkContext } from '@openxenon/engine/Intent'
 */

// Use cases
export { createWork } from './create-work'
export { computeWorkContext } from './get-context'
export { validateWork } from './validate'
export { lockWork } from './lock'
export { analyzeBoundaries } from './analyze-boundaries'
export type { BoundaryRef } from './analyze-boundaries'
export { attachAsset, detachAsset } from './attach'

// Types
export type {
  WorkType,
  CreateWorkInput, CreateWorkResult,
  ValidateWorkInput, ValidateWorkResult,
  LockWorkInput, LockWorkResult,
  GetContextInput, WorkContext,
} from './types'
