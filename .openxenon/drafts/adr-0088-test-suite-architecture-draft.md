---
entity: adr-draft
version: 0.1.0
status: Draft
date: 2026-08-01
supersedes: null
superseded-by: null
draft-location: .openxenon/drafts/adr-0088-test-suite-architecture-draft.md
promote-target: docs/adrs/0088-test-suite-architecture.md
related:
  - .openxenon/CONTEXT-MAP.md
  - docs/adrs/0084-collaboration-boundary-layering.md
  - docs/rfcs/RFC-0015-proof-system-overhaul.md
  - AGENTS.md
---

# ADR-0088 (Draft): OXN 测试套件 4 层架构（Test Suite Architecture）

> **状态**：🚧 Draft（**2026-08-02 amended** — P0a-c 已落地，详见 Migration Plan；待 review → Accepted 后 promote 到 `docs/adrs/0088-test-suite-architecture.md`）
> **日期**：2026-08-01（origin），2026-08-02（amend #1：P0 完成 + D6-D9 + Definitions + Phase 重排）
> **位置**：`.openxenon/drafts/adr-0088-test-suite-architecture-draft.md`（Draft 阶段，不应在 `docs/adrs/`）
> **来源**：
> - 2026-08-01 `/grilling` session（domain-modeling skill）—— 用户 #1 "测试都对应当前版本功能、单元测试、是否存在脱节差异" + #2 "测试属于 OXN 保证其交付质量" + #4 "测试归测试，Proof 归 Proof，两者不重叠" + #5 "重新架构"
> - 2026-08-02 `/grilling` session（domain-modeling skill）—— 用户锁定 4 决策（覆盖=feature→test 映射；模块=三层嵌套；布局=colocated + 拆 CLI 桶；typecheck=修 TS18003 + 测试纳入 + 子包不动）
> **影响层**：E0-E3 全栈 · 测试方法论 · 测试/Proof 边界

## Context

### 当前状态（实测 2026-08-02，P0 完成后）

| 指标 | 数值 |
|---|---|
| Test 文件数 | 146 |
| Test case 数 | 1834（**1831 pass + 3 skip + 0 fail**，P0 无回归） |
| 测试源码 LOC | 26,809 |
| wall-clock | 32.91s → 34.76s（P0 加载 __tests__ 进 typecheck 后实际跑通） |
| `pnpm run typecheck` | 修复前 EXIT=0（**silent 假象**）；修复后 EXIT=2 暴露 232 个真实错误 |
| 真实源码 bug | **17 个** Asset 模块（已全部修复，详见 Migration Plan P0b） |
| 函数签名 silent ignore | **2 个**（resolveAssetFile + listAssetReferences，已修） |
| 跨包 leak | **1 处** cli → src/daemon（已修 tsconfig rootDir，完整搬移待 follow-up） |
| 覆盖率红旗 | `Insight/` 0 unit（335 src 行）/ `Pool/` 0 unit（240 src 行） |
| 测试类型 drift（剩余） | 232 个错误全部在 test 文件（P0d 待处理） |

### 触发问题

OXN 现有测试套件**与功能特性映射存在系统性脱节**。经 2026-08-01 grilling session 审计发现 4 类脱节：

1. **完全缺测**：2 个核心 module（`Insight/` + `Pool/`）无 unit test，全部依赖 e2e 黑盒兜底。
2. **完全冗余测**：5+ 漂移测试（`.skip()` 集中废弃块 / `@deprecated` describe / orphan test / 5 个未被 import 的 fixtures 文件）。
3. **层级错位**：shell-exec（L1）+ shell-provider（L2 wrapper）双测真壳 spawn；CLI E2E 14 文件占 84% wall-clock 但仅贡献 12.5% test case。
4. **单文件价值密度失衡**：`Work/__tests__/work-validator.test.ts`（1007 行）+ `work-context-builder.test.ts`（901 行）+ `per-work-blueprints-merger.test.ts`（590 行）+ `birth-cert.test.ts`（539 行）4 件占 Work 整个模块测试 76% 行数。

