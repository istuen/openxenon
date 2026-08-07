# ADR-0098: 分支模型三层 — main / dev / feat/goal-<slug>

v0.6.0 / §4.7 / 2026-08-07

## Status
Accepted。

## Context
分支模型在 v0.6.0 前是两态（main + feat/* 短期）。Version cut 引入 Goal 1:1 锁定后，需要长期集成分支作为 Goal branch 的基础来源，避免每个 Goal 从 main 拉 tag 导致长期回归冲突。

## Decision
分支模型三层：

- **main**（长期 base）：稳定 release tag 处。所有 release tag 起点；tag 永不直接 commit 到 main。
- **dev**（长期 integration）：v0.4 sync 起存在（最后一次 sync commit `0444c7c merge: feat/v0.4-unify-md → dev`）。未来所有 Goal 分支基于 `dev` 拉。
- **feat/goal-<slug>**（Goal-specific 短期分支）：v0.5.0 D2 起 `oxn draft promote --target goal --goal-slug=<slug>` 自动 `git checkout -b feat/goal-<slug> dev`。D4 后 dev/pool/<slug>.md frontmatter `branch` 字段预填；branch = Goal 1:1。Goal 转正后归档。

**历史归档分支**（不接收新 commit）：`feat/v0.6.1` / `feat/v0.6.1-alpha.1` / `feat/v0.5-*` / `feat/v0.4-*` 等作为 v0.4/v0.5/v0.6 历史保留。

## Consequences
- 分支命名约定锁定：feat/goal-<slug> 强制 `slug == dev/pool/<slug>` 1:1；
- `oxn draft promote --target goal --goal-slug=<slug>` 自动建分支（已在 v0.5.0 D2 落地）；
- Goal work IAP 执行阶段在 `feat/goal-<slug>` 分支上跑（`packages/engine/src/Goal/manager.ts:createWorkFromGoal` stub 当前返回建议配置）；
- `dev` 合并策略：每周 schedule cut → 合并 active feat/goal-* → dev tag → main rebase（ADR-0097 配套）。
