---
title: 架构
---

# 架构

> OXN 架构 = **E1-E4 结构实体 + L0-L3 工程分层**。E1-E4 是理念，L0-L3 是代码依赖方向。物理目录用各自名称（`kernel/`、`oxl/`、`infra/`、`cli/`、`daemon/`、`src/service/<Domain>/`），不直接对应 E 或 L。

## 1. E1-E4 结构实体（理念层）

| 实体 | 性质 | 主导权 | 对应代码模块 |
|---|---|---|---|
| E1 Asset | 静态硬约束边界 | 工程师 | `service/Asset/` |
| E2 Work | 动态协作（IAP 三阶段 + Round） | 工程师 ↔ AI | `service/Intent/` + `service/Align/` |
| E3 Engine | 独立验证主权基座 | OXN | L0-L2 全部 |
| E4 Insight | 涌现层（1+1>2） | AI 推理 | `service/Insight/`（v0.6 哲学占位） |

详见 [Core Concepts](./core-concepts.md)。

## 2. L0-L3 工程分层

```
┌────────────────────────────────────────────────────────┐
│  L3: Tools & Applications (工具与应用层)                │
│      CLI (oxn) + Skills (oxn-work) + Daemon            │
│      物理目录: src/cli/ / src/server.ts / .opencode/    │
├────────────────────────────────────────────────────────┤
│  L2: Engine Core Logic (引擎核心业务层)                  │
│      E1-E4 全部实现在此                                  │
│      Asset / Intent / Align / Proof / Insight / Pool    │
│      物理目录: src/service/<Domain>/                    │
├────────────────────────────────────────────────────────┤
│  L1: OXL + Infra (操作基座与语言层)                     │
│      OXL: OpenXenon Language DSL 编译器                 │
│      Infra: 文件系统/探针/Socket/OS 操作                 │
│      物理目录: src/oxl/ / src/infra/                    │
├────────────────────────────────────────────────────────┤
│  L0: Kernel (逻辑内核层)                                 │
│      纯逻辑零 IO: Schema / Contract / Verdict / Processor│
│      物理目录: src/kernel/                               │
└────────────────────────────────────────────────────────┘
```

**依赖规则**：L3 → L2 → L1 → L0（单向，不可反向）

## 3. E1-E4 在 L2 Engine 的实现

L2 Engine 是 OXN 的核心，按 DDD 模块化组织：

```
src/service/                              ← L2 Engine 物理位置
├── Asset/                                ← E1 Asset 硬约束边界
│   ├── index.ts
│   ├── create.ts / list.ts / validate.ts / compile.ts
│   ├── sync.ts / get.ts / delete.ts / migrate.ts
│   ├── types.ts / internal/
│
├── Intent/                               ← E2 Work · Intent 阶段
│   ├── index.ts
│   ├── create-work.ts / analyze-boundaries.ts / refine-boundaries.ts
│   ├── attach.ts / detach.ts / add-task.ts
│   ├── validate.ts / lock.ts / unlock.ts / get-context.ts
│
├── Align/                                ← E2 Work · Align 阶段
│   ├── index.ts
│   ├── run.ts / submit.ts / status.ts
│   ├── list-tasks.ts / task-status.ts
│   ├── edit-task.ts / delete-task.ts / finalize.ts
│   ├── read-artifact.ts / next-round.ts       ← v0.6 Round 新增
│
├── Proof/                                ← E2 Work · Proof 阶段
│   ├── index.ts
│   ├── create.ts / list.ts / describe.ts / list-probes.ts
│   ├── add-probe.ts / run.ts / dry-run.ts
│   ├── show.ts / verify.ts / render-verdict.ts
│
├── Insight/                              ← E4 Insight 涌现层
│   ├── index.ts
│   ├── proof-insight.ts / work-insight.ts（v0.6 最弱形态）
│   ├── cross-proof.ts / pipeline.ts（v0.5 规划）
│   ├── audit-write.ts / audit-list.ts / audit-read.ts
│
└── Pool/                                 ← 辅助
    ├── index.ts
    ├── create.ts / list.ts / read.ts
    ├── review.ts / approve.ts / reject.ts / journal.ts
```

