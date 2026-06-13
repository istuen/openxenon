---
title: 介绍
---

# 介绍

> OpenXenon 是工程师与 AI 协作工作台。工程师定义意图，AI 执行对齐，OXN 证明结果。

## What —— 是什么

OpenXenon 解决的是 AI 编程时代最核心的问题：**当 AI 说"我做完了"，谁来验证它真的做完了？**

答案是 **OXN**——一个独立于 AI 的证明引擎。它不写代码，不替代 AI，只做一件事：**用不可篡改的方式证明 AI 的工作结果是否合格**。

核心范式是 **IAP（Intent-Align-Proof）**，三个主体各司其职：

```
工程师           AI              OXN
  │               │               │
  ▼               ▼               ▼
Intent           Align           Proof
Domain(.oxn)    Work(.oxn)      frozen.json
Blueprint(.oxn)  Task → Artifact  Verdict
  │               │               │
  └───────────────┴───────────────┘
         不可交叉，不可绕过
```

## 解决的问题

1. **验证 AI 执行结果** — AI 声称完成任务后，OXN 独立运行 Probe 检查并产出 frozen.json。AI 无法修改这个文件。
2. **工程师意图对齐** — 通过 Domain 与 Blueprint 前置约束，告诉 AI "用什么语言"和"按什么步骤"，防止漂移。
3. **Token 投入有效化** — 证明结果反馈驱动意图演化，经验沉淀为可复用资产，不让 Token 白烧。

## IAP 范式速览

| 轴 | 主导者 | 职责 | 关键资产 |
|---|---|---|---|
| Intent | 工程师 | 定义业务词典与技术蓝图 | Domain / Blueprint |
| Align  | AI      | 在蓝图边界内编排执行 | Work / Task / Part |
| Proof  | OXN     | 独立验证，产出不可篡改证明 | Probe / Proof / frozen.json |

> **IAP 第一法则**：主导权不交叉，证明不可绕过。

## OXN Engine

OXN Engine 是 Proof 轴的执行主体，由三部分组成：

- **DSL** — OXL 领域特定语言（Langium 实现），定义 Domain / Blueprint / Work 语法
- **Runtime** — Kernel（纯逻辑校验）+ Infra（IO 执行）+ Daemon（守护进程 + 逃逸机制）
- **CLI** — 工程师与 AI 的唯一操作入口（`oxn proof` / `oxn work` / `oxn blueprint` / `oxn domain`）

## 选择你的学习路径

| 如果你是... | 请读 | 用时 |
|---|---|---|
| **评估者 / 决策者** | 介绍 → 核心概念 | 15 min |
| **业务开发者** | 快速开始 → 实战案例 → DDD 实战 | 1–2 h |
| **AI 集成方** | AI 协作者入口 → 对齐轴 → CLI 参考 | 30 min |
| **贡献者** | 架构 → 扩展 | 2–3 h |

> 🟦 **如果你正在读这份文档的是 AI 模型**：请直接读 [llm-prompt.md](./llm-prompt.md)。

> 💡 **使用提示**：本站点 URL 包含 `.html` 后缀（GitHub Pages 项目页限制）。建议通过左侧导航或顶栏菜单浏览，避免手敲 URL。
