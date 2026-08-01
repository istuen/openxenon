---
entity: adr
version: 1.0.0
status: Accepted
date: 2026-07-31
supersedes: null
superseded-by: null
related:
  - .openxenon/CONTEXT-MAP.md
  - docs/adrs/0084-collaboration-boundary-layering.md
  - docs/adrs/0072-oxn-as-referent-for-nondeterministic-agent.md
  - docs/adrs/0073-oxn-implementation-boundary-criteria.md
  - .openxenon/assets/domains/oxn-domain.md
  - .openxenon/assets/domains/oxn-engine-domain.md
---

# ADR-0085: OXN Engine 的 6 轴环境刻画（partially observable / deterministic channel / semidynamic / sequential-with-memory / discrete / partially known）

> **状态**：✅ Accepted（2026-07-31）
> **日期**：2026-07-31
> **来源**：2026-07-31 `/grilling` session（domain-modeling skill）R&N Term #8 环境类型盘问
> **影响层**：OXN Engine 性质刻画 + 搜索问题边界 + Probe 设计 + 拓扑闭包校验定位

## Context

**触发问题**：R&N 智能体理论把环境按 6 个维度分类（observable / deterministic / episodic / static / discrete / known）。OXN Engine 不是 R&N 意义上的智能体（ADR-0072），但既然 OXN 给 AI Agent 提供"确定性参照系"，OXN Engine 自己所处的环境类型也必须明确——它决定了：

1. Probe 的设计边界（确定性环境 → Probe 可调用外部命令，非确定性环境 → Probe 必须用对抗性快照）
2. Work 的拓扑闭包校验定位（静态环境 → 拓扑闭包 = 结构格式校验，非搜索空间约束）
3. AI Agent 的工作模式识别（部分可观察 → AI 必须探索；完全可观察 → AI 直接执行）
4. 文档预期对齐（开发者文档写"OXN 适合 X 不适合 Y"时需要判据）

**当前 CONTEXT-MAP 的环境刻画是隐式的**——只在 Term #8 / Term #11 / Term #17 散见"路径成本""拓扑闭包"等讨论，但从未把 OXN 自己的环境刻画成体系。这导致 2026-07-22 grilling session 的 R&N 映射被迫把 OXN 套进"完全可观察 / 完全确定 / 单回合 / 静态 / 离散 / 完全已知"——经不起工程师深问（"OXN 真的是完全可观察吗？AI 通道外行为你怎么观察？"）。

**关键边界问题**：

- `maxIterations` 是什么？——是路径成本还是环境约束？
- 拓扑闭包校验是什么性质？——是搜索空间约束还是结构格式校验？
- Probe 标准 AI 不可见——是 OXN 环境的不可观察性，还是 OXN 对 AI 的对抗性？

## Decision

### D1: OXN Engine 的 6 轴环境刻画

OXN Engine 所处的环境按 R&N 6 轴分类如下：

| 维度 | OXN 环境 | 含义 |
|---|---|---|
| **可观察性** | partially observable（部分可观察） | OXN 只能观察通道内的 CLI 调用 + 状态机事件；AI 在通道外的推理 / 读代码 / 试方案 / 放弃等行为不可观察。Probe 范围 = 工程师选择的观测面，不是全量环境 |
| **确定性** | deterministic channel（确定性通道） | OXN 内部状态机是确定性的：CLI 调用 → 状态变更 → trace.jsonl 记录，结果可重现（同一 CLI 序列 → 同一 state.json）。OXN 的"确定性"指**通道内确定**，不是**环境确定** |
| **回合性** | episodic with memory（回合性带记忆） | 每次 CLI 调用是离散动作（episodic），但 work.md + state.json + trace.jsonl 保留跨回合上下文（memory）；新一轮 Round 可读历史 |
| **静态/动态** | semidynamic（半动态） | Asset 创建后不可改（planLock），Work 在生命周期内变化（state 演进），二者构成"资产静态 + 执行动态"的半动态模型 |
| **连续/离散** | discrete（离散） | 所有 IO Primitive（io.stat / io.read / io.exec）输出离散值；状态机事件离散；OXN 不处理连续信号 |
| **已知性** | partially known（部分已知） | OXN 知道 Asset 声明的边界（已知），但 Work 内 AI 的具体动作路径不可预知（未知） |

### D2: maxIterations = 环境约束（搜索预算），非 path_cost

**R&N 区分**：

- `path_cost(action, state) → cost`：单步成本（如移动 1 步 = 1，斜线 = √2）。
- `maxIterations`：搜索算法允许的最大展开节点数（搜索预算）。

`maxIterations = 3`（Round 硬限制默认值）是**搜索预算**——它限制 AI 在 Work 内可发起多少轮 IAP 循环，与"路径成本"无关。

OXN 里：

- path_cost = slot DAG（工程师定义的确定性路径边界，从 0 到 1 的目标边界）
- maxIterations = 环境约束（搜索算法层面的预算）
- 两者属于不同概念层，不可混用

### D3: 拓扑闭包校验 = 结构格式校验，非搜索空间约束

`oxn-work-domain.md:inv-14 task-dag-no-cycles` + `ADR-0061 §D4` 的 P5 拓扑闭包 hard-check——Task DAG ⊆ Workflow slot DAG——属于**结构格式校验**：

- 校验时机：lock 时刻（一次性）
- 校验对象：声明合法性（task.deps 是否在 boundary 祖先集合内）
- 与搜索空间约束无关——OXN 不约束 AI 怎么探索状态空间，只校验 Task 编排是否符合 Blueprint slot 拓扑

