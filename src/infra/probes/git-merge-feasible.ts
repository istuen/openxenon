// =============================================================================
// git-merge-feasible probe (L1-Infra)
//
// 物理观测：用 git merge-tree --write-tree 算法模拟三路合并
// 判定：见 checkMergeFeasibility 返回的 MergeFeasibility 枚举
// 关键：不修改 working tree / index / refs
// =============================================================================

import { checkMergeFeasibility, type MergeFeasibilityResult } from '../git/workspace'
import type { ProbeContextBase } from '../../kernel/contracts/probe-port'

export interface GitMergeFeasibleParams {
  workBranch: string
  targetBranch?: string
  cwd?: string
}

export type GitMergeFeasibleResult = MergeFeasibilityResult

export async function executeGitMergeFeasible(
  params: GitMergeFeasibleParams,
  context: ProbeContextBase,
): Promise<GitMergeFeasibleResult> {
  const cwd = params.cwd ? `${context.projectRoot}/${params.cwd}` : context.projectRoot
  return checkMergeFeasibility(params.workBranch, params.targetBranch ?? 'current', cwd)
}
