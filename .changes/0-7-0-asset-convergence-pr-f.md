---
version: 0.7.0-alpha.0
prerelease: alpha
date: 2026-08-09
type: refactor
scope: asset-convergence-pr-f
status: pending
---

# 0.7.0-alpha.0: Asset 收敛 PR-F（Domain 层收敛）

> 来源：[RFC-0027-asset-convergence-v070.md](../../docs/rfc/zh-cn/RFC-0027-asset-convergence-v070.md) §PR-F

## 摘要

Domain 文件数：13 → **9**（-4：1 个 Domain 合并 + 3 个 Axiom 归口消除重复 + Boundary 删除合并到 Asset + 5 个 Axiom canonical 转移）

| 变化 | 详情 |
|---|---|
| `oxn-draft-domain.md` ↔ `oxn-draft-promote-domain.md` | **合并**（D1 消除循环引用 Inv5DagNoCycles 违反） |
| 3 条字面重复 Inv | canonical 归 proof-domain（D2） |
| VersionHygiene Axiom | canonical 归 project-domain（D3） |
| AssetMap Axiom | canonical 归 asset-domain（D3） |
| Kernel / Infra / Daemon 三 Axiom | canonical 归 engine-domain（D4） |
| 8 条错误处理 ForbiddenConstructs | canonical 归 engine-domain ForbiddenErrorContractFamily（D5） |
| Philosophy 占位 Axiom | 删（D8） |
| IntentPoolRetired + 3 项 Forbidden | canonical 归 project-domain DeprecatedConstructsV040（D9） |
| Boundary Axiom | 删，合并到 Asset 定义（D10） |
| ForbiddenDraftAsAsset | 合并吸收 ForbiddenDraftPromoteAsAsset（D11） |
| 8 个 Domain frontmatter version | 删（D14，版本号中性原则强化） |

## D1：合并 oxn-draft-domain + oxn-draft-promote-domain

**违反**：`oxn-draft-domain.md:13` references `oxn-draft-promote-domain`；`oxn-draft-promote-domain.md:10` references `oxn-draft-domain` → 双向引用违反 `oxn-asset-domain.md:103 Inv5DagNoCycles`

**变更**：
- 保留 `oxn-draft-domain.md`，吸收 promote 域全部 Concept（PromoteRoute / SkeletonForking / PromoteLifecycle / TargetDispatchTable / PromoteBoundaryIsolation / PromoteCompanionAsset / PromoteFutureExtension 7 个 Axiom）到新 `## PromoteRoute` 段
- 吸收 promote 域全部 Invariant（Inv1-7 → 本域 Inv14-20）
- 合并 ForbiddenDraftAsAsset + ForbiddenDraftPromoteAsAsset（D11）
- 删除 `oxn-draft-promote-domain.md`
- references 单向化：`oxn-draft-domain` → `oxn-domain` + `oxn-project-domain` + `oxn-asset-domain`

**文件**：
- `.openxenon/assets/domains/oxn-draft-domain.md`（重写，含 PromoteRoute 段）
- `.openxenon/assets/domains/oxn-draft-promote-domain.md`（删）

## D2：3 条字面重复 Inv 归 proof-domain canonical

| Inv | 原 work-domain 行 | 原 proof-domain 行 | 新位置 |
|---|---|---|---|
| FrozenImmutable | Inv22 | Inv11 | proof Inv11（**不变**） |
| TraceAppendOnly | Inv23 | Inv13 | proof Inv13（**不变**） |
| ProbeFromBlueprint | Inv25 | Inv22 | proof Inv22（**不变**） |

**变更**：
- work-domain 删 3 条 Axiom 内容（保留 heading + 注释指向 proof canonical）
- proof-domain 不变（canonical 已存在）
- work-domain Inv22-36 → 22-35 序号顺延（+1 注释说明）

**文件**：
- `.openxenon/assets/domains/oxn-work-domain.md`（3 Inv 删 + 序号顺延）

## D3：VersionHygiene / AssetMap Axiom 归口

| Axiom | 原 cli/project domain 行 | canonical 行 |
|---|---|---|
| VersionHygiene | cli:34 / project:120 | project:120 |
| AssetMap | project:125 / asset:29 | asset:29 |

**变更**：
- cli-domain §VersionHygiene 改为指向 project-domain canonical
- project-domain §AssetMap 改为指向 asset-domain canonical

**文件**：
- `.openxenon/assets/domains/oxn-cli-domain.md`
- `.openxenon/assets/domains/oxn-project-domain.md`

## D4：Kernel / Infra / Daemon 归 engine-domain canonical

| Axiom | 原位置 | canonical 行 |
|---|---|---|
| Kernel | engine:21 / proof:44 | engine（**扩张吸收**） |
| Infra | engine:24 / proof:47 | engine（**扩张吸收**） |
| Daemon | engine:27 / domain:60 | engine（**扩张吸收**） |

**变更**：
- engine-domain §Kernel/Infra/Daemon 改为吸收 proof + domain 的完整定义
- proof-domain §Kernel/Infra 改为指向 engine canonical（Axiom 删除占位）
- oxn-domain §Daemon 改为指向 engine canonical（Axiom 删除占位）

**文件**：
- `.openxenon/assets/domains/oxn-engine-domain.md`（3 Axiom 扩张）
- `.openxenon/assets/domains/oxn-proof-domain.md`（2 Axiom 删）
- `.openxenon/assets/domains/oxn-domain.md`（1 Axiom 删）