**2026-08-02 审计发现新一类 silent gap**：

5. **typecheck silent gap**：root `tsconfig.json` exclude 含 `packages/engine`（engine 整包自排除 → TS18003），同时排除所有 `**/__tests__`；CLI tsconfig `rootDir: "./src"` 让 cli 越界 import `src/daemon/` 触发 TS6059。结果：`pnpm run typecheck` 永远 EXIT=0 但 engine 源码 + 105 测试 + 跨包 leak 全部 silent 漂移。

### 用户 5 个关键决策（2026-08-01 grilling session）

1. 测试对应功能特性，单元测试存在脱节差异 → 需做 mapping audit
2. **测试属于 OXN 自身交付质量保证**；Proof 是 OXN 给用户的产品功能，OXN 自身开发期 Proof 也会调 OXN 自身的 test
3. OXN "不评判"哲学（ADR-0066/0067）与 bun test 硬断言**不冲突**——前者评判 OXN 用户工作，后者断言 OXN 自身代码
4. 测试归测试，Proof 归 Proof——**两者平行不重叠**
5. 重新架构（不是简单删减）

### 用户 4 个关键决策（2026-08-02 grilling session，amend 来源）

6. **覆盖** = feature→test 映射审计（产映射表 + 缺口/冗余清单），**不**是代码覆盖率 %（bunfig 未配 coverage，区分清楚）
7. **模块粒度** = 三层嵌套（包→层→子目录），测试跟子目录
8. **测试布局** = colocated（源码旁挂 `__tests__/`）+ CLI 桶拆 e2e 到子目录让 bunfig fnmatch 能拆并发
9. **typecheck 边界** = 修 TS18003 + 测试纳入 typecheck + 子包 `files` 不动（engine 当前不发布，完整决策列为 follow-up ADR 候选）

## Definitions（2026-08-02 锐化，domain-modeling 产出）

测试方法论术语，**记入 ADR 而非 Domain 文件**——测试方法论非核心领域词汇，进 Domain 文件会污染 invariants（AGENTS.md 边界规则）。

| 术语 | 锐化定义 | 与现状的纠偏 |
|---|---|---|
| **Test Suite** | OXN 全部 `*.test.ts` 集合，按 T0-T3 四层组织（对齐 L0-L3） | 与 Proof（协作期产物，D2 已分）区分 |
| **colocated** | `__tests__/` 紧邻源码，跟随三层嵌套（包→层→子目录） | 修 bunfig 注释自称"Y scheme"的矛盾 |
| **feature→test 映射** | 覆盖审计交付物：version→feature→source module→test file→status | 与"代码覆盖率 %"区分（bunfig 未配 coverage） |
| **typecheck 覆盖** | `tsc --noEmit` 检查范围，含源码 + 测试 | 与"代码覆盖率"区分 |
| **幻影模块澄清** | `Intent`/`Align`=IAP 阶段（OxnWorkDomain），非 engine 子目录；`Workflow`/`Domain`/`Stack`=AssetKind（OxnAssetDomain），非 engine 子目录；`Daemon`= `src/daemon/`（residual），非 `packages/engine/src/daemon/` | bunfig glob 把这些当 engine 子目录是术语错位 |

## Decision

### D1：OXN 测试套件 4 层架构（与 L0-L3 工程分层对齐）

OXN 测试套件按 **OXN 功能分层**重新组织，与 ADR-0084 / AGENTS.md 工程分层一致：

