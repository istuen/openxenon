---
redirectFrom:
  - /zh-cn/work.html
title: 工作
---

# 工作（动态协作）

> 术语查询见 [术语表](./glossary.md)（RFC-0017 单一权威源）。本页不重定义术语。

> **Work 是工程师与 AI Agent 的一次结构化协作**。Work 走 3 步生命周期 `create → run → submit`，
> 由 Blueprint 决定编排差异（开发 / 修复 / 探索 / 编辑 Asset）。
> v0.6+ 收敛：删 Round / finalize / PlanLock / frozen.json；hash 指纹绑定 submit 时刻。

## 1. 3 步生命周期

```
Work (一次完整协作)
├── create          — 工程师主权
│   ├── 引用 Blueprint（决定编排）
│   ├── 写 work.md + 自动生成 task 骨架
│   └── 算 hash 指纹（workMdHash + tasksHash + blueprintsHash）
│
├── run             — AI Agent 主权
│   ├── 启动状态机
│   └── 推进 task part × N
│
└── submit          — AI Agent 主权（Engine 验证）
    ├── 提交工作成果
    ├── 重算 hash 指纹（与 create 时锁定值比对）
    └── 触发 Blueprint observe 列表的 Probe
```

**关键约束**：
- **无 Round 循环**：v0.6+ 删除（v0.5 前支持 `next-round` + `finalize` 多轮循环）
- **无 PlanLock / 三层锁**：v0.6+ 删除（hash 指纹只在 submit 时刻验证）
- **无 frozen.json 终态文件**：v0.6+ 删除（submit 即终态，无独立 finalize 步骤）
- **无 mode / workType / EditTarget**：所有编排差异由 Blueprint 承载

## 2. Blueprint 驱动的差异编排

所有场景都走同一套 3 步流程，差异由 Blueprint 承载：

| 场景 | Blueprint | 编排差异 |
|---|---|---|
| 通用开发 | `dev-workflow` | dev slot + domain ref |
| Bug 修复 | `fix-issue`（→ `bug-fix-blueprint` v0.7+） | diagnose→locate→fix→verify 4 slot |
| 探索 / 报告 | `dev-workflow`（with explore-analyze 编排） | 仅 doc slot，不强求 typecheck |
| 编辑 Asset | `oxn-blueprint` (asset-create --mode evolve) | mode 参数化 |

**奥姆剃刀**：`mode`/`workType`/`workTypeToMode`/`EditTarget` 等行为零影响的残留字段已删。

## 3. DRIFT 可观测不阻断

submit 时重算 hash 指纹：

- **无 DRIFT**：Asset / Task 引用未变，submit 通过
- **有 DRIFT**：Asset / Task 引用变化，submit **仍接受**但标记 `state.drift=true`，工程师 review 可见

**原则**（RFC-0033 D3）：DRIFT 是审计依据，不是阻断机制——AI 不会因 Asset 演进被拒。

## 4. 物理布局

```
.openxenon/works/<work-name>/
├── work.md                        (协作声明 + Blueprint 引用 + task 列表)
├── tasks/
│   └── <task-name>/task.md        (单 task 内容 + skillContext)
└── .work/                         (协作状态，Engine 写入)
    ├── birth-cert.json            (create 时刻的 Asset 引用快照)
    └── state.json                 (current round / tasks status / drift 标记)
```

**AI 写入权限**：`work.md` + `tasks/*.md`（create 时刻锁 0o444）；AI 只能写 `state.json` + `trace.jsonl`（Engine 拥有写权独占）。

## 5. 与 9 阶段的关系

历史 9 阶段（协作定义 / 启动 / 上下文组装 / 任务执行 / 申请证明 / 独立验证 / 证明产出 / 观测判断 / 演化）已在 v0.6 收敛为 3 步：

- **阶段 0 + 1 → create**：Asset 引用 + work.md + 骨架生成
- **阶段 2 + 3 + 4 → run + submit**：上下文组装 + 任务执行 + 提交验证
- **阶段 5 + 6 + 7 + 8 → submit 内含 + 工程师 review**：Probe 验证 + 工程师判定

详见 RFC-0033（Work 极简化 D1：删除 Round / PlanLock / 三层锁 / frozen.json 终态）+ RFC-0032（D25：删除 Proof / Insight / Daemon 整体系）。

## 下一步

- [生命周期](./lifecycle.md) — 3 步 + 三方分工速览
- [Asset](./asset.md) — Blueprint 引用的 5 类资产
- [术语表](./glossary.md) — 术语查询
</content>
</invoke>