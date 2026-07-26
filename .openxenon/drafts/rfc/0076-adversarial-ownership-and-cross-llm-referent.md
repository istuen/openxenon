---
entity: adr
version: 1.0.0
status: Accepted
date: 2026-07-23
supersedes: null
superseded-by: null
related:
  - .openxenon/drafts/rfc/0072-oxn-as-referent-for-nondeterministic-agent.md
  - .openxenon/drafts/rfc/0073-oxn-implementation-boundary-criteria.md
  - .openxenon/drafts/rfc/0012-main-sub-agent-audit-chain.md
  - .openxenon/CONTEXT-MAP.md
---

# ADR-0076: 对抗关系归属与跨 LLM 参照锚点

> **状态**：✅ Accepted
> **日期**：2026-07-23
> **来源**：2026-07-23 grilling session 第五轮（domain-modeling + grill-with-docs skill）
> **影响层**：对抗性设计定位 + Main/Sub Agent 跨 LLM 扩展 + 信息隐藏边界

## Context

**触发问题**：Term #14（adversarial search）盘问暴露两个结构性误解：

1. **对抗关系归属错误**：直觉认为 OXN-vs-AI 是对抗关系（因信息隐藏）。但 R&N 对抗搜索前提是两个有利益的 agent 博弈——OXN 无利益（彻底不判，无 P）、不搜索（Term #13）、不是 agent（Term #1）。OXN 不是博弈方。

2. **信息隐藏定位模糊**：Probe 验证标准 AI 不可见（`iap-paradigm.md:269`）看起来像"预防性设计"，与 ADR-0012 审计链哲学（事后记录不预防限制）有张力。这个张力此前未被显式调解。

**关键发现**：对抗关系在 **AI-vs-AI** 之间（主子委托链），不在 OXN-vs-AI 之间。OXN 是这个对抗关系的**验证边界**，不是博弈方。信息隐藏是"软对抗"设计层，与审计链层分离，各自服务不同目的。

**跨 LLM 场景**：AI Agent 可分主和子（1:N）。主 Agent 负责理解 Work 目标、编写 Work Context、编排设计 Task 和 Task Context；子 Agent 执行 Task。也可能是主 Agent 开新会话给另一 AI 执行 Task——这是 LLM 算力分配，Task 可交更小 LLM 推理执行。OXN 的参照系让不同 LLM 对齐同一确定性边界。

## Decision

### D1: 对抗关系在 AI-vs-AI 之间，不在 OXN-vs-AI 之间

| 层 | 关系 | 性质 |
|---|---|---|
| 工程师 ↔ AI | 确定性期望 vs 非确定性产出 | OXN 验证这个边界（非博弈方） |
| AI 主 ↔ AI 子 | 1:N 委托（主编排 Task，子执行） | 可能的对抗性（子不一定产出主期望的） |
| OXN | 验证边界 | 无利益、不搜索、不博弈 |

R&N 对抗搜索 = 两个有利益的 agent 博弈（零和）。OXN 无利益不博弈——对抗关系在 AI 主子委托链。OXN 是验证边界：验证子的产出是否符合工程师确定性期望。

### D2: 软对抗两层分离

信息隐藏与审计链的张力通过**两层分离**调解：

| 层 | 机制 | 目的 | 哲学 |
|---|---|---|---|
| 审计链层 | Probe **声明** AI 可见 | 事后记录 AI 调用了什么 Probe | ADR-0012：不预防限制 |
| 对抗设计层 | Probe **验证标准** AI 不可见 | 防 AI 针对性绕过验证 | 软对抗（预防性隐藏） |

两层分离服务不同目的。这不是设计缺陷，是"软对抗"——OXN 不阻止 AI 做任何事（审计链层），但让 AI 无法针对性优化"通过验证"而非"真正解决问题"（对抗设计层）。

**与 ADR-0012 的关系**：ADR-0012 反模式明确否决"AI 不应该看到 Probe"——AI 必须看到 Probe 声明才能调用。本 ADR 锐化此论断：AI 看到 Probe 声明（审计链层），但看不到 Probe 验证标准（对抗设计层）。两层不矛盾。

### D3: 跨 LLM 参照锚点

OXN 的参照系让不同 LLM 对齐同一确定性边界：

| 场景 | 机制 | OXN 角色 |
|---|---|---|
| 同会话主子 | 主 Agent 编排 Task，子 Agent 执行 | 提供共享参照锚点 |
| 跨会话委托 | 主 Agent 开新会话给另一 AI 执行 Task | 提供持久化上下文 |
| 跨 LLM 委托 | 主用大 LLM 编排，子用小 LLM 执行 | 提供确定性参照让不同 LLM 对齐 |

