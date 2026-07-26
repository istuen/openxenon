---
entity: oxp
id: OXP-0002
version: 1.0.0
status: Accepted
date: 2026-07-22
promoted-from: .openxenon/drafts/rfc/0067-no-judgment-principle.md
related:
  - ADR-0067: .openxenon/drafts/rfc/0067-no-judgment-principle.md
  - ADR-0066: .openxenon/drafts/rfc/0066-terminology-simplification.md
  - ADR-0068: .openxenon/drafts/rfc/0068-daemon-responsibility-boundary.md
synced-at: 2026-07-22
---

# OXP-0002: 彻底不判原则的代码贯彻

> **类型**：OXP (OpenXenon Proposal)
> **来源**：ADR-0067（2026-07-21 grilling session）
> **状态**：✅ Accepted（核心冻结，仅可追加 errata 段）
> **批次**：2026-07-22 首批 OXP promote

## 摘要

OpenXenon 核心原则是"**彻底不判**"——OXN 只记录客观事实（Probe 跑了/exitCode/文件路径），不评判"合格不合格"。判定权归工程师。本 OXP 把此原则在 5 个层面代码化贯彻。

## 决策要点

### D1: 三态字段重命名

| 状态 | 语义 | 探测是否完成 | 目标是否符合 |
|---|---|---|---|
| **COMPLETED** | 探测完成 + 目标符合预期 | ✅ | ✅ |
| **DEVIATED** | 探测完成 + 目标偏离预期 | ✅ | ❌ |
| **INCONCLUSIVE** | 探测未完成（环境干扰/未执行） | ❌ | —— |

### D2: ProbeVerdict → ProbeOutcome

L0 Kernel 产出的单个 Probe 结果类型从 `ProbeVerdict` 改名为 `ProbeOutcome`。代码层面：
- 类型 `ProbeVerdict` → `ProbeOutcome`
- 值枚举 `PassVerdict / FailVerdict / InconclusiveVerdict` → `CompletedOutcome / DeviatedOutcome / InconclusiveOutcome`

### D3: frozen.json verdict 字段 → outcome 聚合结构

```json
// Before
{
  "verdict": "PASSED"
}

// After
{
  "outcome": {
    "completed": 5,
    "deviated": 2,
    "inconclusive": 1
  }
}
```

OXN 不做"整体合格/失败"聚合判定——只提供各状态的 Probe 数量。

### D4: 废弃 oxn-proof-domain inv-10

`proof-has-position: Proof 是有立场的判定` —— 与"彻底不判"正面冲突，**废弃**。

### D5: 废弃 oxn-proof-domain inv-9

`escape-on-probe-fail: Probe FAIL 时 Daemon 触发逃逸机制：阻止 Work 进入 done` —— 与"彻底不判"正面冲突，**废弃**。

改 Probe DEVIATED 时 Daemon 记录偏离 + 通知工程师 + 不阻断 Work。

## 影响范围

- ✅ ADR-0067 Accept
- ✅ frozen.json schema 变更规范（待代码落地）
- ✅ ProbeOutcome 三态字段在 7 个 Domain 文件统一
- ✅ inv-9 / inv-10 已重写为 `probe-deviation-notifies-not-blocks` / `proof-neutral-record`
- 📝 代码层 rename + schema 迁移跟进 v0.7.3 terminology-alignment work

## 相关决策

- [ADR-0067 完整原文](../../.openxenon/drafts/rfc/0067-no-judgment-principle.md)
- [ADR-0066 术语精简](../../.openxenon/drafts/rfc/0066-terminology-simplification.md)
- [ADR-0008 ProbeObservation vs ProbeVerdict](../../.openxenon/drafts/rfc/0008-probe-observation-vs-verdict.md) — 物理观测 vs 业务判定的二元公理（已废弃相关字段名）
- [ADR-0031 Proof = 公证人 ≠ 裁判](../../.openxenon/drafts/rfc/0031-proof-notary-not-judge.md) — 决策内容保留，术语废弃

## Errata

> 本段用于后续追加修正说明。核心决策自 OXP-0002 Accepted 起冻结。