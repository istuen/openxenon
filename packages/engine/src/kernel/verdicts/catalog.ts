// =============================================================================
// Probe Catalog (v0.1.2)
//
// 单一真相源：把"AI 看得到的语义层"与"OXN 内部的实现层"清晰分离。
//
// 关键设计：
//   - semanticName / description / inputs[] / examples → AI 可见（白名单）
//   - ref / inputMap                            → AI 不可见（黑盒内部）
//   - 新增 probe 只需在 PROBE_CATALOG 加一条，无需改 grammar / CLI / runner
//
// 与 IAP 三轴对齐：
//   - Intent 侧（Blueprint 内 observe）→ 引用 internalRef
//   - Proof 侧（proof.oxn）→ 引用 semanticName，CLI 翻译到 internalRef
//   - AI 永远不直接看到 internalRef（封装边界）
// =============================================================================

export type ProbeInputType = 'string' | 'number' | 'boolean'

export interface ProbeInputDef {
  /** 语义 input 名（AI 可见） */
  name: string
  type: ProbeInputType
  required: boolean
  /** 描述（AI 可见，--input-json 校验时显示） */
  description: string
}

export interface ProbeExample {
  name: string
  inputs: Record<string, string | number | boolean>
}

export interface ProbeCatalogEntry {
  /** 语义名（AI 可见）。如 `fs-exists` / `shell-exec` */
  semanticName: string
  /** 一句话描述（AI 可见） */
  description: string
  /** 输入契约（AI 可见） */
  inputs: ProbeInputDef[]
  /** 用法示例（AI 可见） */
  examples: ProbeExample[]
  /** 内部 ref（AI 不可见，CLI 翻译使用） */
  internalRef: string
  /** input 名翻译表（AI 不可见）：semanticName → internalName */
  inputMap: Record<string, string>
  /** 归属 builtin 类别 (RFC-0015 D4.2 后允许 'oxn' | 'prj') */
  builtin: 'oxn' | 'prj'
  /** v1.1: 关联的 ProgramContext term 名（如 'SourceFile' / 'TestCase'）。
   *  AI 可见——帮助 AI 理解 probe 服务的编程概念。
   *  5a builtin probes 留空（无对应 P1 term）；5b P1 probes 必填。 */
  domainTerm?: string
}

/**
 * PROBE_CATALOG: 唯一真相源。
 * 新增 probe 只需在此加一条（grammars/CLI/runner 自动适配）。
 */
