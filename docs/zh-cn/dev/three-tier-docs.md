---
title: 三层文档守门
---

# 三层文档守门

> 产品手册、开发手册、内部手册（ADRs/RFCs）、动态文稿（pools）之间的引用有严格规则。

## 四层文档架构

| 层 | 路径 | 性质 | 受众 |
|---|---|---|---|
| **产品手册** | `docs/{zh-cn,en}/product/` | SSOT · 流动 | 外部用户 + AI 协作者 |
| **开发手册** | `docs/{zh-cn,en}/dev/` | SSOT · 流动 | 贡献者 / 维护者 |
| **内部手册** | `.openxenon/docs/{adrs,rfcs}/` | SSOT · 沉淀 | 维护者 |
| **动态文稿** | `.openxenon/pools/{drafts,issues,journals,spikes}/` | 流动 | 维护者 |

## 引用规则矩阵

| 来源 → 目标 | product/ | dev/ | .openxenon/docs/ | .openxenon/pools/ |
|---|---|---|---|---|
| **product/** | ✅ 内部 | ✅ 脚注 | ❌ 禁止 | ❌ 禁止 |
| **dev/** | ✅ | ✅ 内部 | ✅ | ✅ |
| **.openxenon/docs/** | ❌ 禁止 | ✅ | ✅ 内部 | ✅ 引用探索稿 |
| **.openxenon/pools/** | ❌ 禁止 | ❌ 禁止 | ❌ 禁止 | ✅ 内部 |

## 自动守卫

```bash
# 文档三层边界检查
bun scripts/check-doc-boundary.ts
```

违规示例：

```
🚨 文档边界违规
  docs/zh-cn/product/faq.md:12
  → 禁止引用 .openxenon/docs/adrs/0014-why-openxenon.md
  → 规则：product/ 不可引用内部手册
```

支持豁免：在违规行前加 `<!-- boundary:ignore -->`。

## 参考

- [AGENTS.md §文档三层架构](../../../AGENTS.md#文档三层架构) — 完整规则
- [AGENTS.md §开发者操作指南](../../../AGENTS.md#开发者操作指南) — 跨层引用规则表
