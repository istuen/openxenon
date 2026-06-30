// =============================================================================
// step.ts (v0.2 T14 — Daemon PR-2: Proof-driven incremental step)
// =============================================================================

export interface Step {
  name: string
  execute: () => Promise<StepResult>
  rollback: () => Promise<void>
}

export interface StepResult {
  ok: boolean
  reason?: string
  snapshot?: Record<string, unknown>
}

export interface StepPipeline {
  steps: Step[]
  runAll(): Promise<StepResult[]>
}

/** 创建增量式 Step Pipeline (Proof 驱动) */
export function createStepPipeline(steps: Step[]): StepPipeline {
  return {
    steps,
    async runAll(): Promise<StepResult[]> {
      const results: StepResult[] = []
      for (const step of steps) {
        const result = await step.execute()
        results.push(result)
        if (!result.ok) {
          // rollback all previous steps
          for (let i = results.length - 2; i >= 0; i--) {
            await steps[i]!.rollback()
          }
          break
        }
      }
      return results
    },
  }
}
