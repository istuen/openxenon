# Intent-Align 范式

> v0.1 引入的**核心架构灵魂**：把"声明"与"实例"区分清楚，让 AI 在静态意图的边界内做动态对齐。

## 1. 范式定义

**Intent-Align 二元对偶** 是 OpenXenon v0.1 的设计哲学：

- **Intent（意图）**：静态、声明式、不可变的业务/技术约束
- **Align（对齐）**：动态、实例化、可变的工作/任务/零件编排

> **原则**：每一种实体要么是 Intent，要么是 Align，**不存在第三种状态**。

## 2. 实体对偶表

| 层级 | Intent（静态/声明） | Align（动态/实例） | 关系 |
|---|---|---|---|
| **业务** | **Domain**（DDD 限界上下文：term/ban/invariant） | — | Domain 是 Align 引用的业务词典 |
| **技术** | **Blueprint**（slot 拓扑模板） | — | Blueprint 是 Align 引用的技术模板 |
| **编排** | — | **Work**（资源池 + task DAG） | 一个 Work 可引用多个 Domain + Blueprint |
| **执行** | Blueprint 内的 **Slot** | **Part**（align 到 slot） | 1:N（一个 slot 可被多个 part align） |
| **观测** | Blueprint slot 的 **Observe** 数组 | **Probe**（align 到 observe） | 1:N（一个 observe 可由多 probe 验证） |
| **数据** | **Prop Definition**（属性意图） | **Prop Assignment**（属性赋值） | 1:1 |

## 3. 为什么需要"对偶"

### 痛点 1：单一蓝图承担双重身份

v0.0.x 时代，Blueprint 同时承担"业务蓝图"和"项目蓝图"两个角色：
- 一份 Blueprint 既要描述"业务上要做什么"（noun/verb/rules）
- 又要描述"技术上怎么做"（slot/observe）

→ **业务专家看不懂 Blueprint，技术负责人改不动 Blueprint**。

### 痛点 2：AI 上下文无法隔离

跨业务域编排时，AI 看到所有 Domain 的全部语言约束，**分不清当前任务属于哪个域**。

### 痛点 3：验证标准被绕过

如果 AI 看到了 `expectation/rule` 块，会"针对验证标准优化"（test-hacking），而不是真正解决问题。

## 4. Intent-Align 如何解决

| 痛点 | 解决方式 |
|---|---|
| 双角色混淆 | **Domain = 业务 Intent**，**Blueprint = 技术 Intent**，Work 才负责组合 |
| 上下文隔离 | Work 声明用到的 domain 池；Task 在 task.oxn 内**显式 align** 哪些 domain 参与本次执行 |
| 验证标准绕过 | Blueprint 不再带 expectation/rule；验证逻辑完全在 Probe 内（Align 端） |

## 5. 对偶的物理映射

```
.openxenon/
├── domains/                 ← Intent（业务）
│   ├── member-context.oxn      业务上下文，AI 只能用里面的 term
│   └── order-context.oxn
├── blueprints/              ← Intent（技术）
│   ├── dev-workflow.oxn        slot 拓扑模板
│   └── fix-issue.oxn
└── works/                   ← Align（动态编排）
    └── onboarding/
        ├── work.oxn            声明用到的 domain/blueprint + 编排 task DAG
        └── tasks/
            └── register-member/
                ├── task.oxn    align 1 个 blueprint + 显式声明参与的 domain
                └── state.json  运行时状态
```

## 6. 与 DDD 的关系

Intent-Align 不是 DDD 的替代品，而是 DDD 在工具链中的**工程化映射**：

| DDD 概念 | Intent-Align 映射 |
|---|---|
| Bounded Context | **Domain** 实体（Intent） |
| Ubiquitous Language | Domain 内的 `term` 块 |
| Anti-Corruption Layer | Domain 内的 `ban` 块 + `context_map.imports` |
| Domain Service | **Blueprint** 实体（Intent） |
| Application Service | **Work** 实体（Align） |
| Domain Event | **Trace** 记录（`work-trace.jsonl`） |

## 7. 决策依据

本范式的确立经历了与 AI 的多轮迭代：
- **轮 1**：识别"Blueprint 双角色"问题
- **轮 2**：是否给 Blueprint 注入 DDD？答：否，应独立 Domain 实体
- **轮 3**：一份 vs 多份业务蓝图？答：多份（按限界上下文）
- **轮 4**：是否新增 Compose 层？答：否，编排下沉到 Work
- **轮 5**：确立 **Intent-Align 二元对偶** — 架构灵魂

详见 [ADR-0002](../adr/0002-intent-align-paradigm.md)。
