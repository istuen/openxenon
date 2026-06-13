---
title: 核心概念
---

# 核心概念

> IAP 三轴一图 + 三大主体权力分立 + IAP 第一法则。
> 本章是理解 OpenXenon 所有后续内容的基础。

## What —— IAP 三轴一图

IAP（Intent-Align-Proof）是 OpenXenon 的架构灵魂。它不是自上而下灌输的范式，而是从 Proof 轴的需求自下而上生长的。

```
        Intent轴                    Align轴
    Domain(.oxn)                 Work(.oxn)
         │                            │
         ▼                            ▼
    Blueprint(.oxn)              Task → Artifact
         │   Probe标准               │  Artifact事实
         └────────────┬───────────────┘
                      │
                      ▼
                  Proof轴
               Proof(Verdict)
                OXN Engine
                      │
                      │  反馈（P → I）
                      │  Verdict 驱动 Intent 演化
                      └──────────▶ Intent 演化
```

**正向推导**：工程师定义 Intent → AI 执行 Align → OXN 给出 Proof
**反馈闭环**：Proof 的 Verdict 反馈驱动 Intent 演化（精准化 / 业务化 / 资产化）

三轴形成 I → A → P → I 闭环，下一轮的 Intent 比上一轮更精准。

## 三大主体 —— 权力分立

IAP 范式的核心是三轴分离、主导权不交叉。在工作台上，存在三个拥有独立主权的行为主体：

| 主体 | 主导轴 | 核心权力 | 绝对禁区 |
|---|---|---|---|
| 工程师 | Intent | 创作 Domain 与 Blueprint | 不能自我证明意图正确 |
| AI | Align | 编排 Work、选择 Part | 不能自我验证执行合格 |
| OXN | Proof | 产出不可篡改的 Proof | 不能修改意图或替 AI 执行 |

每个主体只在自己的轴内拥有主权，不容其他主体侵犯。

## IAP 第一法则

> **主导权不交叉，证明不可绕过。**

- AI 不得越过 Blueprint 的 slot 边界（对齐权受制于意图权）
- 工程师不得在 Probe 检查前宣布完成（意图权受制于证明权）
- OXN 不得修改 Domain 术语或 Blueprint 规则（证明权不得篡权）

## IAP 三轴实体

### Intent 轴（工程师主权）

| 实体 | 中文 | 定义 | 物理形态 |
|---|---|---|---|
| Domain | 领域 | 业务词汇表（term）、禁令（ban）、不变式（invariant） | `.openxenon/domains/<name>.oxn` |
| Blueprint | 蓝图 | 技术流水线模板，定义 slot 拓扑 + Probe 标准 | `.openxenon/blueprints/<name>.oxn` |
| Program Domain | 编程领域 | OXN 内置的编程概念词汇表，无需 DDD 即可使用 Blueprint | `@oxn/domains/ProgramContext` |

### Align 轴（AI 主权）

| 实体 | 中文 | 定义 | 物理形态 |
|---|---|---|---|
| Work | 工作 | AI 对齐 Blueprint 的完整作业空间 | `.openxenon/works/<name>/work.oxn` |
| Task | 任务 | Work 中的执行步骤，对齐 Blueprint 的一个 slot | `.openxenon/works/<w>/tasks/<t>/` |
| Part | 构件 | 执行 Task 的具体工具，内联在 task 块中 | `part { skill_context = "..." }` |
| Artifact | 产物 | Task 执行后落盘的文件或状态 | 项目文件系统中的实际文件 |

### Proof 轴（OXN 主权）

| 实体 | 中文 | 定义 | 物理形态 |
|---|---|---|---|
| Probe | 探针 | 验收标准的声明（Intent 侧）与执行（Proof 侧） | `@oxn/probes/*` 或内联 |
| Proof | 证明 | OXN 对 Work/Task 执行 Probe 后产出的完整判定记录 | `frozen.json` |
| Verdict | 裁定 | Proof 的最终结论：PASS 或 FAIL | `frozen.json` 中的 `verdict` 字段 |

**Proof 物理路径**：
- P 独立模式（Proof-First）: `.openxenon/proofs/<name>/frozen.json`
- IAP 完整模式: `.openxenon/works/<w>/tasks/<t>/frozen.json`

两种模式使用同一文件名 `frozen.json`，区别仅在父目录与生命周期。

## OXN Engine

OXN Engine 是 Proof 轴的执行主体：[Intent](./intent.md) 声明标准，[Align](./align.md) 产出事实，OXN 汇合二者给出 [Proof](./proof.md)。

OXN Engine = **DSL + Runtime + CLI**：

| 组件 | 作用 |
|---|---|
| DSL (OXL) | Domain / Blueprint / Work 的语法定义与解析 |
| Runtime | Kernel（纯逻辑）+ Infra（IO）+ Daemon（守护进程） |
| CLI | 工程师与 AI 的统一操作入口 |

## Runtime 三模块纯洁性约束

| 模块 | 中文 | 职责 | 约束 |
|---|---|---|---|
| Kernel | 内核 | 纯逻辑校验，零 IO | 不得执行任何副作用（如 `fs.existsSync`） |
| Infra | 底座 | 副作用 / IO 执行，获取事实 | 只回答事实，不得做出 PASS/FAIL 判定 |
| Daemon | 守护进程 | 生命周期管理 + 逃逸机制 | Probe FAIL 时阻止 Work 进入 done |

> **纯洁性第一法则**：
> - Infra 不能绕过 Daemon 自我宣布完成
> - Daemon 不能修改 Kernel 规则
> - Kernel 不能直接执行 Task

## 信息隐藏原则

> **AI 只看"该做什么"，不看"该满足什么"**——这是 OpenXenon 的对抗性设计，防止 AI 针对性绕过验证。

| 信息 | 谁可见 |
|---|---|
| Domain term / ban | AI 可见（需要统一语言） |
| Blueprint slot | AI 可见（需要知道步骤） |
| Probe 验证标准 | AI **不可见** |
| frozen.json | AI **不可写** |
| state.json | AI **不可写** |

## 两类资产与两层架构

| 实体 | 谁创建 | 谁使用 | OXN 角色 |
|---|---|---|---|
| Domain | 工程师 | AI / OXN | 读取 + 校验 |
| Blueprint | 工程师 | AI / OXN | 读取 + 校验 |
| Work | OXN + 工程师 | AI / OXN | 创建 + 管理 |
| Proof | OXN | 工程师 / AI | 产出 + 冻结 |

## → 参考

- 完整术语表：[Glossary](./glossary.md)
- 代码架构分层：[Architecture](./architecture.md)
- 设计笔记：[Intent](./intent.md) / [Align](./align.md) / [Proof](./proof.md)
