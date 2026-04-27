import type { ProofExecutionContext, ProofOutput } from '../types/proof'
import { executeBuiltInProof } from './built-in-proofs-registry'
import type { Probe } from '../types/arsenal/blueprint'

export interface ProbeResult {
  probe: Probe
  passed: boolean
  output?: ProofOutput
  error?: string
}

export async function routeProbeToBuiltin(
  probe: Probe,
  context: ProofExecutionContext
): Promise<ProbeResult> {
  try {
    let output: ProofOutput

    switch (probe.type) {
      case 'fs_exists': {
        const input = { path: probe.pattern }
        output = await executeBuiltInProof('fs_exists', input, context)
        break
      }

      case 'fs_content_match': {
        const input = {
          path: probe.pattern,
          pattern: probe.pattern
        }
        output = await executeBuiltInProof('fs_content_match', input, context)
        break
      }

      case 'fs_forbid': {
        const input = {
          path: probe.pattern,
          pattern: probe.pattern
        }
        output = await executeBuiltInProof('fs_content_match', input, context)
        output = {
          success: !output.success,
          message: output.success
            ? `Found forbidden pattern in ${probe.pattern}`
            : `No forbidden pattern found in ${probe.pattern}`,
          data: output.data
        }
        break
      }

      case 'exec': {
        const input = {
          command: probe.command,
          cwd: probe.cwd
        }
        output = await executeBuiltInProof('exec_exit_zero', input, context)
        break
      }

      default:
        return {
          probe,
          passed: false,
          error: `Unknown probe type: ${probe.type}`
        }
    }

    return {
      probe,
      passed: output.success,
      output
    }
  } catch (error) {
    return {
      probe,
      passed: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
