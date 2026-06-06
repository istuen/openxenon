# 0007. IAP 三轴范式升级

**Status**: Accepted
**Date**: 2026-06-06
**Supersedes**: [ADR-0002](./0002-intent-align-paradigm.md)

> 完整 IAP 范式与逃逸机制见 [docs/core/iap-paradigm.md](../core/iap-paradigm.md)。本 ADR 是 IAP 范式升级的决策占位，详细决策依据（Goals / Non-Goals / Decisions / Risks）见 [openspec/changes/iap-paradigm-docs/design.md](../../openspec/changes/iap-paradigm-docs/design.md)。

## Context

v0.1 引入的 Intent-Align 二元对偶范式（[ADR-0002](./0002-intent-align-paradigm.md)）解决了 Blueprint 双角色、AI 上下文隔离、验证标准绕过等核心问题，但在 v0.1+ 演进中暴露了一个更深层的缺口：

- **Core Engine 的主导权未被结构化表述**——v0.1 仅把 Core Engine 描述为"判决者与记录者"，但 Core Engine 实际上承担了"判定产物是否真的满足意图"这一独立工作，需要与"编排执行"（Align 轴）严格区分。
- **"假完成"风险无机制防御**——v0.1 的 Probe 失败仅返回错误码，AI 可能反复重试直到耗尽预算，或工程师用 `--force` 跳过验证。人类"差不多就行"、AI"花了很多力气就放行"是常见反模式。
- **Y 型生产权链未呈现**——v0.1 文档用"编排流/执行流"两条直线描述流转，掩盖了 Intent 与 Align 并行展开、在 Proof 汇合的 Y 型结构。

v0.0.x Arsenal 时代 Core Engine 僭越所有主导权的教训，进一步强化了"主导权必须显式建模"的必要性。

## Decision

将 OpenXenon 的架构灵魂从 **Intent-Align 二元对偶** 升级为 **IAP 三轴（Intent-Align-Proof）**：

1. **三轴主导权**——工程师主导 Intent 轴（Domain + Blueprint 唯一合法生产者），AI 主导 Align 轴（Work/Task/Part 编排），Core Engine 主导 Proof 轴（Verdict 判定）。
2. **Core Engine 三模块**——Kernel（裁判，纯逻辑零 IO）+ Infra（法医，副作用但不做判定）+ Daemon（法警，运行时 + 逃逸机制）。
3. **逃逸机制**——Daemon 在 Probe FAIL 时触发"预警 + 阻止 + 诊断"，**无 `--force` 绕过**。
4. **Y 型生产权链**——Intent 轴与 Align 轴并行展开，在 Proof 轴汇合。
5. **5 个核心实体**——Domain / Blueprint / Work / Task / **Proof**（Proof 是独立第三轴的产出，不是 Align 轴的附属物）。

## Consequences

- 品牌级名称变更：`Intent-Align 范式` → `IAP 范式（Intent-Align-Proof）`，README 全文统一。
- Core Engine 角色从"判决者与记录者"升级为"证明轴主导者 + 三模块协同"。
- 新增 4 条硬约束作为 v0.2+ 门控（Domain→Blueprint / Blueprint→Work / Work→Task / **Probe→Proof**）。
- 文档结构：`docs/core/iap-paradigm.md` 作为权威入口；`docs/core/intent-align.md` 降级为 IAP 的 Intent/Align 子集视图；`ADR-0002` 加 superseded 横幅。
- 零代码变更：本决策仅影响文档与范式表述，不修改 OXN DSL 语法、OXN 资产语义或 src/ 任何模块。

## 详细决策依据

完整 Goals / Non-Goals / Decisions / Risks / Trade-offs / Migration Plan 见：
- [openspec/changes/iap-paradigm-docs/proposal.md](../../openspec/changes/iap-paradigm-docs/proposal.md)
- [openspec/changes/iap-paradigm-docs/design.md](../../openspec/changes/iap-paradigm-docs/design.md)
- [openspec/changes/iap-paradigm-docs/tasks.md](../../openspec/changes/iap-paradigm-docs/tasks.md)