export const PROBE_CATALOG: ProbeCatalogEntry[] = [
  {
    semanticName: 'fs-exists',
    description: 'Check if a file or glob pattern exists at the given path',
    inputs: [
      {
        name: 'path',
        type: 'string',
        required: true,
        description: 'File path or glob pattern to check (e.g. "./dist/index.js")',
      },
    ],
    examples: [
      { name: 'build-output-exists', inputs: { path: './dist/index.js' } },
      { name: 'test-fixture-exists', inputs: { path: './src/__tests__/fixture.json' } },
    ],
    internalRef: '@oxn/probes/fs-exists',
    inputMap: { path: 'pattern' },
    builtin: 'oxn',
  },
  {
    semanticName: 'shell-exec',
    description: 'Execute a shell command and verify exit code (exit 0 → PASS)',
    inputs: [
      {
        name: 'command',
        type: 'string',
        required: true,
        description: 'Shell command to execute (e.g. "bun test")',
      },
      {
        name: 'timeout',
        type: 'number',
        required: false,
        description: 'Timeout in milliseconds, default 30000',
      },
    ],
    examples: [
      { name: 'tests-pass', inputs: { command: 'bun test', timeout: 60000 } },
      { name: 'build-success', inputs: { command: 'bun run build' } },
    ],
    internalRef: '@oxn/probes/shell-exec',
    inputMap: { command: 'command', timeout: 'timeout' },
    builtin: 'oxn',
  },
  {
    // v1.1: catalog 注册（非新实现——infra + kernel 早已存在，仅 catalog 缺失）
    semanticName: 'fs-not-exists',
    description: 'Check that no files match the given path or glob pattern (hits === 0 → PASS)',
    inputs: [
      {
        name: 'path',
        type: 'string',
        required: true,
        description: 'File path or glob pattern to check (should not exist)',
      },
    ],
    examples: [
      { name: 'no-stale-build', inputs: { path: './dist/index.js' } },
      { name: 'no-debug-code', inputs: { path: 'src/console.log' } },
    ],
    internalRef: '@oxn/probes/fs-not-exists',
    inputMap: { path: 'pattern' },
    builtin: 'oxn',
  },
  {
    // v1.1: catalog 注册（fs_match 的语义层 alias，kebab-case 命名）
    // 实际仍是 fs_match 策略，但 AI 看到 'fs-content-match' 比 'fs_match' 更明确
    semanticName: 'fs-content-match',
    description: 'Check file content matches a regex pattern (matched: true → PASS)',
    inputs: [
      {
        name: 'path',
        type: 'string',
        required: true,
        description: 'File path to read',
      },
      {
        name: 'contains',
        type: 'string',
        required: true,
        description: 'Regex pattern to match (e.g. "openxenon" / "^export const \\w+")',
      },
    ],
    examples: [
      { name: 'package-declares-dep', inputs: { path: './package.json', contains: '"openxenon":' } },
      { name: 'file-exports-default', inputs: { path: './dist/index.js', contains: 'export default' } },
    ],
    internalRef: '@oxn/probes/fs-content-match',
    inputMap: { path: 'path', contains: 'contains' },
    builtin: 'oxn',
  },
  {
    // v1.1: 全新 Probe —— 文件可被 JSON 解析
    // 实现见 src/infra/probes/fs-parseable.ts (5a.2)
    semanticName: 'fs-parseable',
    description: 'Check file is parseable (currently supports JSON; valid → PASS)',
    inputs: [
      {
        name: 'path',
        type: 'string',
        required: true,
        description: 'File path to parse (currently only *.json)',
      },
    ],
    examples: [
      { name: 'package-json-valid', inputs: { path: './package.json' } },
      { name: 'tsconfig-valid', inputs: { path: './tsconfig.json' } },
    ],
    internalRef: '@oxn/probes/fs-parseable',
    inputMap: { path: 'path' },
    builtin: 'oxn',
  },
  {
    // v1.1 P1: test-pass — 跑 bun test + 解析退出码 + 简易 pass/fail 统计
    // 复 ProgramContext.TestCase term
    semanticName: 'test-pass',
    description: 'Run bun test and verify all pass (exit 0 → PASS)',
    inputs: [
      {
        name: 'path',
        type: 'string',
        required: false,
        description: 'Test file path or directory (defaults to project root)',
      },
      {
        name: 'pattern',
        type: 'string',
        required: false,
        description: 'Filter pattern for bun test (e.g. "auth")',
      },
      {
        name: 'timeout',
        type: 'number',
        required: false,
        description: 'Timeout in milliseconds, default 120000',
      },
    ],
    examples: [
      { name: 'all-tests-pass', inputs: { timeout: 60000 } },
      { name: 'auth-tests-only', inputs: { path: './tests/auth', pattern: 'auth' } },
    ],
    internalRef: '@oxn/probes/test-pass',
    inputMap: { path: 'path', pattern: 'pattern', timeout: 'timeout' },
    builtin: 'oxn',
    domainTerm: 'TestCase',
  },
  {
    // v1.1 P1: deps-resolved — 验证 package.json 依赖都被 lockfile 解析
    // 复 ProgramContext.Package term。纯 JS，无 spawn。
    semanticName: 'deps-resolved',
    description:
      'Verify all dependencies declared in package.json are resolved by lockfile (missing.length === 0 → PASS)',
    inputs: [
      {
        name: 'packageJson',
        type: 'string',
        required: false,
        description: 'package.json path (defaults to project root)',
      },
      {
        name: 'lockfile',
        type: 'string',
        required: false,
        description: 'Lockfile path (auto-detected: bun.lock > package-lock.json > pnpm-lock.yaml > yarn.lock)',
      },
    ],
    examples: [
      { name: 'default-detect', inputs: {} },
      { name: 'explicit-pkg', inputs: { packageJson: './packages/web/package.json' } },
    ],
    internalRef: '@oxn/probes/deps-resolved',
    inputMap: { packageJson: 'packageJson', lockfile: 'lockfile' },
    builtin: 'oxn',
    domainTerm: 'Package',
  },
  {
    // v1.1 P1: ts-compiles — 跑 tsc --noEmit
    // 复 ProgramContext.SourceFile term（与 lint-check 共享）。
    // Spawn: npx tsc --noEmit [--project tsconfig.json] [path]
    semanticName: 'ts-compiles',
    description: 'Run tsc --noEmit to verify type checking passes (exit 0 → PASS)',
    inputs: [
      {
        name: 'path',
        type: 'string',
        required: false,
        description: 'File or directory to compile (defaults to entire project)',
      },
      {
        name: 'tsconfig',
        type: 'string',
        required: false,
        description: 'tsconfig.json path (defaults to ./tsconfig.json or ./tsconfig.build.json)',
      },
      {
        name: 'timeout',
        type: 'number',
        required: false,
        description: 'Timeout in milliseconds, default 120000',
      },
    ],
    examples: [
      { name: 'whole-project', inputs: { timeout: 60000 } },
      { name: 'specific-file', inputs: { path: './src/foo.ts' } },
    ],
    internalRef: '@oxn/probes/ts-compiles',
    inputMap: { path: 'path', tsconfig: 'tsconfig', timeout: 'timeout' },
    builtin: 'oxn',
    domainTerm: 'SourceFile',
  },
  {
    // v1.1 P1: lint-check — 跑 biome check 验证代码风格
    // 复 ProgramContext.SourceFile term（与 ts-compiles 共享）。
    // 前置依赖：biome (devDep)
    semanticName: 'lint-check',
    description: 'Run biome check to verify code style (exit 0 → PASS; requires biome in project)',
    inputs: [
      {
        name: 'path',
        type: 'string',
        required: false,
        description: 'Path to lint (defaults to project root)',
      },
      {
        name: 'apply',
        type: 'boolean',
        required: false,
        description: 'Whether to auto-apply fixes (--apply, default false)',
      },
      {
        name: 'timeout',
        type: 'number',
        required: false,
        description: 'Timeout in milliseconds, default 60000',
      },
    ],
    examples: [
      { name: 'check-only', inputs: { timeout: 60000 } },
      { name: 'check-and-apply', inputs: { apply: true } },
    ],
    internalRef: '@oxn/probes/lint-check',
    inputMap: { path: 'path', apply: 'apply', timeout: 'timeout' },
    builtin: 'oxn',
    domainTerm: 'SourceFile',
  },
  {
    // v1.1 P1: http-responds — HTTP 请求检查 status
    // 复 ProgramContext.APIEndpoint term。用 Bun fetch（global），
    // 无 spawn。安全：默认 timeout 5s + AbortSignal。
    semanticName: 'http-responds',
    description: 'HTTP request checking status code (status === expectedStatus → PASS; default timeout 5s)',
    inputs: [
      {
        name: 'url',
        type: 'string',
        required: true,
        description: 'URL to request (http/https)',
      },
      {
        name: 'method',
        type: 'string',
        required: false,
        description: 'HTTP method (GET/POST/PUT/DELETE/HEAD, default GET)',
      },
      {
        name: 'expectedStatus',
        type: 'number',
        required: false,
        description: 'Expected status code (default 200)',
      },
      {
        name: 'timeout',
        type: 'number',
        required: false,
        description: 'Timeout in milliseconds, default 5000',
      },
      {
        name: 'body',
        type: 'string',
        required: false,
        description: 'Request body (only meaningful for POST/PUT)',
      },
      {
        name: 'headers',
        type: 'string',
        required: false,
        description: 'Request headers (JSON string, optional)',
      },
    ],
    examples: [
      { name: 'health-check', inputs: { url: 'https://api.example.com/health' } },
      {
        name: 'expect-201',
        inputs: { url: 'https://api.example.com/users', method: 'POST', expectedStatus: 201, body: '{"name":"x"}' },
      },
    ],
    internalRef: '@oxn/probes/http-responds',
    inputMap: {
      url: 'url',
      method: 'method',
      expectedStatus: 'expectedStatus',
      timeout: 'timeout',
      body: 'body',
      headers: 'headers',
    },
    builtin: 'oxn',
    domainTerm: 'APIEndpoint',
  },
  {
    // v1.1 P1: file-exports — 进程隔离 runtime import 提取 exports
    // 复 ProgramContext.Module term。
    // 方案 A（你的审查建议）：await import(path) 运行时分析，零新依赖。
    // 默认 spawn bun run tmp script 隔离副作用（防污染主 runner）。
    semanticName: 'file-exports',
    description: 'Process-isolated runtime import extracting module exports (exports.length > 0 → PASS)',
    inputs: [
      {
        name: 'path',
        type: 'string',
        required: true,
        description: '.ts / .js file path to analyze',
      },
    ],
    examples: [
      { name: 'dist-exports', inputs: { path: './dist/index.js' } },
      { name: 'src-exports', inputs: { path: './src/foo.ts' } },
    ],
    internalRef: '@oxn/probes/file-exports',
    inputMap: { path: 'path' },
    builtin: 'oxn',
    domainTerm: 'Module',
  },
  {
    // v1.2: git-clean — working tree 干净（PoC: git-workflow Blueprint 入口守卫）
    // 复 ProgramContext.WorkingTree term
    semanticName: 'git-clean',
    description: 'Check working tree is clean (no uncommitted changes; clean: true → PASS)',
    inputs: [
      {
        name: 'path',
        type: 'string',
        required: false,
        description: 'Git repository path to check (defaults to current directory)',
      },
      {
        name: 'includeUntracked',
        type: 'boolean',
        required: false,
        description: 'Whether to count untracked files as dirty (default false)',
      },
    ],
    examples: [
      { name: 'default-strict', inputs: {} },
      { name: 'include-untracked', inputs: { includeUntracked: true } },
    ],
    internalRef: '@oxn/probes/git-clean',
    inputMap: { path: 'path', includeUntracked: 'includeUntracked' },
    builtin: 'oxn',
    domainTerm: 'WorkingTree',
  },
  {
    // v1.2: git-branch-exists — 本地分支存在（PoC: git-workflow base 分支守卫）
    semanticName: 'git-branch-exists',
    description: 'Check if a local branch exists (exists: true → PASS)',
    inputs: [
      {
        name: 'branch',
        type: 'string',
        required: true,
        description: 'Local branch name to check (e.g. "main" / "feat/saturn")',
      },
    ],
    examples: [
      { name: 'main-exists', inputs: { branch: 'main' } },
      { name: 'feature-exists', inputs: { branch: 'feat/saturn' } },
    ],
    internalRef: '@oxn/probes/git-branch-exists',
    inputMap: { branch: 'branch' },
    builtin: 'oxn',
    domainTerm: 'Branch',
  },
  {
    // RFC-0015 D4.1: git-status-clean — git-clean 的 verbose alias (给工程师读 verdict 用)
    // @deprecated — use `git-clean` instead. 保留 1 个大版本 (v0.8.x) 兼容期间, v0.9.0 物理删除。
    semanticName: 'git-status-clean',
    description:
      '@deprecated — use `git-clean`. Check git status --porcelain output (same as git-clean; clean: true → PASS)',
    inputs: [
      {
        name: 'path',
        type: 'string',
        required: false,
        description: 'Git repository path to check (defaults to current directory)',
      },
    ],
    examples: [{ name: 'default', inputs: {} }],
    // RFC-0015 D4.1: 保留自 ref — handler/strategy 仍独立注册但语义相同 (alias 兼容);
    //  runner.ts 跑使用 `@oxn/probes/git-status-clean` 走 git_status_clean handler,
    //  与 git-clean 二者跑出同一 outcome. v0.9.0 删除此 entry.
    internalRef: '@oxn/probes/git-status-clean',
    inputMap: { path: 'path' },
    builtin: 'oxn',
    domainTerm: 'WorkingTree',
  },
  {
    // v1.2: git-merge-feasible — 三路合并模拟（PoC 核心：不实际 merge，给可行性证据）
    // 复 ProgramContext.MergeCommit term
    semanticName: 'git-merge-feasible',
    description:
      'Use git merge-tree to determine if work branch can merge into target_branch (no actual merge; can_ff_merge / can_merge_clean → PASS)',
    inputs: [
      {
        name: 'workBranch',
        type: 'string',
        required: true,
        description: 'Work branch name (e.g. "feat/saturn" / "oxn/poc-1")',
      },
      {
        name: 'targetBranch',
        type: 'string',
        required: false,
        description: 'Target branch name (default "current" = current branch)',
      },
      {
        name: 'cwd',
        type: 'string',
        required: false,
        description: 'Git repository path (defaults to current directory)',
      },
    ],
    examples: [
      { name: 'work-into-main', inputs: { workBranch: 'feat/saturn', targetBranch: 'main' } },
      { name: 'work-into-current', inputs: { workBranch: 'feat/saturn' } },
    ],
    internalRef: '@oxn/probes/git-merge-feasible',
    inputMap: { workBranch: 'workBranch', targetBranch: 'targetBranch', cwd: 'cwd' },
    builtin: 'oxn',
    domainTerm: 'MergeCommit',
  },
  {
    // v0.6.2: docs-build — 跑 vitepress build docs 验证文档站点构建通过
    // 由 doc-author / 3 promote blueprint 的 validate slot observe（🆕 v0.7.0 RFC-0027 PR-H：doc-publish 已删除）
    semanticName: 'docs-build',
    description: 'Run `bun run docs:build` (vitepress build) to verify doc site builds (exit 0 → PASS)',
    inputs: [
      {
        name: 'timeout',
        type: 'number',
        required: false,
        description: 'Timeout in milliseconds, default 180000',
      },
    ],
    examples: [{ name: 'default', inputs: {} }],
    // RFC-0015 D4.2: 移至 @prj/ project scope (OXN self-host)
    internalRef: '@prj/probes/docs-build',
    inputMap: { timeout: 'timeout' },
    builtin: 'prj',
  },
  {
    // RFC-0015 D4.2: 移至 @prj/ project scope (heading-skeleton-check OXN-internal — 5 池 spec 是 OXN 项目专属)
    semanticName: 'heading-skeleton-check',
    description:
      'Validate heading skeleton of .openxenon/pools/<pool>/*.md files (H1 mode; pool type determines spec: research / design / issue / audit / journal)',
    inputs: [
      {
        name: 'path',
        type: 'string',
        required: true,
        description: 'File or directory path to validate (recursively collects .md)',
      },
      {
        name: 'pool',
        type: 'string',
        required: true,
        description: 'Pool kind: research / design / issue / audit / journal (determines required H1 spec)',
      },
    ],
    examples: [
      { name: 'research-pool', inputs: { path: './.openxenon/pools/research', pool: 'research' } },
      { name: 'design-pool', inputs: { path: './.openxenon/pools/design', pool: 'design' } },
    ],
    internalRef: '@prj/probes/heading-skeleton-check',
    inputMap: { path: 'path', pool: 'pool' },
    builtin: 'prj',
  },
  {
    // RFC-0015 D4.2: 移至 @prj/ project scope (docs-heading-check — DOCS_CHAPTER_SPEC What→Why→How→参考 OXN 专属)
    semanticName: 'docs-heading-check',
    description:
      'Validate chapter skeleton of docs/{product,dev,rfc}/*.md files (H2 mode: What→Why→How→参考; only files containing ## What)',
    inputs: [
      {
        name: 'path',
        type: 'string',
        required: true,
        description: 'File or directory path to validate (recursively collects .md)',
      },
    ],
    examples: [
      { name: 'product-zh', inputs: { path: './docs/product/zh-cn' } },
      { name: 'dev-zh', inputs: { path: './docs/dev/zh-cn' } },
    ],
    internalRef: '@prj/probes/docs-heading-check',
    inputMap: { path: 'path' },
    builtin: 'prj',
  },
  {
    // RFC-0015 D4.2: 移至 @prj/ project scope (doc-boundary 6 条规则硬编码 OXN 目录结构)
    semanticName: 'doc-boundary',
    description:
      'Document boundary guard (6 rules: product→openxenon / dev→drafts / dev→assets / rfc→drafts/rfc / drafts→drafts/rfc / drafts/rfc→assets)',
    inputs: [
      {
        name: 'root',
        type: 'string',
        required: false,
        description: 'Project root (default process.cwd())',
      },
    ],
    examples: [{ name: 'default', inputs: {} }],
    internalRef: '@prj/probes/doc-boundary',
    inputMap: { root: 'root' },
    builtin: 'prj',
  },
  {
    // RFC-0015 D4.2+D6.1: boundary-guard — OXN-internal 生命周期 probe (@prj/ scope)
    //   校验 work.md ## Tasks 段每个 task 的 blueprint/domain/boundary/deps 引用
    //   builtin domain 列表运行时从 @oxn/domains/ registry 动态读取 (D6.1 修复)
    semanticName: 'boundary-guard',
    description: 'Validate each work.md ## Tasks blueprint/domain/boundary/deps references resolve to existing assets',
    inputs: [
      {
        name: 'root',
        type: 'string',
        required: false,
        description: 'Project root directory (defaults to process.cwd())',
      },
    ],
    examples: [{ name: 'default', inputs: {} }],
    internalRef: '@prj/probes/boundary-guard',
    inputMap: { root: 'root' },
    builtin: 'prj',
  },
  {
    // RFC-0015 D4.2+D6.2: stale-draft-check — OXN-internal 生命周期 probe (@prj/ scope)
    //   原 stale-draft-check (扫已废弃 .openxenon/pools/) 改造为扫 .openxenon/drafts/
    semanticName: 'stale-draft-check',
    description: 'Validate drafts .md references[] all point to active assets (not archived/missing)',
    inputs: [
      {
        name: 'root',
        type: 'string',
        required: false,
        description: 'Project root directory (defaults to process.cwd())',
      },
    ],
    examples: [{ name: 'default', inputs: {} }],
    internalRef: '@prj/probes/stale-draft-check',
    inputMap: { root: 'root' },
    builtin: 'prj',
  },
  {
    // RFC-0015 D4.2+D6.3: asset-migrate-check — OXN-internal 生命周期 probe (@prj/ scope)
    //   校验 .archived/assets 完整性; D6.3 修复: 复用 reference-checker.listAssetReferences (删除自实现)
    semanticName: 'asset-migrate-check',
    description: 'Validate .archived/assets completeness (.metadata.json + ## Archival marker + no forward ref)',
    inputs: [
      {
        name: 'root',
        type: 'string',
        required: false,
        description: 'Project root directory (defaults to process.cwd())',
      },
    ],
    examples: [{ name: 'default', inputs: {} }],
    internalRef: '@prj/probes/asset-migrate-check',
    inputMap: { root: 'root' },
    builtin: 'prj',
  },
  {
    // RFC-0015 D4.2+D6.4: oxn-runtime-version — OXN-internal 生命周期 probe (@prj/ scope)
    //   校验 config.runtime.oxnVersion 与 engine version; D6.4 修复: 从 ProbeContext.engineVersion 注入 (非 import.meta.url 上溯)
    semanticName: 'oxn-runtime-version',
    description:
      'Validate project expected runtime version (config.runtime.oxnVersion) matches engine package.json version',
    inputs: [
      {
        name: 'root',
        type: 'string',
        required: false,
        description: 'Project root directory (defaults to process.cwd())',
      },
    ],
    examples: [{ name: 'default', inputs: {} }],
    internalRef: '@prj/probes/oxn-runtime-version',
    inputMap: { root: 'root' },
    builtin: 'prj',
  },
  // ========================================================================
  // RFC-0016 D1-D4: 4 通用 builtin probe (@oxn/ scope; 任何项目可用)
  // ========================================================================
  {
    // RFC-0016 D1: file-hash — 文件 SHA-256 匹配预期 hash
    semanticName: 'file-hash',
    description: 'Verify file SHA-256 (or other algorithm) matches expected hash',
    inputs: [
      {
        name: 'file',
        type: 'string',
        required: true,
        description: 'File path (relative to project root or absolute)',
      },
      {
        name: 'expectedHash',
        type: 'string',
        required: true,
        description: 'Expected hash (hex string)',
      },
      {
        name: 'algorithm',
        type: 'string',
        required: false,
        description: 'Hash algorithm (sha256/sha512/md5/sha1, default sha256)',
      },
    ],
    examples: [{ name: 'sha256-check', inputs: { file: './package.json', expectedHash: 'abc123...' } }],
    internalRef: '@oxn/probes/file-hash',
    inputMap: { file: 'file', expectedHash: 'expectedHash', algorithm: 'algorithm' },
    builtin: 'oxn',
    domainTerm: 'SourceFile',
  },
  {
    // RFC-0016 D2: test-coverage — 覆盖率 ≥ 阈值 (lines/branches/functions)
    semanticName: 'test-coverage',
    description: 'Verify test coverage (lines/branches/functions) meets thresholds',
    inputs: [
      {
        name: 'minLinesPct',
        type: 'number',
        required: true,
        description: 'Minimum lines coverage percentage (0-100)',
      },
      {
        name: 'minBranchesPct',
        type: 'number',
        required: false,
        description: 'Minimum branches coverage percentage (0-100)',
      },
      {
        name: 'minFunctionsPct',
        type: 'number',
        required: false,
        description: 'Minimum functions coverage percentage (0-100)',
      },
      {
        name: 'runner',
        type: 'string',
        required: false,
        description: 'Test runner (bun/jest/vitest, default bun; v0.7.0 expand)',
      },
    ],
    examples: [
      { name: 'lines-80', inputs: { minLinesPct: 80 } },
      { name: 'strict', inputs: { minLinesPct: 95, minBranchesPct: 85, minFunctionsPct: 90 } },
    ],
    internalRef: '@oxn/probes/test-coverage',
    inputMap: {
      minLinesPct: 'minLinesPct',
      minBranchesPct: 'minBranchesPct',
      minFunctionsPct: 'minFunctionsPct',
      runner: 'runner',
    },
    builtin: 'oxn',
    domainTerm: 'TestCase',
  },
  {
    // RFC-0016 D3: json-path — JSONPath 值匹配预期
    semanticName: 'json-path',
    description: 'Verify JSONPath value matches expected (simplified JSONPath subset)',
    inputs: [
      {
        name: 'file',
        type: 'string',
        required: true,
        description: 'JSON file path',
      },
      {
        name: 'path',
        type: 'string',
        required: true,
        description: 'Simplified JSONPath expression ($.a.b[0][*])',
      },
      {
        name: 'expected',
        type: 'string',
        required: true,
        description: 'Expected value (JSON-serialized; deep equality in handler)',
      },
    ],
    examples: [
      { name: 'package-name', inputs: { file: './package.json', path: '$.name', expected: 'openxenon' } },
      {
        name: 'tsconfig-strict',
        inputs: { file: './tsconfig.json', path: '$.compilerOptions.strict', expected: true },
      },
    ],
    internalRef: '@oxn/probes/json-path',
    inputMap: { file: 'file', path: 'path', expected: 'expected' },
    builtin: 'oxn',
    domainTerm: 'ConfigFile',
  },
  {
    // RFC-0016 D4: port-listening — 端口正在监听
    semanticName: 'port-listening',
    description: 'Verify TCP port is listening (Node net.connect cross-platform)',
    inputs: [
      {
        name: 'host',
        type: 'string',
        required: true,
        description: 'Host (localhost / 127.0.0.1 / 0.0.0.0)',
      },
      {
        name: 'port',
        type: 'number',
        required: true,
        description: 'Port number (1-65535)',
      },
      {
        name: 'timeout',
        type: 'number',
        required: false,
        description: 'Connection timeout in milliseconds (default 3000)',
      },
    ],
    examples: [
      { name: 'localhost-3000', inputs: { host: 'localhost', port: 3000 } },
      { name: 'dev-server-check', inputs: { host: '127.0.0.1', port: 5173, timeout: 5000 } },
    ],
    internalRef: '@oxn/probes/port-listening',
    inputMap: { host: 'host', port: 'port', timeout: 'timeout' },
    builtin: 'oxn',
    domainTerm: 'APIEndpoint',
  },
]

