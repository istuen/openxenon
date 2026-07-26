import type {
  ProbeObservation,
  ProbeResult,
  ProbeStrategy,
  ProbeOutcome,
  ProbeDefinition,
} from '@openxenon/engine/kernel'
import { PROBE_VERDICT_STRATEGIES } from '@openxenon/engine/kernel'

export type { ProbeObservation, ProbeResult, ProbeOutcome, ProbeDefinition }
export type { ProbeStrategy }

// v1.1 verdict-unify: 不再本地定义, 改从 L0-Kernel 注册表重导出。
// 老调用方 (ProbeEvaluator, evaluateProbe 等) 接口签名零变化。
const defaultStrategies: Record<string, ProbeStrategy> = PROBE_VERDICT_STRATEGIES

export class ProbeEvaluator {
  static defaultStrategies: Record<string, ProbeStrategy> = defaultStrategies

  strategies: Record<string, ProbeStrategy>

  constructor(strategies?: Record<string, ProbeStrategy>) {
    this.strategies = { ...defaultStrategies, ...strategies }
  }

  evaluate(observation: ProbeObservation, params: Record<string, unknown>): ProbeOutcome {
    const hasResult = 'result' in observation && observation.result !== undefined
    if (hasResult) {
      const obs = observation as ProbeResult
      const passed = obs.result === 'COMPLETED'
      return {
        passed,
        outcome: passed ? 'COMPLETED' : 'DEVIATED',
        message: passed ? 'OK' : obs.error || 'Failed',
      }
    }

    const strategy = this.strategies[observation.probeType]
    if (!strategy) {
      return {
        passed: false,
        outcome: 'DEVIATED',
        message: `Unknown probe type: ${observation.probeType}`,
      }
    }
    return strategy(observation, params)
  }

  reduceResults(observations: ProbeObservation[], policy: 'AND' | 'OR'): ProbeOutcome {
    if (observations.length === 0) {
      return { passed: false, outcome: 'DEVIATED', message: 'No probes executed' }
    }

    const outcomes = observations.map((obs) => {
      const strategy = this.strategies[obs.probeType]
      if (!strategy) {
        return { passed: false, outcome: 'DEVIATED', message: `Unknown probe type: ${obs.probeType}` }
      }
      return strategy(obs, {})
    })

    if (policy === 'AND') {
      const allPassed = outcomes.every((v) => v.passed)
      if (allPassed) {
        return { passed: true, outcome: 'COMPLETED', message: 'All probes passed' }
      }
      const failed = outcomes.filter((v) => !v.passed)
      return {
        passed: false,
        outcome: 'DEVIATED',
        message: `${failed.length}/${outcomes.length} probes failed`,
      }
    }

    if (policy === 'OR') {
      const somePassed = outcomes.some((v) => v.passed)
      if (somePassed) {
        const passed = outcomes.filter((v) => v.passed)
        return {
          passed: true,
          outcome: 'COMPLETED',
          message: `${passed.length}/${outcomes.length} probes passed`,
        }
      }
      return {
        passed: false,
        outcome: 'DEVIATED',
        message: 'All probes failed',
      }
    }

    return { passed: false, outcome: 'DEVIATED', message: `Unknown policy: ${policy}` }
  }

  reduceStageVerdict(observations: ProbeObservation[], policy: 'AND' | 'OR'): 'COMPLETED' | 'DEVIATED' {
    const outcome = this.reduceResults(observations, policy)
    return outcome.passed ? 'COMPLETED' : 'DEVIATED'
  }
}

export const defaultEvaluator = new ProbeEvaluator()

export function evaluateProbe(
  definition: ProbeDefinition,
  observation: ProbeObservation,
  evaluator: ProbeEvaluator = defaultEvaluator,
): ProbeOutcome {
  return evaluator.evaluate(observation, definition.params)
}

export function reduceProbeResults(
  observations: ProbeObservation[],
  policy: 'AND' | 'OR',
  evaluator: ProbeEvaluator = defaultEvaluator,
): ProbeOutcome {
  return evaluator.reduceResults(observations, policy)
}

export function reduceStageVerdict(
  observations: ProbeObservation[],
  policy: 'AND' | 'OR',
  evaluator: ProbeEvaluator = defaultEvaluator,
): 'COMPLETED' | 'DEVIATED' {
  return evaluator.reduceStageVerdict(observations, policy)
}
