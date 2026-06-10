import type { ProbeObservation, ProbeResult, ProbeHandler } from '../../kernel/contracts/probe-port'
import type { ProbeContext } from './fs-exists'
import { executeFsExists } from './fs-exists'
import { executeFsMatch, type FsMatchParams } from './fs-match'
import { executeFsNotExists } from './fs-not-exists'
import { executeFsParseable, type FsParseableParams } from './fs-parseable'
import { executeShellExec, type ShellExecResult } from './shell-exec'
import { executeTestPass, type TestPassParams } from './test-pass'
import { executeDepsResolved, type DepsResolvedParams } from './deps-resolved'
import { executeTsCompiles, type TsCompilesParams } from './ts-compiles'
import { executeLintCheck, type LintCheckParams } from './lint-check'
import { executeHttpResponds, type HttpRespondsParams } from './http-responds'
import { executeFileExports, type FileExportsParams } from './file-exports'
import { executeGitClean, type GitCleanParams } from './git-clean'
import { executeGitBranchExists, type GitBranchExistsParams } from './git-branch-exists'
import { executeGitStatusClean, type GitStatusCleanParams } from './git-status-clean'
import { executeGitMergeFeasible, type GitMergeFeasibleParams } from './git-merge-feasible'

export type { ProbeObservation, ProbeResult, ProbeHandler }

