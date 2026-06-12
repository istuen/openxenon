// =============================================================================
// git-clean probe (L1-Infra)
//
// 物理观测：调 git status --porcelain
// 判定：行数 == 0 → clean: true
// 注：本文件只做"git 物理观测"，不做 PASS/FAIL 判定
//     PASS/FAIL 由 src/kernel/verdicts/verdict.ts 的 gitCleanStrategy 判定
// =============================================================================

import { isWorkingTreeClean, type GitResult } from '../git/workspace'
import type { ProbeContextBase } from '../../kernel/index'

export interface GitCleanParams {
  path?: string
  includeUntracked?: boolean
}

export interface GitCleanResult extends GitResult {
  clean: boolean
  dirtyFiles: string[]
}

export async function executeGitClean(params: GitCleanParams, context: ProbeContextBase): Promise<GitCleanResult> {
  const cwd = params.path ? `${context.projectRoot}/${params.path}` : context.projectRoot
  const r = await isWorkingTreeClean(cwd, { includeUntracked: params.includeUntracked ?? false })
  return {
    ok: r.ok,
    stdout: r.stdout,
    stderr: r.stderr,
    exitCode: r.exitCode,
    error: r.error,
    clean: r.clean,
    dirtyFiles: r.clean ? [] : r.stdout.split('\n').filter((l) => l.trim().length > 0),
  }
}
