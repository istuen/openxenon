---
entity: adr
status: Archived
archived-at: 2026-08-11
archived-by: RFC-0030-D1
---

# ADR-0032: Pi vs OpenCode 选型最终结论（避免反复讨论）

> **来源**：`docs_tmp/harness-1.md`, `harness-3.md` (2026-07-02)
> **抽取日**：2026-07-04
> **状态**：Adopted（实际选择 OpenCode）
> **影响层**：L3 CLI / AI 集成

## 决策

OXN 采用 **OpenCode** 作为 AI 协作底座（**非 Pi**）。

## 决策矩阵

| 维度 | OpenCode | Pi |
|---|---|---|
| 用户基数 | 大（VS Code 兼容） | 小（研究项目） |
| 透明度 | 高（社区活跃） | 中（Pi 作者主导） |
| 二次开发 | 成熟（已有 fork 文化） | 灵活但小众 |
| 维护风险 | 低 | 中 |
| 与 Bun / OXL 兼容 | ✅ 直接调 `bun` | ⚠️ 需要适配 |

## 现状

- ✅ 当前 `oxn init --ai opencode` 已落地
- ⚠️ Pi 实验线未真正开启

## 教训

未来若有人重提"切 Pi"，应引用本 ADR，避免重复讨论。

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-07-02-harness-1.md`
- `docs/zh-cn/cli.md` §AI 集成