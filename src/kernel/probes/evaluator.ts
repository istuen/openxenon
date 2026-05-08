export type ProbeVerdict = {
  passed: boolean
  message: string
}

export interface ProbeDefinition {
  type: string
  params: Record<string, unknown>
  expected?: unknown
}

export interface ProbeResult {
  probeType: string
  result: 'PASSED' | 'FAILED'
  output?: string
  error?: string
  executedAt: number
}

export function evaluateProbe(
  definition: ProbeDefinition,
  actualResult: ProbeResult
): ProbeVerdict {
  const { type, params, expected } = definition

  switch (type) {
    case 'fs_exists': {
      const files = (actualResult.output || '').split('\n').filter(Boolean)
      const passed = files.length > 0
      return {
        passed,
        message: passed ? `Found ${files.length} matching path(s)` : 'No matching paths found'
      }
    }

    case 'fs_not_exists': {
      const files = (actualResult.output || '').split('\n').filter(Boolean)
      const passed = files.length === 0
      return {
        passed,
        message: passed ? 'Path does not exist (as expected)' : `Path exists: ${files.join(', ')}`
      }
    }

    case 'fs_match': {
      const passed = actualResult.result === 'PASSED'
      return {
        passed,
        message: passed ? 'Pattern matched' : (actualResult.error || 'Pattern did not match')
      }
    }

    case 'shell_exec': {
      const passed = actualResult.result === 'PASSED'
      return {
        passed,
        message: passed ? `Command succeeded` : (actualResult.error || 'Command failed')
      }
    }

    default:
      return {
        passed: false,
        message: `Unknown probe type: ${type}`
      }
  }
}

export function reduceProbeResults(
  results: ProbeResult[],
  policy: 'AND' | 'OR'
): ProbeVerdict {
  if (results.length === 0) {
    return { passed: false, message: 'No probes executed' }
  }

  if (policy === 'AND') {
    const allPassed = results.every(r => r.result === 'PASSED')
    if (allPassed) {
      return { passed: true, message: 'All probes passed' }
    }
    const failed = results.filter(r => r.result === 'FAILED')
    return {
      passed: false,
      message: `${failed.length}/${results.length} probes failed`
    }
  }

  if (policy === 'OR') {
    const somePassed = results.some(r => r.result === 'PASSED')
    if (somePassed) {
      const passed = results.filter(r => r.result === 'PASSED')
      return {
        passed: true,
        message: `${passed.length}/${results.length} probes passed`
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
  proofResults: ProbeResult[],
  policy: 'AND' | 'OR'
): 'PASSED' | 'FAILED' {
  const verdict = reduceProbeResults(proofResults, policy)
  return verdict.passed ? 'PASSED' : 'FAILED'
}
