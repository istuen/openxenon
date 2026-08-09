---
version: 0.6.4-alpha.0
prerelease: alpha
date: 2026-08-09
type: refactor
scope: asset-convergence-pr-b
status: pending
---

# 0.6.4-alpha.0: Asset 收敛 PR-B（Domain 收敛）

> 来源：[`.openxenon/drafts/design-asset-convergence-v064.md`](../../.openxenon/drafts/design-asset-convergence-v064.md) §PR-B
> 前置：PR-A（roadmap → assetmap）

## 摘要

Domain 文件数：13 → **11**（-2）

| 变化 | 类型 | 详情 |
|---|---|---|
| `oxn-insight-domain.md` | **删除** | Q5：Insight 0 引用，CONTEXT-MAP 列为涌现层但下游无消费方 |
| `oxn-probe-domain.md` | **并入** `oxn-proof-domain.md` | Q6：Probe 是 Proof 的 sensor 子概念，5 层名 + outcome 三态 + InterferenceFlag + Inv26-29 + 4 个 Insight Axiom + Inv30-36 全部收编 |

## 删除

- `.openxenon/assets/domains/oxn-insight-domain.md`（v1.0.0）
- `.openxenon/assets/domains/oxn-probe-domain.md`（v1.1.0）
- ⚠️ `.openxenon/.archived/assets/domains/{OxnInsightDomain,OxnProbeDomain}.md` 不存在，无需清理

## 合并到 `oxn-proof-domain.md`（v1.0.0 → v1.1.0）

### `## Concept` 段追加 9 个 Axiom（合并自 probe + insight）

来自 `oxn-probe-domain.md`：

- **Probe** — OXN 内置探针 = 客观事实校验统一抽象
- **ProbeOutcome** — L0 Kernel 产出 3 态拼写分层（pass/fail/inconclusive ↔ COMPLETED/DEVIATED/INCONCLUSIVE ↔ PASS/FAIL/INCONCLUSIVE）
- **UseName** — 业务场景名（字符集 `^[a-zA-Z0-9-]+$`）
- **ProbeName** — Probe 本体名（catalog 注册名）
- **InterferenceFlag** — 信任/污染/干扰唯一收敛目标（ADR-0086 + ADR-0066）
- **SchemaFieldMapping** — 🆕 Q11 b：原 `## Schema` 段改写为 Axiom
- **TargetFrozenJsonStructure** — 🆕 Q11 b：原 `## Schema` 段改写为 Axiom

来自 `oxn-insight-domain.md`（E2=a：术语归宿放 `oxn-proof-domain`）：

- **Insight** — E4 涌现层（写 Draft 通路）
- **Citation** — 反向引用计数 + 影响半径
- **IntentPoolRetired** — Intent Pool v3 已退役（v0.3.0 D1）
- **InsightDraftMapping** — Insight → DraftType 映射（research/audit/journal → report；design → design；issue → issue）

### `## Forbidden` 段追加 13 个 forbidden term

来自 probe：

- Taint / Boundary Deviation / 干涉（JudgeWords）
- outcome（aggregate 顶层字段名禁用，必须 `summary.outcome` 形式）

来自 insight：

- Forge / DesignNote / WorkLog / ResearchPaper
- autoInsightApply / autoPatternPromote
- IntentPool / pool-writer / writePoolEntry

新增独立 Axiom `### ForbiddenTrustMarkAndBoundaryDeviation`（来自 probe JudgeWords 注释）

### `## Boundary` 段追加 Inv26-36（11 个 invariant）

来自 probe（Inv26-29）：

- **Inv26Probe5LayerNaming** — 5 层名不可省略/互换
- **Inv27OutcomeProbeOnly** — aggregate 层禁用 `outcome` 字段名
- **Inv28InterferenceFlagCanonical** — Taint / Boundary Deviation / TrustMark 永久 ban
- **Inv29_3StateSpellingLayered** — 3 态拼写分层设计

