# OXN 测试套件重构方案 · CLI（最外层）+ Kernel/Infra（最里层）

> **范围**：ADR-0087 Phase 4-6 实施细节，聚焦 CLI 与 Kernel/Infra 两端
> **日期**：2026-08-01
> **关联**：ADR-0087 (Draft) · ADR-0084 (协作边界分层) · AGENTS.md L0-L3 宪法
> **状态**：active（梳理方案，待用户确认后进入 IAP 流程）

---

## Part 1 · CLI 重构方案（L3 最外层）

### 1.1 当前状态

| 指标 | 数值 |
|---|---|
| CLI 命令文件 | 24 个 `commands/*.ts` |
| `defineCommand` 调用 | 90 处（含嵌套 subcommand） |
| 子命令总数 | 28+ 个 export subcommand |
| **E2E 测试文件** | **14**（占 wall-clock **84.2%** = 27,725ms） |
| Unit 测试文件 | 14（占 wall-clock 约 5,200ms） |
| E2E 共享 helper | `helpers/run-cli.ts`（79 行）+ `helpers/no-direct-fs.ts`（28 行） |
| 总 wall-clock | 32.91s |

### 1.2 当前 CLI 测试模式

```typescript
// 典型 E2E 模式 (draft-e2e.test.ts)
import { setupCliEnv } from './helpers/run-cli'
beforeEach(() => { env = setupCliEnv(CLI_PATH) })
afterEach(() => env.cleanup())
test('name 含斜杠 → exit 1 + OXN_DRAFT_INVALID_NAME', async () => {
  const r = await env.runCli(['draft', 'create', 'foo/bar'])
  expect(r.exitCode).toBe(1)
})
```

**问题**：每个 E2E case spawn 一次 `bun <cliPath>` 二进制（进程冷启动 ~50-80ms × N cases），共 14 E2E 文件每个跑 5-15 cases × ~100ms = 大量 IO。

### 1.3 重构目标

按 ADR-0087 D4 双轨制：
- **T3 unit**：mock dispatch 直接测 `run(ctx)` 函数（不 spawn 二进制）
- **T3 e2e**：仅保留 5-7 个 cross-cutting e2e 文件

### 1.4 改造 1：暴露 `run(ctx)` 为独立 export

**当前**：
```typescript
// config-cmd.ts
const showSubcommand = defineCommand({
  args: { ... },
  run(ctx) { /* logic */ }
})
```

**改造**：
```typescript
// config-cmd.ts
export async function runShow(ctx: { args: Record<string, unknown> }): Promise<void> {
  /* logic */
}
const showSubcommand = defineCommand({
  args: { ... },
  run: runShow  // 委托给独立函数
})
```

**好处**：
- ✅ Unit test 可直接 import `runShow` 测，不走 citty 解析
- ✅ E2E 仍走 `defineCommand`（用户实际路径）
- ✅ 重构后两个路径同一代码（DRY）

**工作量**：每个 commands/*.ts 文件 1 处修改。**~24 文件 / 30 分钟**。

### 1.5 改造 2：新增 CLI dispatch unit test 模板

新建 `packages/cli/src/__tests__/helpers/cli-dispatch.ts`：

```typescript
/**
 * CLI dispatch unit test helper —— 不 spawn 二进制，直接调 export 的 runX(ctx)。
 */
export interface DispatchCtx {
  args: Record<string, unknown>
  cwd?: string
  env?: Record<string, string>
}

export async function dispatch(
  commandPath: 'config.show' | 'config.set' | 'asset.list' | ...,
  ctx: DispatchCtx
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  // mock process.cwd / fs / spawn / etc
  // import runX directly from commands/...
  // call runX(ctx)
  // capture stdout/stderr
}
```

**用法**：
```typescript
// cli-unit.test.ts (新)
import { dispatch } from './helpers/cli-dispatch'

