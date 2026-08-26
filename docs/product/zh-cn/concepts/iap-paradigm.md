---
redirectFrom:
  - /zh-cn/core-concepts.html
title: 核心概念
---

# IAP 协作节奏

> 术语查询见 [术语表](./glossary.md)（RFC-0017 单一权威源）。本页不重定义术语。

> **IAP（Intent–Align–Probe）是 OpenXenon 工程师与 AI Agent 协作的节奏**。
> 不是工具，不替代直接协作；是工程层面对"AI 不可全信"问题的协作约定。

## 三阶段含义

| 阶段 | 谁负责 | 核心动作 |
|---|---|---|
| **Intent（意图）** | 工程师 | 声明意图 + 选 Asset 边界（Blueprint） + 锁定不可变引用 |
| **Align（对齐）** | AI Agent | 在 Blueprint 编排下执行任务，逐 part 推进 |
| **Probe（探测）** | OXN Engine | 工程师预声明的探针独立验证 + 工程师基于结果判定 |

## 与还原论的关系

IAP 是工程还原论在 AI 协作中的应用：

- **Intent 还原** = 把模糊意图拆解为可验证的 Asset 边界（Domain term/ban/invariant + Workflow slot + Stack tool）
- **Align 还原** = 把执行拆解为 Blueprint slot DAG，每 slot 由 AI 在上下文内完成
- **Probe 还原** = 把"AI 是否完成"还原为工程师可独立观测的事实（hash / test / file / port）

## 信息隐藏原则

AI 协作的最大风险是"针对性绕过验证"。IAP 通过信息隐藏对抗：

| 信息 | AI 可见 |
|---|---|
| Asset term / ban / invariant | ✅（统一语言） |
| Blueprint slot DAG | ✅（需要知道步骤） |
| **Probe 验证标准**（expect / scheme） | ❌ |
| **frozen.json / state.json**（结果文件） | ❌（Engine 写权独占） |

**奥姆剃刀**：删一切冗余可见性。AI 知道"该做什么"，不知道"该满足什么"。

## 与 OpenSpec 的区别

| 维度 | OpenSpec | OpenXenon |
|---|---|---|
| 角色 | specs 是 change 改写的目标 | Asset 是 Work 引用的边界（不改写） |
| 验证 | AI 自查 + 人工 review | Engine 独立第三方探针 |
| 演进 | 每次 archive 合并 | Asset 创建后不可变，演进走新版 Asset |

详见 [Asset vs OpenSpec specs/](./asset.md#2-asset-vs-openspec-specs-设计反转) § 详细对比。

## 历史与收敛

IAP 范式在 OXN 演进中经历：

- **v0.5**：9 阶段完整生命周期（协作定义 / 启动 / 上下文组装 / 任务执行 / 申请证明 / 独立验证 / 证明产出 / 观测判断 / 演化）
- **v0.6**：9 阶段收敛为 3 步（create / run / submit）—— 删除 Round / PlanLock / finalize
- **v0.6+**：删除 Proof / Insight / Daemon 整体系（RFC-0032 D25）—— IAP 中"Probe"独立为 Blueprint observe 列表，不再有独立子模块

**当前落地**：3 步生命周期是 IAP 唯一承载形态，Blueprint 决定编排差异。

## 下一步

- [生命周期](./lifecycle.md) — 3 步 + 三方分工速览
- [Work](./work.md) — 动态协作详情
- [Asset](./asset.md) — 静态边界详情
</content>
</invoke>