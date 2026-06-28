/**
 * Intent module — get-work-context use case (v0.6 PR-5b续)
 *
 * 读取 work IAP 上下文，供 AI 消费（仅 skill_context，不含 Probe 验证标准）
 */
import type { GetContextInput, WorkContext } from './types'

export interface DerivedSkillContext {
  overallGoal: string
  constraints: string[]
  maxIterations: number
}

function snapshotContext(
  ctx: { goal?: string; constraints?: string[] } | undefined,
  maxIters: number,
  loopPolicy: { maxIterations?: number } | undefined,
): DerivedSkillContext {
  return {
    overallGoal: ctx?.goal ?? '',
    constraints: ctx?.constraints ?? [],
    maxIterations: loopPolicy?.maxIterations ?? maxIters,
  }
}

export function computeWorkContext(
  input: GetContextInput,
  workState: { skillContext?: DerivedSkillContext; currentRound?: number },
): WorkContext {
  const ctx = snapshotContext(
    { goal: workState.skillContext?.overallGoal, constraints: workState.skillContext?.constraints },
    workState.skillContext?.maxIterations ?? 3,
    undefined,
  )
  return {
    workName: input.workName,
    taskName: input.taskName,
    skillContext: `Goal: ${ctx.overallGoal}\nConstraints: ${ctx.constraints.join(', ')}\nMax iterations: ${ctx.maxIterations}`,
    currentRound: workState.currentRound ?? 1,
  }
}
