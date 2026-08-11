---
entity: rfc
id: RFC-0028
theme: context-map-deprecation
status: Accepted
date: 2026-08-10
accepted: 2026-08-10
accepted-at: 2026-08-10
supersedes: []
superseded-by: ~
related:
  - RFC-0009
  - RFC-0018
  - .openxenon/assets/domains/oxn-domain.md
  - .openxenon/assets/domains/oxn-asset-domain.md
  - .openxenon/assets/domains/oxn-work-domain.md
  - .openxenon/assets/domains/oxn-proof-domain.md
  - AGENTS.md
synced-at: 2026-08-10
landing-reason: declarative
---

# RFC-0028: CONTEXT-MAP.md 退役

> **类型**：RFC（OpenXenon 规范 · meta-RFC）
> **主题**：context-map-deprecation
<!-- allow-version -->
> **状态**：✅ Accepted（2026-08-10 — CONTEXT-MAP.md 整体删除 + 守门规则 5 → 4 + Domain 内容回收 + AGENTS.md 升格唯一 Meta 入口）
> **来源**：2026-08-10 grilling session（domain-modeling skill）
> **批次**：v0.7.0 配套新增
<!-- /allow-version -->
> **关系**：本 RFC 撤销 RFC-0018 §D3（CONTEXT-MAP.md 重构决策）；RFC-0018 §D5 由本 RFC 落地

## 摘要

CONTEXT-MAP.md（198 行）整体删除。Meta 层入口由 `AGENTS.md` §入口指针 + §AI Agent 唯一入口段统一承担。守门规则 5 条 → 4 条。CONTEXT-MAP §核心术语锐化段内容（PEAS / Referent / StructureV2 / Blueprint Context / ProbeOutcome / outcome / 三方协作 / IAP 闭环 / Performance Measure 9 段）回迁各 Domain 文件。

## 决策

### D1：CONTEXT-MAP.md 整体删除

**理由**：

1. **内容语义**：CONTEXT-MAP §核心术语锐化段的 9 段（Referent / OpenXenon 三方协作 / Asset / Work / Proof / P / Report / ProbeOutcome / outcome / StructureV2）**全部都是 OpenXenon Domain 概念**，本质是各 Domain 文件的"中央缓存副本"，不是独立 SSOT。
2. **索引功能**：CONTEXT-MAP §Contexts（9 Domain 表）已被 AssetMap `oxn-system.md` §Scenes（按 scene 路由的 Domain 列表）覆盖，scene 路由维度信息量更大。
3. **入口角色**：CONTEXT-MAP 的"入口"角色被 `AGENTS.md` §意图解析流程 + §入口指针完整覆盖；AGENTS.md 本就是 v0.6.2-alpha.2 起 L5 兜底文档（5 级语义优先级最末层兜底）。

**结果**：

- 跨层豁免支点（`assets → CONTEXT-MAP`、`docs/product → CONTEXT-MAP`、`docs/dev → CONTEXT-MAP`、正向豁免 `CONTEXT-MAP → Asset`）4 条规则全失效
- 17 ADR + 10+ Draft 中 CONTEXT-MAP 引用全部 cascade 改写
- RFC-0018 D3 重构决策撤销，改为"删除"

### D2：Domain 内容回迁

PEAS / Referent / StructureV2 / Blueprint Context / ProbeOutcome / outcome / 三方协作 / IAP 闭环 / Performance Measure 共 9 段内容（合并为 12 Axiom）按语义归属回迁各 Domain 文件：

| Axiom | 回迁位置 |
|---|---|
| `### OpenXenonThreePartyCollaboration` | `oxn-domain.md` §Concept |
| `### IAPClosedLoop` | `oxn-domain.md` §Concept |
| `### PerformanceMeasureNotEnforced` | `oxn-domain.md` §Concept |
| `### AssetPeasRole` | `oxn-asset-domain.md` §ContextEngineering |
| `### BlueprintContextEngineering` | `oxn-asset-domain.md` §ContextEngineering |
| `### WorkContextStaticPlanLockProtected` | `oxn-asset-domain.md` §ContextEngineering |
| `### TaskContextPerSlotSplit` | `oxn-asset-domain.md` §ContextEngineering |
| `### PlanLockFiveHash` | `oxn-asset-domain.md` §ContextEngineering |
| `### WorkAsSolutionReference` | `oxn-work-domain.md` §Concept |
| `### ProofAsObjectiveOutcome` | `oxn-proof-domain.md` §Concept |
| `### ProbeOutcomeThreeStates` | `oxn-proof-domain.md` §Concept |
| `### OutcomeAggregateStructure` | `oxn-proof-domain.md` §Concept |

**Group 命名约定**：oxn-asset-domain.md 新增 `§ContextEngineering` Group（区别于既有 `## Concept` / `## Forbidden` / `## Boundary` / `## DesignPhilosophy` / `## Slogan`），Group 名 free-form 由 v0.7.4 grilling 决议锁定。