```
T0 unit (L0-Kernel)        ─── 纯函数：kernel/* + verdicts/* + 部分 infra helpers
                                bun test --concurrent, fast
                                ↑
T1 unit + light IO          ─── probes/* + providers/* + runtime/*
                                真 IO + 重试机制
                                ↑
T2 business unit (use case) ─── Asset/* + Work/* + Proof/* + Insight/* + Pool/*
                                use case 边界 + 集成
                                ↑
T3 unit + e2e (CLI)         ─── commands/* unit (mock dispatch)
                             ─── commands/*-e2e.test.ts (cross-cutting)
```

**T0-T2 = bun test unit**（OXN 内部 quality gate）；**T3 e2e = cross-cutting 黑盒**（OXN 用户场景）。

### D2：测试与 Proof 边界（与 D1 同源决策）

| 维度 | bun test | OXN Proof |
|---|---|---|
| **生命周期** | OXN 开发期（修代码后跑） | OXN 协作期（Work 提交后跑） |
| **目的** | OXN 自身代码交付质量 | OXN 给用户的协作证据 |
| **输出** | pass/fail + bun exit code | `frozen.json` + `outcome.md`（不可篡改） |
| **跑者** | `bun test` | `oxn proof run` |
| **断言机制** | `expect().toBe()` 硬断言 | ProbeOutcome 三态（COMPLETED/DEVIATED/INCONCLUSIVE） |
| **消费方** | lefthook pre-push / CI | 工程师 + AI Agent 协作审计 |

**核心原则**：OXN 自身开发期 Proof 实现（例如 `runner.ts` / `outcome-writer.ts`）**会调用 OXN 自身的 bun test**——因为 Proof 是 OXN 提供的功能，其代码质量由 OXN 自身的 test 保证。这与 OXN "不评判用户工作"哲学不冲突——前者评判 OXN 自身代码，后者不评判用户工作。

### D3：测试与"不评判"哲学（澄清 #3）

OXN "不评判"哲学（ADR-0066/0067）适用范围：
- ✅ OXN 给用户的工作（Work / Asset / Proof 内容）
- ❌ 不适用于 OXN 自身开发期代码

bun test 硬断言适用于：
- ✅ OXN 自身 Engine 代码（Kernel/Infra/Business/CLI）
- ❌ 不适用于 OXN 用户的 Asset 内容

两者层级分明，**不冲突**。

### D4：T3 CLI 双轨制（unit + e2e）

CLI 命令（28+ 子命令）测试分两层：

| 子命令族 | 测试方式 | 理由 |
|---|---|---|
| `init` / `install-skill` / `migrate-assets` | **T3 e2e**（spawn `oxn` 二进制） | 黑盒关键路径 |
| `config` / `set` / `show` | **T3 unit**（mock dispatch） | 无 spawn 必要 |
| `asset.*` (create/list/show/evolve/archive/delete/diff/validate) | **T2 business unit** + T3 unit | use case 在 Engine，CLI 是薄调用 |
| `work.*` (create/run/submit/finalize/list-task/task-status/edit-task) | **T2 business unit** + T3 unit | 同上 |
| `proof.*` (create/run/show/list/probe:*) | **T2 business unit** + T3 unit | 同上 |
| `insight` (compute/cross-proof/pipeline) | **T2 business unit** + T3 unit | 同上 |
| `pool-*` (create/list/approve/review/reject) | **T2 business unit** + T3 unit | 同上 |
| `external.*` (check/status/mark) | **T2 business unit** + T3 unit | 同上 |
| `draft.*` (create/archive/discard) | **T2 business unit** + T3 unit | 同上 |
| `daemon.*` (start/stop/status) | **T3 unit**（无 IO）+ T3 e2e | daemon 真实 socket |

**总 E2E 文件目标**：从当前 14 收敛到 **5-7 个**（init / install-skill / work-migrate / cross-work / insight-cross / draft-e2e / daemon-e2e）。

### D5：测试分层与 AGENTS.md 工程分层映射

OXN 工程分层（AGENTS.md L0-L3）↔ 测试分层：

