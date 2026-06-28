---
title: 工作
---

# 工作（E2 · 动态协作空间）

> **Work 是 OXN 的第二结构实体（E2）——工程师与 AI 的动态协作空间**。Work 内部走 IAP 三阶段（Intent → Align → Proof），多轮 Round 循环直到 work 真正结束。
> v0.6 把 Insight 从 Work 中独立为 E4 涌现层——Work 不再负责"总结"，只负责"交付"。

## 1. IAP 三阶段

```
Work (一次完整 IAP 周期)
├── Intent 阶段 (工程师主权)
│   1. 创建 work.oxn
│   2. 分析 work 需要哪些 Asset 作为边界
│   3. 选择引用 Asset (ref @prj/assets/...)
│   4. 可以是探索、讨论然后落盘成文档（不一定要开发）
│
├── Align 阶段 (AI 模型主权)
│   1. 按 tasks 执行
│   2. 每轮 Align 拆 N 个 Tasks（Round 概念）
│   3. 落盘产物到项目文件系统
│
├── Proof 阶段 (Engine 主权)
│   1. 跑探针 (Probe)
│   2. 产出 verdict
│   3. verdict = FAIL → 逃逸机制触发 (block done)
│
├── (可选) Round 循环
│   verdict = FAIL 或 intent 调整 → 回到 Intent 阶段 → 新一轮 Align
│
└── finalize → 写 frozen.json
```

**关键**：一次 Intent 不一定要开发——可以是探索、讨论然后落盘成文档。IAP 范式不做强制开发路径假设。

## 2. 3 大 Work 模式

所有模式走同一套 8 阶段流程（init→migrate→create→add-task→validate→lock→run→submit→finalize）：

| 模式 | Intent | Align | Proof | Skill 入口 |
|---|---|---|---|---|
| **Asset 模式** | 选资产类型（domain/blueprint/stack） | 填内容 + 落盘 | 语法校验 + planLock | `oxn work --type asset` |
| **Develop 模式** | 选边界 + goal | AI 写代码（Round 对齐） | 跑 lint/test/build | `oxn work --type develop` |
| **Proof 模式** | 声明探针 | 准备环境 | 跑探针 + frozen.json | `oxn work --type proof` |

**v0.6 调整**：Insight 从 "Work Mode D" 升为 E4 涌现层。Work 只负责交付，Insight 负责涌现。

**Develop 模式 4 子模式**（在 Align 阶段内部）：
- explore（探索性工作：1 task + 1 blueprint slot）
- develop（单域深度开发：1 task 多 part = blueprint 多 slot）
- fix（多 task 串行 deps）
- onboarding（跨域编排：work 级 N domain + task 按需 inject）

## 3. Round 多轮 IAP 循环（v0.6 新增）

**OXN 相对 OpenSpec 的最大护城河**。OpenSpec 的工作流是单次线性 `propose → apply → archive`；OXN 的 Work 支持多轮 IAP 循环。

```
Work (my-feature)
├── Round 1: intent + align + proof → verdict FAIL (type-check)
│   └── oxn work next-round → 回到 Intent 调整
├── Round 2: intent(adjust) + align + proof → verdict FAIL (lint)
│   └── oxn work next-round
├── Round 3: intent(refine) + align + proof → verdict PASS
└── oxn work finalize
```

**v0.6 最小实现**：
- Work 状态加 `currentRound` 字段
- CLI 命令 `oxn work next-round <work>`——显式开启新一轮
- **不做全自动循环**（手动触发，避免无限循环）
- 每轮保留 `round-n/` 子目录（intent/align/proof 快照）
- `finalize` 时汇总所有 round 供 E4 Insight 消费

```bash
# Round 1 跑完
oxn work run my-feature --json
oxn work submit my-feature --task t1 --json

# verdict fail → 开启 Round 2
oxn work next-round my-feature

# 调整 Intent（编辑 work.oxn 加 invariant）
# ...

# Round 2 跑
oxn work lock my-feature --json
oxn work run my-feature --json

# Round 2 pass → finalize
oxn work finalize my-feature --json
```

## 4. 8 阶段流程

```
init → migrate → create → add-task → validate → lock → run → submit → finalize
                                                │         │
                                                ▼         ▼
                                            .work      .work.planLock
                                         静态门禁卡    4 组件 hash
```

所有 3 模式、所有 Round 都走这 8 阶段。每轮 Round 走完整 8 阶段流程。

## 5. Intent 不一定开发

Intent 阶段可以是探索、讨论然后落盘成文档。与 Intent Pool 5 类池对应：
- research 池：探索、信息收集
- design 池：设计、讨论
- issue 池：bug 分析
- audit 池：审计
- journal 池：时间线记录

详见 [Asset](./asset.md) 和 [Insight](./insight.md)。

## 6. 反模式

- ❌ 跳过 validate + lock 直接 run
- ❌ lock 后修改 .oxn
- ❌ 先 submit 后 run
- ❌ 把 Insight 当 Work 的一个 Mode（v0.6 Insight 已升为 E4 独立层）——Work 只负责交付，Insight 负责涌现
- ❌ 把 Round 循环当自动机制——v0.6 手动触发

---

## → 参考

- [Core Concepts](./core-concepts.md) — E1-E4 完整概念
- [Asset](./asset.md) — E1 硬约束边界
- [Insight](./insight.md) — E4 涌现层
- [Architecture](./architecture.md) — Engine L0-L3 分层
- [v0.6 RFC](../../.openxenon/pools/sprints/v0.6-iap-refactor/design/v0.6-iap-refactor-rfc.md)
