export type ProbeVerdict = {
  passed: boolean
  message: string
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
}

export interface ProbeResult extends ProbeObservation {
  result: 'PASSED' | 'FAILED'
}

export type ProbeStrategy = (
  observation: ProbeObservation,
  params: Record<string, unknown>
) => ProbeVerdict

const probeStrategies: Record<string, ProbeStrategy> = {
  fs_exists: (obs, params) => {
    const files = (obs.output || '').split('\n').filter(Boolean)
    const passed = files.length > 0
    return {
      passed,
      message: passed ? `Found ${files.length} matching path(s)` : 'No matching paths found'
    }
  },

  fs_not_exists: (obs, params) => {
    const files = (obs.output || '').split('\n').filter(Boolean)
    const passed = files.length === 0
    return {
      passed,
      message: passed ? 'Path does not exist (as expected)' : `Path exists: ${files.join(', ')}`
    }
  },

  fs_match: (obs, params) => {
    const matched = obs.error === undefined
    return {
      passed: matched,
      message: matched ? 'Pattern matched' : (obs.error || 'Pattern did not match')
    }
  },

  shell_exec: (obs, params) => {
    const exitCode = (params.exitCode as number | null) ?? -1
    const passed = exitCode === 0
    return {
      passed,
      message: passed ? 'Command succeeded' : (obs.error || `Exit code: ${exitCode}`)
    }
  },

  exec_exit_zero: (obs, params) => {
    const exitCode = (params.exitCode as number | null) ?? -1
    const passed = exitCode === 0
    return {
      passed,
      message: passed ? 'Exit code 0' : `Exit code: ${exitCode}`
    }
  },

  exec_output_match: (obs, params) => {
    const output = obs.output || ''
    const minLength = (params.minLength as number) ?? 1
    const pattern = params.pattern as string | undefined
    let passed = output.trim().length >= minLength
    if (pattern && typeof pattern === 'string') {
      passed = passed && output.includes(pattern)
    }
    return {
      passed,
      message: passed ? 'Output matched' : `Output too short or no match: "${output.substring(0, 50)}"`
    }
  }
}

export function registerProbeStrategy(type: string, strategy: ProbeStrategy): void {
  probeStrategies[type] = strategy
}

export function evaluateProbe(
  definition: ProbeDefinition,
  observation: ProbeObservation
): ProbeVerdict {
  const hasResult = 'result' in observation && observation.result !== undefined
  if (hasResult) {
    const obs = observation as ProbeResult
    const passed = obs.result === 'PASSED'
    return {
      passed,
      message: passed ? 'OK' : (obs.error || 'Failed')
    }
  }

  const strategy = probeStrategies[definition.type]
  if (!strategy) {
    return {
      passed: false,
      message: `Unknown probe type: ${definition.type}`
    }
  }
  return strategy(observation, definition.params)
}

export function reduceProbeResults(
  observations: ProbeObservation[],
  policy: 'AND' | 'OR'
): ProbeVerdict {
  if (observations.length === 0) {
    return { passed: false, message: 'No probes executed' }
  }

  const verdicts = observations.map(obs => {
    const strategy = probeStrategies[obs.probeType]
    if (!strategy) {
      return { passed: false, message: `Unknown probe type: ${obs.probeType}` }
    }
    return strategy(obs, {})
  })

  if (policy === 'AND') {
    const allPassed = verdicts.every(v => v.passed)
    if (allPassed) {
      return { passed: true, message: 'All probes passed' }
    }
    const failed = verdicts.filter(v => !v.passed)
    return {
      passed: false,
      message: `${failed.length}/${verdicts.length} probes failed`
    }
  }

  if (policy === 'OR') {
    const somePassed = verdicts.some(v => v.passed)
    if (somePassed) {
      const passed = verdicts.filter(v => v.passed)
      return {
        passed: true,
        message: `${passed.length}/${verdicts.length} probes passed`
      }
    }
    return {
      passed: false,
      message: 'All probes failed'
    }
  }

  return { passed: false, message: `Unknown policy: ${policy}` }
}

export function reduceStageVerdict(
  observations: ProbeObservation[],
  policy: 'AND' | 'OR'
): 'PASSED' | 'FAILED' {
  const verdict = reduceProbeResults(observations, policy)
  return verdict.passed ? 'PASSED' : 'FAILED'
}