**机制**：Work/Task context 在执行前已落盘成 OXN Work 内部存储的信息（`work.md` + `tasks/<t>/task.md` + `state.json`）。任何 LLM（主或子、大或小、同会话或跨会话）通过 OXN CLI 读取即可获取上下文。无需特殊跨 LLM 实现协议——OXN CLI + 持久化 context 已支持。

**与 ADR-0012 的关系**：ADR-0012 定义 Main/Sub Agent 审计链哲学，但未显式覆盖跨 LLM 场景。本 ADR 扩展：从同 LLM 主子到跨 LLM 委托，参照机制不变（OXN CLI 读持久化 context）。

### D4: 四判据验证

| 判据 | 本 ADR | 通过？ |
|---|---|---|
| 1. 补偿方向 | OXN 提供跨 LLM 参照锚点（补偿 agent 非确定） | ✅ |
| 2. agent 级别 | OXN 不做博弈搜索（不进 type 4） | ✅ |
| 3. floor/ceiling | OXN 提供参照 floor，不同 LLM 能力是各自 ceiling | ✅ |
| 4. 路径判据 | OXN 不评价主子委托路径好坏 | ✅ |

四判据全过。

## Consequences

### 正面

- **对抗关系归属澄清**：防止后续误设计"OXN 作为博弈方"的功能（如 OXN 主动出 Probe 难为 AI）。
- **信息隐藏定位明确**：软对抗两层分离调解了审计链 vs 预防性的张力。后续讨论 Probe 可见性有两层判据。
- **跨 LLM 场景被命名**：从同 LLM 主子扩展到跨 LLM 委托，参照机制不变。无需特殊实现——现有 OXN CLI + 持久化 context 已支持。
- **ADR-0012 扩展**：Main/Sub Agent 审计链从同 LLM 扩展到跨 LLM，审计哲学不变。

### 负面 / 风险

- **跨 LLM 委托的质量差异**：小 LLM 执行 Task 可能质量低于大 LLM。OXN 不评价质量（彻底不判），靠 Probe 验证事实 + 工程师判定。
- **软对抗的边界模糊**：两层分离（声明可见 vs 标准隐藏）的边界需持续维护。若未来 Probe 类型演进，需重新审视哪些可见哪些隐藏。
- **AI 主子对抗的非对称性**：主 Agent 编排 Task 时可能设定子 Agent 无法完成的约束。OXN 不调解主子关系，只记录子的执行事实。

### 衍生

- **CONTEXT-MAP 对照表**：Term #14 新增（本次落地）
- **ADR-0012 扩展记录**：本 ADR 是 ADR-0012 在跨 LLM 场景的延伸
- **Probe 可见性矩阵**：后续可细化哪些 Probe 字段对 AI 可见/隐藏（v0.8+ Probe 体系演进 RFC 候选）

## Alternatives Considered

- **OXN-vs-AI 是对抗关系**：否决。OXN 无利益（彻底不判）、不搜索（Term #13）、不是 agent（Term #1）。R&N 对抗搜索前提不成立。
- **信息隐藏违背审计链应废除**：否决。Probe 声明 AI 可见（审计链层）+ Probe 验证标准 AI 不可见（对抗设计层）两层分离，不矛盾。废除信息隐藏会让 AI 针对性优化"通过验证"而非"真正解决问题"。
- **信息隐藏应加强预防性**：否决。违反 ADR-0012 审计链哲学（事后记录不预防限制）。软对抗（隐藏标准）已足够，不需加 Probe 随机化/动态生成等更强预防。
- **跨 LLM 委托需特殊实现协议**：否决。Work/Task context 已持久化，任何 LLM 通过 OXN CLI 读取即可。OpenCode/Codex 等本身已实现主子 Agent 机制，OXN 只需提供持久化 context。

## References

- [ADR-0072 OXN 参照系定位](./0072-oxn-as-referent-for-nondeterministic-agent.md) — Referent 结构命名
- [ADR-0073 OXN 实现边界判据](./0073-oxn-implementation-boundary-criteria.md) — 四判据验证
- [ADR-0012 Main/Sub Agent 审计链](./0012-main-sub-agent-audit-chain.md) — 审计链哲学（本 ADR 扩展到跨 LLM）
- [CONTEXT-MAP.md](../../../../CONTEXT-MAP.md) — 对照表扩展
- [IAP 范式文档](../../../docs/product/zh-cn/concepts/iap-paradigm.md) — §9 信息隐藏原则（本 ADR 锐化两层分离）
- Russell & Norvig, *Artificial Intelligence: A Modern Approach* — adversarial search (minimax/alpha-beta) 原义