来自 insight（Inv30-36）：

- **Inv30InsightWritesDraft** — Insight → Draft 通路
- **Inv31InsightManualGateViaDraft** — manual-gate 改写
- **Inv32InsightDraftTypeMapping** — type mapping 锁定
- **Inv33PatternPersistence** — Pattern 持久化
- **Inv34InsightOutputScope** — Insight 输出范围
- **Inv35CrossWorkPatternThreshold** — occurrences ≥ 3
- **Inv36InsightApplyValidates** — apply validate 语义改写

最终 invariant 数：25 → **36**（+11）

## CONTEXT-MAP.md（8 → 7 contexts）

| 变化 | 详情 |
|---|---|
| 删除 | `OxnInsightDomain` 行 |
| 删除 | `OxnProbeDomain` 行 |
| 扩展 | `OxnProofDomain` 行：标注"🆕 v0.6.4 包含 Probe + Insight" |
| 更新 | Relationships 图：删 OxnInsightDomain 节点 + 引用说明 |
| 更新 | 关系说明：Insight Domain 6 个引用关系全部消解 |

## Asset 文件（`oxn-system.md`）

- scene-dev `oxn-proof-domain` 描述：增加"🆕 v0.6.4: Insight 术语收编"
- scene-debug `oxn-proof-domain` 描述：增加"Insight→Draft 涌现（🆕 v0.6.4: 合并 Probe + Insight）"
- 其他场景无需变更（scene-doc/scene-test/scene-release/scene-onboard 未引用 insight/probe Domain）

## 代码层

- `packages/engine/src/infra/probes/boundary-guard.ts:67-79` — `OXN_BUILTIN_DOMAINS_FALLBACK` 删 `oxn-insight-domain` + 注释 `oxn-proof-domain` 包含原 probe 内容
- `packages/engine/src/oxl/__tests__/summary-extractors.test.ts:251-283` — `realDomains` 列表移除 `oxn-insight-domain` + `domainsWithBans >= 6` 调整为 `>= 5`

## Domain cross-reference 更新

- `.openxenon/assets/domains/oxn-domain.md:55` — `oxn-insight-domain` 链接改为 `oxn-proof-domain.md#insight`
- `.openxenon/assets/domains/oxn-draft-domain.md:67,206` — `oxn-insight-domain.md §InsightDraftMapping` 改为 `oxn-proof-domain.md §InsightDraftMapping` + `§Inv30InsightManualGateViaDraft`
- `.openxenon/assets/domains/oxn-project-domain.md:115,220` — 同上

## Glossary 同步

- `bun scripts/sync-domain-glossary.ts --write` 自动同步：`docs/product/zh-cn/concepts/glossary.md`
- 残留 12 处 `oxn-insight-domain` / `oxn-probe-domain` 引用均为描述性注释（"合并自 ..."），无失效链接

## 验证结果

```
bun run typecheck                              ✓ pass
bun run check                                  ✓ pass (1 pre-existing info)
bun test packages/engine packages/cli          ✓ 1931/1931 pass
bun test (full)                                2133/2137 pass (4 pre-existing failures)
bun scripts/check-asset-structure.ts           ✓ 34/34 pass (was 36/36; -2 domains)
bun scripts/check-doc-boundary.ts              ✓ 0 violations
bun scripts/validate-dependencies.ts           ✓ 0 violations
bun scripts/sync-domain-glossary.ts --write    ✓ 写入完成
oxn assetmap show oxn-system --scene debug     ✓ scene-debug 正常输出
```

## 后续 PR（按依赖）

- **PR-C**：Q8 Workflow 合并（17 → 13）
- **PR-D**：Q7 references 语法统一（B 方案 bare name + parent-kind metadata）
- **PR-E**：Q1 + Q3 物理归位（Probe 文件迁 `.openxenon/probes/` + `AssetType` → `EngineModuleType`）

详见 `.openxenon/drafts/design-asset-convergence-v064.md` §4。