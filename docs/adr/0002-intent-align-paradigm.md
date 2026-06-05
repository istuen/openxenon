# 0002. Intent-Align 范式

**Status**: Accepted
**Date**: 2026-06-05

## Context

v0.0.x 时代，OpenXenon 存在几个根本性问题：

1. **Blueprint 双角色**：同时承担"业务蓝图"（noun/verb/rules）和"技术模板"（slot/observe）
2. **AI 上下文无法隔离**：跨域编排时 AI 看到所有 Domain 的全部语言约束
3. **验证标准被绕过**：如果 AI 看到 expectation/rule，会"针对验证标准优化"

## Decision

v0.1 引入 **Intent-Align 二元对偶** 作为架构灵魂：

| 层级 | Intent（声明 / 静态） | Align（实例 / 动态） |
|---|---|---|
| 业务 | **Domain** | — |
| 技术 | **Blueprint** | — |
| 编排 | — | **Work** |
| 执行 | Blueprint 内 **Slot** | **Part**（align 到 slot） |
| 观测 | Blueprint 内 **Observe** | **Probe**（align 到 observe） |
| 数据 | **Prop Definition** | **Prop Assignment** |

**核心原则**：每一种实体要么是 Intent，要么是 Align，不存在第三种状态。

### 实体的物理映射

```
Intent 端（声明）              Align 端（动态）
───────────────                ──────────────
Domain 文件                →  Work 编排器
Blueprint 文件             →  Task DAG
Slot 拓扑                  →  Part 实例
Observe 列表               →  Probe 执行
Prop Definition            →  Prop Assignment
```

## Consequences

**正面**：
- Domain 自治、零外部依赖（Asset Independence 原则）
- Blueprint 不含业务/验证语义，纯技术模板
- AI 通过 `get-context` 只看 align 到的 domain（**全量隔离**）
- 验证标准由 Probe 承载，AI 不可见

**负面**：
- 增加了 Work 编排的复杂度（需要声明 ref 池）
- 初学者需要先理解 Intent-Align 范式才能上手

## Alternatives Considered

### Alternative 1: 单层（Blueprint = Work）
v0.0.x 现状，Blueprint 同时是模板和编排。

- 优点：简单
- 缺点：业务专家看不懂 Blueprint

### Alternative 2: 三层（Domain + Blueprint + Compose）
引入独立 Compose 层负责编排。

- 优点：理论更对称
- 缺点：多一层抽象，Work 已能承担编排职责

### Alternative 3: 引入 Maps（跨域映射）
用 `maps "A" to "B"` 显式表达跨域关系。

- 优点：跨域关系显式
- 缺点：复杂度过高，业务专家不容易理解；通过 `context_map.imports` 声明已够用

## References

- [Intent-Align 范式](../core/intent-align.md)
- [ADR-0003: Domain 作为 DDD 限界上下文](./0003-domain-as-bounded-context.md)