### D3：守门规则简化（5 → 4）

| 规则 | 变更 |
|---|---|
| `rfc-no-meta` | targetPattern 移除 `CONTEXT-MAP.md` |
| `docs-product-no-meta` | 例外目标 `CONTEXT-MAP.md` → `AGENTS.md`（AGENTS.md 作为入口指针例外）|
| `docs-dev-no-meta` | 例外目标 `CONTEXT-MAP.md + AGENTS.md` → `AGENTS.md` |
| `assets-no-meta` | targetPattern 移除 `CONTEXT-MAP.md`；例外目标 → `AGENTS.md` |
| `context-map-asset-index-allowed` | **整规则删除**（CONTEXT-MAP.md 已退役，豁免目标不存在）|

规则数：5 → 4。`scripts/check-doc-boundary.ts` 维护成本下降。

### D4：AGENTS.md 升格唯一 Meta 入口

`AGENTS.md` §入口指针 段扩充：

- 保留原有 8 项入口指针（项目介绍 / 架构 / 路由 / 术语 / L0-L3 / CLI / 变更历史 / 历史归档）
- 新增 `## AI Agent 唯一入口（v0.7+）` 段：声明本文件为 OXO/IAP 系统的唯一 Meta 层入口；列出路由完整流程 5 步（goal → assetmap suggest → scene → Domain frontmatter → work create）；列出 5 级路径层级

### D5：ADR / Draft / RFC cascade 改写

#### ADR cascade（17 个）

17 个 ADR 头部 reference 列表移除 `CONTEXT-MAP.md`；文中 `[CONTEXT-MAP.md](../...)` 链接改写为对应 Domain / RFC 锚点；加 `[RFC-0028]` 来源标注。

涉及：0066 / 0069 / 0070 / 0072 / 0073 / 0074 / 0075 / 0076 / 0077 / 0078 / 0079 / 0084 / 0086 / 0089 / 0090。

#### Draft 注释保留

10+ Draft 中 CONTEXT-MAP 引用**保留原文 + 单行注释**（`<!-- 已迁移：v0.7 CONTEXT-MAP.md 退役，详见 RFC-0028 -->`），考古链不破。

#### RFC cascade

- `RFC-0018 §D3` 撤销（CONTEXT-MAP.md 重构决策反转）
- `RFC-0018 §D5` 新增：CONTEXT-MAP.md 退役（引本 RFC-0028）
- `RFC-0018` 头部 `related:` 移除 `CONTEXT-MAP.md`

### D6：VitePress sidebar 调整

`docs/.vitepress/config.ts` 移除 `/\.\.+\/CONTEXT-MAP/` 死链忽略规则（CONTEXT-MAP.md 已删除）。

## 验证

```
✓ bun run typecheck
✓ bun run check                                  (1 pre-existing info)
✓ bun scripts/check-asset-structure.ts           23/23
✓ bun scripts/check-doc-boundary.ts              0 violations（4 规则）
✓ bun scripts/validate-dependencies.ts           0 violations
✓ bun scripts/sync-domain-glossary.ts --write    9 Domain / 315+ term
✓ grep -rin "CONTEXT-MAP" --include="*.md"        仅历史注释保留（RFC-0028 / changelog / .openxenon/drafts/）
```

## 风险与缓解

| 风险 | 严重度 | 缓解 |
|---|---|---|
| 17 ADR cascade 漏改 | 中 | grep 全仓验证残留 + 二次扫描 |
| docs/product 引用 CONTEXT-MAP 报错 | 中 | docs/product 已 grep 0 引用 |
| RFC-0018 改写后内容连贯性 | 中 | 保留 RFC 头部 + D1/D2/D4 段不动，仅 D3 撤销 + D5 新增 |
| Draft 注释污染 | 低 | 注释精简（单行 HTML 注释），保留考古链 |
| 守门规则简化误删合法引用 | 低 | Phase 2.9 守门验证 + grep 全文扫描 |

## 架构原则一致性

| 原则 | 一致性 |
|---|---|
| 5 级语义优先级（AGENTS.md L5-11） | ✓ 强化：Meta 层只留 AGENTS.md |
| Domain = 术语 SSOT | ✓ 强化：PEAS / Referent / StructureV2 / Blueprint Context 全回 Domain |
| AssetMap = 路由数据 | ✓ 不变：oxn-system.md §Scenes 已是 scene → Domain 路由 |
| AI Agent 入口 = AGENTS.md | ✓ 强化：唯一 Meta 入口 |
| 跨层引用规则简化 | ✓ 5 条 → 4 条 |
| 版本号中性 | ✓ 不变 |
| Domain 9 个总数 | ✓ 不变 |

## changelog

`.changes/0-7-0-context-map-deprecation.md`（v0.7.0-alpha.0）。