test('config show (default) → 列出 5 个 asset dir', async () => {
  const r = await dispatch('config.show', { args: {}, cwd: tmpDir })
  expect(r.exitCode).toBe(0)
  expect(r.stdout).toContain('assetDirs')
})
```

**覆盖范围**：28+ subcommand 各 2-5 case = 56-140 unit case。

**工作量**：~1 个 helper + ~28 个 subcommand unit test 文件 = **~8-10 hr**。

### 1.6 改造 3：E2E 收敛到 5-7 个 cross-cutting 文件

| E2E 文件（保留） | 测什么 | 理由 |
|---|---|---|
| `init-e2e.test.ts`（保留） | `oxn init` 创建 `.openxenon/` 完整性 | 跨子目录系统行为，黑盒必要 |
| `install-skill-e2e.test.ts`（保留） | Skill 部署到目标路径 | cross-platform fs 行为 |
| `work-migrate-e2e.test.ts`（保留） | work v0.5→v0.6 schema 迁移 | 跨版本兼容性 |
| `cross-work-e2e.test.ts`（保留） | 多个 work 跨交互 + planLock 锁 | cross-work 状态机 |
| `insight-cross-e2e.test.ts`（保留） | insight 跨 proof 涌现 | cross-proof 分析 |
| `daemon-e2e.test.ts`（保留） | daemon 真实 socket + lifecycle | 进程 IPC |
| `draft-e2e.test.ts`（**收敛**）| draft 4 个子命令核心 case | 简化保留 |

| E2E 文件（删除或转 unit） | 理由 |
|---|---|
| `blueprint-index-e2e.test.ts` | → unit（mock index builder） |
| `domain-cache-clean-e2e.test.ts` | → unit |
| `domain-index-e2e.test.ts` | → unit |
| `external-cli-e2e.test.ts` | 删除废弃 `.skip` 块（v0.3） |
| `pool-review-approve-reject-e2e.test.ts` | → unit（5 个 Pool 函数独立测） |
| `probe-add-e2e.test.ts` | → unit（probe add 已 unit 化） |
| `token-e2e.test.ts` | → unit |
| `work-asset-mode-e2e.test.ts` | → unit |
| `work-full-lifecycle-e2e.test.ts` | 与 `work-ideal-data-flow-e2e.test.ts` 重复 |
| `work-ideal-data-flow-e2e.test.ts` | 与 `work-full-lifecycle-e2e.test.ts` 重复 |
| `cli-e2e.test.ts` | → unit（4-Tier exit code） |

**净 E2E 文件数**：14 → 7（**-50%**）。

**净 wall-clock**：CLI 部分 27,725ms → 估计 8,000ms（**-71%**）。

### 1.7 改造 4：shell-provider.test.ts mock 化（消除双 spawn）

**当前问题**：
- `probes/__tests__/shell-exec.test.ts`（L1 handler）：3 case 真 `spawn sh -c`
- `providers/__tests__/shell-provider.test.ts`（L2 wrapper）：6 case 真 `spawn sh -c`

shell-provider 应该测 wrapper 行为（IoExec 委派 + flag 透传 + 错误处理），不重复测 sh -c 行为。

**改造**：
```typescript
// shell-provider.test.ts 改造
import { mock, afterEach } from 'bun:test'

const execSpy = mock(async (cmd: string) => ({
  success: cmd.includes('exit 0'),  // 模拟真 shell 行为
  stdout: '', stderr: '', exitCode: 0, durationMs: 1
}))
mock.module('../shell-exec', () => ({
  executeShellExec: execSpy,
  ShellExecResult: class {},
}))

