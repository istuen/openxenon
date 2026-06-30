---
name: oxn-work
description: IAP 范式统一入口（v0.6 极简版）— 创建 work + 走 Intent→Align→Proof 三阶段 + Round 多轮循环。work = IAP 范式的最小完整单元，所有工作（建资产/开发/跑验收）都内聚到 3 大 Work 模式。v1.1 兼容段保留：8 阶段流程 + planLock 守卫 + 错误码速查 + V0→V1 路径迁移。
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

### 步骤 0：Migrate（v1.1 新增）— V0→V1 布局迁移

```bash
oxn work migrate <work>     # **v1.1 V0→V1 布局迁移** — 把 works/<w>/work-{state,trace,frozen}.{json,jsonl} 迁到 works/<w>/.run/{state,trace,frozen}.{json,jsonl}（备份到 .migrated-v0/）
```

V0 老布局（task-filesystem 1.0）：
- `works/<w>/work-{state,trace,frozen}.{json,jsonl}`
- `works/<w>/tasks/<t>/{task-state,task-trace,task-frozen}.{json,jsonl}`

V1 新布局（v1.1 hard-switch 之后）：
- `works/<w>/.run/{state,trace,frozen}.{json,jsonl}`（run 状态/轨迹/判决）
- `works/<w>/.work`（planLock 静态门禁卡）
- `works/<w>/.migrated-v0/<rel>`（V0 备份，不删工程师手动清理）

### 步骤 5：`work validate`

```bash
oxn work validate <work>    # **v1.1 校验 work.oxn + 写 .work** — 解析 work.oxn + 解析 task.oxn + 生成 per-work slim 索引（domains.json + blueprints.json） + 写 .work 出生证明
```

### 步骤 6：`work lock`

```bash
oxn work lock <work>        # **v1.1 锁 work** — 算 planLock（4 组件 hash: workOxnHash / workDomainsHash / blueprintsHash / tasksHash / allHash）→ IAP_ALIGN_LOCK_NOT_FOUND / IAP_ALIGN_LOCK_HASH_MISMATCH 守门
```

### 步骤 7：`work unlock`

```bash
oxn work unlock <work>      # **v1.1 解锁 work** — 清 planLock → null，updatedAt 刷新
```

## v1.1 8 阶段流程图

```
init ─┐
      ├─→ migrate (V0→V1) ─┐
      │                    ↓
      └──────────→ create  ↓
                       ↓
                    add-task
                       ↓
                    validate  ──→ IAP_ALIGN_LOCK_NOT_FOUND
                       ↓            ↑
                    lock  ──────────┘ (4 组件 hash 校验)
                       ↓
                    run    ──→ IAP_ALIGN_LOCK_HASH_MISMATCH
                       ↓            ↑
                    submit          │
                       ↓            │
                    finalize ───────┘
```

## **v1.1 升级要点**

| 维度 | v0.1 (老) | v1.1 (新) |
|---|---|---|
| 状态文件 | `works/<w>/work-state.json` | `works/<w>/.run/state.json` |
| 出生证明 | 无 | `works/<w>/.work` 静态门禁卡 |
| 守卫 | 仅基础校验 | planLock 4 组件 hash 守门 |
| 错误码 | 通用 OXN_INVALID | 细分 IAP_ALIGN_* |
| 迁移 | 无 | `oxn work migrate` 一次性 V0→V1 |

**v1.1 hard-switch 之后**：

- ✅ 所有 work 必须经过 `validate → lock` 才能 `run`
- ✅ `lock` 后修改 .oxn → IAP_ALIGN_LOCK_HASH_MISMATCH 硬阻断
- ✅ 删除 work → 后续 run 抛 IAP_ALIGN_WORK_REMOVED
- ✅ V0 布局项目首次 `oxn work create` 自动提示运行 `oxn work migrate`

## v1.1 错误处理速查

| 错误码 | 触发场景 | 解决 |
|---|---|---|
| `IAP_ALIGN_LOCK_NOT_FOUND` | work 缺 `.work` 出生证明 | `oxn work validate <work>` 重建 |
| `IAP_ALIGN_LOCK_HASH_MISMATCH` | lock 后改了 .oxn / task.oxn / domains.json / blueprints.json | `oxn work unlock` → 改 → `validate` → `lock` |
| `IAP_ALIGN_WORK_REMOVED` | work 目录不存在 | `oxn work list` 看现有 work；或创建新 work |
| `IAP_ALIGN_CHECKLIST_MISSING` | v1.0.2 兼容：checklist 缺失 | 添加 work checklist |

**planLock 4 组件 hash**（v1.1 新增）：

- `workOxnHash` — work.oxn 的 SHA-256
- `workDomainsHash` — per-work domains.json 的 SHA-256
- `blueprintsHash` — per-work blueprints.json 的 SHA-256
- `tasksHash` — tasks/<t>/task.oxn 集合的 SHA-256
- `allHash` — 上述 4 个 hash 的组合 hash（顶层守卫）

任意一项变化 → IAP_ALIGN_LOCK_HASH_MISMATCH → 必须 unlock → 修改 → 重新 lock。

**v1.1 新增** `.work` 静态门禁卡：

- 位置：`works/<w>/.work`
- 内容：`{ version, workName, mode, createdAt, updatedAt, planLock: { 4 组件 hash } | null }`
- 写入：仅 `work validate` 写一次；后续 `work lock` 补 planLock
- 读取：所有 `work run` / `work submit` 入口必查

## 反模式

- ❌ 跳过 validate + lock 直接 run
- ❌ lock 后修改 .oxn
- ❌ 把 Insight 当 Work Mode（v0.6 Insight 已升为 E4 涌现层）
- ❌ 把 Round 当自动循环（v0.6 手动触发）
- ❌ 不要跳过 validate+lock 直接 run（v1.1 守卫抛 IAP_ALIGN_LOCK_NOT_FOUND）
- ❌ 不要绕过 lock 守卫跑生产（v1.1 planLock 是 OWNPASS 唯一凭证）
- ❌ 不要在锁后修改 .oxn（v1.1 LOCK_HASH_MISMATCH 必触发）

## → 参考

- [E1-E4 完整概念](../../../docs/zh-cn/core-concepts.md)
- [Asset · E1 硬约束边界](../../../docs/zh-cn/asset.md)
- [Work · E2 IAP 核心](../../../docs/zh-cn/work.md)
- [Insight · E4 涌现层](../../../docs/zh-cn/insight.md)
- [v0.6 RFC 完整设计](../../../.openxenon/pools/sprints/v0.6-iap-refactor/design/v0.6-iap-refactor-rfc.md)
