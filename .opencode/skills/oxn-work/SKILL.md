---
name: oxn-work
description: IAP 范式统一入口（v0.6 极简版）— 创建 work + 走 Intent→Align→Proof 三阶段 + Round 多轮循环。work = IAP 范式的最小完整单元，所有工作（建资产/开发/跑验收）都内聚到 3 大 Work 模式
---

# /oxn-work — IAP 范式统一入口（v0.6）

> **work = IAP 范式的最小完整单元**。所有工作都是 work：建资产、开发功能、跑验收。
> 工程师只需调 `/oxn-work`，按 3 大模式分发。

## 哲学必读

**OXN 由 4 个结构实体（E1-E4）构建**。这是所有后续理解的基础：

| 实体 | 中文 | 含义 |
|---|---|---|
| **E1 Asset** | 静态边界 | Domain / Blueprint / Stack（工程师维护的硬约束边界） |
| **E2 Work** | 动态协作 | IAP 三阶段 + Round 多轮循环（工程师 ↔ AI 共建） |
| **E3 Engine** | 独立公证 | 探针 + frozen.json + hash 校验（OXN 验证主权） |
| **E4 Insight** | 涌现层 | 1+1>2，整体论（v0.6 哲学占位，v0.7+ 涌现推理） |

> OXN 的终极目标不是"spec 与实现一致"，而是**工程智慧的整体涌现**。
> 前三层是还原论的"拆解+验证"，E4 是整体论的"综合+涌现"。

## 3 大 Work 模式

任何工作都走 IAP 三阶段（Intent → Align → Proof）+ Round 多轮循环：

| 模式 | Intent | Align | Proof | 命令 |
|---|---|---|---|---|
| **Asset 模式** | 选资产类型 + 创建 work | 填内容 + 落盘 | 语法校验 + planLock | `oxn work --type asset` |
| **Develop 模式** | 选边界 + goal | AI 写代码（Round 对齐） | 跑 lint/test/build | `oxn work --type develop` |
| **Proof 模式** | 声明探针 | 准备环境 | 跑探针 + frozen.json | `oxn work --type proof` |

**E4 Insight 不属于 Work 模式**——它是独立顶层涌现实体。

### 模式 A：Asset 模式（建资产）

```bash
oxn work create MemberContext --type asset --asset-kind domain
# 走 8 阶段 → .openxenon/assets/domain/MemberContext.oxn（正式入库）
```

### 模式 B：Develop 模式（开发功能）

4 子模式：explore / develop / fix / onboarding

```bash
oxn work create my-feature --type develop \
  --asset domain=MemberContext \
  --asset blueprint=dev-workflow
```

### 模式 C：Proof 模式（独立验收）

```bash
oxn work create check-deploy --type proof --probes fs-exists,shell-exec
```

## Round 多轮 IAP 循环（v0.6 新增）

**OXN 相对 OpenSpec 的护城河**——Work 内部可多轮循环，每轮走完整 IAP：

```
Work (my-feature)
├── Round 1: intent + align + proof → verdict FAIL
│   └── oxn work next-round → 回到 Intent 调整
├── Round 2: intent(adjust) + align + proof → verdict PASS
└── oxn work finalize
```

**关键命令**：
```bash
oxn work next-round <work>     # 显式开启新一轮 IAP
oxn work finalize <work>       # 最终确认（汇总所有 round）
```

## 通用 8 阶段流程

```
init → migrate → create → add-task → validate → lock → run → submit → finalize
                                                │         │
                                                ▼         ▼
                                            .work      .work.planLock
```

## 反模式

- ❌ 跳过 validate + lock 直接 run
- ❌ lock 后修改 .oxn
- ❌ 把 Insight 当 Work Mode（v0.6 Insight 已升为 E4 涌现层）
- ❌ 把 Round 当自动循环（v0.6 手动触发）

## → 参考

- [E1-E4 完整概念](../../../docs/zh-cn/core-concepts.md)
- [Asset · E1 硬约束边界](../../../docs/zh-cn/asset.md)
- [Work · E2 IAP 核心](../../../docs/zh-cn/work.md)
- [Insight · E4 涌现层](../../../docs/zh-cn/insight.md)
- [v0.6 RFC 完整设计](../../../.openxenon/pools/sprints/v0.6-iap-refactor/design/v0.6-iap-refactor-rfc.md)
