---
entity: adr
version: 1.0.0
status: Accepted
date: 2026-07-23
supersedes: null
superseded-by: null
related:
  - .openxenon/drafts/rfc/0072-oxn-as-referent-for-nondeterministic-agent.md
  - .openxenon/drafts/rfc/0074-insight-ingredient-not-reasoner.md
  - .openxenon/drafts/rfc/0077-utility-owns-ai-oxn-converts-goal-to-boundary.md
  - .openxenon/drafts/rfc/0078-llm-agent-knowledge-full-oxn-does-boundary-engineering.md
  - .openxenon/CONTEXT-MAP.md
---

# ADR-0079: Asset 全体是 Ontology；OXN 形式化推理能力保留不实现

> **状态**：✅ Accepted
> **日期**：2026-07-23
> **来源**：2026-07-23 grilling session 第八轮（domain-modeling + grill-with-docs skill）
> **影响层**：Asset 本质定位 + Ontology 推理归属 + OXN 功能边界决策

## Context

**触发问题**：Term #24（ontology）盘问暴露一个张力——R&N ontology 是知识工程的核心组件（概念化 + 形式化推理）。OXN 有类似结构（E1-E4 实体分类 + Domain 术语 + MD DSL）。但 Term #22/ADR-0078 刚确立 OXN 做边界工程不做知识工程。如果 Domain/Asset 是本体，那 OXN 不就在做知识工程吗？

**关键发现**：

1. **Asset 全体是 Ontology**——不只是 Domain，所有 Asset 类型（Domain/Workflow/Stack/Blueprint）都是 Ontology。它们描述"构建软件是什么、如何关联"，但不是具体实现（实现交给 AI Agent）。

2. **边界 = Ontology 定义本身**——Asset 的"边界"不是外加约束，就是 Ontology 的定义本身。而且这个边界对 LLM 是**可确定性的**——因为 LLM 的知识库包含这些概念，或可以推理出。

3. **形式化推理归属 AI Agent**——R&N ontology 的形式化推理（OWL/RDF description logic）由 inference engine 做。OXN 没有 inference engine（ADR-0074）。但 AI Agent 可以推理——它读 Asset 的 Ontology 定义，自己推理出结论，推理结果作为 Insight 给到工程师决策。

4. **OXN 形式化推理能力保留不实现**——形式化推理是数学公式推导（确定性的，程序可实现），OXN 理论上能实现。但当前有意不实现，两层原因：(a) 工程师目前不具备这方面能力；(b) 如果让 AI Agent 实现这部分 OXN 功能，工程师无法验证正确性 → 噪音 + 损害 OXN 自身确定性。

## Decision

### D1: Asset 全体是 Ontology（不只是 Domain）

| Asset 类型 | Ontology 描述的内容 |
|---|---|
| Domain | 软件的术语/不变量/边界是什么 |
| Workflow | 工作流程的状态/角色/步骤是什么 |
| Stack | 技术栈的约定/版本/依赖是什么 |
| Blueprint | 工作编排的模板/slot/依赖是什么 |

Asset 全体描述"构建软件是什么、如何关联"——这是 Ontology 的定义（领域概念化的显式表达）。但 Asset 不是具体实现——实现交给 AI Agent。

这**不与** ADR-0078（边界工程非知识工程）矛盾：
- ADR-0078 说 Asset 是**边界线索**非知识——这是从**消费视角**看（给 AI 约束参考，非给空机器注入知识）
- 本 ADR 说 Asset 是 Ontology——这是从**结构视角**看（Asset 的形式是概念化声明）
- **结构是 Ontology，功能是边界**——Asset 用 Ontology 的形式承载边界线索的功能。LLM 已有知识（knowledge-full），不需要 OXN 注入知识；但 LLM 需要 Ontology 定义来聚焦 + 确定性地使用已有知识。

### D2: 边界 = Ontology 定义；LLM 可确定性消费

Asset 的"边界"不是外加的约束，**就是 Ontology 的定义本身**。

R&N ontology 需要形式化推理引擎（description logic）来消费 ontology。OXN 没有 inference engine（ADR-0074），但 **LLM 可以推理**：

```
Asset (Ontology 定义)
    │
    │  AI Agent 读取
    ▼
AI Agent 推理（LLM 已有知识 + Ontology 定义 → 推理结论）
    │
    ├── 推理正确 → 用于工作产出
    └── 推理结果作为 Insight → 工程师决策
```

LLM 的知识库包含 Ontology 概念（或可推理出），因此 Ontology 定义对 LLM 是**可确定性的**——LLM 能稳定理解"这个项目用这些术语、遵守这些不变量"。这是 ADR-0078 的补充：Asset 边界对 LLM 可确定性，因为 LLM 已有相关知识。

### D3: OXN 形式化推理能力保留不实现

