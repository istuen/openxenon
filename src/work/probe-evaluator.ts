import type { ProbeObservation, ProbeResult, ProbeStrategy, ProbeVerdict, ProbeDefinition } from '../kernel/index'
import { PROBE_VERDICT_STRATEGIES } from '../kernel/index'

export type { ProbeObservation, ProbeResult, ProbeVerdict, ProbeDefinition }
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

  evaluate(observation: ProbeObservation, params: Record<string, unknown>): ProbeVerdict {
    const hasResult = 'result' in observation && observation.result !== undefined
    if (hasResult) {
      const obs = observation as ProbeResult
      const passed = obs.result === 'PASSED'
      return {
        passed,
        message: passed ? 'OK' : obs.error || 'Failed',
      }
    }

    const strategy = this.strategies[observation.probeType]
    if (!strategy) {
      return {
        passed: false,
        message: `Unknown probe type: ${observation.probeType}`,
      }
    }
    return strategy(observation, params)
  }

  reduceResults(observations: ProbeObservation[], policy: 'AND' | 'OR'): ProbeVerdict {
    if (observations.length === 0) {
      return { passed: false, message: 'No probes executed' }
    }

    const verdicts = observations.map((obs) => {
      const strategy = this.strategies[obs.probeType]
      if (!strategy) {
        return { passed: false, message: `Unknown probe type: ${obs.probeType}` }
      }
      return strategy(obs, {})
    })

    if (policy === 'AND') {
      const allPassed = verdicts.every((v) => v.passed)
      if (allPassed) {
        return { passed: true, message: 'All probes passed' }
      }
      const failed = verdicts.filter((v) => !v.passed)
      return {
        passed: false,
        message: `${failed.length}/${verdicts.length} probes failed`,
      }
    }

    if (policy === 'OR') {
      const somePassed = verdicts.some((v) => v.passed)
      if (somePassed) {
        const passed = verdicts.filter((v) => v.passed)
        return {
          passed: true,
          message: `${passed.length}/${verdicts.length} probes passed`,
        }
      }
      return {
        passed: false,
        message: 'All probes failed',
      }
    }

    return { passed: false, message: `Unknown policy: ${policy}` }
  }

  reduceStageVerdict(observations: ProbeObservation[], policy: 'AND' | 'OR'): 'PASSED' | 'FAILED' {
    const verdict = this.reduceResults(observations, policy)
    return verdict.passed ? 'PASSED' : 'FAILED'
  }
}

export const defaultEvaluator = new ProbeEvaluator()

export function evaluateProbe(
  definition: ProbeDefinition,
  observation: ProbeObservation,
  evaluator: ProbeEvaluator = defaultEvaluator,
): ProbeVerdict {
  return evaluator.evaluate(observation, definition.params)
}

export function reduceProbeResults(
  observations: ProbeObservation[],
  policy: 'AND' | 'OR',
  evaluator: ProbeEvaluator = defaultEvaluator,
): ProbeVerdict {
  return evaluator.reduceResults(observations, policy)
}

export function reduceStageVerdict(
  observations: ProbeObservation[],
  policy: 'AND' | 'OR',
  evaluator: ProbeEvaluator = defaultEvaluator,
): 'PASSED' | 'FAILED' {
  return evaluator.reduceStageVerdict(observations, policy)
}
