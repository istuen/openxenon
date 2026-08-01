import type { ProbeObservation, ProbeResult, ProbeHandler, ProbeContextBase } from '@openxenon/engine/kernel/index'
import type { InterferenceFlag } from '@openxenon/engine/kernel/contracts/io-primitive'
import { FileProvider } from '@openxenon/engine/infra/providers/file-provider'
import { HttpProvider } from '@openxenon/engine/infra/providers/http-provider'
import { ShellProvider } from '@openxenon/engine/infra/providers/shell-provider'
import { GitProvider } from '@openxenon/engine/infra/providers/git-provider'
import { readFileSync, existsSync } from '@openxenon/engine/infra/filesystem'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** RFC-0015 D6.4: 从 packages/engine/package.json 读 version 注入 ProbeContext.engineVersion
 *  - ProbeRunner 层职责: 在 wrapper 调用 execute* 前注入
 *  - 候选路径覆盖 src/ + bundled dist/ (与 oxn-builtin-registry.resolveBuiltinDir 同模式)
 *  - 失败降级: 返回 undefined (handler 检测到后报 passed=false)
 */
let _cachedEngineVersion: string | undefined
function readEngineVersion(): string | undefined {
  if (_cachedEngineVersion) return _cachedEngineVersion
  const candidates: string[] = []
  try {
    const here = dirname(fileURLToPath(import.meta.url))
    // dev: packages/engine/src/infra/probes/ → ../../../package.json
    candidates.push(join(here, '../../../package.json'))
    // bundled: dist/ 同级
    candidates.push(join(here, '../../package.json'))
  } catch {
    /* CommonJS 等 */
  }
  for (const p of candidates) {
    if (existsSync(p)) {
      try {
        const pkg = JSON.parse(readFileSync(p, 'utf-8')) as { name?: string; version?: string }
        if (pkg.name === '@openxenon/engine' && pkg.version) {
          _cachedEngineVersion = pkg.version
          return pkg.version
        }
        if (pkg.version) {
          _cachedEngineVersion = pkg.version
          return pkg.version
        }
      } catch {
        /* 继续下一候选 */
      }
    }
  }
  return undefined
}
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
import { executeBoundaryGuard, type BoundaryGuardParams } from './boundary-guard'
import { executeStaleDraftCheck, type StaleDraftCheckParams } from './stale-draft-check'
import { executeAssetMigrateCheck, type AssetMigrateCheckParams } from './asset-migrate-check'
import { executeOxnRuntimeVersion, type OxnRuntimeVersionParams } from './oxn-runtime-version'
import { executeFileHash, type FileHashParams } from './file-hash'
import { executeTestCoverage, type TestCoverageParams } from './test-coverage'
import { executeJsonPath, type JsonPathParams } from './json-path'
import { executePortListening, type PortListeningParams } from './port-listening'

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
  //   D2.1: 走 FileProvider.ioStat 拿 flags（stat-only，不读内容 → content flags 无）
  heading_skeleton_check: async (params, context) => {
    const hsParams = params as unknown as HeadingSkeletonCheckParams
    const fileProvider = new FileProvider()
    const probePath = hsParams.path ?? ''
    const fullPath = probePath.startsWith('/') ? probePath : `${context.projectRoot}/${probePath}`
    let interference: { flags: InterferenceFlag[] } = { flags: [] }
    try {
      const statResult = await fileProvider.ioStat({ path: fullPath })
      interference = statResult.interference
    } catch {
      /* stat 失败不影响 probe 执行 */
    }
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
      interference,
      executedAt: Date.now(),
    } as ProbeObservation
  },

  // v0.6.2: docs-heading-check — 校验 docs .md 章节骨架（H2 模式：What→Why→How→参考）
  //   D2.1: 走 FileProvider.ioStat 拿 flags（stat-only）
  docs_heading_check: async (params, context) => {
    const dhcParams = params as unknown as DocsHeadingCheckParams
    const fileProvider = new FileProvider()
    const probePath = dhcParams.path ?? ''
    const fullPath = probePath.startsWith('/') ? probePath : `${context.projectRoot}/${probePath}`
    let interference: { flags: InterferenceFlag[] } = { flags: [] }
    try {
      const statResult = await fileProvider.ioStat({ path: fullPath })
      interference = statResult.interference
    } catch {
      /* stat 失败不影响 probe 执行 */
    }
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
      interference,
      executedAt: Date.now(),
    } as ProbeObservation
  },

  // v0.6.2: doc-boundary — 文档三层守门
  //   D2.1: 走 FileProvider.ioStat 拿 flags（stat-only，扫描 docs/ 与 drafts/ 根）
  doc_boundary: async (params, context) => {
    const dbParams = params as unknown as DocBoundaryParams
    const fileProvider = new FileProvider()
    const root = dbParams.root ?? context.projectRoot
    const docsRoot = `${root}/docs`
    let interference: { flags: InterferenceFlag[] } = { flags: [] }
    try {
      const statResult = await fileProvider.ioStat({ path: docsRoot })
      interference = statResult.interference
    } catch {
      /* stat 失败不影响 probe 执行 */
    }
    const result = await executeDocBoundary(dbParams, context as ProbeContext)
    return {
      probeType: 'doc_boundary',
      output: JSON.stringify({
        passed: result.passed,
        violationCount: result.violationCount,
        violations: result.violations,
      }),
      error: result.passed ? undefined : `${result.violationCount} violations`,
      interference,
      executedAt: Date.now(),
    } as ProbeObservation
  },

  // RFC-0015 D6.1: boundary-guard — 一等公民 probe, 校验 work.md ## Tasks refs
  boundary_guard: async (params, context) => {
    const bgParams = params as unknown as BoundaryGuardParams
    const result = await executeBoundaryGuard(bgParams, context as ProbeContext)
    return {
      probeType: 'boundary_guard',
      output: JSON.stringify({
        passed: result.passed,
        workCount: result.workCount,
        taskCount: result.taskCount,
        failedRefs: result.failedRefs,
      }),
      error: result.passed ? undefined : `${result.failedRefs.length} failed ref(s)`,
      executedAt: Date.now(),
    } as ProbeObservation
  },

  // RFC-0015 D6.2: stale-draft-check — 一等公民 probe, 校验 draft .md refs 不 stale (v0.6.2 从 stale-pool-check 改造)
  stale_draft_check: async (params, context) => {
    const spParams = params as unknown as StaleDraftCheckParams
    const result = await executeStaleDraftCheck(spParams, context as ProbeContext)
    return {
      probeType: 'stale_draft_check',
      output: JSON.stringify({
        passed: result.passed,
        draftCount: result.draftCount,
        staleRefs: result.staleRefs,
      }),
      error: result.passed ? undefined : `${result.staleRefs.length} stale ref(s)`,
      executedAt: Date.now(),
    } as ProbeObservation
  },

  // RFC-0015 D6.3: asset-migrate-check — 一等公民 probe, 校验 .archived/assets 完整性
  asset_migrate_check: async (params, context) => {
    const amcParams = params as unknown as AssetMigrateCheckParams
    const result = await executeAssetMigrateCheck(amcParams, context as ProbeContext)
    return {
      probeType: 'asset_migrate_check',
      output: JSON.stringify({
        passed: result.passed,
        archiveCount: result.archiveCount,
        incompleteArchives: result.incompleteArchives,
        staleArchiveRefs: result.staleArchiveRefs,
      }),
      error: result.passed
        ? undefined
        : `${result.incompleteArchives.length} incomplete + ${result.staleArchiveRefs.length} stale ref(s)`,
      executedAt: Date.now(),
    } as ProbeObservation
  },

  // RFC-0015 D6.4: oxn-runtime-version — 一等公民 probe, 校验 engine runtime version
  //   注入 engineVersion 到 ProbeContext (替代原 handler 内 import.meta.url 上溯)
  oxn_runtime_version: async (params, context) => {
    const rtvParams = params as unknown as OxnRuntimeVersionParams
    const enrichedContext: ProbeContext = {
      ...context,
      engineVersion: context.engineVersion ?? readEngineVersion(),
    } as ProbeContext
    const result = await executeOxnRuntimeVersion(rtvParams, enrichedContext)
    return {
      probeType: 'oxn_runtime_version',
      output: JSON.stringify({
        passed: result.passed,
        skipped: result.skipped,
        actual: result.actual,
        expected: result.expected,
        mismatch: result.mismatch,
      }),
      error: result.passed
        ? undefined
        : `engine version mismatch: actual=${result.actual}, expected=${result.expected}`,
      executedAt: Date.now(),
    } as ProbeObservation
  },

  // ========================================================================
  // RFC-0016 D1-D4: 4 通用 builtin probe (任何项目可用)
  // ========================================================================

  // RFC-0016 D1: file-hash — 文件 SHA-256 匹配预期
  file_hash: async (params, context) => {
    const fhParams = params as unknown as FileHashParams
    const result = await executeFileHash(fhParams, context as ProbeContext)
    return {
      probeType: 'file_hash',
      output: JSON.stringify({ passed: result.passed, actual: result.actual }),
      error: result.passed ? undefined : (result.error ?? 'hash mismatch'),
      executedAt: Date.now(),
    } as ProbeObservation
  },

  // RFC-0016 D2: test-coverage — 覆盖率 ≥ 阈值
  test_coverage: async (params, context) => {
    const tcParams = params as unknown as TestCoverageParams
    const result = await executeTestCoverage(tcParams, context as ProbeContext)
    return {
      probeType: 'test_coverage',
      output: JSON.stringify({
        passed: result.passed,
        lines: result.lines,
        branches: result.branches,
        functions: result.functions,
        exitCode: result.exitCode,
        summaryPath: result.summaryPath,
      }),
      error: result.passed ? undefined : (result.error ?? 'coverage below threshold'),
      executedAt: Date.now(),
    } as ProbeObservation
  },

  // RFC-0016 D3: json-path — JSONPath 值匹配预期
  json_path: async (params, context) => {
    const jpParams = params as unknown as JsonPathParams
    const result = await executeJsonPath(jpParams, context as ProbeContext)
    return {
      probeType: 'json_path',
      output: JSON.stringify({ passed: result.passed, actual: result.actual }),
      error: result.passed ? undefined : (result.error ?? 'value mismatch'),
      executedAt: Date.now(),
    } as ProbeObservation
  },

  // RFC-0016 D4: port-listening — 端口正在监听
  port_listening: async (params, context) => {
    const plParams = params as unknown as PortListeningParams
    const result = await executePortListening(plParams, context as ProbeContext)
    return {
      probeType: 'port_listening',
      output: JSON.stringify({
        passed: result.passed,
        host: result.host,
        port: result.port,
        durationMs: result.durationMs,
      }),
      error: result.passed ? undefined : (result.error ?? 'port not listening'),
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
    'boundary-guard:probes': 'boundary_guard',
    'stale-draft-check:probes': 'stale_draft_check',
    'asset-migrate-check:probes': 'asset_migrate_check',
    // RFC-0016 D1-D4: 4 通用 builtin probe aliases (@oxn/ scope)
    '@oxn/probes/file-hash': 'file_hash',
    '@oxn/probes/test-coverage': 'test_coverage',
    '@oxn/probes/json-path': 'json_path',
    '@oxn/probes/port-listening': 'port_listening',
    'file-hash:probes': 'file_hash',
    'test-coverage:probes': 'test_coverage',
    'json-path:probes': 'json_path',
    'port-listening:probes': 'port_listening',
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
  executeBoundaryGuard,
  executeStaleDraftCheck,
  executeAssetMigrateCheck,
  executeOxnRuntimeVersion,
  executeFileHash,
  executeTestCoverage,
  executeJsonPath,
  executePortListening,
}
