---
entity: adr
version: 1.0.0
status: Accepted
date: 2026-07-31
supersedes: null
superseded-by: null
related:
  - .openxenon/CONTEXT-MAP.md
  - docs/adrs/0085-oxn-environment-characterization.md
  - docs/adrs/0072-oxn-as-referent-for-nondeterministic-agent.md
  - docs/adrs/0073-oxn-implementation-boundary-criteria.md
  - docs/adrs/0078-llm-agent-knowledge-full-oxn-does-boundary-engineering.md
  - docs/adrs/0057-trust-chain-core-model.md
  - .openxenon/assets/domains/oxn-proof-domain.md
  - .openxenon/assets/domains/oxn-work-domain.md
  - .openxenon/assets/domains/oxn-asset-domain.md
---

# ADR-0084: 协作边界分层模型 — Proof-First 下限 + Asset 参照 + Work 编排 + Insight 涌现

> **状态**：✅ Accepted（2026-07-31）
> **日期**：2026-07-31
> **来源**：2026-07-31 `/grilling` session（domain-modeling skill）+ AIMA 模块校验迭代
> **影响层**：产品定位 + 三机制协作语义 + 工程师 ↔ AI Agent 协作边界刻画

## Context

**触发问题**：OXN 既有叙事把 Asset → Work → Proof 三机制表达为**线性编排**——"先 Intent（Asset）后 Align（Work）后 Proof"。这种叙事在 v0.1–v0.5 时期足以解释 IAP 范式的三阶段顺序，但 v0.6.x 落地后暴露两个语义冲突：

1. **Proof 不依赖 Work/Asset 可独立运作**：`oxn proof create / probe add / run` 三命令不引用任何 Asset、不创建任何 Work 即可跑通。这是 OXN 在 5 分钟上手阶段给工程师的**核心确定性工具**，但线性叙事把它放在流水线的最后，掩盖了"Proof 是下限"的独立性。

2. **Insight 涌现层与线性叙事冲突**：v0.7+ 设计稿把 Insight 列为 E4 涌现实体，但在线性叙事里没有位置（既是"Proof 之后"又是"Asset 之前"，取决于观察角度）。工程师与 AI Agent 协作的实际心理模型是**分层**而非线性——可以从任意一层启动，逐层叠加。

**3 机制协作语义不锐化**：在 `oxn-domain.md` 早期定义里，Asset/Work/Proof 的描述是"互相引用、一起工作"，但缺乏"方向（工程师→AI 还是 AI→工程师）""本质（参照/追踪/验证）""不可省价值"的清晰分工。这让"OXN 是不是 CI？" "OXN 是不是 RAG？"等差异化问题难以回答。

**oxn-work 8 阶段流程已经实现完整闭环**：但工程师在 chat 里让 AI "调 `oxn work create` → 调 `oxn work add-task` → 调 `oxn work validate` + `lock` → 调 `oxn work run` + `submit` → 调 `oxn work status` → 调 `oxn work finalize`" 时，缺乏"**协作边界在哪一刻闭合？**"的明确回答。

## Decision

### D1: 协作边界分层模型（四层独立可用，下层不依赖上层）

OXN 三机制从线性编排（Asset → Work → Proof）重新定义为**分层下限**：

```
Insight（涌现层）—— 基于 Work 客观数据的模式涌现
    ↑ 数据源
Work（编排层）—— 串联 Proof + Asset；记录执行轨迹为 Insight 提供客观原料
    ↑ 可选叠加
Asset（参照层）—— 工程师提供的边界参照；AI 自建走 Draft→Promote
    ↑ 可选叠加
Proof（下限层）—— AI 通过 OXN 自证；工程师用 Probe 定义确定性度量
```

**四层各自独立可用，上层依赖下层但下层不依赖上层**：