**决策**：形式化推理（description logic / OWL reasoning）是 OXN 理论上可实现但**有意当前不实现**的功能。

| 层 | 理由 |
|---|---|
| **理论上可行** | 形式化推理是数学公式推导，确定性的，程序可实现，符合 OXN 确定性定位 |
| **当前不实现 (a)** | 工程师目前不具备这方面知识经验——"我的边界决定 OXN 当前开发边界"（ADR-0078 边界工程对 OXN 自身开发的递归应用） |
| **当前不实现 (b)** | 如果让 AI Agent 实现这部分 OXN 功能，工程师无法验证正确性 → 产生噪音 + 损害 OXN 自身确定性。OXN 的核心价值是确定性参照——如果自身推理正确性不可保证，参照就失去了意义 |

**替代路径**：当前由 AI Agent 做推理（读 Asset Ontology → LLM 推理 → Insight 给工程师）。工程师通过 Insight 间接验证 AI 推理的正确性。未来工程师能力具备后，或找到有能力的工程师后，可考虑在 OXN 内实现确定性形式化推理。

## Consequences

### 正面

1. **Asset 结构与功能统一**——Asset 在结构上是 Ontology（概念化声明），在功能上是边界线索（给 AI 约束参考）。两个 ADR（0078 边界工程 + 0079 Ontology）从不同视角描述同一实体，无矛盾。
2. **形式化推理归属明确**——当前由 AI Agent 承担（LLM 推理 → Insight），OXN 不做。这填补了 ADR-0074（OXN 不推理）留下的"那谁推理"的空缺——AI 推理，OXN 提供 Ontology 定义参照。
3. **保留未来扩展空间**——形式化推理是有意保留而非否决。未来条件成熟时可实现，不会与本 ADR 冲突。
4. **递归边界工程**——"工程师能力边界决定 OXN 开发边界"再次出现（Term #23 概率边界 + 本 ADR 形式化推理），确立了一个元原则：OXN 自身开发也遵循边界工程范式。

### 负面 / 限制

1. **AI 推理正确性不可直接验证**——AI 读 Asset Ontology 推理的结论，工程师只能通过 Insight 间接验证。如果 AI 推理错误且未被发现，可能传播到工作产出。
2. **形式化推理缺失限制了 Ontology 的深度**——当前 Asset Ontology 是"轻量本体"（概念化声明 + 边界约束，无形式化推理）。复杂的本体推理（如一致性检查、隐含关系发现）当前无法实现。
3. **"保留"可能被误读为"待办"**——保留不等于承诺实现。需要明确这是"当前有意不做"，不是"排期待做"。

### 中性

1. **概率边界（Term #23）与形式化推理的关系**——两者都是 OXN 下一代可能方向，都因工程师能力边界当前不做。但两者独立——概率边界是 Probe verdict 的升级（true/false→概率），形式化推理是 Ontology 消费方式的升级（AI 推理→OXN 推理）。可独立演进。

## Alternatives Considered

### Alt-1: Asset 不是 Ontology（Term #24 候选 b）

**否决**。Asset 明确描述"构建软件是什么、如何关联"——这是 Ontology 的定义。否认会丢失 Asset 的概念化性质，把它降级为普通配置文件。

### Alt-2: OXN 当前实现形式化推理

**否决**。两层障碍：(a) 工程师能力不具备；(b) 让 AI 实现 OXN 推理功能会导致工程师无法验证正确性，损害 OXN 确定性核心价值。在确定性保证可达成前不实现。

### Alt-3: 否决 OXN 未来实现形式化推理

**否决**。形式化推理是确定性的（数学公式推导），符合 OXN 定位。当前不实现是能力约束，不是性质否决。完全否决会关闭未来合理的扩展方向。

### Alt-4: 合并进 ADR-0078

**否决**。ADR-0078 记录"OXN 做边界工程不做知识工程"的前提。本 ADR 记录"Asset 是 Ontology + 形式化推理保留"。虽然相关，但 Asset 的 Ontology 定位和边界工程前提是不同层次的决策。合并会让 0078 膨胀。

## References

- [ADR-0072 OXN 参照系定位](./0072-oxn-as-referent-for-nondeterministic-agent.md) — Referent 结构命名
- [ADR-0074 Insight 原料非推理](./0074-insight-ingredient-not-reasoner.md) — OXN 不推理（本 ADR 明确推理归属 AI Agent）
- [ADR-0077 Utility 归属与目标→边界转换](./0077-utility-owns-ai-oxn-converts-goal-to-boundary.md) — 机制
- [ADR-0078 LLM agent knowledge-full](./0078-llm-agent-knowledge-full-oxn-does-boundary-engineering.md) — 前提（本 ADR 补充 Asset 聚焦 + Ontology 结构）
- `CONTEXT-MAP.md` Term #16（Asset 全声明式）+ Term #22（边界工程）+ Term #24（ontology）
