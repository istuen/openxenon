# 0.2.0 — Sprint 3d T7: Probe Signal Taint v2 PR-4 沙箱验证 + `oxn probe add` CLI

> 父文档: `.openxenon/forges/2026-06-14-probe-signal-taint-design.md` v2 §10 PR-4
> Sprint 3d 任务 T7, probe-taint v2 6 PR 系列的第 4 PR (v2 核心 — 沙箱)
> 前置: T1+T2+T3+T4+T5+T6 已合入主分支
> ⚠ PoC 闸门: Bun vm.SourceTextModule PoC 通过 (方案 A 继续, 不降级)

## 变更

### 0. PoC 闸门通过 `bun-poc/spike-t7-sandbox/`

4/4 验证矩阵 (Bun 1.3.10 runtime):
- ✅ 合法 S3 Provider 加载 + `ioStat` runtime 调用
- ✅ `require('fs/promises')` 拦截 (沙箱无 `require` 全局)
- ✅ `process.exit(1)` 拦截 (沙箱无 `process` 全局)
- ✅ `globalThis.fetch()` 拦截 (沙箱 context 不放 fetch)

**关键发现**:
1. Bun `vm.SourceTextModule` 完美支持 ESM 沙箱 (TS 转译后 JS 作为 ES Module)
2. Bun 沙箱**自动隔离** `process` (比 Node 严格)
3. ESM default export 的 class 经 `new exported()` 实例化后保留所有成员
4. 沙箱 context 不放 `globalThis.fetch` 即拦截 fetch

决策: **方案 A 继续**, 不降级方案 B (Worker) / C (Bun.spawn) / D (推迟 PR-4)。

### 1. 沙箱引擎 `src/cli/probe-sandbox.ts` (~270 行)

L3-CLI 层, 纯洁性约束: 可依赖 L0-Contract + L1-Infra 异步 fs + L3 自身。

```ts
export const FORBIDDEN_GLOBALS = [
  'process.exit', 'process.kill', 'process.abort',
  'require', 'module', 'exports', '__dirname', '__filename',
  'globalThis.fetch',
] as const

export const FORBIDDEN_MODULES = [
  'fs', 'fs/promises', 'child_process', 'net', 'http', 'https',
  'dgram', 'cluster', 'worker_threads', 'vm', 'inspector',
] as const

export async function sandboxValidate(
  sourcePath: string,
  expectedSchemes: string[],
): Promise<SandboxResult>

// 8 步流程:
//   1. readFile (TS 源)
//   2. bunTranspile (Bun.Transpiler loader: 'ts' → JS)
//   3. vm.createContext 严格白名单 (codeGeneration: { strings: false, wasm: false })
//   4. new vm.SourceTextModule(js, { context, identifier, initializeImportMeta })
//   5. module.link() 拦截 module specifier (FORBIDDEN_MODULES)
//   6. module.evaluate()
//   7. namespace.default 拿 class (new 实例化) / object
//   8. isInfraProvider 鸭子类型检测 + schemes 一致性 + runtime ioStat 验证
```

**关键技巧**:
- ESM class default export: `new (exported as new () => InfraProvider)()`
- Bun 沙箱无 process 全局 → `process.exit()` 在沙箱内 throw `process is not defined`
- `link()` 抛 `sandbox_violation: module X is forbidden` 阻断 forbidden module 导入
- 越界 → `flags: ['sandbox_violation']` + 抛 IAPError `INFRA/SANDBOX_REJECTED`

### 2. 注册表存储 `src/cli/probe-registry-store.ts` (~140 行)

```ts
export async function registryRead(projectRoot: string): Promise<ProviderManifest[]>
export async function registryUpsert(projectRoot: string, manifest: ProviderManifest): Promise<void>
export async function registryRemove(projectRoot: string, name: string): Promise<boolean>

// 物理路径: .openxenon/probes/registry.json
// Schema v1: { version: 1, providers: ProviderManifest[] }
// Degraded mode: 不存在 / 损坏 → [] (不阻断)
// 校验 cachePath 物理一致
```

### 3. `oxn probe add` CLI `src/cli/probe-add.ts` (~175 行)

4 步流程 (任一失败回滚):
```
1. fetchSource(args.source)
   ├── http(s)://URL → fetch().text()
   └── 本地路径 → readFile()
2. 落盘 0o644 立即 0o444 (写权独占, 参照 frozen-immutable)
3. sandboxValidate(cachePath, expectedSchemes)
   ├── ok=true  → 进 4
   └── ok=false → 删 cachePath, 抛 IAPError PROOF/PROBE_INVALID
4. registryUpsert(projectRoot, { name, version, schemes, source: 'cli-add', expectedHash, cachePath, registeredAt })
```

CLI 注册 (`src/cli/index.ts` subCommands): `probe: () => import('./probe')` → `probeAddSubcommand` (本 PR 仅暴露 add, list/remove/update 计划 PR-5/6 补)

### 4. Infrastructure 扩展

`src/infra/filesystem-async.ts`:
- 加 `chmod` / `unlink` re-export (供 probe-sandbox / probe-registry-store 用)

