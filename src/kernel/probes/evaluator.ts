export type ProbeVerdict = {
  passed: boolean
  message: string
  actual?: unknown
  params?: Record<string, unknown>
  duration?: number
  failureMessage?: string
}

export interface ProbeDefinition {
  type: string
  params: Record<string, unknown>
  expected?: unknown
}

export interface ProbeObservation {
  probeType: string
  output?: string
  error?: string
  executedAt: number
  exitCode?: number | null
}

export interface ProbeResult extends ProbeObservation {
  result: 'PASSED' | 'FAILED'
}

export type ProbeStrategy = (observation: ProbeObservation, params: Record<string, unknown>) => ProbeVerdict

const defaultStrategies: Record<string, ProbeStrategy> = {
  fs_exists: (obs, params) => {
    const start = Date.now()
    const files = (obs.output || '').split('\n').filter(Boolean)
    const passed = files.length > 0
    return {
      passed,
      message: passed ? `Found ${files.length} matching path(s)` : 'No matching paths found',
      actual: files,
      params,
      duration: Date.now() - start,
      failureMessage: passed ? undefined : `No files match pattern "${params.pattern}"`,
    }
  },

  fs_not_exists: (obs, params) => {
    const start = Date.now()
    const files = (obs.output || '').split('\n').filter(Boolean)
    const passed = files.length === 0
    return {
      passed,
      message: passed ? 'Path does not exist (as expected)' : `Path exists: ${files.join(', ')}`,
      actual: files,
      params,
      duration: Date.now() - start,
      failureMessage: passed ? undefined : `Files exist when they should not: ${files.join(', ')}`,
    }
  },

  fs_match: (obs, params) => {
    const start = Date.now()
    const matched = obs.error === undefined
    return {
      passed: matched,
      message: matched ? 'Pattern matched' : obs.error || 'Pattern did not match',
      actual: !!matched,
      params,
      duration: Date.now() - start,
      failureMessage: matched ? undefined : obs.error,
    }
  },

  shell_exec: (obs, params) => {
    const start = Date.now()
    const exitCode = obs.exitCode ?? -1
    const passed = exitCode === 0
    return {
      passed,
      message: passed ? 'Command succeeded' : obs.error || `Exit code: ${exitCode}`,
      actual: { exitCode },
      params,
      duration: Date.now() - start,
      failureMessage: passed ? undefined : `Command failed with exit code ${exitCode}`,
    }
  },

  exec_exit_zero: (obs, params) => {
    const start = Date.now()
    const exitCode = obs.exitCode ?? -1
    const passed = exitCode === 0
    return {
      passed,
      message: passed ? 'Exit code 0' : `Exit code: ${exitCode}`,
      actual: { exitCode },
      params,
      duration: Date.now() - start,
      failureMessage: passed ? undefined : `Exit code was ${exitCode}, expected 0`,
    }
  },

  exec_output_match: (obs, params) => {
    const start = Date.now()
    const output = obs.output || ''
    const minLength = (params.minLength as number) ?? 1
    const pattern = params.pattern as string | undefined
    let passed = output.trim().length >= minLength
    if (pattern && typeof pattern === 'string') {
      passed = passed && output.includes(pattern)
    }
    return {
      passed,
      message: passed ? 'Output matched' : `Output too short or no match: "${output.substring(0, 50)}"`,
      actual: { outputLength: output.trim().length, hasPattern: pattern ? output.includes(pattern) : undefined },
      params,
      duration: Date.now() - start,
      failureMessage: passed ? undefined : `Output does not match expected pattern`,
    }
  },
}

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

let globalEvaluator = new ProbeEvaluator()

export function setGlobalProbeEvaluator(evaluator: ProbeEvaluator): void {
  globalEvaluator = evaluator
}

export function getGlobalProbeEvaluator(): ProbeEvaluator {
  return globalEvaluator
}

export function registerProbeStrategy(type: string, strategy: ProbeStrategy): void {
  globalEvaluator.strategies[type] = strategy
}

export function evaluateProbe(definition: ProbeDefinition, observation: ProbeObservation): ProbeVerdict {
  return globalEvaluator.evaluate(observation, definition.params)
}

export function reduceProbeResults(observations: ProbeObservation[], policy: 'AND' | 'OR'): ProbeVerdict {
  return globalEvaluator.reduceResults(observations, policy)
}

export function reduceStageVerdict(observations: ProbeObservation[], policy: 'AND' | 'OR'): 'PASSED' | 'FAILED' {
  return globalEvaluator.reduceStageVerdict(observations, policy)
}