export const probeHandlers: Record<string, ProbeHandler> = {
  fs_exists: async (params, context) => {
    const pattern = (params.pattern || params.path) as string
    const files = await executeFsExists(pattern, context as ProbeContext)
    return {
      probeType: 'fs_exists',
      output: files.join('\n'),
      executedAt: Date.now(),
    } as ProbeObservation
  },

  fs_not_exists: async (params, context) => {
    const pattern = (params.pattern || params.path) as string
    const files = await executeFsNotExists(pattern, context as ProbeContext)
    return {
      probeType: 'fs_not_exists',
      output: files.join('\n'),
      executedAt: Date.now(),
    } as ProbeObservation
  },

  fs_match: async (params, context) => {
    const matchParams = params as unknown as FsMatchParams
    const result = await executeFsMatch(matchParams, context as ProbeContext)
    return {
      probeType: 'fs_match',
      // v1.1: JSON-stringify so Kernel can read `matched` boolean (data contract fix)
      // Previously, only `result.content` was passed → Kernel could not distinguish
      // "matched" from "not matched but file read succeeded"
      output: JSON.stringify({ matched: result.matched, content: result.content, pattern: result.pattern }),
      error: result.error,
      executedAt: Date.now(),
    } as ProbeObservation
  },

  shell_exec: async (params, context) => {
    const command = params.command as string
    const result: ShellExecResult = await executeShellExec(command, context as ProbeContext)
    return {
      probeType: 'shell_exec',
      output: result.stdout || result.stderr,
      error: result.error,
      executedAt: Date.now(),
      exitCode: result.exitCode,
    } as ProbeObservation & { exitCode: number | null }
  },

  // v1.1: fs-parseable — JSON 解析验证
  fs_parseable: async (params, context) => {
    const parseParams = params as unknown as FsParseableParams
    const result = await executeFsParseable(parseParams, context as ProbeContext)
    return {
      probeType: 'fs_parseable',
      output: JSON.stringify({ parsed: result.parsed, format: result.format, topLevelKeys: result.topLevelKeys }),
      error: result.error,
      executedAt: Date.now(),
    } as ProbeObservation
  },

  // v1.1 P1: test-pass — 跑 bun test
  test_pass: async (params, context) => {
    const testParams = params as unknown as TestPassParams
    const result = await executeTestPass(testParams, context as ProbeContext)
    return {
      probeType: 'test_pass',
      output: JSON.stringify({ passed: result.passed, exitCode: result.exitCode, summary: result.summary }),
      error: result.error,
      executedAt: Date.now(),
    } as ProbeObservation
  },

  // v1.1 P1: deps-resolved — 验证 package.json 依赖都被 lockfile 解析
  deps_resolved: async (params, context) => {
    const depsParams = params as unknown as DepsResolvedParams
    const result = await executeDepsResolved(depsParams, context as ProbeContext)
    return {
      probeType: 'deps_resolved',
      output: JSON.stringify({
        missing: result.missing,
        declaredCount: Object.keys(result.declared).length,
        resolvedCount: result.resolved ? Object.keys(result.resolved).length : 0,
        lockfilePath: result.lockfilePath,
      }),
      error: result.error,
      executedAt: Date.now(),
    } as ProbeObservation
  },

  // v1.1 P1: ts-compiles — 跑 tsc --noEmit 验证类型
  ts_compiles: async (params, context) => {
    const tsParams = params as unknown as TsCompilesParams
    const result = await executeTsCompiles(tsParams, context as ProbeContext)
    return {
      probeType: 'ts_compiles',
      output: JSON.stringify({ passed: result.passed, exitCode: result.exitCode, errorCount: result.errorCount }),
      error: result.error,
      executedAt: Date.now(),
    } as ProbeObservation
  },

  // v1.1 P1: lint-check — 跑 biome check 验证代码风格
  lint_check: async (params, context) => {
    const lintParams = params as unknown as LintCheckParams
    const result = await executeLintCheck(lintParams, context as ProbeContext)
    return {
      probeType: 'lint_check',
      output: JSON.stringify({ passed: result.passed, exitCode: result.exitCode, issueCount: result.issueCount }),
      error: result.error,
      executedAt: Date.now(),
    } as ProbeObservation
  },

  // v1.1 P1: http-responds — HTTP 请求检查 status（无 spawn，用 Bun fetch）
  http_responds: async (params) => {
    // 注意：http-responds 不需要 projectRoot（fetch 是 global）
    const httpParams = params as unknown as HttpRespondsParams
    const result = await executeHttpResponds(httpParams)
    return {
      probeType: 'http_responds',
      output: JSON.stringify({
        passed: result.passed,
        status: result.status,
        ok: result.ok,
        durationMs: result.durationMs,
      }),
      error: result.error,
      executedAt: Date.now(),
    } as ProbeObservation
  },

  // v1.1 P1: file-exports — 进程隔离 runtime import 提取 exports
  file_exports: async (params, context) => {
    const feParams = params as unknown as FileExportsParams
    const result = await executeFileExports(feParams, context as ProbeContext)
    return {
      probeType: 'file_exports',
      output: JSON.stringify({
        exports: result.exports,
        exportCount: result.exports.length,
        isolated: result.isolated,
        durationMs: result.durationMs,
      }),
      error: result.error,
      executedAt: Date.now(),
    } as ProbeObservation
  },

  // v1.2: git-clean — working tree 干净
  git_clean: async (params, context) => {
    const gitParams = params as unknown as GitCleanParams
    const result = await executeGitClean(gitParams, context as ProbeContext)
    return {
      probeType: 'git_clean',
      output: JSON.stringify({ clean: result.clean, dirtyFiles: result.dirtyFiles }),
      error: result.error,
      executedAt: Date.now(),
    } as ProbeObservation
  },

  // v1.2: git-branch-exists — 本地分支存在
  git_branch_exists: async (params, context) => {
    const gitParams = params as unknown as GitBranchExistsParams
    const result = await executeGitBranchExists(gitParams, context as ProbeContext)
    return {
      probeType: 'git_branch_exists',
      output: JSON.stringify({ exists: result.exists }),
      error: result.error,
      executedAt: Date.now(),
    } as ProbeObservation
  },

  // v1.2: git-status-clean — git-clean 的语义别名（verbose 版）
  git_status_clean: async (params, context) => {
    const gitParams = params as unknown as GitStatusCleanParams
    const result = await executeGitStatusClean(gitParams, context as ProbeContext)
    return {
      probeType: 'git_status_clean',
      output: JSON.stringify({ clean: result.clean, dirtyFiles: result.dirtyFiles }),
      error: result.error,
      executedAt: Date.now(),
    } as ProbeObservation
  },

  // v1.2: git-merge-feasible — 三路合并模拟（不实际 merge）
  git_merge_feasible: async (params, context) => {
    const gitParams = params as unknown as GitMergeFeasibleParams
    const result = await executeGitMergeFeasible(gitParams, context as ProbeContext)
    return {
      probeType: 'git_merge_feasible',
      output: JSON.stringify({
        status: result.status,
        conflictFiles: result.conflictFiles,
        targetCommit: result.targetCommit,
        workCommit: result.workCommit,
        error: result.error,
      }),
      error: result.error,
      executedAt: Date.now(),
    } as ProbeObservation
  },
}

