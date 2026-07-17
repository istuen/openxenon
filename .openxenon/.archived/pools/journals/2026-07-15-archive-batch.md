---
event: archive-journal-batch
date: 2026-07-15
reason: v0.3-era design drafts with broken `forges/` references (目录已重命名为 pools/)
related-issues: pool-audit-D4 (pools 文档审计)
---

# Journal: 2026-07-15 — 归档 v0.3 时代 journals

3 篇 v0.3 时代 journal 因 `forges/` 路径全部失效（v0.3 已迁移到 `pools/`）被移入 `_archive/`：

| 归档文件 | 归档原因 |
|---|---|
| `2026-06-13-intent-pool-design-v0.3.0.md` | v0.3 Intent Pool 设计，多处引 `.openxenon/forges/...` 路径全失效；`src/hall/` 等路径同样已重构 |
| `2026-06-18-md-canonical-v1.md` | v0.3 路线 C 远期档，决策已在 v0.4-v0.6 阶段落地（`.md` 已成 canonical，`unified+remark+mdast` 路径规划已被实际实现覆盖） |
| `2026-06-20-md-ssot-decision.md` | v0.3 战略决策日志，5 项决策已全部落地（forges→pools 迁移完成，5 个 version scripts 已实施，5 类 IAP create CLI 已就绪） |

**归档原则**：保留历史决策记录（journals 是流动层，可改可删），但保留在 `_archive/` 子目录而非根目录，以避免污染当前 journals/ 时间线（按日期前缀排序的会话日志）。

**当前 journals/ 时间线**：

- `2026-07-04-e2e-v061-alpha0.md` — v0.6.1-alpha.0 端到端验证
- `2026-07-10-references-kind-isolation.md` — references 同 kind 决策 + AssetPaper backfill

归档后所有 journals 当前指向 v0.6.1 状态，无过期引用。