## D5：8 条错误处理 ForbiddenConstructs 归 engine

| Term | 原 cli 行 | 原 proof 行 | 原 work 行 |
|---|---|---|---|
| HARD_FAIL | 76 | 128 | — |
| SOFT_FAIL | 77 | 129 | — |
| VerdictAsException | 71 | 130 | 122 |
| FailureAsCrash | 72 | 131 | — |
| OXN_INTERNAL_ERROR_AS_IAP | 73 | 132 | — |
| StackTraceToAI | 74 | 133 | — |
| HARD_HALT_AS_IAP | 75 | 134 | — |
| Flag | — | 135 | — |

**变更**：
- engine-domain 新增 `### ForbiddenErrorContractFamily` Axiom（含全部 7 项 + desc）
- cli/proof/work 三个 Domain ForbiddenConstructs 删 7 项（保留指向 engine canonical 注释）

**文件**：
- `.openxenon/assets/domains/oxn-engine-domain.md`（+1 Axiom）
- `.openxenon/assets/domains/oxn-cli-domain.md`（-7 项）
- `.openxenon/assets/domains/oxn-proof-domain.md`（-7 项）
- `.openxenon/assets/domains/oxn-work-domain.md`（-1 项）

## D6：oxn-domain 三件套 → 四件套冲突修复

**冲突**：`oxn-domain.md:42` 说"三件套 frozen.json + trace.jsonl + state.json"；`oxn-proof-domain.md:30` 说"四件套 + outcome.md"

**变更**：`oxn-domain.md:42` 改为"四件套 frozen.json + outcome.md + trace.jsonl + state.json"，与 proof-domain canonical 对齐。

**文件**：
- `.openxenon/assets/domains/oxn-domain.md`（1 处）

## D8：删 Philosophy 占位 Axiom

**变更**：`oxn-engine-domain.md:45` 的 `### Philosophy` Axiom 删除（"OXN Engine 哲学占位"——已无信息量；OXN Engine 哲学沉淀到 ADR-0031/0066/0067）

**文件**：
- `.openxenon/assets/domains/oxn-engine-domain.md`（-1 Axiom）

## D9：IntentPoolRetired 归 project-domain canonical

**重复**：
- `oxn-proof-domain.md:100` `IntentPoolRetired` Axiom（v0.6.4 PR-B 合并自 insight-domain）
- `oxn-proof-domain.md:151-153` IntentPool / pool-writer / writePoolEntry Forbidden
- `oxn-project-domain.md:112` `IntentPoolDeprecated` Axiom（canonical 已在）
- `oxn-project-domain.md:171-173` IntentPool / pool-writer / writePoolEntry Forbidden（canonical 已在 DeprecatedConstructsV040）

**变更**：
- proof-domain 删 `IntentPoolRetired` Axiom
- proof-domain ForbiddenConstructs 删 IntentPool / pool-writer / writePoolEntry 3 项

**文件**：
- `.openxenon/assets/domains/oxn-proof-domain.md`（-1 Axiom + -3 项）

## D10：删 Boundary Axiom（合并到 Asset 定义）

**变更**：
- `oxn-domain.md:48` `### Boundary` Axiom 删除（Asset 别名，无独立语义）
- `oxn-domain.md:44` `### Asset` Axiom 注释补"别名：Boundary（OXN Asset 即边界）"

**文件**：
- `.openxenon/assets/domains/oxn-domain.md`（-1 Axiom + Asset 注释补）

## D11：ForbiddenDraftAsAsset 合并

**变更**：D1 合并 draft + draft-promote 域时，ForbiddenDraftAsAsset 合并吸收 ForbiddenDraftPromoteAsAsset 的 2 项（draft-promote-asset + draft-promote-assetkind）。

**文件**：D1 合并吸收。

## D14：删 8 个 Domain frontmatter version 字段

**变更**：删除 8 个活跃 Domain 的 frontmatter `version` 字段（AGENTS.md 版本号中性原则强化：已落地的架构真理不带版本号；版本号只放 `.changes/` / `dev/versions/` / `dev/pool/` / `dev/meta/` / `.openxenon/drafts/`）。

**保留**：`NpmSupplyChainAdvisory.md` 的 `version: 0.1.0`（advisory 类型历史溯源，非定义性 Asset）。

**文件**：
- 8 个 Domain frontmatter `version:` 行删除

## 验证结果

```
bun run typecheck                              ✓ pass
bun run check                                  ✓ pass (1 pre-existing info)
bun test packages/engine packages/cli          ✓ 1931/1931 pass
bun scripts/check-asset-structure.ts           ✓ 29/29 pass (was 30/30; -1 merged draft-promote)
bun scripts/check-doc-boundary.ts              ✓ 0 violations
bun scripts/validate-dependencies.ts           ✓ 0 violations
bun scripts/sync-domain-glossary.ts --write    ✓ 写入完成
oxn asset list                                  ✓ domain 9 (was 10)
oxn assetmap show oxn-system --scene dev       ✓ 正常输出
```

## 后续 PR（按依赖）

- **PR-G**：D7 Scope / Part / Flag 重命名 + cascade
- **PR-H**：6 Workflow 删除 + asset-create mode 化
- **PR-I**：scene stub + bug-fix-blueprint 接入

详见 [RFC-0027 §PR-G/H/I](../../docs/rfc/zh-cn/RFC-0027-asset-convergence-v070.md#5-各-pr-文件清单)。