/**
 * Intent module — lock-work use case (v0.6 阶段3)
 *
 * Wraps plan-hash.ts hashWorkPlan for planLock 四组件 hash 计算。
 */
import { hashWorkPlan } from '../../../src/work/plan-hash'
import type { LockWorkInput, LockWorkResult } from './types'

export function lockWork(input: LockWorkInput): LockWorkResult {
  const plan = hashWorkPlan(input.projectRoot, input.workName)
  return {
    ok: plan.ok,
    planLock: {
      workOxnHash: plan.planLock?.workOxnHash ?? '',
      workDomainsHash: plan.planLock?.workDomainsHash ?? '',
      blueprintsHash: plan.planLock?.blueprintsHash ?? '',
      tasksHash: plan.planLock?.tasksHash ?? '',
      allHash: plan.planLock?.allHash ?? '',
    },
  }
}