- **只用 Proof**：`oxn proof create → probe add → run`——验证任意文件/命令，无 Asset 无 Work（oxn-proof Skill 已实现）。
- **Proof + Asset**：Proof 引用 Asset 派生的 stackTools——参数化 Probe 执行（v0.6.1 已实现）。
- **Asset + Work + Proof**：完整 IAP 闭环——三轴联动（oxn-work Skill）。
- **三层 + Insight**：跨 Work 涌现层——v0.7+ 设计中，Insight 从 Work 客观数据（trace.jsonl + frozen.json）提取模式反哺工程师。

### D2: 三机制协作语义锐化表

| 机制 | 方向 | 本质 | 确定性根基 | 不可省价值 |
|---|---|---|---|---|
| **Proof** | AI 自证 → 工程师审计 | AI 通过 OXN 验证执行成果 | 执行代码不可变（构建产物） | 工程师有不依赖 AI 自我汇报的独立验证——确定性度量因工程师而异（Probe 范围） |
| **Asset** | 工程师 → AI Agent | 参照机制（边界线索） | planLock + content_hash | AI 有边界参照提高确定性——但 AI 自建须走 Draft→Promote |
| **Work** | 围绕 AI Agent | 追踪机制 + Insight 数据源 | planLock + 4 组件 hash | 为 Insight 提供客观数据——缺 Work 则 Insight 基于经验/推理（可偏差） |

### D3: 协作边界分层场景表

| 层级 | 机制组合 | 场景 | 工程师能做什么 | AI Agent 能做什么 |
|---|---|---|---|---|
| **L0 下限** | Proof only | AI 直接改代码 | 用 `oxn proof` 独立验证 AI 产出 | 可主动调 `oxn proof` 自证 |
| **L1 参照** | Proof + Asset | AI 参照 Asset 工作 | 定义 Asset 边界 + 用 Proof 验证 | 读 Asset 做对齐参考 |
| **L2 编排** | Asset + Work + Proof | AI 在 IAP 闭环内工作 | 起 Work + 选 Blueprint + 跑 Probe | 走 Work 8 阶段流程 |
| **L3 涌现** | 上述 + Insight | 跨 Work 模式涌现 | 读 Insight 报告调整 Asset | 无（涌现层对 AI 不可见） |

### D4: Slogan 与正定义

- **Slogan（一句话）**：OpenXenon 是工程师定义 AI Agent 协作边界的工具。
- **正定义（展开）**：OpenXenon 通过工程师定义 Asset，作为 AI Agent 在 Work 约束的协作边界，由 Proof 验证 AI Agent 成果。

正定义三要素：

1. **主语补全为"工程师通过 OXN"**：明确 OXN 是工具不是主体。
2. **三机制闭环叙述**：Asset（定义边界）→ Work（约束协作）→ Proof（验证成果），不并列、不堆叠。
3. **Insight 不入定义**：未实现，不在产品定位上承诺。

### D5: 与"证据/证明"用词的剥离

正定义用"验证"替代"证据"与"证明"——前者是 OXN 提供的能力（Probe 跑 + 记录 outcome），后两者引入"什么是证据 / OXN 如何提供证据 / 证据准确性"等延伸认知负担，超出 OXN 的核心能力。

对应产品文档用词统一：introduction.md + iap-paradigm.md + proof.md + iap-cheatsheet.md 中"证据"全部替换为"验证"，"证明"全部替换为"验证"。

## Consequences

### 正面

- **产品定位被锐化**：OXN 不再被误读为"任务跟踪器"或"CI"，四层模型清晰回答"OXN 能给工程师什么"。
- **差异化锚点确立**：单 AI Agent（无持久边界）、AI Agent 框架（AI ↔ AI 协作）、普通工具组合（rules + git + CI 分散）、**AI Agent + OXN（工程师定义的协作边界 + 独立验证 + 持久积累）**。
- **Insight 的位置明确**：E4 涌现层独立于 IAP 三轴，依赖 Work 提供的客观数据，不混入三轴叙事。
- **Proof-First 上手路径清晰**：5 分钟可跑通 `oxn proof` 验证 AI 产出，建立"OXN 是验证工具"的第一印象，再按需升级到 L1/L2。