// ---------------------------------------------------------------------------
// 查询 API
// ---------------------------------------------------------------------------

/** 列出所有 probe（AI 调 `probe list` 时返回的形态） */
export function listProbesSummary(): Array<{
  name: string
  description: string
  requiredInputs: string[]
}> {
  return PROBE_CATALOG.map((p) => ({
    name: p.semanticName,
    description: p.description,
    requiredInputs: p.inputs.filter((i) => i.required).map((i) => i.name),
  }))
}

/** AI 调 `probe describe <name>` 时返回的形态 */
export function describeProbe(name: string): {
  name: string
  description: string
  inputs: ProbeInputDef[]
  examples: ProbeExample[]
} | null {
  const entry = PROBE_CATALOG.find((p) => p.semanticName === name)
  if (!entry) return null
  return {
    name: entry.semanticName,
    description: entry.description,
    inputs: entry.inputs,
    examples: entry.examples,
  }
}

/** 内部用：从 catalog 取 entry（含 internalRef + inputMap） */
export function getCatalogEntry(name: string): ProbeCatalogEntry | null {
  return PROBE_CATALOG.find((p) => p.semanticName === name) ?? null
}

/** 内部用：从 internalRef 反查 semanticName（frozen.json 用） */
export function getSemanticNameByInternalRef(internalRef: string): string | null {
  const entry = PROBE_CATALOG.find((p) => p.internalRef === internalRef)
  return entry?.semanticName ?? null
}

