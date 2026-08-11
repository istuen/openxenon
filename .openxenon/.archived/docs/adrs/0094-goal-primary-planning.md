---
entity: adr
status: Archived
archived-at: 2026-08-11
archived-by: RFC-0030-D1
---

# ADR-0094: Goal 成为主规划单元（取代 PlanningPool）

v0.6.0 / D5+ / 2026-08-07

## Status
Accepted（与 D5+ Goal CLI 同步落地）。

## Context
原 PlanningPool（`dev/pool/<slug>.md`）作为 Version 的前置 lock 单元。engine closure 自证完成后，规划池需正名为独立概念 —— 它不再 "升级为 Version"，而是 1:1 锁定一个 IAP 准备分支（详见 ADR-0098 `feat/goal-<slug>`）。此外 D2 后 promote-target 新增 goal 子路由，Draft → Goal 直达，Goal entry 路径与 pool 路径一致，正名顺势而为。

## Decision
PlanningPool 正名为 Goal。`dev/pool/<slug>.md` frontmatter 必含 `branch: feat/goal-<slug>` + `source: {direct|draft}` + `status: planned`。CLI：`oxn goal {create,list,show,work,archive}` 5 命令。Goal = "前提 promise" + "acceleration switch"——commit 时刻由工程师定；release-cut 时由 Goal status + scheduled-version 推算 outcome。

## Consequences
- 5 CLI 落地（Work A：`packages/engine/src/Goal/manager.ts` + `packages/cli/src/commands/goal.ts`）；
- D4 一次性 migration 脚本（`oxn dev-pool-migrate`）给 10 entry 加 branch + source；
- Draft → Goal 直达：`oxn draft promote --target goal --goal-slug=<slug>`（D2 已落地）；
- `oxn goal work <slug>` 创建 Work IAP（D5+ stub，当前返回建议配置；Work 创建留 followup）；
- Intent Pool 5 池机制全部退役（ADR-0095）。
