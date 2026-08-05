---
title: 三层文档守门（v0.7）
---

<!-- allow-version -->
# 三层文档守门（v0.7）
<!-- /allow-version -->

> 产品手册、开发手册、内部手册（RFC）、动态文稿（drafts）之间的引用有严格规则。

<!-- allow-version -->
## 四层文档架构（v0.7 topic-first）
<!-- /allow-version -->

| 层 | 路径 | 性质 | 受众 |
|---|---|---|---|
| **产品手册** | `docs/product/{zh-cn,en}/` | SSOT · 流动 | 外部用户 + AI 协作者 |
| **开发手册** | `docs/dev/{zh-cn,en}/` | SSOT · 流动 | 贡献者 / 维护者 |
| **内部手册** | `docs/rfc/{zh-cn,en}/`（RFC 规范） | SSOT · 沉淀 | 维护者 |
| **动态文稿** | `.openxenon/drafts/` | 流动 | 维护者 |
| **项目资产** | `.openxenon/assets/` | 边界 · 冻结 | 项目工程师 |
| **运行时数据** | `.openxenon/{works,proofs,.cache}/` | gitignore | IAP 运行时 |

<!-- allow-version -->
## 引用规则矩阵（v0.7）
<!-- /allow-version -->

| 来源 → 目标 | docs/product | docs/dev | docs/rfc | .openxenon/drafts | .openxenon/assets |
|---|---|---|---|---|---|
| **docs/product** | ✅ 内部 | ✅ 同树互引 | ✅ 同树互引 | ❌ 禁止 | ❌ 禁止 |
| **docs/dev** | ✅ | ✅ | ✅ | ✅（promote） | ❌ 禁止 |
| **docs/rfc** | ✅ | ✅ | ✅ | ✅ 引用探索稿 | ❌ 禁止 |
| **.openxenon/drafts** | ✅ 仅通过 promote | ✅ 仅通过 promote | ✅ 仅通过 promote | ✅ | ✅ promote 后 |
| **.openxenon/assets** | ❌ | ❌ | ❌ | ❌ | ✅ |

## 关键约束

1. **docs/ 内部可互引**：product↔dev↔rfc 同根，相对路径
2. **docs/ → .openxenon/ 严格隔离**：产品手册不依赖项目内部
3. **.openxenon/drafts/ → docs/ 仅走 promote**：不能直接复制，必须经 IAP 闭环
4. **docs/rfc/ 是决策归档**：RFC-XXXX 编号（RFC-0001 ~ RFC-0012），accepted 后核心冻结，仅可追加 errata

## Promote 工作流

| 场景 | Blueprint |
|---|---|
| 草稿 → 项目边界 | `asset-workflow` → `.openxenon/assets/{kind}/` |
| 草稿 → 产品手册 | `doc-prod-workflow` → `docs/product/{zh-cn,en}/` |
| 草稿 → 开发手册 | `doc-dev-workflow` → `docs/dev/{zh-cn,en}/` |
| 草稿 → 决策记录 | `doc-rfc-workflow` → `docs/rfc/{zh-cn,en}/RFC-XXXX-<theme>.md` |

## 自动守卫

```bash
# 文档三层边界检查
bun scripts/check-doc-boundary.ts
```

违规示例：

```
🚨 文档边界违规
  docs/product/zh-cn/faq.md:12
  → 禁止引用 .openxenon/drafts/rfc/0014-why-openxenon.md
  → 规则：docs/ 不可引用 .openxenon/ 内部
```

支持豁免：在违规行前加 `<!-- boundary:ignore -->`。

<!-- allow-version -->
## 与 v0.6 老模型对比

| v0.6 | v0.7 |
<!-- /allow-version -->
|---|---|
| `docs/zh-cn/product/` | `docs/product/zh-cn/`（topic-first） |
| `.openxenon/docs/adrs/` | `docs/rfc/zh-cn/RFC-XXXX-<theme>.md`（规范） |
| `.openxenon/docs/rfcs/` | `docs/rfc/zh-cn/`（撤销独立目录） |
| `.openxenon/pools/{drafts,issues,journals,spikes}/` | `.openxenon/drafts/`（删除 issues/journals，spikes 内置为 kind） |

## 参考

- [AGENTS.md §文档三层架构](../../../AGENTS.md#文档三层架构v0-7-重构) — 完整规则
- [AGENTS.md §RFC 生命周期](../../../AGENTS.md#rfc-生命周期v07-取代-oxp-机制) — 4 条 Promote 工作流
- [AGENTS.md §开发者操作指南](../../../AGENTS.md) — 跨层引用规则表