// ---------------------------------------------------------------------------
// 翻译层
// ---------------------------------------------------------------------------

import { IAPError, IAPAction } from '../contracts/iap-error'

export interface TranslatedProbe {
  internalRef: string
  internalParams: Record<string, unknown>
}

/**
 * 把 AI 传来的 `{semanticName, inputs: Record<string, primitive>}` 翻译成
 * `internalRef + internalParams`（CLI/runner 内部使用）。
 *
 *   1. 校验 semanticName 存在
 *   2. 校验必填 input 都齐
 *   3. 校验 input 类型
 *   4. 应用 inputMap 翻译 key 名
 *
 * 错误契约（v1.0 双轨制）：
 *   抛 `IAPError('PROOF', 'INFRA_FAIL_PROBE_CATALOG', YIELD_TO_HUMAN, ...)`，CLI 顶层 catch
 *   转成 `{code: 'INFRA_FAIL_PROBE_CATALOG', axis, action, context, message}` 输出。
 *   4 个老 OXN_PROBE_* 码（UNKNOWN / INPUT_MISSING / INPUT_TYPE / INPUT_UNKNOWN）
 *   合并为 1 个 IAPError（语义统一为"Probe Infra 跑不到，AI 检查输入"）；
 *   具体原因走 `context.reason` 字段。
 */