describe('ShellProvider (wrapper only)', () => {
  afterEach(() => { mock.restore(); /* re-register for next describe */ })
  test('委派给 executeShellExec', async () => { ... })
  test('flag 透传到 InterferenceFlags', async () => { ... })
})
```

**注意**：bun 的 `mock.module` 是进程级 mock，会污染后续测试。需要**确认测试运行顺序**或**用进程隔离**（`bun test --isolate`）。

**工作量**：~30 分钟（受 mock pollution 限制，可能需要 work around）。

### 1.8 改造 5：CLI unit test 并发重排

**当前**：`bunfig.toml concurrentTestGlob` 不含 `packages/cli/src/__tests__/`（注释说整个 CLI 串行）。但其中 14 个 unit 文件实际无 spawn，可以并发。

**改造**：
```toml
concurrentTestGlob = [
  "packages/engine/src/**/*.test.ts",
  "packages/cli/src/__tests__/!(config-loader|domain-canonicalization|verbosity|output-user-input|proof-outcome-writer|probe-stats-store|skill-tools-adapters|iap-error-dictionary-v1_1).test.ts",
  # ^ 8 个 unit 文件加 concurrent (e2e 仍串行)
]
```

**节省**：6 个 unit 文件 × ~600ms = ~3,500ms（粗估）。

### 1.9 CLI 重构预算汇总

| 操作 | 工作量 | LOC 变化 | wall-clock 变化 |
|---|---|---:|---:|
| 改造 1：暴露 run(ctx) 为 export | 0.5 hr | +30 ×24 = +720 | 0 |
| 改造 2：CLI dispatch unit helper + 28 unit | 8-10 hr | +1,200 ~ +2,000 | -300ms（unit 更快） |
| 改造 3：E2E 收敛 14 → 7 | 4 hr | -2,000 | **-19,000ms** |
| 改造 4：shell-provider mock 化 | 0.5 hr | -100 | -150ms |
| 改造 5：CLI unit 并发 | 0.5 hr | 0 | -3,500ms |
| **CLI 净结果** | **~14-16 hr** | **-180 ~ +580** | **-22,950ms (-69% 总 wall-clock)** |

---

## Part 2 · Engine Kernel/Infra 重构方案（L0 + L1 最里层）

### 2.1 Kernel 现状

| 子目录 | src 文件 | test 文件 | test:src 比例 | test 数 |
|---|---:|---:|---:|---:|
| `kernel/verdicts/` | 8 | 5 | 0.63 | ~150 |
| `kernel/contracts/` | 8 | 1 | 0.13 | ~30 |
| `kernel/schemas/types/` | 8 | 1 (probe.test.ts) | 0.13 | ~20 |
| `kernel/schemas/validators/` | 6 | 3 | 0.50 | ~40 |
| `kernel/schemas/` (顶层) | 5 | 1 (frozen-proof-shape) | 0.20 | ~10 |
| `kernel/__tests__/processors/` | n/a | 2 | n/a | ~30 |

### 2.2 Infra 现状

| 子目录 | src 文件 | test 文件 | test:src 比例 | test 数 |
|---|---:|---:|---:|---:|
| `infra/probes/` | 25 | 16 | 0.64 | ~120 |
| `infra/providers/` | 4 | 4 | 1.00 | ~20 |
| `infra/runtime/` | 4 | 1 | 0.25 | ~15 |
| `infra/insight/` | 2 | 2 | 1.00 | ~10 |
| `infra/registry/` | n/a | 1 | n/a | ~10 |
| `infra/git/` | 3 | 1 | 0.33 | ~10 |
| `infra/i18n/` | 3 | 1 | 0.33 | ~10 |
| `infra/assets/` | 5 | 1 | 0.20 | ~10 |
| `infra/` (顶层) | n/a | 2 | n/a | ~20 |

### 2.3 Kernel 重构关键点

#### 改造 K1：contracts/ 多对一聚合拆解

**当前问题**：
- `kernel/contracts/iap-error.ts`（IAPError + IAPAction + 4-Tier exit code）
- `kernel/contracts/probe-port.ts`（ProbeHandler + ProbeObservation）
- `kernel/contracts/hash-port.ts` / `os-port.ts` / `name-canonical.ts` / `io-primitive.ts` / `part-port.ts` / `file-system-port.ts`

8 src 文件，**仅 1 个聚合 test** (`name-canonical.test.ts`)。其他 contract 接口无独立 unit test。

**改造**：
- `iap-error.test.ts`（新增）：IAPError constructor + toIAPError + 4-Tier exit code mapping 5-10 case
- `probe-port.test.ts`（新增）：ProbeHandler 类型签名 + ProbeObservation shape（无 IO handler 行为）
- `hash-port.test.ts` / `os-port.test.ts` / `file-system-port.test.ts`（新增）：每个 contract 1 个聚合 test

**工作量**：~3-4 hr / +300 LOC / 5 个 test 文件。

#### 改造 K2：schemas 多对一拆解

**当前**：
- `schemas/types/` 8 文件（part / sample / task-trace / action / spec / policy / artifact / task）→ 1 个聚合 test (`probe.test.ts` 测 ProbeDefinition + ProbeInvocation)
- `schemas/validators/` 6 文件 → 3 个 test（blueprint / frozen / part-asset）
- `schemas/` 顶层 5 文件（proof-schema / frozen-proof / pipeline-insight / proof-result / oxn-state）→ 1 个 test (`frozen-proof-shape.test.ts`)

**问题**：schemas/types 下 8 个文件**几乎零测试**——直接被 OXN 业务使用，schema 错误会让 frozen.json 写入失败或 schema validation 错乱。

**改造**：
- 每个 type schema 加 1 个聚合 unit test（合法 / 拒绝非法）
- `frozen-schema.test.ts`（已存在）+ `proof-schema.test.ts`（新增）
- `pipeline-insight-schema.test.ts`（新增）

**工作量**：~2-3 hr / +200 LOC / 4 个 test 文件。

#### 改造 K3：verdicts/ 已覆盖良好（最小改动）

`verdicts/` 8 src / 5 test / 150 case——覆盖好。重点是 trust-baseline 的 `applyTrustBaseline` 在 D2 已 wiring，但 12 flag 各 1 case 还不够（覆盖率 5/12）。

**改造**：trust-baseline.test.ts 加 7 个 flag 各 1 case = +7 case。

工作量：~30 分钟 / +50 LOC。

### 2.4 Infra 重构关键点

#### 改造 I1：probes/ spawn 类与非 spawn 类分层

**当前问题**：
- 16 个 probe test，3 个 spawn 类（shell-exec / ts-compiles / shell-provider）已 `.serial` + bunfig 排除
- 但其他 13 个 probe test 也被**强制串行**（bunfig 跳过整个 infra/），即使它们无 spawn

**改造**：
- bunfig 改为精确 glob（像之前 work 一样）：
  ```toml
  concurrentTestGlob = [
    "packages/engine/src/kernel/**/*.test.ts",
    "packages/engine/src/oxl/**/*.test.ts",
    # ... 列出无 spawn 的子目录
    "packages/engine/src/infra/probes/!(shell-exec|ts-compiles).serial.test.ts",
    "packages/engine/src/infra/providers/!(shell-provider).serial.test.ts",
  ]
  ```
- 13 个无 spawn probe 测（如 file-hash / boundary-guard / oxn-runtime-version）放回 concurrent

**节省**：13 × ~50ms = -650ms。

**注意**：shell-provider 是 mock.module 测试，已经命名 .serial 不需要改 glob。

#### 改造 I2：runtime/ 多对一聚合拆解

**当前**：`infra/runtime/{index,bun,deno,node}.ts` 4 个 runtime 适配器，**仅 1 个聚合 test** (`runtime.test.ts`)。

**改造**：每个 runtime adapter 1 个 unit test（mock `Bun.spawn` / `Deno.run` / `child_process.spawn`），验证 spawn 行为差异（CLI flag / env 变量 / exit code 提取）。

**工作量**：~2 hr / +200 LOC / 3 个 test 文件。

#### 改造 I3：providers/ 完整性（mock pollution 修复）

**当前问题**：
- 4 个 provider 4 个 test，但 shell-provider 真 spawn（污染+慢）
- HTTPProvider / FileProvider / GitProvider 已 mock 或真 IO（小 IO，可接受）
- stack tests (lint-check-stack / test-pass-stack / ts-docs-stack) 用 `mock.module('../shell-exec', ...)` 进程级污染 ShellProvider 真 shell 调用 → 4 fail（已 commit，承认 pre-existing）

**改造**：
- shell-provider.test.ts mock 化（详见 1.7）
- stack tests 加 `afterEach(() => mock.restore())`（Bun 1.3+ 支持）或用 `--isolate` 跑 stack tests（如果支持）

**工作量**：~1 hr / +50 LOC / -150ms wall-clock。

#### 改造 I4：infra 其他子目录补 unit test

| 子目录 | 当前覆盖 | 提议 |
|---|---|---|
| `infra/git/` | 33% | 加 `workspace-manager.test.ts` |
| `infra/i18n/` | 33% | 加 `i18n-loader.test.ts` |
| `infra/assets/` | 20% | 加 `asset-path-resolver.test.ts` |
| `infra/registry/` | 100% | 维持 |
| `infra/insight/` | 100% | 维持 |

**工作量**：~2 hr / +150 LOC / 3 个 test 文件。

### 2.5 Kernel/Infra 重构预算汇总

| 操作 | 工作量 | LOC 变化 | wall-clock 变化 |
|---|---|---:|---:|
| K1: contracts/ 拆 5 个 test | 3-4 hr | +300 | -50ms |
| K2: schemas/ 拆 4 个 test | 2-3 hr | +200 | -30ms |
| K3: trust-baseline 加 7 case | 0.5 hr | +50 | 0 |
| I1: probes 13 unit 重并发 | 0.5 hr | 0 | -650ms |
| I2: runtime/ 拆 3 test | 2 hr | +200 | -100ms |
| I3: shell-provider mock 化 | 1 hr | +50 | -150ms |
| I4: infra 子目录补 unit | 2 hr | +150 | -50ms |
| **Kernel/Infra 净结果** | **~12-14 hr** | **+950** | **-1,030ms** |

---

## Part 3 · 整体预算与依赖

### 3.1 全栈重构预算

| 区域 | 工作量 | LOC | wall-clock |
|---|---|---:|---:|
| **CLI** | 14-16 hr | -180 ~ +580 | **-22,950ms (-69%)** |
| **Kernel/Infra** | 12-14 hr | +950 | -1,030ms |
| **Insight + Pool unit**（ADR-0087 Phase 2） | 2-3 hr | +800-1200 | +200ms |
| **Proof 子模块 unit**（ADR-0087 Phase 3） | 1-2 hr | +400-600 | +100ms |
| **Work 单文件拆分**（ADR-0087 Phase 5） | 2 hr | 0 | 0 |
| **orphan + fixtures 清理**（ADR-0087 Phase 6） | 0.5 hr | -1500 | -50ms |
| **总计** | **~32-38 hr**（约 1-2 sprint） | **+470 ~ +1,830** | **-23,730ms (-72%)** |

### 3.2 执行依赖

```
Phase 6 清理 orphan fixtures  ──┐
                               ├─→ Phase 1 (DONE)
