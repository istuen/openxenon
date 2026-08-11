---
entity: adr
status: Archived
archived-at: 2026-08-11
archived-by: RFC-0030-D1
---

# ADR-0097: Version Forcing Function — `a+b+c` 三触发器

v0.6.0 / §4.5 / 2026-08-07

## Status
Accepted。

## Context
Version cut 不能单靠 schedule trigger —— 工程师无法强行推、又易拖太久（"overhang"）。需要 3 路叠加 trigger 让 cut 函数自适应：

## Decision
3 trigger 进入 release-cut workflow `bump-version` slot：

- **a. `done` trigger**：所有 active planned Goal 全达成后触发。表达 "所有承诺已完成"。
- **b. `change` trigger**：人为/工具紧急 cut（如 security patch），不等 done。changelog 标 `overhang` 并解释强制原因。
- **c. `schedule` trigger**：每周 cron 自动跑（防止 "1 月不 version"）。changelog 标 "auto cut (cadence)"。

3 trigger 共同汇入 bump-version slot；自动 cadence + dry-run 强制：首次自动 cut 前人工 ack。

## Consequences
- `bump-version` slot 调 `oxn version cut --trigger {done|change|schedule}`（CLI 4 trigger 选项）；
- 每次 cut 输出 `proposedVersion` + `activeGoals` + `nextSteps` 列表（cut 实现层已在 v0.6.0 Work A）；
- `--dry-run` 默认 true（首个 Wave 必走 dry-run）；
- 自动化：GitHub Actions cron / 本地 schedule（§4.5）。
