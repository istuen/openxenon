# 0006. L2 命名为 Module 避免与 Domain 实体混淆

**Status**: Accepted
**Date**: 2026-06-05

## Context

OpenXenon v0.1 引入四层架构（L0 Kernel / L1 Foundation / L2 / L3 Runtime）后，**L2 层最初命名为 "L2 Domain"**。

但这个命名带来严重歧义：

1. **OXN DSL 有 `Domain` 实体**（DDD 限界上下文），位于 L2 层
2. **"L2 Domain"** 既可以理解为"L2 层"，也可以理解为"L2 层的 Domain 实体"
3. 在文档标题、架构图、行文时不断产生歧义

实际案例：
```
// docs/architecture/overview.md（v0.1 早期）
│ L2: Domain（业务实体）  ← ❌ 让人误以为整层都是 Domain

// README.md
| L2 Domain | Arsenal + Domain + Work |  ← ❌ 命名冲突
```

## Decision

**L2 层重命名为 "Module"（模块层）**：

- 旧称：`L2 Domain` / `L2: Domain` / `L2 层`
- 新称：`L2 Module` / `L2: Module` / `L2 模块层`

### L2 Module 包含三个并列子模块

| 子模块 | 物理位置 | 范式 |
|---|---|---|
| **Arsenal** | `src/arsenals/` | v0.0.x 兼容（资产生命周期） |
| **Domain** | `.openxenon/domains/` | Intent（业务限界上下文） |
| **Work** | `.openxenon/works/` | Align（编排与执行） |

### 命名对照

| 旧 | 新 |
|---|---|
| L2 Domain | **L2 Module** |
| L2 Domain 层 | **L2 Module 层** |
| L2 Domain（Arsenal + Domain + Work） | **L2 Module（Arsenal + Domain + Work）** |
| 业务实体层 | **业务 / 工程模块层** |

### 保留的 "Domain"

- OXN DSL 的 `Domain` 实体（DDD 限界上下文）**保留**——它是 L2 Module 的子模块
- Domain 内的 term/ban/invariant 等概念不变
- 仅修改"分层命名"，不修改"实体命名"

## Consequences

**正面**：
- L2 层与 Domain 实体的命名彻底解耦
- 文档可无歧义地引用"Module 层"和"Domain 实体"
- 架构图更清晰：L2 Module → [Arsenal | Domain | Work]

**负面**：
- 历史文档（docs_tmp、openspec）中的"L2 Domain"未迁移
- scripts/validate-dependencies.ts 中的 `L2-Arsenal` / `L2-Work` 已正确（无需修改）

## Alternatives Considered

### Alternative 1: 保留 L2 Domain
- 优点：无需变更
- 缺点：歧义持续存在，文档混乱

### Alternative 2: 重命名 Domain 实体为 BoundedContext
- 优点：消除歧义
- 缺点：Domain 已是 DDD 通用术语，重命名成本高、与社区脱节

### Alternative 3: 重命名 L2 为 "L2 Application"
- 优点：贴近 DDD 术语
- 缺点："Application" 模糊，且与 L3 Runtime 区分不明显

## References

- [架构总览](../architecture/overview.md)
- [ADR-0001: 四层架构宪法](./0001-four-layer-constitution.md)
- [ADR-0003: Domain 作为 DDD 限界上下文](./0003-domain-as-bounded-context.md)
- 历史讨论：见 `openspec/changes/docs-zhcn-sync/` 系列