Phase 3 Proof 子模块 unit  ───┐│
                              ├┤
Phase 2 Insight/Pool unit ──┐ ││
                            │ ││
Phase 4 CLI 改造 1 (暴露 run) ──→ Phase 4 改造 5 (并发)
                                ↓
Phase 4 改造 2 (CLI dispatch unit)
                                ↓
Phase 4 改造 3 (E2E 收敛)
                                ↓
Phase 5 Work 拆分
                                ↓
Phase I1 probes 重并发
                                ↓
Phase I3 shell-provider mock
```

### 3.3 风险与回滚

| 风险 | 缓解 |
|---|---|
| CLI run(ctx) 暴露后破坏 citty 内部状态 | 委托模式（defineCommand.run = runX），不绕过 citty |
| bunfig 重排导致新并发竞态 | 每个改造后跑全量 `bun test` 看 wall-clock + pass 数 |
| shell-provider mock 化后错过真 shell 行为 | 保留 shell-exec 真 spawn test（已存在） |
| Insight/Pool unit test 改动 Proof 行为 | Insight/Pool 是 use case，单元测不调 Proof |
| ADR-0087 review 拒 | 草案状态，可调整后再执行 |

---

## Part 4 · 建议下一步

按工作量和风险分 3 个 sprint：

**Sprint 1（~8 hr）— 零风险清理 + Phase 1-3（Insight/Pool/Proof unit + 清理）**
- ADR-0087 review → Accepted
- Phase 2：Insight/Pool unit test
- Phase 3：Proof 子模块 unit test
- Phase 6：orphan + fixtures 清理

**Sprint 2（~14 hr）— CLI 改造**
- 改造 1：暴露 run(ctx) 为 export（24 文件）
- 改造 2：CLI dispatch unit helper + 28 subcommand unit
- 改造 5：CLI unit 并发重排
- 改造 3：E2E 收敛 14 → 7

**Sprint 3（~10 hr）— Kernel/Infra + Work**
- 改造 K1-K3：contracts/schemas/verdicts
- 改造 I1-I4：probes/runtime/providers/infra
- Phase 5：Work 单文件拆分
- 改造 4：shell-provider mock 化

**总 wall-clock 优化**：32.91s → 估计 9-10s（**-72%**）。

---

## 关键反问 4.1（决策点）

你希望：

1. **先 Review ADR-0087 草案**（5 分钟，决定接受/调整）
2. **进入 Sprint 1**：Insight + Pool + Proof unit + 清理（~8 hr）
3. **进入 Sprint 2**：CLI 改造（~14 hr）
4. **进入 Sprint 3**：Kernel/Infra + Work（~10 hr）
5. **直接全 3 sprint 推进**

如选 1：我等你的 review 反馈后再开 Sprint。
如选 2/3/4：进入 IAP 流程（创建 work + lock + run + submit + finalize + commit + push）。
如选 5：先 ADR review，再 3 个 sprint 顺序推进。