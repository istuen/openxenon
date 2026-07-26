# ADR-0057: 信任链——OpenXenon 的核心模型

> **状态**：⛔ Superseded by [ADR-0066](./0066-terminology-simplification.md)
> **日期**：2026-07-12（原始） / 2026-07-21（Superseded）
> **触发**：[版本统一 RFC §0.4](../../rfcs/version-unification-rfc.md)
> **影响层**：全局哲学（影响所有模块的设计方向）

## 原始决策（2026-07-12，已 Superseded）

信任链是 OpenXenon Engine 的"能源"——三方信任拓扑：

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

## Superseded 理由（2026-07-21）

1. **AI 不"信任"OXN**：AI 是概率模型，不存在"信任"概念，只消费 OXN 注入的 context
2. **与"彻底不判"冲突**：ADR-0066 + ADR-0067 明确 OXN 只记录事实不评判，"信任"叙事暗示 OXN 在做信任判定
3. **术语精简**：TrustChain 词汇废弃，统一到 Proof（决策内容归入 Proof desc）

## 保留的决策内容

| 原 TrustChain 要素 | 现归属 |
|---|---|
| 工程师 ↔ OXN：信任关系 | OXN Engine desc：OXN 提供客观证据，工程师基于证据判断 |
| OXN ↔ AI：AI 信任 OXN | 废弃（AI 不"信任"）|
| 工程师 ↔ AI：通过 OXN 间接信任 | Proof desc：OXN 提供不可篡改证据让工程师观测 AI 执行 |
| 三方拓扑图 | 废弃（改为：工程师 ↔ OXN ↔ AI 单向观测链）|

## 新的核心模型（替代信任链）

```
工程师 ────► OXN ────► AI
   │         │         │
   │    提供客观证据   消费 OXN context
   │         │         │
   ▼         ▼         ▼
  基于证据    记录事实   执行任务
  做出判定    不评判    (走通道)
```

- **工程师**：定义边界 + 接收证据 + 基于证据判定
- **OXN**：记录事实（Probe + Trace + Frozen）+ 提供证据（Report）
- **AI**：消费 OXN context（Asset 边界 + Skill 指导）+ 执行任务

判定权归工程师，OXN 提供证据，AI 执行任务。三方不再是"信任拓扑"，而是"观测链 + 执行链"。

## 参考

- [版本统一 RFC §0.4](../../rfcs/version-unification-rfc.md)
- [core-concepts.md §3.1](../../../docs/zh-cn/core-concepts.md)
- [ADR-0031 Proof = 公证人 ≠ 裁判](./0031-proof-notary-not-judge.md)
- **Superseded by [ADR-0066 术语精简](./0066-terminology-simplification.md)**