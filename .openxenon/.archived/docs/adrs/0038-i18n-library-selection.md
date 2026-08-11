---
entity: adr
status: Archived
archived-at: 2026-08-11
archived-by: RFC-0030-D1
---

# ADR-0038: i18n 库选型（Paraglide vs typesafe-i18n vs i18next）

> **来源**：`docs_tmp/i18n-tool.md` (2026-05-23)
> **抽取日**：2026-07-04
> **状态**：Pending → 需确认 i18n 实际落地状态
> **影响层**：L3 / CLI + Web 双端

## 候选

| 库 | 优势 | 劣势 |
|---|---|---|
| **Paraglide** | 零运行时、类型安全、ICU 支持 | 生态较小 |
| **typesafe-i18n** | 完整 TS 类型、tree-shake 友好 | 需手动维护键 |
| **i18next** | 生态最大、插件丰富 | 运行时开销、类型弱 |

## 决策（待定）

i18n-tool.md 早期推荐 Paraglide，但需确认当前是否已落地。

## 候选行动

1. 检查 `packages/cli/src/i18n/` 当前实现
2. 检查 `docs/{zh-cn,en}/` 是否为同一源的不同 snapshot
3. 若未实现，建议 Paraglide（契合 Bun 零运行时哲学）

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-05-23-i18n-tool.md`