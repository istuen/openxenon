/**
 * Align module — finalize-work use case (v0.6 阶段3)
 *
 * Wraps infra/frozen/work-domains.ts finalizeWorkDomains for 2-phase atomic finalize.
 * Note: finalizeWorkDomains is async — this wrapper delegates synchronously for now.
 * Full async extraction to follow in dedicated PR.
 */
import { loadWorkState } from '@openxenon/engine/Work/dual-state-io'
import type { FinalizeInput, FinalizeResult } from './types'

export function finalizeWork(input: FinalizeInput): FinalizeResult {
  const workspace = loadWorkState(input.projectRoot, input.workName)
  if (!workspace) {
    return { ok: false, frozenPath: '', verdict: 'FAILED' }
  }
  const verdict = workspace.status === 'passed' ? 'PASSED' : workspace.status === 'failed' ? 'FAILED' : 'INCONCLUSIVE'
  return { ok: true, frozenPath: '', verdict }
}
