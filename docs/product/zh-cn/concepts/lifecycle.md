---
title: OpenXenon 协作生命周期
---

# OpenXenon 协作生命周期

> 术语查询见 [术语表](./glossary.md)（RFC-0017 单一权威源）。本页不重定义术语。

> OpenXenon 是工程师与 AI Agent 之间的协作工具。OXN 不替代直接协作，不充当协作中介，
> 提供**强化 + 可靠**的协作链路支撑（Asset 边界 + Work 结构化 + Probe 验证）。

## 三方分工

| 主体 | 角色 |
|---|---|
| 工程师 | 定义边界（Asset）+ 判定通过/不通过（基于 Probe 结果） |
| AI Agent | 在 Work 内执行任务（work.md 3 步生命周期） |
| OXN Engine | 提供工具 + 记录 + 验证（hash 指纹 + Probe 结果） |

## 3 步生命周期（v0.6+ 收敛）

| 步骤 | 主权 | 命令 | 关键动作 |
|---|---|---|---|
| **1. create** | 工程师 | `oxn work create <name> --blueprint <bp>` | 写 work.md + 生成 task 骨架（引用 Blueprint） |
| **2. run** | AI Agent | `oxn work run <name>` | 启动状态机 + 推进 task part × N |
| **3. submit** | AI Agent | `oxn work submit <name> <task>` | 提交工作成果 + 触发 Probe 验证 + 写 hash 指纹 |

**关键**：3 步覆盖所有场景（开发 / 修复 / 探索 / 编辑 Asset）。无 mode / workType / EditTarget 字段差异——所有编排差异由 Blueprint 承载。

## DRIFT 可观测不阻断

v0.6 引入 **hash 指纹 + DRIFT 标记**：submit 时计算 workMdHash + tasksHash，与 create 时锁定值比对：

- **无 DRIFT**：Asset / Task 引用未变，submit 通过
- **有 DRIFT**：Asset / Task 引用变化，submit 仍接受但标记为 `DRIFT=true`，工程师 review 时可见

DRIFT 是**可观测不阻断**（v0.6+ 简化原则）——AI 不会因 Asset 演进被拒，工程师有审计依据。

## 与 9 阶段的关系

历史 9 阶段（协作定义 / 启动 / 上下文组装 / 任务执行 / 申请证明 / 独立验证 / 证明产出 / 观测判断 / 演化）已在 v0.6 收敛为 3 步；细节见 RFC-0033 D1 / RFC-0032 D25。

## 下一步

- [Work](./work.md) — 3 步生命周期详情
- [Asset](./asset.md) — 静态边界详情
- [术语表](./glossary.md) — 术语查询
</content>
</invoke>