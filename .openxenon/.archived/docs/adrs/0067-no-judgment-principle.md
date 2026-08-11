---
entity: adr
version: 1.0.0
status: Archived
date: 2026-07-21
supersedes: null
superseded-by: null
promoted-to: docs/rfc/zh-cn/OXP-0002-no-judgment-principle.md
related:
  - .openxenon/docs/adrs/0031-proof-notary-not-judge.md
  - .openxenon/docs/adrs/0008-probe-observation-vs-verdict.md
  - .openxenon/docs/adrs/0057-trust-chain-core-model.md
  - .openxenon/assets/domains/oxn-proof-domain.md
  - .openxenon/assets/domains/oxn-engine-domain.md
archived-at: 2026-08-11
archived-by: RFC-0030-D1
---

# ADR-0067: 彻底不判原则的代码贯彻

> **状态**：✅ Accepted
> **日期**：2026-07-21
> **来源**：2026-07-21 grilling session + ADR-0066 术语精简
> **影响层**：L0-Kernel + L1-Infra + L2-Proof + frozen.json schema

## Context

OpenXenon 核心原则是"**彻底不判**"——OXN 只记录客观事实（Probe 跑了/exitCode/文件路径），不评判"合格不合格"。判定权归工程师。

但当前代码/文档在 5 个层面违反此原则：

1. **Verdict 三态 PASSED/FAILED/INCONCLUSIVE**：裁判语言
2. **ProbeVerdict 类型**（L0 Kernel 产出）："判决"语义
3. **frozen.json verdict 字段**：整体合格/失败的聚合判定
4. **oxn-proof-domain inv-10**："Proof 是有立场的判定（不是中性的证据记录）"——直接否定不判原则
5. **oxn-proof-domain inv-9**："Probe FAIL 时 Daemon 触发逃逸机制：阻止 Work 进入 done"——直接阻断行为

这 5 处违反导致"OXN 不判"叙事与代码行为不一致。

## Decision

### D1: 三态字段重命名

`PASSED / FAILED / INCONCLUSIVE` → `COMPLETED / DEVIATED / INCONCLUSIVE`

| 状态 | 语义 | 探测是否完成 | 目标是否符合 |
|---|---|---|---|
| **COMPLETED** | 探测完成 + 目标符合预期 | ✅ | ✅ |
| **DEVIATED** | 探测完成 + 目标偏离预期 | ✅ | ❌ |
| **INCONCLUSIVE** | 探测未完成（环境干扰/未执行） | ❌ | —— |

"完成"指**探测完成**，不是**目标完成**。

### D2: ProbeVerdict → ProbeOutcome

L0 Kernel 产出的单个 Probe 结果类型从 `ProbeVerdict` 改名为 `ProbeOutcome`。

代码层面：
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

`proof-has-position: Proof 是有立场的判定（不是中性的证据记录）` —— 与"彻底不判"正面冲突，**废弃**。

理由：
- "有立场判定"暗示 OXN 在做判定
- OXN 实际只记录事实，让工程师基于事实判断
- 决策内容"Core Engine 站在 Intent 一侧"已通过 Asset 边界（D1 确定性边界）落实

### D5: 废弃 oxn-proof-domain inv-9

`escape-on-probe-fail: Probe FAIL 时 Daemon 触发逃逸机制：阻止 Work 进入 done` —— 与"彻底不判"正面冲突，**废弃**。

理由：
- "阻止 Work 进入 done"是裁判+阻断行为
- 改 Probe DEVIATED 时 Daemon 记录偏离 + 通知工程师 + 不阻断 Work
- 通道构建期硬阻断（结构错误/拓扑错误）由 ADR-0068 定义边界

## Consequences

### 正面

- **代码与叙事一致**：OXN 不判原则在代码层面完全落实
- **聚合结构更客观**：outcome 提供各状态 Probe 数量，工程师自行判断
- **语义清晰**：COMPLETED = 探测完成 + 符合；DEVIATED = 探测完成 + 偏离；INCONCLUSIVE = 未完成

### 负面 / 风险

- **frozen.json schema 变更**：所有读取 verdict 字段的代码需要更新
- **ProbeVerdict 类型改名**：影响范围 `packages/engine/src/kernel/verdicts/` + `packages/engine/src/Proof/` + frozen.json 序列化
- **历史 frozen.json 兼容性**：旧 frozen.json 用 verdict 字段 → 需要迁移脚本（oxn work migrate）

### 衍生

- **CLI 输出**：CLI Verdict 输出 → Report 输出（基于 outcome 聚合结构生成可读报告）
- **错误码不变**：IAPError / OXNCrash 退出码不变（这是 CLI 错误处理，不是 Proof 判定）
- **Probe FAIL → Probe DEVIATED**：错误码 `IAP_INTENT_PROBE_OUT_OF_BOUNDARY` 语义不变（这是边界越界，不是 Probe 失败）

## Alternatives Considered

- **保留 PASSED/FAILED/INCONCLUSIVE 仅重定义 desc**：改名成本最低。但保留裁判语言持续暗示判定权，与"彻底不判"语义张力——否决
- **outcome 聚合结构 + 单一 status 字段同时存在**：同时提供 `outcome: {completed, deviated, inconclusive}` 和 `status: "completed"`。但 status 是冗余判定——否决
- **不废弃 inv-9，仅重写为不阻断**：保留 inv 编号。但 inv 内容实质性改变，应废弃重写而非重写——废弃
- **不废弃 inv-10，重写为"记录立场"**：保留 inv 编号。但 inv 内容实质性改变（从"有立场判定"改为"记录立场"），应废弃重写——废弃

## References

- [ADR-0066 术语精简](./0066-terminology-simplification.md)
- [ADR-0008 ProbeObservation vs ProbeVerdict](./0008-probe-observation-vs-verdict.md) — 物理观测 vs 业务判定的二元公理
- [ADR-0031 Proof = 公证人 ≠ 裁判](./0031-proof-notary-not-judge.md) — 决策内容保留，术语废弃
- [oxn-proof-domain.md](../../../assets/domains/oxn-proof-domain.md) — Proof 业务领域
- [oxn-engine-domain.md](../../../assets/domains/oxn-engine-domain.md) — OXN Engine 业务领域
