---
entity: oxp
id: OXP-0001
version: 1.0.0
status: Accepted
date: 2026-07-22
promoted-from: .openxenon/drafts/rfc/0066-terminology-simplification.md
related:
  - ADR-0066: .openxenon/drafts/rfc/0066-terminology-simplification.md
  - ADR-0067: .openxenon/drafts/rfc/0067-no-judgment-principle.md
  - ADR-0068: .openxenon/drafts/rfc/0068-daemon-responsibility-boundary.md
synced-at: 2026-07-22
---

# OXP-0001: 术语精简——废弃叙事层冗余术语，统一到 Proof

> **类型**：OXP (OpenXenon Proposal)
> **来源**：ADR-0066（2026-07-21 grilling session）
> **状态**：✅ Accepted（核心冻结，仅可追加 errata 段）
> **批次**：2026-07-22 首批 OXP promote

## 摘要

OpenXenon 产品定位收敛后（"工程师与 AI Agent 协作工具，为协作提供边界与证据"），废弃 7 个裁判视角术语（TrustChain / EvidenceChain / EvidenceChainTriple / Notary / AuditChain / Taint / Verdict），统一到 Proof 或 OXN Engine desc。彻底消除"OXN 在证明/判决/公证什么"的隐含语义，贯彻"彻底不判"原则。

## 决策要点

### 废弃 7 个术语

| 废弃词 | 原位置 | 决策内容归入 |
|---|---|---|
| **TrustChain** | oxn-engine-domain H3 + ADR-0057 | Proof desc |
| **EvidenceChainTriple** | oxn-work-domain H3 + ADR-0011 | Proof desc（三件套是技术规范）|
| **Notary** | oxn-engine-domain H3 + ADR-0031 | OXN Engine desc |
| **AuditChain** | oxn-engine-domain H3 + ADR-0012 | OXN Engine desc |
| **Taint** | oxn-proof-domain H3 | InterferenceFlag（合并）|
| **Verdict** | oxn-proof-domain H3 + 代码 | 拆分为 ProbeOutcome + outcome + Report |
| **EvidenceChain** | （未引入） | —— |

### Verdict 拆分三层

| 层级 | 原 Verdict | 新术语 |
|---|---|---|
| Probe 级（ProbeVerdict）| 单个 Probe 的判定 | **ProbeOutcome** |
| Proof 级（frozen.json verdict 字段）| 聚合三态 | **outcome** 聚合结构 `{completed, deviated, inconclusive}` |
| CLI 输出（Verdict 输出）| oxn work submit 后的报告 | **Report** |

### 三态字段重命名

```
PASSED / FAILED / INCONCLUSIVE  →  COMPLETED / DEVIATED / INCONCLUSIVE
```

"完成"指**探测完成**，不是**目标完成**。

## 影响范围

- ✅ ADR-0066/0067/0068 全部 Accept
- ✅ 7 个 Domain .md 文件 desc 重写
- ✅ glossary 8 个文件同步
- ✅ 7 处 Domain 内部债清理（inv-3/inv-9/inv-10/inv-15/inv-20/inv-22 + Verdict H3）
- 📝 代码层 ProbeVerdict → ProbeOutcome + frozen.json schema 变更 跟进 [v0.7.3 terminology-alignment work](../../.openxenon/works/v0-7-3-terminology-alignment/work.md)

## 相关决策

- [ADR-0066 完整原文](../../.openxenon/drafts/rfc/0066-terminology-simplification.md)
- [ADR-0067 彻底不判贯彻](../../.openxenon/drafts/rfc/0067-no-judgment-principle.md)
- [ADR-0068 Daemon 职责边界](../../.openxenon/drafts/rfc/0068-daemon-responsibility-boundary.md)
- [CONTEXT-MAP.md](../../CONTEXT-MAP.md) — 根级词汇表（含术语精简记录）

## Errata

> 本段用于后续追加修正说明。核心决策自 OXP-0001 Accepted 起冻结。