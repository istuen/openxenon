---
entity: adr
version: 1.0.0
status: Accepted
date: 2026-07-21
supersedes: null
superseded-by: null
promoted-to: docs/rfc/zh-cn/OXP-0001-terminology-simplification.md
related:
  - .openxenon/CONTEXT-MAP.md
  - .openxenon/docs/adrs/0031-proof-notary-not-judge.md
  - .openxenon/docs/adrs/0057-trust-chain-core-model.md
  - .openxenon/docs/adrs/0011-evidence-chain-triple.md
  - .openxenon/docs/adrs/0012-main-sub-agent-audit-chain.md
  - .openxenon/assets/domains/oxn-proof-domain.md
  - .openxenon/assets/domains/oxn-engine-domain.md
  - .openxenon/assets/domains/oxn-work-domain.md
---

# ADR-0066: 术语精简——废弃叙事层冗余术语，统一到 Proof

> **状态**：✅ Accepted
> **日期**：2026-07-21
> **来源**：2026-07-21 grilling session（domain-modeling skill）
> **影响层**：术语权威源（7 个 Domain .md 文件）+ ADR 索引 + 文档

## Context

经过 4 轮 grilling session 锐化，OpenXenon 产品定位收敛为：
> "OpenXenon 是工程师与 AI Agent 协作工具，为协作提供边界与证据。"

核心原则是"**彻底不判**"——OXN 只记录客观事实（Probe 跑了/exitCode/文件路径），不评判"合格不合格"。判定权归工程师。

但当前术语体系混合了 3 种视角：
1. **工程师视角**（拥有）：Asset, PlanLock, BirthCert
2. **AI 视角**（消费）：Work, Context, Slot, Part
3. **裁判视角**（应去除）：Proof, Verdict, Taint, Notary, TrustChain, AuditChain, EvidenceChainTriple

裁判视角词汇违反"彻底不判"原则——它们暗示 OXN 在"证明/判决/公证"什么。

ADR-0057 (TrustChain) 的"三方信任拓扑"叙事在 AI 不"信任"OXN 的现实下不成立。ADR-0011 (EvidenceChainTriple) 与 ADR-0057 概念重叠，且 EvidenceChainTriple 三件套本质上就是 Proof 的技术规范。ADR-0031 (Notary) 的"公证人"法律隐喻过重。ADR-0012 (AuditChain) 与 ADR-0031 在"事后审计不预防限制"哲学上有重叠，但应归入 OXN Engine desc 而非独立术语。

## Decision

### 废弃 7 个术语

| 废弃词 | 原位置 | 决策内容归入 |
|---|---|---|
| **TrustChain** | oxn-engine-domain H3 + ADR-0057 | Proof desc |
| **EvidenceChain** | （未引入） | —— |
| **EvidenceChainTriple** | oxn-work-domain H3 + ADR-0011 | Proof desc（三件套是 Proof 的技术规范）|
| **Notary** | oxn-engine-domain H3 + ADR-0031 | OXN Engine desc |
| **AuditChain** | oxn-engine-domain H3 + ADR-0012 | OXN Engine desc |
| **Taint** | oxn-proof-domain H3 | InterferenceFlag（合并）|
| **Verdict** | oxn-proof-domain H3 + 代码 | 拆分为 ProbeOutcome + outcome + Report |

### 拆分 Verdict（关键决策）

当前 Verdict 在 3 层使用，混用同一个词：
- **Probe 级**（ProbeVerdict）：单个 Probe 的判定 → **改名为 ProbeOutcome**
- **Proof 级**（Verdict 字段）：frozen.json 里的聚合三态 → **改名为 outcome 聚合结构**
- **CLI 输出**（Verdict 输出）：oxn work submit 后的报告 → **改名为 Report**

### 三态字段重命名

当前 `PASSED / FAILED / INCONCLUSIVE` 改为：
- `COMPLETED`（探测完成 + 目标符合预期）
- `DEVIATED`（探测完成 + 目标偏离预期）
- `INCONCLUSIVE`（探测未完成）

"完成"指**探测完成**，不是**目标完成**。脚本 exitCode≠0 时探测完成了（脚本跑了），但目标偏离了（结果不符合预期）→ DEVIATED。

### Proof 级聚合结构（替换 Verdict 字段）

当前 `verdict: "PASSED"` 改为：

```json
{
  "outcome": {
    "completed": 5,
    "deviated": 2,
    "inconclusive": 1
  }
}
```

OXN 不做"整体合格/失败"聚合判定——只提供各状态的 Probe 数量。判定权归工程师。

### 保留但重定义 desc

| 术语 | 重定义 |
|---|---|
| **Proof** | 协作**过程**证明（不是结果证明）；包含 frozen.json + trace.jsonl + state.json 三件套；OXN Engine 记录事实不评判合格 |
| **Asset** | 工程师为 AI 协作定义的环境约束；5 类 AssetKind |
| **Daemon** | OXN Engine 后台守护进程；运行时状态监听 + 事件监听；不监听文件系统 |

## Consequences

### 正面

- **术语精简**：87+31=118 个 H3 terms 精简到 ~95 个；叙事层冗余术语全砍
- **视角统一**：所有术语要么是工程师视角（Asset）、要么是 AI 视角（Work）、要么是 OXN 视角（Proof）；无裁判视角词汇
- **"彻底不判"原则落地**：OXN 不再"证明/判决/公证"任何东西，只记录事实
- **判定权归工程师**：outcome 聚合结构只提供 Probe 数量，工程师看数量做判定

### 负面 / 风险

- **改名成本**：frozen.json schema 变更（verdict → outcome）+ 代码类型重命名（ProbeVerdict → ProbeOutcome + PASSED → COMPLETED）
- **ADR 索引更新**：ADR-0057 / ADR-0011 / ADR-0031 / ADR-0012 的"废弃术语"段落需要更新
- **文档同步**：README + introduction.md + iap-paradigm.md + docs/glossary/zh-cn/ 全部需要同步

### 衍生

- **新 ADR 必填**：ADR-0067（彻底不判贯彻）+ ADR-0068（Daemon 职责边界）
- **ADR-0066 后续**：ADR-0057 / 0011 / 0031 / 0012 标记 Superseded（不删，新 ADR supersede）

## Alternatives Considered

- **保留所有术语仅重定义 desc**：保留术语丰富性。但保留裁判视角词汇持续暗示 OXN 有判定权，与"彻底不判"冲突——否决
- **只废弃 4 个核心词（Verdict/Taint/TrustChain/Notary），保留 EvidenceChainTriple 和 AuditChain**：保留 ADR 数量。但 EvidenceChainTriple 是 Proof 的技术规范，AuditChain 是 Engine 的哲学原则，独立 term 冗余——否决
- **完全重命名 Proof → Evidence**：完全消除"证明"裁判语言。但 Proof 字面"证明"可重定义为"过程证明"，成本更低——保留 Proof 重定义

## References

- [CONTEXT-MAP.md](../../../../CONTEXT-MAP.md) — 根级词汇表
- [oxn-proof-domain.md](../../../assets/domains/oxn-proof-domain.md) — Proof 业务领域
- [oxn-engine-domain.md](../../../assets/domains/oxn-engine-domain.md) — OXN Engine 业务领域
- [ADR-0067](#) — 彻底不判贯彻（待写）
- [ADR-0068](#) — Daemon 职责边界（待写）