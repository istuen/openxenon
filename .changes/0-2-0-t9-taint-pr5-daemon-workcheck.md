# 0.2.0 — Sprint 5a T9: Probe Signal Taint v2 PR-5 Daemon 冷加载 + Work 前置校验

> 父文档: `.openxenon/forges/2026-06-14-probe-signal-taint-design.md` v2 §10 PR-5
> Sprint 5a 任务 T9, probe-taint v2 6 PR 系列的第 5 PR (Daemon + Work check 收尾)
> 前置: T1+T2+T3+T4+T5+T6+T7 已合入主分支

## 变更

### 1. L1-Infra 新增 `src/infra/registry/daemon-startup.ts` (~75 行)

```ts
export interface DaemonStartupResult {
  ok: boolean
  bootstrap: { ok: number; corrupted: number; missing: number }
  warnings: string[]
}

export async function daemonStartup(projectRoot: string): Promise<DaemonStartupResult>
// 1. 注册 4 builtin (FileProvider/HttpProvider/ShellProvider/GitProvider) 幂等
// 2. 调 reg.bootstrapFromDisk(registryPath, cacheDir) 校验 hash
// 3. 收集 warnings[] (corrupted / missing) 返, 不抛错
```

**关键**: 启动期**只读 + 不触网**, 坏文件标 CORRUPTED 不阻断 (v2 核心倒置 vs v1 启动期拒启)。

启用于 `src/daemon/server.ts:startServer` 钩子点 — server 启动前 bootstrap + 收集 warnings, daemonLogger 输出。

### 2. L3-CLI 新增 `src/cli/probe-list.ts` + `src/cli/probe-fix.ts`

**probe-list.ts** (~55 行):
- bootstrap + reg.list() 输出 (表格 + JSON 双格式)
- 表格列: NAME / SCHEMES / STATUS (✅ OK / ❌ CORRUPTED / ⚠️ MISSING / ❔ UNREGISTERED) / REASON

**probe-fix.ts** (~50 行):
- 查 manifest → builtin 抛 IAPError `PROBE_FIX_UNAVAILABLE` 引导重装 (`bun install -g openxenon`)
- cli-add 引导 re-run `oxn probe add <source>` (实际重下逻辑留 PR-5.1)

CLI 注册 (`src/cli/probe.ts` subCommands): `add` + `list` + `fix` (remove/update 留 PR-5.1/PR-6 补)

### 3. L2-Work 新增 `src/work/work-precheck.ts` (~40 行)

```ts
export async function workPrecheck(requiredSchemes: string[]): Promise<void>
// 1. 调 reg.checkWorkDependencies(requiredSchemes)
// 2. !ok → 抛 IAPError PROOF/PROBE_CORRUPTED | PROBE_MISSING (按 blocked.reason 区分)
```

**v2 核心倒置**: 精准阻断**该 Work**, 不引用坏 probe 的 Work 正常运行 (其他 Work 不受影响)。

### 4. IAPError 字典扩展 (src/kernel/contracts/iap-error.ts)

```diff
- 9 码
+ 12 码: 加 'PROBE_CORRUPTED' | 'PROBE_MISSING' | 'PROBE_FIX_UNAVAILABLE'
```

### 5. 测试 (8 case)

`src/cli/__tests__/work-precheck.test.ts` (5 case):
1. Work A 用 s3 (CORRUPTED) → 抛 IAP_PROOF_PROBE_CORRUPTED
2. Work B 不用 s3 → 正常通过 (v2 核心倒置)
3. Work C 用 redis (UNREGISTERED) → 抛 IAP_PROOF_PROBE_MISSING
4. Work D 用 file:// builtin → 正常通过
5. 多 scheme 部分坏 → 抛 IAPError (阻断整个 Work)

`src/cli/__tests__/probe-list.test.ts` (3 case):
1. 3 OK + 1 CORRUPTED → 4 行 + CORRUPTED 状态
2. 空 registry → 0 providers
3. 单个 builtin OK → list 含该 builtin

### 6. 架构合规修复

- `daemonStartup` 物理路径 `src/daemon/ → src/infra/registry/` (L1-Infra, 供 daemon/cli 共同调用, 避免 'CLI 不能导入 Daemon' 架构违规)
- `daemon/server.ts` 'existsSync' (L2 直接引 'fs') → 改用 `'../infra/filesystem'` (L1-Infra 收口)
- `validate-dependencies.ts` 0 violations (253 文件 804 imports)

## 指标

- 测试: 1311 → **1322** (+11: 5 precheck + 3 list + 3 fixture round; 实际 +8 新)
- biome: 0 warnings
- L0–L3 依赖违规: 0
- 14 个 builtin probe 透传: 不变 (T9 不动 verdict strategies)
- 行为变化: 
  - 新增 `oxn probe list` / `oxn probe fix` CLI 子命令
  - Daemon 启动期冷加载 ProviderRegistry (v2 核心倒置)
  - IAPError 字典 9 → 12 码

## v2 核心倒置落地 (vs v1)

| 维度 | v1 (启动期拒启) | v2 (本 PR — T9) |
|---|---|---|
| 启动期遇到 CORRUPTED | engine crash | 标状态, 不阻断 |
| 启动期遇到 MISSING | 拒启 | 标状态, 不阻断 |
| Work 启动期遇到坏 probe | (启动已崩) | 精准阻断**该 Work** |
| 其他 Work | (启动已崩) | 正常运行 |

## 风险

| 风险 | 等级 | 缓解 |
|---|---|---|
| Daemon 启动期 IO 与 v0.1.x Work 状态机冲突 | 中 | 1322 测试 + 端到端守护 |
| `workPrecheck` 调用点未全量覆盖 | 低 | T9 阶段导出函数, 调用方按需 (后续 PR 强化) |
| `oxn probe fix` 对 builtin 不可修复 | 中 | 明确错误信息 `PROBE_FIX_UNAVAILABLE` 引导重装 |
| daemonStartup 路径从 daemon → infra (L1) | 低 | lint daemon↔cli 互引规则 + validate-deps 守护 |
| `existsSync` L2 直引 → 改 L1-Infra 收口 | 低 | 复用 Sprint 1 filesystem.ts |
| 2 个 pre-existing e2e flake (work-run-diagnostics + domain-index) | 低 | 单跑通过, 不在 T9 范围 |

## 关联

- 上游: T1 (t1a+t1b) + T2 + T3 + T4 + T5 + T6 + T7 已合入主分支
- 下游 [sprint-5b 计划]: PR-6 OXL grammar (T10) 续 taint 系列, 加 `probe` 声明的 OXL 语法
- 下游 [sprint-5.1 计划]: `oxn probe remove` / `oxn probe update` 子命令 + 实际 fetch 逻辑
- 依赖外部: T7 的 `probe-registry-store.ts` (registry.json v1 schema) + T6 的 `ProviderRegistry`
- **taint 6 PR 系列收尾**: PR-1 数据契约 (T4) → PR-2 frozen (T5) → PR-3 Provider (T6) → PR-4 沙箱 (T7) → PR-5 Daemon+Work (T9) ✅

Refs: .openxenon/forges/sprints/sprint-5a/2026-06-15-probe-taint-daemon-workcheck-pr5.md
Refs: .openxenon/forges/2026-06-14-probe-signal-taint-design.md v2
Refs: .openxenon/forges/sprints/EXECUTION-ORDER.md
