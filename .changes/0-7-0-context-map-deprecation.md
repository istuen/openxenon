---
version: 0.7.0-alpha.0
prerelease: alpha
date: 2026-08-10
type: refactor
scope: context-map-deprecation
status: pending
---

# 0.7.0-alpha.0: CONTEXT-MAP.md 退役

> 来源：[RFC-0028-context-map-deprecation](../../docs/rfc/zh-cn/RFC-0028-context-map-deprecation.md)（v0.7.0）

## 摘要

CONTEXT-MAP.md 整体删除（198 行）。Meta 层入口由 `AGENTS.md` §入口指针 + §AI Agent 唯一入口段统一承担。守门规则 5 条 → 4 条。CONTEXT-MAP §核心术语锐化段内容（PEAS / Referent / StructureV2 / Blueprint Context / ProbeOutcome / outcome / 三方协作 / IAP 闭环 / Performance Measure 共 9 段）合并为 12 Axiom，按语义归属回迁各 Domain 文件。

## 内容迁移

| 段 | 迁入位置 |
|---|---|
| §核心术语锐化（Referent / OpenXenon / StructureV2 / Asset / Work / Proof / P / Report / ProbeOutcome / outcome）| `oxn-domain.md` / `oxn-asset-domain.md` / `oxn-work-domain.md` / `oxn-proof-domain.md` 各 Axiom |
| §Contexts（9 Domain 索引）| `oxn-system.md` §Scenes 已覆盖（按 scene 路由维度信息量更大）；Domain frontmatter `abstract:` 描述各 Domain 角色 |
| §Relationships（图）| Domain frontmatter `references:` DAG 已自证（`scripts/check-asset-structure.ts` 守门）|
| §跨层引用（RFC/ADR/Draft 列表）| RFC-0018 §D4 + RFC-0028 §D4/D5 统一承担 |
| §文档维护约定 | `AGENTS.md` §语义优先级 + §Agent 行为规则 已覆盖 |
| §历史快照（已迁出）| git 历史可追溯 |
| §Blueprint 上下文工程 | `oxn-asset-domain.md` §ContextEngineering Group |

12 Axiom 回迁清单：

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

## 守门规则简化

| 规则 | 变更 |
|---|---|
| `rfc-no-meta` | targetPattern 移除 `CONTEXT-MAP.md` |
| `docs-product-no-meta` | 例外目标 `CONTEXT-MAP.md` → `AGENTS.md`（AGENTS.md 作为入口指针例外）|
| `docs-dev-no-meta` | 例外目标 `CONTEXT-MAP.md + AGENTS.md` → `AGENTS.md` |
| `assets-no-meta` | targetPattern 移除 `CONTEXT-MAP.md`；例外目标 → `AGENTS.md` |
| `context-map-asset-index-allowed` | **整规则删除**（CONTEXT-MAP.md 已退役，豁免目标不存在）|

规则数：5 → 4。`scripts/check-doc-boundary.ts` 维护成本下降。

## 文档 cascade

- `docs/.vitepress/config.ts` 移除 CONTEXT-MAP special-case（line 79-80）
- `docs/rfc/zh-cn/RFC-0018-project-engineering-meta.md` D3 撤销（CONTEXT-MAP.md 重构决策反转）；新增 D5（Meta 层由 5 类文档降为 4 类）；头部 `related:` 移除 CONTEXT-MAP.md
- 17 ADR 头部 reference 列表移除 `CONTEXT-MAP.md`；文中 `[CONTEXT-MAP.md](../...)` 链接改写为对应 Domain / RFC 锚点；加 `[RFC-0028]` 来源标注
- 8 Draft 文件（`design-asset-convergence-v064.md` / `design-blueprint-context-template.md` / `doc-versionless-restructuring.md` / `draft-system-design-grilling.md` / `oxn-dev-release-coexistence.md` / `probe-coef-slot-cost-grilling.md` / `terminology-ssot-execution-plan.md` / `.archived/design-builtin-engine-integration.md`）原文引用保留 + 单行 HTML 注释

## AGENTS.md §入口指针 扩充

新增 `## AI Agent 唯一入口（v0.7+）` 段：

- 声明 `AGENTS.md` 为 OXO/IAP 系统的唯一 Meta 层入口
- 列出路由完整流程 5 步：goal → `oxn assetmap suggest` → scene → Domain frontmatter → `oxn work create`
- 列出 5 级路径层级：L1 术语 SSOT / L2 Asset 定义 / L3 路由数据 / L4 解释性 / L5 兜底
- 历史 `CONTEXT-MAP.md` 已于 v0.7 退役（详见本 changelog + RFC-0028）

## 验证

```
✓ bun run typecheck
✓ bun run check                                  (1 pre-existing info)
✓ bun scripts/check-asset-structure.ts           23/23
✓ bun scripts/check-doc-boundary.ts              0 violations（4 规则）
✓ bun scripts/validate-dependencies.ts           0 violations
✓ bun scripts/sync-domain-glossary.ts --write    9 Domain / 315+ term（净 +12 Axiom）
✓ grep -rin "CONTEXT-MAP" --include="*.md"        仅历史注释保留（RFC-0028 / changelog / .openxenon/drafts/）
✓ grep -rin "CONTEXT-MAP" --include="*.ts"        0 match（除 changelog 注释）
```

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

## 后续 PR

- PR-G：v0.7.0 RFC-0027 Critical Name Collision 修复（D7 Scope / Part / Flag 重命名 cascade）
- PR-H：v0.7.0 RFC-0027 Workflow 层收敛（6 Workflow 删除 + asset-create mode 化）
- PR-I：v0.7.0 RFC-0027 AssetMap stub 标注 + bug-fix-blueprint 接入

详见 RFC-0027。