export function translateProbeInputs(semanticName: string, inputs: Record<string, unknown>): TranslatedProbe {
  const entry = getCatalogEntry(semanticName)
  if (!entry) {
    throw new IAPError(
      'PROOF',
      'INFRA_FAIL_PROBE_CATALOG',
      IAPAction.YIELD_TO_HUMAN,
      `unknown probe: ${semanticName}. Run \`oxn proof probe list\` to see available probes.`,
      { probe: semanticName, reason: 'unknown_semantic_name' },
    )
  }

  const internalParams: Record<string, unknown> = {}

  for (const inputDef of entry.inputs) {
    const raw = inputs[inputDef.name]

    if (raw === undefined || raw === null) {
      if (inputDef.required) {
        throw new IAPError(
          'PROOF',
          'INFRA_FAIL_PROBE_CATALOG',
          IAPAction.YIELD_TO_HUMAN,
          `probe "${semanticName}" requires input "${inputDef.name}" (${inputDef.description})`,
          {
            probe: semanticName,
            input: inputDef.name,
            reason: 'input_missing',
          },
        )
      }
      continue
    }

    // 类型校验
    if (inputDef.type === 'string' && typeof raw !== 'string') {
      throw new IAPError(
        'PROOF',
        'INFRA_FAIL_PROBE_CATALOG',
        IAPAction.YIELD_TO_HUMAN,
        `probe "${semanticName}" input "${inputDef.name}" must be string, got ${typeof raw}`,
        {
          probe: semanticName,
          input: inputDef.name,
          actualType: typeof raw,
          expectedType: 'string',
          reason: 'input_type_mismatch',
        },
      )
    }
    if (inputDef.type === 'number' && typeof raw !== 'number') {
      throw new IAPError(
        'PROOF',
        'INFRA_FAIL_PROBE_CATALOG',
        IAPAction.YIELD_TO_HUMAN,
        `probe "${semanticName}" input "${inputDef.name}" must be number, got ${typeof raw}`,
        {
          probe: semanticName,
          input: inputDef.name,
          actualType: typeof raw,
          expectedType: 'number',
          reason: 'input_type_mismatch',
        },
      )
    }
    if (inputDef.type === 'boolean' && typeof raw !== 'boolean') {
      throw new IAPError(
        'PROOF',
        'INFRA_FAIL_PROBE_CATALOG',
        IAPAction.YIELD_TO_HUMAN,
        `probe "${semanticName}" input "${inputDef.name}" must be boolean, got ${typeof raw}`,
        {
          probe: semanticName,
          input: inputDef.name,
          actualType: typeof raw,
          expectedType: 'boolean',
          reason: 'input_type_mismatch',
        },
      )
    }

    // 翻译 key 名：semantic → internal
    const internalName = entry.inputMap[inputDef.name] ?? inputDef.name
    internalParams[internalName] = raw
  }

  return {
    internalRef: entry.internalRef,
    internalParams,
  }
}

