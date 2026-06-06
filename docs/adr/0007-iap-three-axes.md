# 0007. IAP 三轴范式升级

**Status**: Accepted
**Date**: 2026-06-06
**Supersedes**: [ADR-0002](./0002-intent-align-paradigm.md)

> 完整 IAP 范式与逃逸机制见 [docs/core/iap-paradigm.md](../core/iap-paradigm.md)。本 ADR 是 IAP 范式升级的决策占位，详细决策依据（Goals / Non-Goals / Decisions / Risks）见 [openspec/changes/iap-paradigm-docs/design.md](../../openspec/changes/iap-paradigm-docs/design.md)。

## Context

v0.1 引入的 Intent-Align 二元对偶范式（[ADR-0002](./0002-intent-align-paradigm.md)）解决了 Blueprint 双角色、AI 上下文隔离、验证标准绕过等核心问题，但在 v0.1+ 演进中暴露了一个更深层的缺口：

- **OXN 的主导权未被结构化表述**——v0.1 仅把 OXN 描述为"判决者与记录者"，但 OXN 实际上承担了"判定产物是否真的满足意图"这一独立工作，需要与"编排执行"（Align 轴）严格区分。
- **"假完成"风险无机制防御**——v0.1 的 Probe 失败仅返回错误码，AI 可能反复重试直到耗尽预算，或工程师用 `--force` 跳过验证。人类"差不多就行"、AI"花了很多力气就放行"是常见反模式。
- **Y 型生产权链未呈现**——v0.1 文档用"编排流/执行流"两条直线描述流转，掩盖了 Intent 与 Align 并行展开、在 Proof 汇合的 Y 型结构。

v0.0.x Arsenal 时代 OXN 僭越所有主导权的教训，进一步强化了"主导权必须显式建模"的必要性。

## Decision

将 OpenXenon 的架构灵魂从 **Intent-Align 二元对偶** 升级为 **IAP 三轴（Intent-Align-Proof）**：

1. **三轴主导权**——工程师主导 Intent 轴（Domain + Blueprint 唯一合法生产者），AI 主导 Align 轴（Work/Task/Part 编排），OXN 主导 Proof 轴（Verdict 判定）。
2. **OXN Runtime 三模块**——Kernel（内核，纯逻辑零 IO）+ Infra（底座，副作用但不做判定）+ Daemon（守护进程，运行时 + 逃逸机制）。
3. **逃逸机制**——Daemon 在 Probe FAIL 时触发"预警 + 阻止 + 诊断"，**无 `--force` 绕过**。
4. **Y 型生产权链**——Intent 轴与 Align 轴并行展开，在 Proof 轴汇合。
5. **5 个核心实体**——Domain / Blueprint / Work / Task / **Proof**（Proof 是独立第三轴的产出，不是 Align 轴的附属物）。
6. **Proof-First 入口**——`oxn proof create` 是工程师的第一次体验，不要求先学 Domain/Blueprint；5 分钟内能用上 IAP。`frozen.json` 不可篡改是 AI 约束的核心。
7. **两级涌现路径**——OpenXenon 的能力升级走两级涌现：
   - 涌现 1：Proof 重复使用 → 升级到 Blueprint
   - 涌现 2：技术术语不够用 → 升级到 Business Domain（DDD）
8. **Program Domain 内置**——OpenXenon 内置 `@oxn/domains/ProgramContext`（语言无关的编程概念词汇表），让工程师**不写 DDD 就能用 Blueprint**。
9. **4 阶段路线图**——开发计划从线性版本号重写为 L0-L3 能力层：L0 验收 / L1 协作 / L2 演化 / L3 涌现。
10. **OXN 命名升级**——v0.1 文档中的 "Core Engine" 是历史临时名（v0.0.x 残留），统一重命名为 **OXN**。仅在定义 OXN 是什么时（`OXN Engine = DSL + Runtime + CLI`）保留 "OXN Engine" 全称，其他位置（CLI / 校验 / 判决 / 物理观测等）使用缩写 "OXN"。详见 [docs/core/document.md §5.2](../core/document.md#52-废弃与禁用术语) 废弃术语表。
11. **两类资产模型**——OpenXenon 工作台上的资产分为两类：
    - **工程师创意资产**（Domain / Blueprint）——工程师创作，OXN 读取校验
    - **OXN 作业资产**（Work / Task / Proof）——OXN 创建管理，工程师/AI 使用
    - 两层架构：资产层（声明性）+ 运行时层（执行性）。详见 [docs/core/document.md §2.3](../core/document.md#23-两类资产与两层架构)。

## Consequences

- 品牌级名称变更：`Intent-Align 范式` → `IAP 范式（Intent-Align-Proof）`，README 全文统一。
- OXN 角色从"判决者与记录者"升级为"证明轴主导者 + 三模块协同"。
- 品牌定位升级：`人机对齐框架` → `OpenXenon — 工程师与 AI 协作工作台`。
- 命名清理：全文 `Core Engine` → `OXN`（OXN Engine 仅在定义时使用）。
- 新增 4 条硬约束作为 v0.2+ 门控（Domain→Blueprint / Blueprint→Work / Work→Task / **Probe→Proof**）。
- 文档结构：原 5 个 `docs/core/*.md` 文件合并到**单一权威文档** [`docs/core/document.md`](../core/document.md)（5 节：定位 / 概念 / 范式 / 策略 / 术语）。旧文件加废弃横幅保留作为历史归档。
- README 简化：各节内联的 "详见 [...]" 引用全部移除，§9 简化为单一 Document 链接。
- Quickstart 改写：从"Domain → Blueprint → Work"流程改为"**Proof-First**"流程（`oxn proof create` 作为入口）。
- 路线图重组：v0.1-v0.4 线性版本号重写为 L0-L3 能力层路线图。
- 零代码变更：本决策仅影响文档与范式表述，不修改 OXN DSL 语法、OXN 资产语义或 src/ 任何模块。

## 详细决策依据

完整 Goals / Non-Goals / Decisions / Risks / Trade-offs / Migration Plan 见：
- [openspec/changes/iap-paradigm-docs/proposal.md](../../openspec/changes/iap-paradigm-docs/proposal.md)
- [openspec/changes/iap-paradigm-docs/design.md](../../openspec/changes/iap-paradigm-docs/design.md)
- [openspec/changes/iap-paradigm-docs/tasks.md](../../openspec/changes/iap-paradigm-docs/tasks.md)