| 工程层 | 测试层 | bun test 路径 |
|---|---|---|
| L0-Kernel（kernel/schemas + verdicts/） | **T0** | `packages/engine/src/kernel/**/__tests__/` |
| L0-Contract（kernel/contracts/） | **T0** | 同上（8 src / 1 聚合 test） |
| L0-Processor（kernel/{processors,verdicts}/） | **T0** | `kernel/verdicts/__tests__/` |
| L1-Infra（infra/filesystem + infra/probes + infra/providers + infra/runtime） | **T1** | `packages/engine/src/infra/**/__tests__/` |
| L1-OXL（oxl/md-pipeline + oxl/md-bridge + oxl/scope） | **T1** + **T0** | `packages/engine/src/oxl/**/__tests__/` |
| L2-Builtin（`src/builtin/`） | **T0** | `src/builtin/__tests__/` |
| L2-Work（Work + Asset + Proof + Insight + Pool） | **T2** | `packages/engine/src/{Work,Asset,Proof,Insight,Pool}/__tests__/` |
| L3（commands + skills + daemon + watcher） | **T3 unit + e2e** | `packages/cli/src/__tests__/` |

> **2026-08-02 amend 修正 D5**：原表 D5 与 `bunfig.toml concurrentTestGlob` 互相矛盾——bunfig 引用 6 个不存在的 engine 模块（`Intent`/`Align`/`Workflow`/`Domain`/`Stack`/`Daemon`），D5 不提。amend 后：bunfig 漂移由 P1 清理（删 6 幻影 glob），D5 表保留 L0-L3 映射但**不**列具体模块路径（路径归 bunfig 管）。

### D6：测试布局原则（2026-08-02 新增）

OXN 测试**严格 colocated**（`__tests__/` 紧邻源码），**禁止**改顶层 `tests/` 镜像源码树。理由：

- 维护性：测试改动伴随源码改动，同 PR review 一致
- monorepo 友好：engine 测试在 `packages/engine/` 内，cli 测试在 `packages/cli/` 内，与包边界天然对齐
- bunfig 简单：`packages/<pkg>/src/**/__tests__/**/*.test.ts` 一行 glob 覆盖

**三层嵌套粒度**（用户决策 #7）：测试目录跟随三层（包→层→子目录）。例：
- `packages/engine/src/Work/__tests__/`（包=engine, 层=Work, 子目录无）
- `packages/engine/src/oxl/md-bridge/__tests__/`（包=engine, 层=oxl, 子目录=md-bridge）
- `packages/cli/src/__tests__/`（包=cli, 层=commands, 子目录无；当前 unit+e2e 平铺）

**CLI 桶拆分**：cli `__tests__/` 当前把 14 unit + 14 e2e + fixtures + helpers + skills/ 全平铺。bunfig fnmatch（basic glob，无 extglob 否定）无法在同一目录区分 unit/e2e 并发策略。**P3 拆 e2e 到 `__tests__/e2e/` 子目录**，bunfig 加 `packages/cli/src/__tests__/*.test.ts`（顶层，fnmatch 不匹配 `e2e/` 子目录）到 `concurrentTestGlob` → 14 个 unit 进并发，14 个 e2e 保持串行。

### D7：typecheck 覆盖（2026-08-02 新增，2026-08-02 P0 已落地）

**OXN typecheck 必须覆盖源码 + 测试**（用户决策 #9）。三层约束：

1. **root tsconfig.json include** 必须含 `packages/engine/src/**/*`（engine 当前被排除，导致 TS18003 silent gap）
2. **root tsconfig.json exclude** **禁止** `**/__tests__`（测试纳入 typecheck）
3. **子包 tsconfig.json** 显式 override `exclude`（防继承父 config 的自排除）

**OXN 不评判**哲学（ADR-0066/0067）适用范围：
- ✅ OXN 给用户的工作（Work / Asset / Proof 内容）
- ❌ 不适用于 OXN 自身开发期代码