### 负面 / 风险

- **叙事切换成本**：v0.6.0 之前的 README / docs / glossary 大量使用"为协作提供边界与证据"。本 ADR 落地需同步替换 13 个文件。
- **Insight 暂不实现**：本 ADR 不承诺 Insight 时间表——v0.7+ 设计稿已有，但不在本 ADR 范围。
- **三机制"协作语义"是抽象层表述**：具体实现细节（如 planLock 4 组件 hash、frozen.json 三件套）保留在各 Domain SSOT 与 ADR-0051/0055 中，本 ADR 不重复。

### 衍生

- **ADR-0085**（环境 6 轴刻画）：把 OXN 在 R&N 环境分类学中的位置钉死（partially observable / deterministic channel / semidynamic / sequential-with-memory / discrete / partially known）。
- **ADR-0072 erratum v1.0.1**：确定性根基从"信息隐藏"锐化为"执行代码不可变"——ADR-0076 「验证标准 AI 不可见」是软对抗，非确定性根基。
- **3 个 Domain 升级**：oxn-proof-domain.md v0.3.0、oxn-work-domain.md v0.3.0、oxn-asset-domain.md v0.4.0（新增 Proof-First 下限 / 确定性度量 / 确定性根基 / 三机制协作语义 4 个 term + inv-21/22/24/25/30/31）。
- **13 个产品文档 slogan 替换**：从"为协作提供边界与证据"到"工程师定义 AI Agent 协作边界的工具"。

## Alternatives Considered

- **维持线性 Asset → Work → Proof 不动**：否决。Proof-First 的独立性（5 分钟跑通）在线性叙事里没有位置，且 v0.7+ Insight 涌现层在线性里也无家可归。
- **"OXN 整合 vs 独有能力"二分**：否决。整合（边界 + 验证 + 记录 + 积累）与独有能力（planLock / frozen.json / Probe catalog）应整合到分层模型——分层模型同时承载两者。
- **保留"证据/证明"措辞**：否决。证据/证明带来"OXN 如何保证证据准确性"的延伸认知负担；OXN 只做"客观事实记录"，用"验证"准确覆盖。
- **slogan 加 AI Agent 工作台名（Cursor / OpenCode / Codex）**：否决。产品定位不绑定具体 AI Agent，OXN 通过 Skill 注入机制兼容所有 AI Agent 工作台，slogan 不列举以保留可扩展性。

## References

- [.openxenon/CONTEXT-MAP.md](../../../CONTEXT-MAP.md) — 协作边界分层语境
- [docs/adrs/0085-oxn-environment-characterization.md](./0085-oxn-environment-characterization.md) — 环境 6 轴刻画
- [docs/adrs/0072-oxn-as-referent-for-nondeterministic-agent.md](./0072-oxn-as-referent-for-nondeterministic-agent.md) — 确定性根基 erratum
- [docs/adrs/0073-oxn-implementation-boundary-criteria.md](./0073-oxn-implementation-boundary-criteria.md) — 四判据（与本 ADR 正交）
- [docs/adrs/0078-llm-agent-knowledge-full-oxn-does-boundary-engineering.md](./0078-llm-agent-knowledge-full-oxn-does-boundary-engineering.md) — 边界工程
- [docs/adrs/0057-trust-chain-core-model.md](./0057-trust-chain-core-model.md) — 三方协作模型
- [.openxenon/assets/domains/oxn-proof-domain.md](../../../.openxenon/assets/domains/oxn-proof-domain.md) — Proof Domain SSOT（v0.3.0）
- [.openxenon/assets/domains/oxn-work-domain.md](../../../.openxenon/assets/domains/oxn-work-domain.md) — Work Domain SSOT（v0.3.0）
- [.openxenon/assets/domains/oxn-asset-domain.md](../../../.openxenon/assets/domains/oxn-asset-domain.md) — Asset Domain SSOT（v0.4.0）