// ---------------------------------------------------------------------------
// Schema 一致性自检（catalog 内部不变量）
// ---------------------------------------------------------------------------

/**
 * 启动时一次性检查：所有 inputMap keys 都必须在 inputs[] 里存在。
 * 防止 catalog 写错时 late fail。
 */
export function assertCatalogConsistency(): { ok: true } | { ok: false; error: string } {
  for (const entry of PROBE_CATALOG) {
    // 1. semanticName 唯一
    const dup = PROBE_CATALOG.find((e) => e !== entry && e.semanticName === entry.semanticName)
    if (dup) {
      return { ok: false, error: `duplicate semanticName: ${entry.semanticName}` }
    }
    // 2. inputs[] name 唯一
    const seen = new Set<string>()
    for (const inp of entry.inputs) {
      if (seen.has(inp.name)) {
        return { ok: false, error: `probe "${entry.semanticName}" has duplicate input "${inp.name}"` }
      }
      seen.add(inp.name)
    }
    // 3. inputMap keys ⊆ inputs[].names
    for (const k of Object.keys(entry.inputMap)) {
      if (!seen.has(k)) {
        return { ok: false, error: `probe "${entry.semanticName}" inputMap has key "${k}" not in inputs[]` }
      }
    }
  }
  return { ok: true }
}