bun test 硬断言 + tsc 硬断言都适用 OXN 自身 Engine 代码。两者层级分明，**不冲突**。

### D8：feature→test 映射审计（2026-08-02 新增）

**覆盖 = feature→test 映射审计**（用户决策 #6），**不**是代码覆盖率 %。审计方法：

1. 扫 `.changes/` 按版本组织的变更条目 + `docs/product/zh-cn/` 版本说明
2. 每个版本特性 → 标对应 source module → grep 对应 test 文件
3. 产映射表：`version | feature | source module | test file | status`

**status 四态**：
- ✅ covered（有对应 test）
- 🔴 gap（无 test，如 Insight/Pool）
- 🟡 redundant（.skip / @deprecated / orphan）
- ⚫ stale（test 引用已删特性）

**交付物**：`docs/dev/zh-cn/test-coverage-audit.md` 或 `.openxenon/drafts/` 草稿。

### D9：子包 files 策略（2026-08-02 新增，follow-up ADR 候选）

子包 `@openxenon/engine`、`@openxenon/cli` 当前**无 `files` 字段**，`main`/`exports` 指向 `./src/*.ts` 源码发布模式。若 `npm pack -w packages/engine`，`__tests__/` 会进 tarball（潜在泄漏）。**当前不发布**，潜在风险暂接受。

**完整决策列为 follow-up ADR 候选（不在本 ADR 范围）**：
- (A) 子包加 `files: ["src"]` + `.npmignore` 排 `__tests__/`
- (B) 子包改构建发布模式（`exports` → `./dist/*.js` + `.d.ts`，`files: ["dist"]`）
- (C) 维持现状（engine/cli 都不发布）

选择涉及 `__tests__/` 是否随源码发布、消费方能否直接 import `.ts`、engine 是否提供 `.d.ts`。**与本 ADR 解耦**，单独决策。

## Migration Plan

> **2026-08-02 amend 重排**：原 Phase 1-6 被替换为 P0（已 done） + P1-P9。P0 在 2026-08-02 落地（详见 P0 段）；P1-P9 待执行。

### P0（**DONE 2026-08-02**，work `p0-typecheck-silent-gap-fix`）：silent gap 修复

**P0a — tsconfig**（30 min）
- ✅ root `tsconfig.json`：include 加 `packages/engine/src/**/*`；exclude 去 `packages/engine`/`tests`/`**/__tests__`
- ✅ `packages/cli/tsconfig.json`：去 `rootDir: "./src"`（防 TS6059 跨包 leak）

**P0b — engine 源码 bug**（实际 ~1 hr）

- ✅ **P0b-1** `packages/engine/src/Asset/types.ts` 补 9 类型（DiffInput/DiffResult, MigrateInput/MigrateResult, TreeInput/TreeNode/TreeResult, UnarchiveInput/UnarchiveResult）—— 修 6 个 TS2305 + 6 个 TS2724 source 错
- ✅ **P0b-2** `packages/engine/src/Asset/internal/resolver.ts` 加 `config?: ProjectConfig | null` 第 5 参（修 resolveAssetFile silent ignore — caller 传 cfg 被 silently 忽略导致 `.oxnrc` path scope 不生效）
- ✅ **P0b-3** `packages/engine/src/Asset/internal/reference-checker.ts` 加 `config?: ProjectConfig | null` 第 2 参（同 P0b-2 silent ignore 修）
- ✅ **P0b-4** `packages/engine/src/oxl/md-pipeline/index.ts` 删 dead imports `BlueprintProp`/`BlueprintSlot`（不存在 exports，被 TS2724 抓出）
- ✅ **P0b-5** `packages/engine/src/oxl/compiler/dual-track.ts` 删 unused `ASSEMBLY_JSON` import

**P0c — 跨包 leak**（去 rootDir 即可）

- ✅ `packages/cli/tsconfig.json` 去 `rootDir: "./src"`（cli → `src/daemon/` 相对 import 不再触发 TS6059）

