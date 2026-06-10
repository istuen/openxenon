// =============================================================================
// git-status-clean probe (L1-Infra)
//
// 物理观测：与 git-clean 完全一致；语义更显式
// （git-clean 隐含语义；git-status-clean 是 verbose 版本，给工程师读 verdict 时用）
// =============================================================================

import { executeGitClean, type GitCleanParams, type GitCleanResult } from './git-clean'
import type { ProbeContextBase } from '../../kernel/contracts/probe-port'

export type GitStatusCleanParams = GitCleanParams
export type GitStatusCleanResult = GitCleanResult

export async function executeGitStatusClean(
  params: GitStatusCleanParams,
  context: ProbeContextBase,
): Promise<GitStatusCleanResult> {
  return executeGitClean(params, context)
}
