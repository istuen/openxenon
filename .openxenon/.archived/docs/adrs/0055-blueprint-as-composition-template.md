---
entity: adr
status: Archived
archived-at: 2026-08-11
archived-by: RFC-0030-D1
---

# ADR-0055: Blueprint 提升为组合模板（E1 Asset 内的隔离层）

<!-- allow-version -->
> **状态**：✅ Adopted + Runtime 已实现（v0.7.3 P1, see §Runtime Implementation）
<!-- /allow-version -->
> **日期**：2026-07-10
> **触发**：[三边界框架 + Blueprint 提升组合模板 RFC](../rfcs/three-boundary-blueprint-elevation-rfc.md)
> **影响层**：L1-OXL（编译器）+ L2-Engine（Work schema + BirthCert + PlanLock）
>
> **Runtime Implementation Status (2026-07-17)**:
>
> - ✅ **D1 Blueprint 组合模板**：runtime 落地（`oxn asset blueprint compile` + `per-work-blueprints-merger`）
<!-- allow-version -->
> - ✅ **D2 Blueprint IR runtime 消费**：runtime 落地（[ADR-0061 §D7](../0061-data-flow-contract.md) + v0.7.3 RFC v0.7.3 §2.1 P1）
<!-- /allow-version -->
>   - `work-context-builder.ts` 读取 `works/<w>/blueprints.json`，反序列化为 `BlueprintIRSummary` 注入 `WorkContextResult.blueprintIR`
>   - `Blueprint.boundaries[].domainRefs` 同步注入 `WorkContextResult.domainLanguages`
>   - 闭环路径：`## Use` → 3 边界 slim refs → runtime IR → Task context
<!-- allow-version -->
> - ✅ **D3 PlanLock blueprintsHash composite**：runtime 落地（v0.6.1-alpha.4 Phase B 已含 3 边界 composite hash）
> - ✅ **D4 per-work-blueprints-merger 重写**：runtime 落地（v0.6.1-alpha.3 + Phase B.5 真实 fileHash）
>
> 依据：[v0.7.3 理想态数据流 RFC §4 P0-P3 + §5.4 ADR 一致性](../rfcs/v0.7.3-ideal-data-flow-rfc.md)
<!-- /allow-version -->

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