这两个概念解耦后，ADR-0061 P5 的 escape hatch（`skipDagCheck=true`）的语义清晰——它是**绕过结构校验**的应急开关，不是**绕过搜索空间约束**。

### D4: Probe 标准 AI 不可见 = OXN 对 AI 的对抗性，非环境不可观察

OXN 环境的"部分可观察"是对**工程师**而言的——OXN 不向工程师暴露 AI 的内部推理。Probe 标准 AI 不可见是**OXN 对 AI 的主动信息隐藏**（提高针对性绕过成本，ADR-0076），不是 OXN 环境的固有不可观察性。

| 不可观察对象 | 观察者 | 性质 |
|---|---|---|
| AI 通道外行为（推理 / 试错） | OXN / 工程师 | 环境固有不可观察 |
| Probe 验证标准（catalog 内部细节） | AI Agent | OXN 主动信息隐藏（对抗性） |
| Probe 触发行为（观测事实） | 工程师 / AI | 完全可观察（frozen.json + trace.jsonl） |

## Consequences

### 正面

- **OXN Engine 性质刻画明确**：6 轴分类让"OXN 是 X 吗"问题有判据（"OXN 通道内确定、通道外不可观察"——不是"完全确定"也不是"完全可观察"）。
- **设计决策边界锐化**：maxIterations vs path_cost、拓扑闭包校验 vs 搜索空间约束、Probe 不可见 vs 环境不可观察——三对容易混淆的概念被显式区分。
- **Probe 设计范围收敛**：Probe 不试图观测 AI 通道外行为（不可能），Probe 是**工程师选择的观测面**（manifest）；这与 ADR-0072 "OXN 是工程师定义的确定性参照"一致。
- **未来探索模式不被锁死**：v0.7+ Insight 涌现层如果要 AI 在 OXN 通道内做更复杂的探索（环境动态 / 部分可观察），6 轴刻画给探索留有"语义提升"空间，不必重写底层。

### 负面 / 风险

- **6 轴刻画是抽象层表述**：具体实现细节（如 io.stat / io.read / io.exec 的 Provider 接线）保留在各 Domain SSOT 与 ADR-0086 中，本 ADR 不重复。
- **AI 通道外行为的"不可观察"可能引发误解**：工程师可能误以为"OXN 应该能观察 AI 的所有行为"——需要在文档中明确"通道外 = OXN 边界外"的设计选择（oxn-work-domain:inv-31 channel-only-tracking 已记录）。
- **R&N 6 轴是简化模型**：R&N 自己承认这套分类"不互斥且非穷尽"——实际环境中可能有混合形态。本 ADR 把 OXN 锁定在 6 轴的具体值上，未来如果 OXN 真的需要处理连续信号（离散 → 连续），需要起新 ADR 修订。

### 衍生

- **CONTEXT-MAP Term #8 锐化**：明确"半动态 = 资产静态 + 执行动态"，与 v0.6 RFC 的 Asset 不可改写约束对齐。
- **oxn-domain.md 增补"OXN 环境 6 轴" term**：与 Referent / Floor / Ceiling 并列，作为产品核心概念。
- **oxn-engine-domain.md 新增 6 轴对应描述**：L0 Kernel 零 IO + L1 Infra 副作用 + 通道内确定性 = 6 轴的具体实现映射。

## Alternatives Considered

- **把 OXN 当成"完全可观察 / 完全确定 / 单回合 / 静态 / 离散 / 完全已知"**：否决。OXN 不能观察 AI 通道外行为（非完全可观察）；OXN 通道内确定但环境本身可能变化（半动态）；Work 跨回合保留上下文（episodic with memory）。
- **把 maxIterations 当成 path_cost 的一种**：否决。maxIterations 是搜索算法层面的预算（限制展开节点数），path_cost 是单步成本（每动作代价）；概念层不同，混用会误导后续讨论。
- **拓扑闭包校验 = 搜索空间约束**：否决。OXN 不约束 AI 怎么探索状态空间，拓扑闭包校验是声明合法性校验（lock 时刻一次性）。把两者等同会导致 ADR-0061 P5 的 escape hatch 语义混乱。
- **Probe 标准 AI 不可见 = 环境不可观察**：否决。这是 OXN 主动设计（ADR-0076 软对抗），不是环境固有性质；混用会让"OXN 应该让 AI 看 Probe 标准"成为合理诉求。

## References

- [.openxenon/CONTEXT-MAP.md](../../../CONTEXT-MAP.md) — R&N Term #8 / #11 / #17 上下文
- [docs/adrs/0084-collaboration-boundary-layering.md](./0084-collaboration-boundary-layering.md) — 协作边界分层模型（本 ADR 的上层叙事）
- [docs/adrs/0072-oxn-as-referent-for-nondeterministic-agent.md](./0072-oxn-as-referent-for-nondeterministic-agent.md) — OXN 不是智能体
- [docs/adrs/0073-oxn-implementation-boundary-criteria.md](./0073-oxn-implementation-boundary-criteria.md) — 路径判据（确定性 vs 优化）
- [docs/adrs/0076-probe-anti-bypass-mechanism.md](./0076-probe-anti-bypass-mechanism.md) — 验证标准 AI 不可见的软对抗（`if exists`）
- [.openxenon/assets/domains/oxn-domain.md](../../../.openxenon/assets/domains/oxn-domain.md) — Referent / Floor / Ceiling
- [.openxenon/assets/domains/oxn-engine-domain.md](../../../.openxenon/assets/domains/oxn-engine-domain.md) — L0 Kernel + L1 Infra 6 轴实现映射
- Russell & Norvig, *Artificial Intelligence: A Modern Approach* — Environment Types (Ch. 2)
