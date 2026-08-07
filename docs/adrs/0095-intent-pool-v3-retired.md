# ADR-0095: Intent Pool v3 退役

v0.6.0 / D1 / 2026-08-07

## Status
Accepted（与 D1 同步落地）。

## Context
5 池机制（research/design/issue/audit/journal）源于 v0.2 T13，作为 Insight 额外采集侧产出归集。问题：(1) 多文件多类分入口难管理，时间戳/干鸭校量同时出现变更易脱串；(2) 5 类与 v0.6.x 锁定的 3 DraftType（report/design/issue）信息冗余；(3) `writePoolEntry` 等 util 与 CLI `oxn pool *` 5 子命令的 dep chain 让 plugin 系统反复 schema-tour。

## Decision
5 池机制全部退役。Insight 输出改走 Draft 通路（`origin: insight`，详见 oxn-insight-domain.md §InsightDraftMapping）：research/audit/journal → Draft report；design → Draft design；issue → Draft issue。零信息损失，3 DraftType 与 domain 锁定的 3 类对齐。

## Consequences
- CLI `oxn pool *` 5 子命令抛 `OXN_POOL_DEPRECATED`（D1 落地）；
- `writePoolEntry` / `pool-writer` 引擎 util 退役（D1+1 版本兼容期后彻底移除）；
- `.openxenon/pools/` 路径自始不创建（无历史包袱）；
- Draft frontmatter `origin: insight` 自动注入（v0.4.0 D1 落地）。
