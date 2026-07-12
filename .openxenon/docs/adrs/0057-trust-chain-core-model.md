# ADR-0057: 信任链——OpenXenon 的核心模型

> **状态**：✅ Adopted
> **日期**：2026-07-12
> **触发**：[版本统一 RFC §0.4](../../docs/rfcs/version-unification-rfc.md)
> **影响层**：全局哲学（影响所有模块的设计方向）

## Context

OpenXenon 解决工程师与 AI Agent 的信任协作问题。AI 是概率性推理模型，其本身就是不确定性的。工程师信任 AI 一定会执行，但不信任 AI 执行在边界内。AI 不懂"信任"，只会通过概率推理执行，但信任 OpenXenon 提供的确定性内容（Asset、Work、Kernel）。

在三边界框架和最小信任闭环确立后，需要将"信任链"正式记录为 OpenXenon Engine 的核心模型。

## Decision

**信任链是 OpenXenon Engine 的"能源"**——三方信任拓扑：

```
         工程师                    AI Agent
        (确定性主体)              (概率性主体)
            │                        │
            │  不确定性的协作          │
            │  ← 不可信任 →           │
            │                        │
            ▼                        ▼
         OpenXenon（确定性层）
         ┌─────────────────────┐
         │  Asset (确定性边界)  │
         │  Work (确定性结构)   │
         │  Kernel (确定性验证) │
         │  Proof (确定性证据)  │
         └─────────────────────┘
            │                        │
            ▼                        ▼
    工程师信任 OXN               AI 信任 OXN
    "OXN 出示证据，               "OXN 提供确定性
     告知 AI 执行了什么，           Asset/Work/Kernel，
     哪些在边界内，                我能获取反馈，
     哪些在边界外"                 推理方向是否在边界内，
                                 但是否跨越依然是我自己处理"
            │
            ▼
    工程师通过 OXN 信任 AI
    "我知道 AI 一定会执行，
     OXN 告诉我哪些可靠、
     哪些不可靠"
```

**核心原则**：
1. 工程师与 AI 原本是两个点协作，协作充满不确定性导致不可信任
2. OpenXenon 加入后分别跟两者建立信任协作
3. 工程师通过 OpenXenon 信任 AI（间接信任链）
4. 信任链是 OpenXenon Engine 的"能源"——没有信任链，OXN 只是任务跟踪器

## Consequences

- **正面**：明确了 OpenXenon 的核心价值定位——不是任务管理器，是信任协作工具
- **正面**：为 v0.6.1~v1.0 的版本路线提供统一叙事框架
- **风险**：过度强调信任链可能忽略其他价值维度（如效率、易用性）
- **衍生**：ADR-0058（最小信任闭环）定义 v0.6.1 的具体实现范围

## References

- [版本统一 RFC §0.4](../../docs/rfcs/version-unification-rfc.md)
- [core-concepts.md §3.1](../../../docs/zh-cn/core-concepts.md)
- [ADR-0031 Proof = 公证人 ≠ 裁判](./0031-proof-notary-not-judge.md) — 信任链的 Proof 层实现