class ProbeRegistry {
  private handlers: Map<string, ProbeHandler> = new Map()

  private aliases: Record<string, string> = {
    'fs-exists': 'fs_exists',
    'fs-not-exists': 'fs_not_exists',
    'fs-content-match': 'fs_match',
    'fs-parseable': 'fs_parseable',
    'test-pass': 'test_pass',
    'deps-resolved': 'deps_resolved',
    'ts-compiles': 'ts_compiles',
    'lint-check': 'lint_check',
    'http-responds': 'http_responds',
    'file-exports': 'file_exports',
    'exec-exit-zero': 'shell_exec',
    'shell-exec': 'shell_exec',
    // v1.2: git-* builtin probes
    'git-clean': 'git_clean',
    'git-branch-exists': 'git_branch_exists',
    'git-status-clean': 'git_status_clean',
    'git-merge-feasible': 'git_merge_feasible',
    // v0.1.2: plural @oxn/probes/* 命名（文档对齐）
    'fs-exists:probes': 'fs_exists',
    'fs-not-exists:probes': 'fs_not_exists',
    'fs-parseable:probes': 'fs_parseable',
    'test-pass:probes': 'test_pass',
    'deps-resolved:probes': 'deps_resolved',
    'ts-compiles:probes': 'ts_compiles',
    'lint-check:probes': 'lint_check',
    'http-responds:probes': 'http_responds',
    'file-exports:probes': 'file_exports',
    'shell-exec:probes': 'shell_exec',
    'git-clean:probes': 'git_clean',
    'git-branch-exists:probes': 'git_branch_exists',
    'git-status-clean:probes': 'git_status_clean',
    'git-merge-feasible:probes': 'git_merge_feasible',
  }

  constructor() {
    for (const [type, handler] of Object.entries(probeHandlers)) {
      this.handlers.set(type, handler)
    }
    for (const [alias, target] of Object.entries(this.aliases)) {
      const handler = this.handlers.get(target)
      if (handler) {
        this.handlers.set(alias, handler)
      }
    }
  }

  register(type: string, handler: ProbeHandler): void {
    this.handlers.set(type, handler)
  }

  get(type: string): ProbeHandler | null {
    return this.handlers.get(type) || null
  }

  has(type: string): boolean {
    return this.handlers.has(type)
  }

  getRegisteredTypes(): string[] {
    return Array.from(this.handlers.keys())
  }

  addAlias(alias: string, target: string): void {
    this.aliases[alias] = target
    const handler = this.handlers.get(target)
    if (handler) {
      this.handlers.set(alias, handler)
    }
  }
}

export const probeRegistry = new ProbeRegistry()

export function hasProbeHandler(type: string): boolean {
  return probeRegistry.has(type)
}

export function getProbeHandler(type: string): ProbeHandler | null {
  return probeRegistry.get(type)
}

export function registerProbeHandler(type: string, handler: ProbeHandler): void {
  probeRegistry.register(type, handler)
}

export type { ProbeContext, ShellExecResult }
export {
  executeFsExists,
  executeFsMatch,
  executeFsNotExists,
  executeFsParseable,
  executeShellExec,
  executeTestPass,
  executeDepsResolved,
  executeTsCompiles,
  executeLintCheck,
  executeHttpResponds,
  executeFileExports,
  executeGitClean,
  executeGitBranchExists,
  executeGitStatusClean,
  executeGitMergeFeasible,
}
