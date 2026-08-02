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

> **状态**：🚧 Draft（2026-08-01 `/grilling` session 产出，待 review → Accepted 后 promote 到 `docs/adrs/0088-test-suite-architecture.md`）
> **日期**：2026-08-01
> **位置**：`.openxenon/drafts/adr-0088-test-suite-architecture-draft.md`（Draft 阶段，不应在 `docs/adrs/`）
> **来源**：2026-08-01 `/grilling` session（domain-modeling skill）—— 用户回答 #1 "测试都对应当前版本功能、单元测试、是否存在脱节差异" + #2 "测试属于 OXN 保证其交付质量" + #4 "测试归测试，Proof 归 Proof，两者不重叠" + #5 "重新架构"
> **影响层**：E0-E3 全栈 · 测试方法论 · 测试/Proof 边界

## Context

### 当前状态（实测 2026-08-01）

| 指标 | 数值 |
|---|---|
| Test 文件数 | 146 |
| Test case 数 | 1834（1831 pass + 3 skip + 0 fail） |
| 测试源码 LOC | 26,809 |
| wall-clock | 32.91s（CLI E2E 占 84.2%） |
| 覆盖率红旗 | `Insight/` 0 unit（335 src 行）/ `Pool/` 0 unit（240 src 行） |

### 触发问题

OXN 现有测试套件**与功能特性映射存在系统性脱节**。经 2026-08-01 grilling session 审计发现 4 类脱节：

1. **完全缺测**：2 个核心 module（`Insight/` + `Pool/`）无 unit test，全部依赖 e2e 黑盒兜底。
2. **完全冗余测**：5+ 漂移测试（`.skip()` 集中废弃块 / `@deprecated` describe / orphan test / 5 个未被 import 的 fixtures 文件）。
3. **层级错位**：shell-exec（L1）+ shell-provider（L2 wrapper）双测真壳 spawn；CLI E2E 14 文件占 84% wall-clock 但仅贡献 12.5% test case。
4. **单文件价值密度失衡**：`Work/__tests__/work-validator.test.ts`（1007 行）+ `work-context-builder.test.ts`（901 行）+ `per-work-blueprints-merger.test.ts`（590 行）+ `birth-cert.test.ts`（539 行）4 件占 Work 整个模块测试 76% 行数。

### 用户 5 个关键决策（2026-08-01 grilling session）

1. 测试对应功能特性，单元测试存在脱节差异 → 需做 mapping audit
2. **测试属于 OXN 自身交付质量保证**；Proof 是 OXN 给用户的产品功能，OXN 自身开发期 Proof 也会调 OXN 自身的 test
3. OXN "不评判"哲学（ADR-0066/0067）与 bun test 硬断言**不冲突**——前者评判 OXN 用户工作，后者断言 OXN 自身代码
4. 测试归测试，Proof 归 Proof——**两者平行不重叠**
5. 重新架构（不是简单删减）

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

## Migration Plan

### Phase 1：零风险废弃清理（2026-08-01 已 commit 45183a0 + 0da994b + 37b1335 + 13cf1d6）

- ✅ `external-cli-e2e.test.ts` L234-248 4 个 `.skip` 块（保留——需确认）
- ✅ `blueprint-schema.test.ts` `validatePartTemplates (@deprecated)` 块（保留——需确认）
- ✅ 3 个 probe handler 改 `.serial.test.ts` 命名 + bunfig 排除 infra/（已 commit）

### Phase 2：完全缺测补救（Insight + Pool unit test，P0）

新建：
- `packages/engine/src/Insight/__tests__/insight-manager.test.ts`（5 个 export 函数各 5-10 case，预计 ~500-800 行）
- `packages/engine/src/Pool/__tests__/{gatekeeper,create,list}.test.ts`（预计 ~300-400 行）

工作量：**~2-3 hr / +800 LOC**。

### Phase 3：Proof 子模块 unit test 补充（P1）

新建：
- `packages/engine/src/Proof/__tests__/outcome-writer.test.ts`
- `packages/engine/src/Proof/__tests__/proof-frozen-writer.test.ts`
- `packages/engine/src/Proof/__tests__/proof-manager.test.ts`

工作量：**~1-2 hr / +500 LOC**。

### Phase 4：CLI unit 化与并发重排（P1）

改造：
- 把 6 个 cli unit test 文件（`config-loader` `domain-canonicalization` `verbosity` `output-user-input` `proof-outcome-writer` `probe-stats-store`）加 `concurrentTestGlob`
- 新建 CLI dispatch unit test 模板（mock fs/skill/spawn）
- shell-provider.test.ts 改 mock.module（消除双 spawn）

工作量：**~3-4 hr / -7300ms wall-clock**。

### Phase 5：Work 单文件拆分（P2）

拆分：
- `work-validator.test.ts`（1007 行）→ `work-validator-base.ts` + `work-validator-edge.ts`
- `work-context-builder.test.ts`（901 行）→ `work-context-builder-*.ts`

工作量：**~2 hr / 0 LOC 变化**。

### Phase 6：orphan test + fixtures 清理（P3）

确认后删除：
- `oxl/examples-md/__tests__/`
- `oxl/generator/__tests__/`
- `cli/__tests__/fixtures/` 5 个未引用文件

工作量：**~30 min / -1500 LOC**。

## Expected Outcomes

### LOC 变化

| 操作 | LOC |
|---|---|
| Phase 2 新增（Insight/Pool unit） | +800-1200 |
| Phase 3 新增（Proof 子模块 unit） | +400-600 |
| Phase 4 新增（CLI dispatch unit） | +600-1000 |
| Phase 5 拆分 | 0 |
| Phase 6 删除 | -1500 |
| **净 LOC** | **+300-1300** |

### wall-clock 变化

| 操作 | wall-clock |
|---|---|
| Phase 2 新增 | +200ms |
| Phase 3 新增 | +100ms |
| Phase 4 并发重排 | -6800ms |
| Phase 6 删除 | -50ms |
| **净 wall-clock** | **-6550ms (-19.9%)** |

### 价值密度变化

| 指标 | 现状 | 提议 |
|---|---|---|
| Insight unit:test 比例 | 0/335 (0%) | 8/335 (2.4%) → 持续优化 |
| Pool unit:test 比例 | 0/240 (0%) | 5/240 (2.1%) |
| CLI E2E 占 wall-clock | 84.2% | <50% |
| 平均 test case per second | 3117 (unit) + 8.3 (e2e) | 显著改善 |
| orphan/redundant tests | 5+ | 0 |

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

## Promote Checklist（review → Accepted 后）

- [ ] 工程师 review 通过
- [ ] 文档边界检查（`bun scripts/check-doc-boundary.ts`）通过
- [ ] heading-skeleton 检查通过
- [ ] 迁移到 `docs/adrs/0088-test-suite-architecture.md`
- [ ] frontmatter `entity: adr-draft` → `entity: adr`，`status: Draft` → `status: Accepted`
- [ ] 删除本 draft 文件
- [ ] 提交 commit：`docs(adrs): ADR-0088 Accepted — OXN 测试套件 4 层架构`