**P0 实际成果**：
- 17 个 Asset 源码 bug 全部修复（Asset 错误 16 → 1）
- 2 个 silent ignore 修（runtime correctness，`.oxnrc` scope 现在对 diff/migrate/tree/unarchive 生效）
- 2 个 oxl dead imports 清
- `pnpm run typecheck` 退出码 0 → 2（**正确暴露**剩余 232 个错误，全部在 test 文件）
- `bun test`：1831 pass / 3 skip / 0 fail（**零回归**）
- wall-clock：32.91s → 34.76s（+1.85s，typecheck 加载测试源码后实际跑通的代价）

### P0d：测试 drift 清理（剩余 232 个错误，**当前 phase**）

按错误类型优先级：
1. **TS6133 unused imports**（~52 个）— 机械删除，最快
2. **TS6196 unused types**（3 个）— 机械删除
3. **TS2532 possibly undefined**（36 个）— 加 null check（`noUncheckedIndexedAccess` strict 抓出）
4. **TS2741/TS2339/TS2739/TS2322**（~25 个）— property 缺失/shape 不匹配，按调用方契约修
5. **TS2769/TS2554/TS2353**（~25 个）— overload/arg 不匹配，按函数签名修
6. **TS7006 implicit any**（2 个）— test helper 加显式类型
7. **TS2578 unused @ts-expect-error**（3 个）— 删 directive

**预计工作量**：~3-5 天（与 ADR-0088 P7 Work split 重叠）

### P1：bunfig 漂移清理（30 min）

- 删 6 个幻影模块 glob（`Intent`/`Align`/`Workflow`/`Domain`/`Stack`/`Daemon` — 实际 engine 子目录：Asset/Draft/errors/infra/Insight/kernel/oxl/Pool/Proof/Roadmap/Work）
- 修 stale 注释（`*serial.test.ts` rename 没发生）
- 评估 `infra/` 全局排除的意图（原意是排除 `infra/{probes,providers}` 跨进程 spawn 资源竞争，但实际整个 `infra/` 被排除；P1 决策是否把 `infra/git`/`infra/i18n`/`infra/runtime`/`infra/__tests__`（root）等纯逻辑纳入并发）

### P2：feature→test 映射审计（3-4 hr，按 D8）

- 扫 `.changes/` 按版本（v0.6.0 / v0.6.1 / v0.6.2-alpha.0）列特性
- 每特性标 source module + test file
- 产映射表（`docs/dev/zh-cn/test-coverage-audit.md` 或 `.openxenon/drafts/` 草稿）
- 缺口/冗余清单喂给 P3/P4/P6/P7/P8

### P3：CLI 桶拆分 + unit 化 + 并发重排（合并原 ADR P4，3-4 hr）

- `packages/cli/src/__tests__/` 14 个 `*-e2e.test.ts` 移到 `__tests__/e2e/`
- 调整 e2e 文件相对 import（fixtures/helpers 路径 +1 层）
- bunfig 加 `packages/cli/src/__tests__/*.test.ts`（顶层，fnmatch 不匹配 `e2e/` 子目录）到 `concurrentTestGlob` → 14 个 unit 进并发，14 个 e2e 保持串行
- shell-provider.test.ts 改 `mock.module`（消除双 spawn）
- 预期 wall-clock -6800ms（原 ADR P4 预估）

### P4：Insight/Pool unit 补救（2-3 hr，原 P2）

新建：
- `packages/engine/src/Insight/__tests__/insight-manager.test.ts`（5 个 export 函数各 5-10 case，~500-800 行）
- `packages/engine/src/Pool/__tests__/{gatekeeper,create,list}.test.ts`（~300-400 行）

### P5：Proof 子模块 unit 补充（1-2 hr，原 P3）

