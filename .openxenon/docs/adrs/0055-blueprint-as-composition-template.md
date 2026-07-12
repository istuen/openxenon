# ADR-0055: Blueprint 提升为组合模板（E1 Asset 内的隔离层）

> **状态**：✅ Adopted
> **日期**：2026-07-10
> **触发**：[三边界框架 + Blueprint 提升组合模板 RFC](../rfcs/three-boundary-blueprint-elevation-rfc.md)
> **影响层**：L1-OXL（编译器）+ L2-Engine（Work schema + BirthCert + PlanLock）

## Context

原 Blueprint 承载"执行模板"（slots/deps/observe）行为，同时 Work 直接引用 Domain + Blueprint + Stack 三种边界。问题：
- Work 引用模型复杂（3 种 ref × N 个）
- Blueprint 既是执行模板又是组合层，职责不清晰
- 无法在 Blueprint 层面组合多个边界

三边界框架将原 Blueprint 改名 Workflow（执行模板），新 Blueprint 提升为组合模板。

## Decision

**新 Blueprint = 组合模板**（E1 Asset 类型）：

```markdown
---
type: blueprint
id: my-pipeline
---

## Refs
- domain: payment-core
- workflow: ci-pipeline
- stack: nodejs
- blueprint: shared-qa-gate    # 嵌套组合
```

**Work 引用简化**：
- Work `## Refs` 只声明 `blueprint: <bp>`（一个 ref），不再直接引用 3 边界
- BirthCert `{ blueprints: [...] }`（原 `{ domains: [...], blueprints: [...], stacks: [...] }`）
- PlanLock `blueprintsHash` 包含 Blueprint + 3 边界的 composite hash
- per-work-blueprints-merger 从 Blueprint `## Refs` 提取 3 边界 refs

**单向依赖层级**：`3 边界 → Blueprint → Work`（变更单向传播）

## Consequences

- **正面**：Work 引用模型极简（单 ref）；Blueprint 成为唯一组合层
- **正面**：边界变更只影响 Blueprint，不影响 Work（隔离性）
- **风险**：BirthCert/PlanLock schema 变更需 migration
- **衍生**：per-work-blueprints-merger 重写

## References

- [三边界框架 RFC §3.3](../rfcs/three-boundary-blueprint-elevation-rfc.md)
- [changelog §2](../../../.changes/0-6-1-three-boundary-blueprint-elevation.md)