**DDD 模块化原则**（非 class-based）：
- 每个模块目录有 `index.ts` 统一入口
- 内部按用例文件拆分（`create.ts` / `list.ts` / ...）
- 纯函数式导出：`export async function create(input): Promise<output>`
- 无类、无状态、无 DI 容器

详见 [v0.6 Service 层设计稿](../../.openxenon/pools/sprints/v0.6-iap-refactor/design/v0.6-service-layer-design.md)。

## 4. Runtime 三模块（L0-L1 约束）

OXN Runtime = L0 Kernel + L1 OXL + L1 Infra：

| 模块 | 层级 | 职责 | 约束 |
|---|---|---|---|
| Kernel | L0 | 纯逻辑：IAP 状态机、探针调度、hash 校验、Verdict 判定 | 零 IO |
| OXL | L1 | OpenXenon Language DSL：.oxn/.md 解析与序列化 | 不依赖 L2/L3 |
| Infra | L1 | 文件系统、进程、网络、探针执行 | 只回答事实，不判定 PASS/FAIL |

> **纯洁性核法则**：Infra 不能绕过 L2 Engine 自我宣布完成 → L2 Engine 不能修改 L0 Kernel 规则 → L0 Kernel 不能直接执行 Task。

## 5. Config 软迁移

默认布局（v0.6 新项目）：

```
.openxenon/
├── config.json                   ← assetRoot + assetDirs
├── assets/domain/                ← E1 Asset 默认路径
├── assets/blueprint/
├── assets/stack/
├── works/<w>/
│   ├── work.oxn
│   ├── round-1/                  ← v0.6 Round 快照
│   ├── round-2/
│   └── .run/{state,trace,frozen}.json
├── proofs/<p>/
└── pools/
```

兼容旧项目（v0.5）：通过 config fallback 自动探测。

## 6. L3 Tools（工具入口层）

| 组件 | 物理位置 | 职责 |
|---|---|---|
| CLI | `src/cli/` | 薄组合调用层：parse args → 调 L2 Engine → format output |
| Skills | `.opencode/skills/oxn-work/` | AI 助手指令：/oxn-work 统一入口 |
| Daemon | `src/daemon/` | 守护进程：文件监听、Work 追踪（v0.6 可选） |

## 7. 与 OpenSpec 架构对比

| 维度 | OpenSpec | OXN v0.6 |
|---|---|---|
| 哲学色底 | 还原论（spec → change → archive 线性拆解） | 还原论 + 整体论辩证统一（E4 Insight 涌现） |
| Asset/规范 角色 | 被 change 改写的目标 | 被 Work 引用的硬约束边界 |
| 验证主体 | AI 自查 + 人工 review | Engine 独立第三方公证 |
| 工作流形态 | 单次线性 propose → apply → archive | **多轮 IAP 循环**（Round × N） |
| 整体涌现 | 无 | E4 Insight 专门承接 |
| Inner Loop | 单次 verify | 多轮 Round：fail → 回到 Intent → 新一轮 Align |
| 明确设计目标 | 让 spec 与实现一致 | 让系统整体功能大于部分之和（1+1>2） |

## 8. Skill 入口架构

```
.opencode/skills/
└── oxn-work/                ← 唯一 Skill（IAP 范式统一入口）
    └── SKILL.md

L3 CLI → L2 Engine（DDD 模块化调用）
  import { create } from '../service/Asset'
  import { run } from '../service/Align'
```

---

## → 参考

- [Core Concepts](./core-concepts.md) — E1-E4 + L0-L3 完整概念
- [Asset](./asset.md) — E1 硬约束边界
- [Work](./work.md) — E2 动态协作 + IAP + Round
- [Insight](./insight.md) — E4 涌现层
- [v0.6 RFC](../../.openxenon/pools/sprints/v0.6-iap-refactor/design/v0.6-iap-refactor-rfc.md)