新建：
- `packages/engine/src/Proof/__tests__/outcome-writer.test.ts`
- `packages/engine/src/Proof/__tests__/proof-frozen-writer.test.ts`
- `packages/engine/src/Proof/__tests__/proof-manager.test.ts`

### P6：Work 单文件拆分（2 hr，原 P5）

拆分：
- `work-validator.test.ts`（1007 行）→ `work-validator-base.ts` + `work-validator-edge.ts`
- `work-context-builder.test.ts`（901 行）→ `work-context-builder-*.ts`

### P7：orphan test + fixtures 清理（30 min，原 P6）

确认后删除：
- `oxl/examples-md/__tests__/`
- `oxl/generator/__tests__/`
- `cli/__tests__/fixtures/` 5 个未引用文件

### P8：零风险废弃清理核实（1 hr，原 P1）

- 核实 commit `45183a0` 等是否真做了 `*.serial.test.ts` rename（git log）
- 核实 `external-cli-e2e.test.ts` L234-248 4 个 `.skip` 块——保留 or 删？
- 核实 `blueprint-schema.test.ts` `validatePartTemplates (@deprecated)` 块——保留 or 删？

### P9：ADR promote + docs sync（1-2 hr）

- amend → review → Accepted
- 跑 `bun scripts/check-doc-boundary.ts` + `check-heading-skeleton.ts`
- 迁移到 `docs/adrs/0088-test-suite-architecture.md`
- frontmatter `entity: adr-draft` → `entity: adr`，`status: Draft` → `Accepted`
- 删 draft 文件
- 提交 commit：`docs(adrs): ADR-0088 Accepted — OXN 测试套件 4 层架构`

## Expected Outcomes

### LOC 变化

| 操作 | LOC |
|---|---|
| P0 已 done（Asset/types.ts 补 9 类型 + 2 签名 silent ignore 修 + 2 oxl cleanup + tsconfig） | +96 / -10 |
| P0d 测试 drift 清理 | -300 ~ +500（视具体 null check 数） |
| P4 新增（Insight/Pool unit） | +800-1200 |
| P5 新增（Proof 子模块 unit） | +400-600 |
| P3 新增（CLI unit 化） | +600-1000 |
| P6 拆分 | 0 |
| P7 删除 | -1500 |
| **净 LOC（预估）** | **+100-2000** |

### wall-clock 变化

| 操作 | wall-clock |
|---|---|
| P0 已 done | +1850ms（typecheck 加载测试源码后实际跑通） |
| P0d 清理（占位） | ±0 |
| P4 新增 | +200ms |
| P5 新增 | +100ms |
| P3 并发重排 | -6800ms |
| P7 删除 | -50ms |
| **净 wall-clock（预估）** | **-4700ms (-14.3%)** |

### 价值密度变化

| 指标 | P0 前 | P0 后现状 | 提议（P0d-P7 全 done） |
|---|---|---|---|
| `pnpm run typecheck` 真实性 | EXIT=0 silent | EXIT=2 暴露 232 错（全部 test） | EXIT=0 真实 |
| Insight unit:test 比例 | 0/335 (0%) | 0/335 (0%) | 8/335 (2.4%) → 持续优化 |
| Pool unit:test 比例 | 0/240 (0%) | 0/240 (0%) | 5/240 (2.1%) |
| CLI E2E 占 wall-clock | 84.2% | 84.2% | <50% |
| 平均 test case per second | 3117 (unit) + 8.3 (e2e) | 同上 | 显著改善 |
| orphan/redundant tests | 5+ | 5+ | 0 |
| 真实源码 bug（silent typecheck） | 17 | **0** | 0 |
| 跨包 leak | 1 | **0（typecheck 层）** | 0（架构层 follow-up） |

## Alternatives Considered

### 替代方案 A：纯工程视角"删废弃 + 收敛 E2E"（不架构化）

- **优点**：短期收益明确
- **缺点**：未解决 Insight/Pool 缺测根本问题，Phase 6 之后又会漂移

