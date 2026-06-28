/**
 * Align module — run-work use case (v0.6 阶段3)
 *
 * Wraps dual-state-exec.ts runWork, migrating to Engine module.
 */
import { runWork as execRunWork } from '../../../src/work/dual-state-exec'
import type { WorkspaceState } from '../../../src/work/dual-state'
import type { RunWorkInput, RunWorkResult } from './types'

export function runWork(input: RunWorkInput): RunWorkResult {
  const state: WorkspaceState = execRunWork({
    projectRoot: input.projectRoot,
    workName: input.workName,
    domainNames: [],
    blueprintNames: [],
    tasks: [],
  })
  return {
    ok: true,
    status: state.status === 'passed' ? 'passed' : state.status === 'failed' ? 'failed' : 'running',
    currentRound: state.currentRound,
  }
}
