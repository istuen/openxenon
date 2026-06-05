# 0003. Domain 作为 DDD 限界上下文

**Status**: Accepted
**Date**: 2026-06-05

## Context

OpenXenon 在 0.0.x 没有 Domain 概念，Blueprint 同时承担业务语义。导致：
- 业务专家无法直接维护 Blueprint
- 业务术语约束（noun/verb）散落在 Blueprint 内
- 跨域编排时无法做上下文隔离

## Decision

v0.1 引入 **Domain 实体**作为 DDD 限界上下文，承载业务语义：

### Domain 内容

```oxn
domain "<DomainName>" {
  description = "..."

  term {
    "<Noun>": "<释义>",
    "<Verb>": "<释义>"
  }

  ban { "<禁用词>" }

  invariant { "<业务不变量>" }

  context_map {
    imports "<OtherDomain>" as "<Alias>"
  }
}
```

| 字段 | 含义 |
|---|---|
| `term` | 核心词汇表（map 格式：nouns/verbs 合并） |
| `ban` | 禁用词表（AI 不得使用） |
| `invariant` | 业务不变量（v0.1 文档化，v0.2 Probe 校验） |
| `context_map` | 跨域引用声明（仅声明，不传递依赖） |

### 自治原则（Asset Independence）

Domain 必须满足：
1. **不引用 Asset**：不出现 `ref "@oxn/..."` 或 `ref "@prj/..."`
2. **不持有 Slot**：不含 slot/observe
3. **不持有 Probe**：不含 probe 引用
4. **不持有 Execution**：不含 execution

→ Domain 失去自治性即失去跨项目/跨技术栈的可复用性。

## Consequences

**正面**：
- 业务专家可直接维护 Domain（不需懂技术）
- 跨项目复用 Domain（不变的部分）
- AI 上下文可按 task align 隔离
- 业务术语统一（term + ban）

**负面**：
- 业务专家需要学 OXN DSL（但语法极简）
- invariant 在 v0.1 仅文档化，需 v0.2 接入 Probe 强校验

## Alternatives Considered

### Alternative 1: 不引入 Domain
保持 v0.0.x 现状（Blueprint 承担一切）。

- 优点：无新概念
- 缺点：业务专家被迫接触技术

### Alternative 2: 业务规则放在 YAML sidecar
Domain 用 YAML 描述，Blueprint 用 OXN。

- 优点：业务专家工具链熟悉
- 缺点：与 OXN DSL 分裂，违反单一权威源

### Alternative 3: Domain 复用 ContextMap（DDD 原生）
沿用 DDD 的 ContextMap 概念。

- 优点：与 DDD 学术对齐
- 缺点：术语与"上下游翻译"过深，初学者难懂

我们采用简化版：只保留 `imports "X" as "Alias"` 声明，不传递依赖。

## References

- [Domain 详解](../architecture/domain.md)
- [ADR-0002: Intent-Align 范式](./0002-intent-align-paradigm.md)
- [术语表 § 命名约定](../core/terminology.md#8-命名约定)
