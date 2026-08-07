# ADR-0093: Version 概念切换 — 从前瞻 lock 文档 → 回顾 cut 记录

v0.6.0 / §4.5 / 2026-08-07

## Status
Accepted（与 D5+ release-cut workflow 改造同步落地；supersede 2026-07-27 RFC-0013 Errata 的 5+2=7 entry 逻辑）。

## Context
原 `dev/versions/` 目录作为 "前瞻规划锁写单元"——工程师 mental commit 写 entry，scheduling 时补 version/git mv 到 dev/versions/。该模式有两个痛点：(1) lock 与实际 release 节奏脱节——Version Hygiene 强制 dev > release，但 Release 真实发生日由 manual 触发；(2) lock 数据与 .changes/ 双轨写，易产生 stale ref（RFC-0013 L220 写 "5+2=7" 实际 10，详见 §D4 stale cleanup）。

## Decision
`dev/versions/` 整体退役（§4.4，README + Blueprint-2.md 已移 `.archived/dev/versions/`）。Version 概念切换为 "回顾 cut 记录"：data 生产中心不再是 lock 文档，而是 release-cut workflow 的产物（changelog + tag + GitHub Release）。具体：
- Goal entry 在 dev/pool/<slug>.md，scheduled-version=~；
- release-cut 工作流触发 `oxn version cut`（bump-version slot）+ 读 `oxn version show`（gen-changelog slot）；
- Version 是 cut 时的 snapshot，不再是前瞻 lock。

## Consequences
- `oxn version {cut,list,show,status}` 4 CLI（D5+ Work A 落地）；
- 6-slot release-cut workflow 改造（§4.5，ADR-0097 锁 forcing function 三 trigger）；
- 10 个 dev/pool entry（D4）一次性加 `branch` + `source` 字段，保持向后可追溯；
- 历史 `dev/versions/` 内容移到 `.openxenon/.archived/dev/versions/`，不再被任何 system 引用。