`src/kernel/contracts/iap-error.ts`:
- IAPErrorCode 7 → 9: 加 `'SANDBOX_REJECTED'` (INFRA 轴) + `'PROBE_INVALID'` (PROOF 轴)
- 'SANDBOX_REJECTED' 给沙箱拦截用, 'PROBE_INVALID' 给 probe 校验失败用

### 5. 单元 + E2E 测试 (父文档 T4.4 + T4.5 表 11 case)

`src/cli/__tests__/probe-sandbox.test.ts` (6 case):
1. 合法 S3 Provider → ok=true + flags=[] + provider.name='s3' + schemes 一致
2. 合法 Provider 但 schemes 不匹配 → reject (missing scheme "ftp://")
3. 越界 require('fs/promises') → ok=false + flags=[sandbox_violation] (evaluate 阶段 throw)
4. 越界 process.exit(1) → ok=false + flags=[sandbox_violation] (runtime 'process is not defined')
5. 越界 globalThis.fetch() → ok=false + flags=[sandbox_violation] (runtime 'globalThis.fetch is not a function')
6. 空 default export → reject 'missing default export / InfraProvider'

`src/cli/__tests__/probe-add-e2e.test.ts` (5 case):
1. 合法 s3 Provider → sandbox ok + registry 写 s3 entry + cachePath 0o444
2. 越界 evil provider (require fs) → sandbox reject + 不写 registry + IAPError PROOF/PROBE_INVALID
3. 未实现 InfraProvider empty.ts → sandbox reject + 不写 registry
4. registry.json 不存在 → registryRead 返 [] (degraded mode)
5. registryUpsert 写完后 json 物理存在 + format 正确 (version=1, providers[0].name 等)

Fixtures `src/cli/__tests__/fixtures/` (5):
- `sample-s3-provider.ts` (合法)
- `evil-provider.ts` (require 'fs/promises')
- `evil-exit-provider.ts` (process.exit)
- `evil-fetch-provider.ts` (globalThis.fetch)
- `empty-provider.ts` (空 default export)

### 6. PoC 资产 `bun-poc/spike-t7-sandbox/`

- `vm-source-text-module.ts`: 4 类场景 sandboxLoad 测试 (合法 + 3 越界)
- `RESULT.md`: 闸门决策记录 + 关键发现 (Bun 沙箱严格隔离 process / require / fetch)
- 作为后续 Bun 升级的回归基线 (Bun 行为变化时重跑验证)

## 指标

- 测试: 1299 → **1310** (+11: 6 sandbox + 5 e2e)
- biome: 0 warnings
- L0–L3 依赖违规: 0 (validate-dependencies.ts 253 文件 804 imports)
- 14 个 builtin probe 透传: 不变 (T7 不动 verdict strategies)
- 行为变化:
  - 新增 `oxn probe` CLI 子命令 (本 PR 仅 add)
  - 新增沙箱验证能力 (第三方 Provider 必须过沙箱)
  - IAPError 字典 7 码 → 9 码 (加 SANDBOX_REJECTED + PROBE_INVALID)
- 端到端 CLI 验证: 合法 s3 add → registry.json 写 + cachePath 0o444; 越界 evil → 拦截; 未实现 empty → 拦截

## 风险

| 风险 | 等级 | 缓解 |
|---|---|---|
| Bun vm.SourceTextModule 对 TS 转译行为不兼容 | 高 | **PoC 已通过**, 4/4 验证矩阵全绿 |
| 沙箱被绕过 (globalThis 反射) | 中 | `codeGeneration: { strings: false, wasm: false }` + context 严格白名单 |
| 第三方 Provider 死循环 | 中 | PoC 阶段无超时 (PoC 后可加 AbortController) |
| WAF 头黑名单不全 | 中 | PoC 阶段不实现 (复用 PR-3 黑名单时考虑) |
| 沙箱 link 时机问题 (async 动态 import) | 中 | PoC 验证 + 4 case 全过 |
| ESM class default export 实例化失败 | 中 | TS 类型断言 + 鸭子类型检测 + runtime ioStat 试调 |
| L3-CLI 架构合规 (no fs 直引) | 中 | 3 新文件 0 fs 直引, 走 filesystem-async (T1a 约定) |
| 2 个 pre-existing e2e flake (work-run-diagnostics + domain-index) | 低 | 单跑通过, 不在 T7 范围 |

## 关联

- 上游: T1 (t1a+t1b) + T2 + T3 + T4 + T5 + T6 已合入主分支
- 下游 [sprint-4 计划]: PR-5 daemon 启动期**只读** `.openxenon/probes/registry.json` + 校验 Hash
- 下游 [sprint-4 计划]: PR-5 补 `oxn probe list` / `remove` / `update` 子命令
- 依赖外部: Bun runtime + `vm` 模块 + Bun.Transpiler (内置 TS loader, 无外部 tsc 依赖)
- **v2 核心倒置**: v1 的"启动期拒启"在 v2 改为"标 CORRUPTED 不阻断 Daemon", 本 PR 是该倒置的实现基础

Refs: .openxenon/forges/sprints/sprint-3d/2026-06-15-probe-taint-sandbox-cli-pr4.md
Refs: bun-poc/spike-t7-sandbox/RESULT.md
Refs: .openxenon/forges/2026-06-14-probe-signal-taint-design.md v2
Refs: .openxenon/forges/sprints/EXECUTION-ORDER.md
