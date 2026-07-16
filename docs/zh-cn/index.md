---
title: 介绍
---

# OpenXenon

> **工程师定意图，AI Agent 跑对齐，OXN Engine 出证明。**

OpenXenon 是一款轻量级人机协作工具。它用 IAP 范式（Intent–Align–Proof）构建的 OXN Engine，驱动"工程师 ↔ AI Agent ↔ OXN Engine"协作流水线运转。

**核心命题**：当 AI Agent 说"我做完了"，谁能让工程师**信任**这件事真的发生了？——不是 AI 自证，而是 OXN Engine 独立公证的不可篡改记录。

---

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 2rem;">

<div>

## 📘 产品手册

> 受众：OpenXenon 使用者（工程师 + AI Agent 协作者）

**OpenXenon 是什么、有什么、怎么用。**

- [**介绍**](/zh-cn/product/introduction.html) — 一句话定位 + 三痛点 + 三方分工
- [**快速开始**](/zh-cn/product/quickstart.html) — 5 分钟跑通 Proof-First
- [**IAP 范式与信任链**](/zh-cn/product/concepts/iap-paradigm.html) — 核心范式必读
- [**E1-E4 四实体**](/zh-cn/product/concepts/iap-paradigm.html) — 范式落地的结构实体
- [**实战案例**](/zh-cn/product/practice/recipes.html) — 端到端可运行的工作流
- [**用户参考**](/zh-cn/product/reference/cli-user-guide.html) — CLI / 模板 / 术语表 / FAQ
- [**AI 入口**](/zh-cn/product/ai-entry.html) — AI Agent 协作者专用页

</div>

<div>

## 🔧 开发手册

> 受众：OpenXenon 贡献者 / 维护者

**OpenXenon 怎么实现、怎么扩展、怎么贡献。**

- [**入门**](/zh-cn/dev/getting-started.html) — 环境搭建 + 仓库布局 + 工具链
- [**架构总览**](/zh-cn/dev/architecture.html) — E1-E4 + L0-L3 全景
- [**Monorepo 双包**](/zh-cn/dev/monorepo.html) — packages/cli + packages/engine
- [**L0-L3 宪法**](/zh-cn/dev/l0-l3-constitution.html) — 8 子层依赖图 + 越界解读
- [**扩展点**](/zh-cn/dev/extending/custom-probe.html) — 自定义 Probe / Part / Skill
- [**测试**](/zh-cn/dev/testing.html) + [**发布**](/zh-cn/dev/releasing.html) + [**调试**](/zh-cn/dev/debugging.html)
- [**代码规范**](/zh-cn/dev/conventions.html) — biome / eslint / commit

</div>

</div>

---

## 为什么需要 OpenXenon — 三痛点

| 痛点 | 现象 | OXN 切断机制 |
|---|---|---|
| **Drift**（漂移） | AI 跑着跑着悄悄偏题 | E1 Asset 硬约束边界 |
| **Hallucination**（幻觉） | AI 自信地输出错误 | E3 Engine 独立探针 |
| **幻觉自证** | AI 把"没检查"当"没问题" | INCONCLUSIVE verdict 强制人审 |

## 三方主体分工

| 主体 | 主导 | 核心动作 | 禁区 |
|---|---|---|---|
| **工程师** | E1 Asset + E2 Intent | 定意图、维护资产、决定合格判定 | 不可把判定权让渡给 AI |
| **AI Agent** | E2 Align | 执行 tasks、多轮 Round、落盘产物 | 不可越边界、不可改 Asset |
| **OXN Engine** | E3 + E4 | 跑探针、记事实、产 verdict、涌现推理 | 不评判质量、不替 AI 执行 |