### 替代方案 B：用 OXN Proof 取代 bun test

- **优点**：减少 LOC
- **缺点**：违反 D2 边界——Proof 是 OXN 用户功能，不能 self-host（OXN 不能用 OXN 测 OXN 自身，会循环依赖）

### 替代方案 C：保留现状，仅补 Insight/Pool unit test

- **优点**：最小改动
- **缺点**：CLI E2E 84% wall-clock / shell-provider 双测真壳 等问题未解

**选 D（本 ADR）原因**：兼顾短期脱节点修复 + 长期架构清晰，与 ADR-0084 协作边界分层一致。

## Consequences

### 正面

1. **测试与功能边界一一对应**：T0/T1/T2/T3 ↔ L0/L1/L2/L3，每层测试只测本层职责
2. **Insight/Pool 核心 module 有 unit 保护**：OXN 自身开发期质量门覆盖完整
3. **wall-clock -19.9%**：CLI E2E 改并发 + probe IO 改并发，CI 提速
4. **Phase 6 删除 1500 行**：移除 orphan + fixtures 死代码

### 负面

1. **LOC 净增 300-1300**：测试 LOC 增加（因为补 Insight/Pool/Proof/CLI unit），但 wall-clock 减
2. **CI 改造工作量**：Phase 4 bunfig.toml 改动需要回归测试稳定性
3. **ADR 需要 review**：本 ADR 是 Draft，需工程师 review → Accepted 才能执行 Phase 2-6

## Related Documents

- **AGENTS.md**：硬性规则 L0-L3 宪法
- **RFC-0018**：项目工程元层 + SSOT 全景
- **RFC-0015**：Proof 体系重整（D1-D8）—— 与本 ADR 平行
- **ADR-0084**：协作边界分层（L0-L3 工程层划分）
- **ADR-0066 / 0067**：OXN "不评判"哲学

## History

- 2026-08-01：`/grilling` session 产出（domain-modeling skill）+ 用户决策 #1-#5
- 2026-08-01：初始误放在 `docs/adrs/0087-test-suite-architecture.md`，按"ADR 在 Draft 阶段应在 .openxenon/drafts/"约定迁移到本路径
- 2026-08-02：编号从 0087 改为 0088（0087 已被 `0087-md-single-orthogonal-point.md` 占用）
- 2026-08-02：**amend #1**（当前）：
  - **P0 已落地**（work `p0-typecheck-silent-gap-fix`）—— 修 tsconfig silent gap + 17 Asset 源码 bug + 2 函数签名 silent ignore + 跨包 leak
  - **新增 D6-D9**：测试布局原则（colocated + 三层嵌套 + CLI 桶拆）/ typecheck 覆盖 / feature→test 映射审计 / 子包 files follow-up
  - **新增 Definitions 段**：5 个锐化术语（Test Suite / colocated / feature→test 映射 / typecheck 覆盖 / 幻影模块澄清）
  - **重排 Migration Plan**：原 Phase 1-6 → P0（done） + P1-P9（pending），P0d 填补 typecheck 暴露的测试 drift
  - **修漂移**：删原 Phase 1 已 commit 但实际未做的 `*.serial.test.ts` rename 声称；删原 D5 6 个幻影模块 glob 路径引用
  - 同步 Expected Outcomes（P0 实际成果 + 后续预估）

## Promote Checklist（review → Accepted 后）

- [ ] 工程师 review 通过
- [ ] 文档边界检查（`bun scripts/check-doc-boundary.ts`）通过
- [ ] heading-skeleton 检查通过
- [ ] 迁移到 `docs/adrs/0088-test-suite-architecture.md`
- [ ] frontmatter `entity: adr-draft` → `entity: adr`，`status: Draft` → `status: Accepted`
- [ ] 删除本 draft 文件
- [ ] 提交 commit：`docs(adrs): ADR-0088 Accepted — OXN 测试套件 4 层架构`