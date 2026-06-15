# 0.2.0 — Sprint 3c T6: Probe Signal Taint v2 PR-3 ProviderRegistry + 4 内置 Provider

> 父文档: `.openxenon/forges/2026-06-14-probe-signal-taint-design.md` v2 §10 PR-3
> Sprint 3c 任务 T6, probe-taint v2 6 PR 系列的第 3 PR (Provider 落地)
> 前置: T1+T2+T3+T4+T5 已合入主分支

## 变更

### 1. Provider 中心 `src/infra/registry/provider-registry.ts` (~280 行)

L1-Infra 层, 纯洁性约束:
- 可依赖 L0-Contract (IO Primitive 类型) + L1-Infra 自身
- 不得 import L0-Processor / L2+ / L3 层

```ts
export type ProviderStatus = 'OK' | 'CORRUPTED' | 'MISSING' | 'UNREGISTERED'

export interface ProviderManifest {
  name: string
  version: string
  schemes: string[]                // ['file://'] / ['http://', 'https://'] / ['shell://'] / ['git://']
  source: 'builtin' | 'cli-add'    // v2.0 仅 builtin
  expectedHash: string              // SHA-256
  cachePath: string                 // .openxenon/.cache/third-party-probes/<name>.ts
  registeredAt: number
}

export interface InfraProvider {
  readonly name: string
  readonly schemes: readonly string[]
  ioStat(req): Promise<{ result, interference }>
  ioRead(req): Promise<{ result, interference }>
  ioExec(req): Promise<{ result, interference }>
}

export class ProviderRegistry {
  bootstrapFromDisk(registryJsonPath, cacheDir): { ok, corrupted, missing }
  // ↑ CORRUPTED / MISSING **不抛错** (父文档 §5.1 明确)
  checkWorkDependencies(schemes[]): { ok, blocked: Array<{scheme, reason}> }
  getProvider(scheme) / getStatus(scheme) / getManifest(name) / list()
}

export function getProviderRegistry(): ProviderRegistry  // 单例
export function resetProviderRegistry(): void            // 测试用
```

### 2. 4 内置 Provider

#### FileProvider (`file://`)

- `ioStat`: `lstatSync` (而非 `statSync`, 需要检测 symlink 本身) + 4 项 flag 检测:
  - `symlink`: `lstat.isSymbolicLink()`
  - `cache_path`: CACHE_PATH_PATTERNS 3 项 (`.cache` / `node_modules` / `.git/objects`)
  - `just_modified`: mtimeMs 距 now < 1000ms
  - `permission_denied`: mode & 0o400 === 0
- `ioRead`: `readFileSync` + maxBytes 截断 (utf-8 / base64)
- `ioExec`: 抛 IAPError `PROVIDER_UNSUPPORTED` (用 `shell://` URI)

#### HttpProvider (`http://`, `https://`)

- WAF 头黑名单 6 项硬编码:
  - `cf-ray` (Cloudflare)
  - `x-sucuri-id` (Sucuri)
  - `x-akamai-transformed` (Akamai)
  - `x-imperva-id` (Imperva)
  - `x-azure-ref` (Azure WAF)
  - `x-aws-waf-token` (AWS WAF)
- 干涉 flag 检测:
  - `waf_detected`: 命中 WAF 头
  - `cdn_cache`: `age` 头 (非 0) 或 `x-cache: HIT`
  - `response_truncated`: `content-length` > maxBytes
  - `network_timeout`: fetch AbortError
- 测试用: 注入 `_fetchFn` 覆盖 `globalThis.fetch` (无需 mock 库)
- `ioStat`: HEAD (仅取 headers) / `ioRead`: GET + maxBytes 截断 / `ioExec`: 抛 IAPError

#### ShellProvider (`shell://`)

- 委派 `src/infra/probes/shell-exec.ts:executeShellExec`
- 转换 `ShellExecResult` (success/stdout/stderr/exitCode/durationMs/error) → `IOExecResult` (exitCode/stdout/stderr/durationMs) + `IOInterference`
- 干涉 flag:
  - `sandbox_violation`: `Invalid command` (命中 DANGEROUS_PATTERNS)
  - `network_timeout`: `timeout` 触发
  - `unknown`: 其他 error
- `ioStat` / `ioRead`: 抛 IAPError `PROVIDER_UNSUPPORTED` (用 `file://`)

#### GitProvider (`git://`)

- `ioStat`: 委派 `git-status-clean` + 从 stdout 检测 `detached_head` + `.git/shallow` 文件存在 → `shallow_clone`
- `ioRead`: 委派 `git-branch-exists`, branchName 从 `git://<name>` 解析, text = `'true'` / `'false'`
- `ioExec`: 委派 `git-merge-feasible`, command 形如 `'workBranch:targetBranch'`, exitCode 由 `status` 映射 (can_ff_merge / can_merge_clean → 0)

### 3. IAPError 扩展 `src/kernel/contracts/iap-error.ts`

