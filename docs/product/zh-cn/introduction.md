---
redirectFrom:
  - /zh-cn/index.html
title: 介绍
---

# 介绍

> **OpenXenon —— 工程师定意图，AI Agent 跑对齐，OXN Engine 出证明。**
>
> 工程师信任 AI Agent 在边界内的执行成果。

> **术语权威源**：本文档中的核心词汇（OpenXenon / OXN CLI / OXN Engine）以
> [Layer 0 顶层 Domain](../../.openxenon/assets/domains/oxn-domain.md) 为唯一权威源。
> 详见 [`oxn-domain`](../../.openxenon/assets/domains/oxn-domain.md)。

## What —— 是什么

OpenXenon 是一款**轻量级人机协作工具**。它用 IAP 范式（Intent–Align–Proof）构建的 OXN Engine，驱动"工程师 ↔ AI Agent ↔ OXN Engine"协作流水线运转。

**核心命题**：当 AI Agent 说"我做完了"，谁能让工程师**信任**这件事真的发生了？——不是 AI 自证，而是 OXN Engine 独立公证的不可篡改记录。

```
工程师                AI Agent              OXN Engine
  │                    │                       │
  ▼                    ▼                       ▼
定意图（Intent）    跑对齐（Align）         出证明（Proof）
  │                    │                       │
  │   Domain / Blueprint   │   Work / Task / Part  │   frozen.json + verdict.md
  │                    │                       │
  └────── 协作流水线 ──────┴────── 信任基座 ──────┘
```

**一句话**：**工程师定意图，AI Agent 跑对齐，OXN Engine 出证明**。

## 解决的问题

1. **验证 AI 执行结果** — AI Agent 声称完成任务后，OXN Engine 独立运行 Probe 检查并产出 `frozen.json` + `verdict.md`。AI Agent 无法修改这些文件。
2. **工程师意图对齐** — 通过 Domain / Blueprint / Stack 前置边界，告诉 AI Agent 哪些能做、哪些不能做、用什么语言、按什么步骤。
3. **Token 投入有效化** — 证明结果反馈驱动意图演化，经验沉淀为可复用资产，不让 Token 白烧。

## 为什么需要 OpenXenon — 三痛点

> _（ADR-0014 · slogan-readme-2）_

深夜两点的工程师正在"babysitting the AI"——盯着终端、反复追问"你真的做完了吗？真的修好了吗？真的跑过测试了吗？" 这不是个案，是 2025 年之后所有用 AI 写代码的工程师的日常。

### 痛点 1 · Drift（漂移）

AI 跑着跑着目标悄悄偏了：

> "帮我把 user 表加个索引" → AI 改了 user 表 → 加了索引 → 还改了 orders 表（不必要的 side effect）

工程师最初的需求只是"加索引"，但 AI 越跑越远，最后交付的是"重构用户模块"。**Drift 是最难发现的 bug——你看到代码时它已经成型**。

### 痛点 2 · Hallucination（幻觉）

AI 自信地输出错误：

> "已修复，测试通过" → 实际：改的是错误文件 → 测试根本没跑

AI 的"自信"是它最难对付的特性——它从不迟疑，从不说"我不确定"，从不在交付前自检。**Hallucination 不是 AI 的缺陷，是它的本质**。

### 痛点 3 · Hallucinatory Self-Confirmation（幻觉自证）

AI 把没检查当没问题，反复迭代越跑越偏：

> Round 1：AI 说"修好了" → 实际没跑测试
> Round 2：AI 说"加测试了" → 测试不覆盖 bug
> Round 3：AI 说"测试通过了" → 因为测试断言写反了
> Round 4：AI 说"修复完成" → 因为它相信 Round 3 的结论

> **这是 AI 协作最深层的陷阱**：AI 不是"做不到"，而是"做到了但不知道自己没做到"，然后**自我说服自己做到了**。

### OXN 的回应

OXN 用三个不可妥协的机制切断幻觉自证循环：

| 机制 | 切哪个幻觉环节 |
|---|---|
| **frozen.json**（OS 层 + 内容层 + 写权独占） | AI 改不了"事实" |
| **E3 Engine 独立公证**（Engine ≠ AI） | 验证不是 AI 自查 |
| **3-state verdict**（PASSED / FAILED / INCONCLUSIVE） | INCONCLUSIVE 强制人审 |

> OpenXenon 是个半成品，但我们真心希望它能帮到那些深夜还在 babysitting AI 的工程师。

## IAP 范式速览

| 阶段 | 角色 | 行为 | 关键产物 |
|---|---|---|---|
| **Intent（定意图）** | 工程师 | 定义业务词典与技术蓝图 | Domain / Blueprint / Stack |
| **Align（跑对齐）** | AI Agent | 在边界内编排 Work/Task/Part | Work / Task / 落盘产物 |
| **Proof（出证明）** | OXN Engine | 跑 Probe，记录客观事实，输出不可篡改证据 | frozen.json + verdict.md |

> **信任源自客观公证，而非 AI 自我证明**。OXN Engine 是公证人，不是裁判——它记录"发生了什么"（脚本退出码、测试覆盖率、文件路径等客观事实），不评判"工作合格不合格"。"合格"的判定属于工程师，基于 Asset 与 Proof 的对照。

## OXN Engine

OXN Engine 是 IAP 范式的执行主体（**控制结构**，非执行环境），由三部分组成：

- **L0 Kernel** — 纯逻辑、零 IO（Schema / Contract / Verdict / Processor）。严禁引入概率性数学模型。
- **L1 OXL + Infra** — OXL 领域特定语言（Langium 实现）+ 文件系统 / socket / frozen 等统一副作用出入口
- **L2 Engine** — Asset / Intent / Align / Proof / Insight / Pool 6 大业务模块（DDD 模块化）
- **L3 Tools** — CLI（`oxn` 入口，薄组合调用层）+ Skills（`/oxn-work` 唯一 Skill）+ Daemon（守护进程 + 逃逸机制）

> **OXN Engine 不提供代码执行环境**。沙箱、CI/CD、测试等执行通过库去调用，结果作为证据由 Probe 采集。Engine 不关心怎么执行，只关心执行结果是否被客观记录。

## 选择你的学习路径

| 如果你是... | 请读 | 用时 |
|---|---|---|
| **评估者 / 决策者** | Introduction → Core Concepts | 15 min |
| **业务开发者** | Quickstart → Recipes → DDD in Practice | 1–2 h |
| **AI 集成方** | llm-prompt → Align → CLI | 30 min |
| **贡献者** | Architecture → Extending | 2–3 h |

> 🟦 **如果你正在读这份文档的是 AI 模型**：请直接读 [ai-entry.md](./ai-entry.md)。

> 💡 **使用提示**：本站点 URL 包含 `.html` 后缀（GitHub Pages 项目页限制）。建议通过左侧导航或顶栏菜单浏览，避免手敲 URL。
