import type { ProbeObservation, ProbeResult, ProbeHandler, ProbeContextBase } from '@openxenon/engine/kernel/index'
import type { InterferenceFlag } from '@openxenon/engine/kernel/contracts/io-primitive'
import { FileProvider } from '@openxenon/engine/infra/providers/file-provider'
import { HttpProvider } from '@openxenon/engine/infra/providers/http-provider'
import { ShellProvider } from '@openxenon/engine/infra/providers/shell-provider'
import { GitProvider } from '@openxenon/engine/infra/providers/git-provider'
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
import { executeDocsBuild, type DocsBuildParams } from './docs-build'
import { executeHeadingSkeletonCheck, type HeadingSkeletonCheckParams } from './heading-skeleton-check'
import { executeDocsHeadingCheck, type DocsHeadingCheckParams } from './docs-heading-check'
import { executeDocBoundary, type DocBoundaryParams } from './doc-boundary'

export type { ProbeObservation, ProbeResult, ProbeHandler }

export const probeHandlers: Record<string, ProbeHandler> = {
  // ───────── FileProvider 分组 (4 handlers; RFC-0015 D2.1) ─────────

  // D2.1: fs_exists 改经 FileProvider.ioStat
  //   - Provider returns { exists, isFile, isDir, ... } + interference.flags
  //   - shell-style glob ('*') 走 executeFsExists (内含 glob 解析)
  fs_exists: async (params, context) => {
    const pattern = (params.pattern || params.path) as string
    // 简单路径（非 glob）走 FileProvider.ioStat — 拿 flags + existence
    if (!pattern.includes('*') && !pattern.includes('?')) {
      const fullPath = pattern.startsWith('/') ? pattern : `${context.projectRoot}/${pattern}`
      const provider = new FileProvider()
      try {
        const { result, interference } = await provider.ioStat({ path: fullPath })
        return {
          probeType: 'fs_exists',
          output: result.exists && (result.isFile || result.isDir) ? fullPath : '',
          interference,
          executedAt: Date.now(),
        } as ProbeObservation
      } catch {
        return {
          probeType: 'fs_exists',
          output: '',
          interference: { flags: ['unknown' as InterferenceFlag] },
          executedAt: Date.now(),
        } as ProbeObservation
      }
    }
    // glob 走原 atomic 函数（glob 解析属 L1-Infra 原子操作，暂无 Provider 抽象）
    const files = await executeFsExists(pattern, context as ProbeContext)
    return {
      probeType: 'fs_exists',
      output: files.join('\n'),
      // glob 模式无具体 path 探测 — flags: [] 不污染
      interference: { flags: [] },
      executedAt: Date.now(),
    } as ProbeObservation
  },

  // D2.1: fs_not_exists 改经 FileProvider.ioStat
  //   语义反转：exists=false → 通过；exists=true → 失败；flags 透传
  fs_not_exists: async (params, context) => {
    const pattern = (params.pattern || params.path) as string
    if (!pattern.includes('*') && !pattern.includes('?')) {
      const fullPath = pattern.startsWith('/') ? pattern : `${context.projectRoot}/${pattern}`
      const provider = new FileProvider()
      try {
        const { result, interference } = await provider.ioStat({ path: fullPath })
        return {
          probeType: 'fs_not_exists',
          output: !result.exists ? fullPath : '',
          interference,
          executedAt: Date.now(),
        } as ProbeObservation
      } catch {
        return {
          probeType: 'fs_not_exists',
          output: '',
          interference: { flags: ['unknown' as InterferenceFlag] },
          executedAt: Date.now(),
        } as ProbeObservation
      }
    }
    const files = await executeFsNotExists(pattern, context as ProbeContext)
    return {
      probeType: 'fs_not_exists',
      output: files.join('\n'),
      interference: { flags: [] },
      executedAt: Date.now(),
    } as ProbeObservation
  },

  // D2.1: fs_match 改经 FileProvider
  //   路径检查走 FileProvider.ioStat（拿 flags），文件内容读走 FileProvider.ioRead（拿 flags）
  //   matched 逻辑保留 executeFsMatch
  fs_match: async (params, context) => {
    const matchParams = params as unknown as FsMatchParams
    const filePath = matchParams.path || ''
    const fullPath = filePath.startsWith('/') ? filePath : `${context.projectRoot}/${filePath}`
    const provider = new FileProvider()

    try {
      // 拿 stat flags（symlink / cache_path / just_modified / permission_denied）
      const { interference: statFlags } = await provider.ioStat({ path: fullPath })
      // 走原 atomic 函数做 regex matching（逻辑层，不重写）
      const result = await executeFsMatch(matchParams, context as ProbeContext)
      return {
        probeType: 'fs_match',
        output: JSON.stringify({ matched: result.matched, content: result.content, pattern: result.pattern }),
        error: result.error,
        interference: statFlags,
        executedAt: Date.now(),
      } as ProbeObservation
    } catch {
      return {
        probeType: 'fs_match',
        output: '{}',
        interference: { flags: ['unknown' as InterferenceFlag] },
        executedAt: Date.now(),
      } as ProbeObservation
    }
  },

  // D2.1: fs_parseable 改经 FileProvider.ioRead
  //   - 读内容用 Provider（拿 flags）
  //   - JSON.parse 保留 executeFsParseable 的解析逻辑
  fs_parseable: async (params, context) => {
    const parseParams = params as unknown as FsParseableParams
    const filePath = parseParams.path
    const fullPath = filePath.startsWith('/') ? filePath : `${context.projectRoot}/${filePath}`
    const provider = new FileProvider()

    try {
      // 先 stat 拿 flags
      const { interference: statFlags } = await provider.ioStat({ path: fullPath })
      const result = await executeFsParseable(parseParams, context as ProbeContext)
      return {
        probeType: 'fs_parseable',
        output: JSON.stringify({ parsed: result.parsed, format: result.format, topLevelKeys: result.topLevelKeys }),
        error: result.error,
        interference: statFlags,
        executedAt: Date.now(),
      } as ProbeObservation
    } catch {
      return {
        probeType: 'fs_parseable',
        output: '{}',
        interference: { flags: ['unknown' as InterferenceFlag] },
        executedAt: Date.now(),
      } as ProbeObservation
    }
  },

  // ───────── ShellProvider 分组 (1 handler; RFC-0015 D2.1) ─────────

  // D2.1: shell_exec 改经 ShellProvider.ioExec
  //   - Provider 自动检测 sandbox_violation / network_timeout / unknown (per d2-3 unit tests)
  shell_exec: async (params, context) => {
    const command = params.command as string
    const provider = new ShellProvider(context as ProbeContextBase)
    try {
      const { result, interference } = await provider.ioExec({ command })
      return {
        probeType: 'shell_exec',
        output: result.stdout || result.stderr,
        // ShellExecResult 字段转换：成功 → undefined err；timeout/sandbox → err by Provider detection
        error: result.exitCode === 0 ? undefined : result.stderr || undefined,
        interference,
        executedAt: Date.now(),
        exitCode: result.exitCode,
      } as ProbeObservation & { exitCode: number | null }
    } catch (err) {
      // Provider 抛 IAPError（如 cmd 抛 validationError）— 退化为 unknown 保守策略
      return {
        probeType: 'shell_exec',
        output: '',
        error: err instanceof Error ? err.message : String(err),
        interference: { flags: ['unknown' as InterferenceFlag] },
        executedAt: Date.now(),
        exitCode: null,
      } as ProbeObservation & { exitCode: number | null }
    }
  },

  // ───────── HttpProvider 分组 (1 handler; RFC-0015 D2.1) ─────────

  // D2.1: http_responds 改经 HttpProvider.ioRead
  //   - Provider 自动检测 waf_detected / cdn_cache / response_truncated / network_timeout
  http_responds: async (params) => {
    const httpParams = params as unknown as HttpRespondsParams
    const url = httpParams.url
    const maxBytes = (httpParams.timeout ?? 5000) > 0 ? 1_000_000 : Infinity
    const provider = new HttpProvider()
    try {
      const { result, interference } = await provider.ioRead({ path: url, maxBytes })
      // status code 需要从 raw fetch 取 — Provider result 只给 text/bytes/truncated
      // 为不破坏现有 strategy，额外做轻量 fetch 拿 status
      let status: number | null = null
      let ok = false
      try {
        const resp = await fetch(url, {
          method: httpParams.method ?? 'GET',
          signal: AbortSignal.timeout(httpParams.timeout ?? 5000),
        })
        status = resp.status
        ok = resp.status === (httpParams.expectedStatus ?? 200)
      } catch {
        /* Provider 已捕获 */
      }
      return {
        probeType: 'http_responds',
        output: JSON.stringify({ passed: ok, status, ok, durationMs: 0, textLength: result.bytes }),
        // http-responds 把 err 设到 output 里 (Kernel 看 output) — 保兼容
        interference,
        executedAt: Date.now(),
      } as ProbeObservation
    } catch {
      // Provider 抛错 → failure 降级
      return {
        probeType: 'http_responds',
        output: JSON.stringify({ passed: false, status: null, ok: false, durationMs: 0 }),
        interference: { flags: ['unknown' as InterferenceFlag] },
        executedAt: Date.now(),
      } as ProbeObservation
    }
  },

  // ───────── GitProvider 分组 (4 handlers; RFC-0015 D2.1) ─────────

  // D2.1: git_clean 改经 GitProvider.ioStat
  //   Provider 内已有 detached_head / shallow_clone / unknown 检测 (per d2-3 unit tests)
  git_clean: async (params, context) => {
    const gitParams = params as unknown as GitCleanParams
    const subpath = gitParams.path ?? ''
    const fullPath = subpath ? `${context.projectRoot}/${subpath}` : context.projectRoot
    const provider = new GitProvider({ projectRoot: fullPath })
    try {
      const { interference } = await provider.ioStat({ path: 'git://' })
      const result = await executeGitClean(gitParams, context as ProbeContext)
      return {
        probeType: 'git_clean',
        output: JSON.stringify({ clean: result.clean, dirtyFiles: result.dirtyFiles }),
        error: result.error,
        interference,
        executedAt: Date.now(),
      } as ProbeObservation
    } catch {
      return {
        probeType: 'git_clean',
        output: '{}',
        interference: { flags: ['unknown' as InterferenceFlag] },
        executedAt: Date.now(),
      } as ProbeObservation
    }
  },

  // D2.1: git_branch_exists 改经 GitProvider.ioRead
  git_branch_exists: async (params, context) => {
    const gitParams = params as unknown as GitBranchExistsParams
    const provider = new GitProvider({ projectRoot: context.projectRoot })
    try {
      const { interference } = await provider.ioRead({ path: `git://${gitParams.branch}` })
      const result = await executeGitBranchExists(gitParams, context as ProbeContext)
      return {
        probeType: 'git_branch_exists',
        output: JSON.stringify({ exists: result.exists }),
        error: result.error,
        interference,
        executedAt: Date.now(),
      } as ProbeObservation
    } catch {
      return {
        probeType: 'git_branch_exists',
        output: '{}',
        interference: { flags: ['unknown' as InterferenceFlag] },
        executedAt: Date.now(),
      } as ProbeObservation
    }
  },

  // D2.1: git_status_clean 改经 GitProvider.ioStat (语义别名；flags 透传)
  git_status_clean: async (params, context) => {
    const gitParams = params as unknown as GitStatusCleanParams
    const subpath = gitParams.path ?? ''
    const fullPath = subpath ? `${context.projectRoot}/${subpath}` : context.projectRoot
    const provider = new GitProvider({ projectRoot: fullPath })
    try {
      const { interference } = await provider.ioStat({ path: 'git://' })
      const result = await executeGitStatusClean(gitParams, context as ProbeContext)
      return {
        probeType: 'git_status_clean',
        output: JSON.stringify({ clean: result.clean, dirtyFiles: result.dirtyFiles }),
        error: result.error,
        interference,
        executedAt: Date.now(),
      } as ProbeObservation
    } catch {
      return {
        probeType: 'git_status_clean',
        output: '{}',
        interference: { flags: ['unknown' as InterferenceFlag] },
        executedAt: Date.now(),
      } as ProbeObservation
    }
  },

  // D2.1: git_merge_feasible 改经 GitProvider.ioExec
  git_merge_feasible: async (params, context) => {
    const gitParams = params as unknown as GitMergeFeasibleParams
    const provider = new GitProvider({ projectRoot: context.projectRoot })
    try {
      const { interference } = await provider.ioExec({
        command: `${gitParams.workBranch}:${gitParams.targetBranch}`,
      })
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
        interference,
        executedAt: Date.now(),
      } as ProbeObservation
    } catch {
      return {
        probeType: 'git_merge_feasible',
        output: '{}',
        interference: { flags: ['unknown' as InterferenceFlag] },
        executedAt: Date.now(),
      } as ProbeObservation
    }
  },

  // ───────── 非 IO-direct handler (RFC-0015 D2.1 范围排除；保持现状) ─────────

  // v1.1: test-pass — 跑 bun test
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

  // v0.6.2: docs-build — 跑 vitepress build docs 验证文档站点构建
  docs_build: async (params, context) => {
    const docsParams = params as unknown as DocsBuildParams
    const result = await executeDocsBuild(docsParams, context as ProbeContext)
    return {
      probeType: 'docs_build',
      output: JSON.stringify({ passed: result.passed, exitCode: result.exitCode, summary: result.summary }),
      error: result.error,
      executedAt: Date.now(),
    } as ProbeObservation
  },

  // v0.6.2: heading-skeleton-check — 校验 pool .md heading 骨架（H1 模式）
  heading_skeleton_check: async (params, context) => {
    const hsParams = params as unknown as HeadingSkeletonCheckParams
    const result = await executeHeadingSkeletonCheck(hsParams, context as ProbeContext)
    return {
      probeType: 'heading_skeleton_check',
      output: JSON.stringify({
        passed: result.passed,
        checked: result.checked,
        passedCount: result.passedCount,
        failedFiles: result.failedFiles,
        errors: result.errors,
      }),
      error: result.passed ? undefined : `failed: ${result.failedFiles.join(', ')}`,
      executedAt: Date.now(),
    } as ProbeObservation
  },

  // v0.6.2: docs-heading-check — 校验 docs .md 章节骨架（H2 模式：What→Why→How→参考）
  docs_heading_check: async (params, context) => {
    const dhcParams = params as unknown as DocsHeadingCheckParams
    const result = await executeDocsHeadingCheck(dhcParams, context as ProbeContext)
    return {
      probeType: 'docs_heading_check',
      output: JSON.stringify({
        passed: result.passed,
        checked: result.checked,
        passedCount: result.passedCount,
        failedFiles: result.failedFiles,
        errors: result.errors,
      }),
      error: result.passed ? undefined : `failed: ${result.failedFiles.join(', ')}`,
      executedAt: Date.now(),
    } as ProbeObservation
  },

  // v0.6.2: doc-boundary — 文档三层守门
  doc_boundary: async (params, context) => {
    const dbParams = params as unknown as DocBoundaryParams
    const result = await executeDocBoundary(dbParams, context as ProbeContext)
    return {
      probeType: 'doc_boundary',
      output: JSON.stringify({
        passed: result.passed,
        violationCount: result.violationCount,
        violations: result.violations,
      }),
      error: result.passed ? undefined : `${result.violationCount} violations`,
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
    'git-clean': 'git_clean',
    'git-branch-exists': 'git_branch_exists',
    'git-status-clean': 'git_status_clean',
    'git-merge-feasible': 'git_merge_feasible',
    'docs-build': 'docs_build',
    'heading-skeleton-check': 'heading_skeleton_check',
    'docs-heading-check': 'docs_heading_check',
    'doc-boundary': 'doc_boundary',
    // RFC-0015 D4.2: 4 OXN-internal probes 走 @prj/ scope (OXN self-host;
    // 外部项目不从 builtin 获得。Engine 内仍执行 handler, 但 catalog 已指向 @prj/).
    '@prj/probes/docs-build': 'docs_build',
    '@prj/probes/heading-skeleton-check': 'heading_skeleton_check',
    '@prj/probes/docs-heading-check': 'docs_heading_check',
    '@prj/probes/doc-boundary': 'doc_boundary',
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
    'docs-build:probes': 'docs_build',
    'heading-skeleton-check:probes': 'heading_skeleton_check',
    'docs-heading-check:probes': 'docs_heading_check',
    'doc-boundary:probes': 'doc_boundary',
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
  executeDocsBuild,
  executeHeadingSkeletonCheck,
  executeDocsHeadingCheck,
  executeDocBoundary,
}
