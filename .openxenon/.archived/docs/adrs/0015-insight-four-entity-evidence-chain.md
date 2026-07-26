# ADR-0015: Insight 四实体证据链 schema（Domain/Bp/Work/Task）

> **来源**：`docs_tmp/insight-1.md` (2026-06-10)
> **抽取日**：2026-07-04
> **状态**：Partially Adopted
> **影响层**：E4 Insight

## 决策

Insight 数据按 **4 个实体维度**组织证据链：

| 实体维度 | 关键数据 | tracesBackTo |
|---|---|---|
| **Domain** | `domain.invariant` 历史 verdict | `frozen.json` 集合 |
| **Blueprint** | `blueprint.type` 适用域 | Domain 引用图 |
| **Work** | 完整 IAP 循环历史 | `trace.jsonl` 整段 |
| **Task** | 单次 task verdict | `frozen.json` + `state.json` |

每个 Insight 包含 `evidenceChain[]`，每条证据带 `tracesBackTo` 反向指针。

## 现状

- ✅ Insight E4 已落地（`docs/zh-cn/insight.md`）
- ⚠️ **四实体 schema 未完全显式**
- 🔗 建议在 `docs/zh-cn/insight.md` 增补 §4-§7

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-06-10-insight-1.md`