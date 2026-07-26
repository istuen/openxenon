---
version: 0.6.1
date: 2026-07-06
type: minor
rfc:
  - .openxenon/drafts/rfc/v0.6.3-asset-paper-schema-rfc.md
adr:
  - .openxenon/drafts/rfc/0051-asset-paper-citation-network.md
---

# 0.6.1 — Asset Paper 基础字段与引用 DAG

> 原规划将该能力安排在 v0.6.3，实际基础实现已在 v0.6.1-alpha.1 落地。本片段只记录当前代码中已实现的范围。

## 核心变化

### Asset Paper 四字段

- Asset 支持 `abstract`、`references`、`citations`、`auditTrail` 四项论文式元数据。
- `validateAssetPaper4Fields()` 提供 fail-open 校验，缺失字段默认返回 warnings。
- strict 模式在字段不完整时抛出 `IAPError(INCOMPLETE_ASSET_PAPER)`。
- Roadmap 只要求 `abstract`，其导航关系由自身 links 承载。

### 引用 DAG

- `validateAssetReferences()` 扫描 domain、workflow、stack、blueprint、roadmap 五类 Asset。
- `checkAssetDAG()` 检测自环、循环依赖和孤儿引用，并返回结构化结果。
- Asset 删除前检查反向引用，仍被其他 Asset 引用时拒绝删除。

### 演进审计

- Asset evolve 在新旧版本中追加双向 `auditTrail` 记录。
- 新版本从零开始记录 citations；旧版本保留被演进关系。

## 未包含的规划

以下能力尚未实现，不属于 v0.6.1：

- `library/`、`external/` Asset 子目录；该方案已由三边界 RFC 收敛为 inline external。
- citations 自动全量或增量重算。
- `oxn asset graph`、DOT/Mermaid 输出和 Hall 影响图。
- citation cache 与 impact radius。

这些图谱能力继续保留在 `.changes/0-7-0-asset-graph.md` 的未来规划中。
