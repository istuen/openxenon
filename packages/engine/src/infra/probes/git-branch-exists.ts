// =============================================================================
// git-branch-exists probe (L1-Infra)
//
// 物理观测：调 git rev-parse --verify refs/heads/<branch>
// 判定：exit 0 → exists: true
// =============================================================================

import { branchExists, type GitResult } from '../git/workspace'
import type { ProbeContextBase } from '@openxenon/engine/kernel/index'

export interface GitBranchExistsParams {
  branch: string
}

export interface GitBranchExistsResult extends GitResult {
  exists: boolean
}

export async function executeGitBranchExists(
  params: GitBranchExistsParams,
  context: ProbeContextBase,
): Promise<GitBranchExistsResult> {
  return branchExists(params.branch, context.projectRoot)
}