```diff
- export type IAPAxis = 'INTENT' | 'ALIGN' | 'PROOF'
+ export type IAPAxis = 'INTENT' | 'ALIGN' | 'PROOF' | 'INFRA'

- export type IAPErrorCode = 'INFRA_FAIL' | 'CRASH' | 'CHECKLIST_MISSING' | 'UNDEFINED_TERM' | 'NAME_FILE_MISMATCH'
+ export type IAPErrorCode = 'INFRA_FAIL' | 'CRASH' | 'CHECKLIST_MISSING' | 'UNDEFINED_TERM' | 'NAME_FILE_MISMATCH' | 'PROVIDER_DUPLICATE' | 'PROVIDER_UNSUPPORTED'
```

3 轴 → 4 轴; 5 码 → 7 码。新增 'INFRA' 轴承载 Provider 错误 (避免误用 'PROOF/INFRA_FAIL')。

### 4. 单元测试 (父文档 T3.6 表 10+ case, 实际 18 case)

`src/infra/providers/__tests__/file-provider.test.ts` (5 case):
1. 普通文件 → flags: []
2. Symlink → flags 包含 symlink
3. Cache path → flags 包含 cache_path
4. Just modified (mtimeMs 距 now < 1000) → flags 包含 just_modified
5. ioExec 抛 IAPError (file provider 不实现)

`src/infra/providers/__tests__/http-provider.test.ts` (6 case):
1. WAF 拦截 (cf-ray 头) → waf_detected
1b. WAF 拦截 (x-sucuri-id 头) → waf_detected
2. CDN 缓存 (age 头) → cdn_cache
2b. CDN 缓存 (x-cache: HIT) → cdn_cache
3. 响应截断 (content-length > maxBytes) → response_truncated
4. ioExec 抛 IAPError (http provider 不实现)

`src/infra/registry/__tests__/provider-registry.test.ts` (7 case):
1. bootstrap 成功 (4 ok, 0 corrupted, 0 missing)
2. 1 篡改 → 3 ok + 1 CORRUPTED, **不抛错**
3. 1 删 → 3 ok + 1 MISSING, **不抛错**
4. checkWorkDependencies: 全部 OK → ok=true
5. checkWorkDependencies: CORRUPTED scheme → blocked
6. register 重复 name → 抛 IAPError
7. getProvider / getStatus / getManifest / list 基本查询

### 5. L1-Infra 架构合规修复

- 6 处 import 改用 `'../../kernel/index'` (kernel barrel) 而非 `'../../kernel/contracts/iap-error'`
- validate-dependencies.ts 0 violations (249 文件 784 imports)
- 4 Provider 互不耦合, 各自独立 mock 测试通过

## 指标

- 测试: 1276 → **1294** (+18: 5 file + 6 http + 7 registry)
- biome: 0 warnings
- L0–L3 依赖违规: 0
- 14 个 builtin probe 透传: 不变 (T6 不动 verdict strategies)
- 行为变化: 新增 InfraProvider 抽象 + 4 Provider 实现; IAPError 字典从 3 轴 / 5 码扩展为 4 轴 / 7 码
- 端到端 CLI work run + proof show: 仍正常 (无回归)

## 风险

| 风险 | 等级 | 缓解 |
|---|---|---|
| WAF 头黑名单不全 | 中 | 父文档 §13 P2 议题, 监控生产环境拦截数据后扩 |
| FileProvider 性能 (每次 stat 都检查 symlink/cache) | 低 | lstat 1 次 syscall, 3 regex 1 次 |
| 4 Provider 接口签名不一致 | 中 | 严格按 InfraProvider 接口实现; typecheck 守护 |
| ShellProvider 把 shell-exec 硬编码命令检查转译 | 中 | 复用 validateCommand, 不重新实现 |
| GitProvider stdout 文本检测 detached_head 脆弱 | 中 | 父文档未规定算法, 文本匹配是 PoC 阶段合理选择 |
| lstat vs stat 选择 (lstat 检测 symlink) | 低 | 测试覆盖 symlink case 2 守护 |
| IAPError 字典扩展破坏旧 consumer | 低 | 旧 consumer 用 'PROOF' / 'ALIGN' / 'INTENT' 不变, 新 'INFRA' 轴是新概念 |
| 2 个 pre-existing work-run-diagnostics e2e flake | 低 | 单跑通过, 不在 T6 范围 |

## 关联

- 上游: T1 (t1a+t1b) + T2 + T3 + T4 + T5 已合入主分支
- 下游 [sprint-3d]: PR-4 沙箱 CLI 在本 PR 的 InfraProvider 接口基础上实现沙箱验证 (FileProvider.ioExec 抛 IAPError 是 PoC 起点)
- 下游 [sprint-5a]: PR-5 Daemon 启动时调 `bootstrapFromDisk()` 校验 4 Provider
- 依赖外部: `src/infra/probes/shell-exec.ts` + `src/infra/probes/git-*.ts` + `src/infra/probes/fs-*.ts` 已存在

Refs: .openxenon/forges/sprints/sprint-3c/2026-06-15-probe-taint-registry-providers-pr3.md
Refs: .openxenon/forges/2026-06-14-probe-signal-taint-design.md v2
Refs: .openxenon/forges/sprints/EXECUTION-ORDER.md
