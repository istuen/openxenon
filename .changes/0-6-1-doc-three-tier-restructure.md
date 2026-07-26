---
version: 0.6.1
date: 2026-07-18
title: v0.6.1 — 文档三层架构重构（topic-first）
author: istuen + opencode
type: major
---

# v0.6.1 — 文档三层架构重构

> **核心变更**：将 `docs/` 从语言优先改为主题优先，将 `.openxenon/` 收敛为项目工作台。

## 核心变化

1. `docs/{zh-cn,en}/{product,dev}/` 调整为 `docs/{product,dev,rfc}/{zh-cn,en}/`，主题成为第一级，语言成为第二级。
2. VitePress locale、导航、侧边栏和站内链接适配 topic-first URL。
3. 产品文档停止引用 `.openxenon/` 内部资料，文档边界检查覆盖新目录。
4. 原 pools 内容按用途收敛：草稿进入 `.openxenon/drafts/`，运行时数据保留在 `.openxenon/{works,proofs}/`。
5. 原 `.openxenon/docs/` 中的 ADR/RFC 暂存到 `.openxenon/drafts/rfc/`，等待 promote、归档或删除。
6. Domain 资产补齐 TrustChain、Notary、Blueprint、Workflow、Stack、Roadmap、Loop 和 EvidenceChainTriple 等核心术语。
7. `AGENTS.md`、`docs/dev/zh-cn/README.md`、VitePress、lefthook 和 `.gitignore` 同步适配。

## 文档边界

- `docs/{product,dev,rfc}/`：外部产品与开发文档。
- `.openxenon/assets/`：项目 Asset 边界。
- `.openxenon/drafts/`：流动的项目工作草稿。
- `.openxenon/drafts/rfc/`：待审视的 ADR/RFC。
- `.openxenon/{works,proofs}/`：IAP 运行时数据。

## 兼容性

- VitePress URL 从 `/openxenon/zh-cn/product/` 调整为 `/openxenon/product/zh-cn/`，不保留旧 URL。
- `scripts/check-doc-boundary.ts` 按 topic-first 结构执行边界校验。
- `docs/.vitepress/config.ts` 只维护站点结构，不承载正文。
