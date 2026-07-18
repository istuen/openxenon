---
title: v0.6.1 — 文档三层架构重构（topic-first）
author: istuen + opencode
type: major
---

# v0.6.1 — 文档三层架构重构

> **核心变更**：将 docs/ 从「语言优先」(zh-cn-first) 改为「主题优先」(product|dev|rfc/{zh-cn,en})；将 .openxenon/ 从「三层文档池」收敛为「项目工作台」(assets + drafts + works + proofs)。

## What —— 改了什么

1. **docs/ 目录重构** — 从 `docs/{zh-cn,en}/{product,dev}/` 改为 `docs/{product,dev,rfc}/{zh-cn,en}/`，topic 为第一级，语言为第二级
2. **VitePress config.ts 全量重写** — locale key 从 `zh-cn`/`en` 改为 `/product/zh-cn/` 等 topic-prefix 形式
3. **修复 26 个断链 + 17 个违规引用** — 产品手册不再跨边界引用 `.openxenon/internal/`
4. **pools/ 整体删除** — issues → GitHub Issues；journals → 不入 OXN 管理；spikes/drafts → `.openxenon/drafts/`
5. **.openxenon/docs/ 整体删除** — 46 ADR + 13 RFC + INDEX + archive 全部迁移到 `.openxenon/drafts/rfc/`（待用户逐个审视归属）
6. **Domain 词汇扩充 34 个 H3 Terms** — 涵盖 TrustChain/Notary/Blueprint/Workflow/Stack/Roadmap/Loop/EvidenceChainTriple 等用户可见核心术语
7. **AGENTS.md + dev/README.md + lefthook.yml + .gitignore 适配新模型**

## Why —— 为什么这么改

v0.6 文档更新滞后于代码，Asset 内容超前于 Doc。docs/ 的「语言优先」结构强迫用户先选语言再选主题，对贡献者不对称。新模型把 docs/ 视为 OXN 的统一文档中心，把 .openxenon/ 视为项目工作台，边界清晰：

- `docs/{product,dev,rfc}/` = OXN 产品手册（外部）
- `.openxenon/assets/` = 项目边界（冻结不可变）
- `.openxenon/drafts/` = 项目工作草稿（流动）
- `.openxenon/drafts/rfc/` = ADR/RFC 暂存（待审视）

## How —— 迁移路径

1. 直接刷新 docs/ 目录，文件名变化但语义不变
2. ADR/RFC 暂存 `.openxenon/drafts/rfc/`，需逐个审视决定 promote → `docs/rfc/zh-cn/OXP-XXXX-xxx.md` 或归档/删除
3. 4 条 Promote 工作流（asset-workflow / doc-prod-workflow / doc-dev-workflow / doc-rfc-workflow）需在后续实现 Blueprint

## 影响范围

- **VitePress URL**：`/openxenon/zh-cn/product/` → `/openxenon/product/zh-cn/`（已确认抛弃旧 URL）
- **AGENTS.md** 已重写文档三层架构段
- **ci 守门**：`bun scripts/check-heading-skeleton.ts .openxenon/drafts/` 已适配新路径
- **doc-boundary-check** 已扩展规则（docs/ → .openxenon/ 严格禁止）

## 后续工作

- [ ] P5.6 扩展 docs/product/zh-cn/reference/glossary.md（16 → ~45 行）
- [ ] P6 定义 4 个 Promote Blueprint
- [ ] P7 ADR/RFC 逐个审视，决定 OXP 编号与归档
- [ ] P8 docs/en/ 结构完全对齐 docs/zh-cn/
