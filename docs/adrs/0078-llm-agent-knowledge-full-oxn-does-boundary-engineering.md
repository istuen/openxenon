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
  - .openxenon/drafts/rfc/0077-utility-owns-ai-oxn-converts-goal-to-boundary.md
  - .openxenon/drafts/rfc/0074-insight-ingredient-not-reasoner.md
  - .openxenon/CONTEXT-MAP.md
---

# ADR-0078: LLM Agent 是 knowledge-full；OXN 做边界工程非知识工程

> **状态**：✅ Accepted
> **日期**：2026-07-23
> **来源**：2026-07-23 grilling session 第七轮（domain-modeling + grill-with-docs skill）
> **影响层**：OXN 存在前提 + Asset 本质定位 + R&N vs LLM agent 范式差异

## Context

**触发问题**：Term #22（knowledge engineering）盘问时，R&N 的 knowledge engineering（acquisition → representation → base → inference → validation）在 OXN 里只能对上前三步（acquisition=工程师写 Asset / representation=MD 声明式 / base=`.openxenon/assets/`），inference engine 明确不存在（OXN 不推理，ADR-0074）。

表面看是"消费者转移"（R&N inference engine → AI Agent）。但深挖暴露了一个更根本的范式差异：**R&N 假定 agent 是 knowledge-empty 的（需要外部注入知识），而 LLM-based agent 是 knowledge-full 的（预训练内化了庞大知识库）**。

**关键发现**：

1. **LLM 本身是庞大的知识库**——如果"知识"指类似人类的知识，LLM 通过预训练已经内化了海量知识。LLM-based AI Agent 是 R&N agent 定义的子集（且在 R&N 成书后才出现），自带 R&N 定义的所有智能体组件（世界模型/传感器/执行器/推理）。

2. **LLM 的根本差异是非稳定性**——LLM 的原理（概率采样 + 注意力机制）决定了它不是稳定智能体。同输入可能产生不同输出。这是 LLM agent 和 R&N agent 的**最大区别**——不是知识有无，而是知识使用的确定性。

3. **OXN 不做知识工程，做边界工程**——LLM agent 已有知识（knowledge-full），不需要 OXN 注入知识。LLM agent 的问题是知识使用不确定（非稳定）。OXN 提供工程师定义的经验边界作为 Asset——不是知识本身，是**约束线索**，让 AI 利用自己已有的知识时提高确定性。

## Decision

### D1: R&N agent 是 knowledge-empty；LLM agent 是 knowledge-full

| 维度 | R&N agent | LLM-based agent |
|---|---|---|
| 知识来源 | 外部注入（knowledge engineering 构建 knowledge base） | 预训练内化（LLM 权重 = 隐式知识库） |
| 推理引擎 | inference engine（显式，消费 knowledge base 推理） | 注意力机制（隐式，不可观测） |
| 知识稳定性 | 稳定（knowledge base 不变则推理一致） | **非稳定**（概率采样决定同输入可不同输出） |
| 缺什么 | 知识（需要 knowledge engineering 填充） | 边界（需要 boundary engineering 约束已有知识的使用） |

R&N 的 knowledge engineering 回答的问题是："如何让一个没有知识的 agent 获得知识并推理"。

LLM agent 不需要回答这个问题——它已经有知识。它需要回答的是："如何让一个有知识但不稳定的 agent 确定性地使用知识"。

### D2: OXN 做的是边界工程，不是知识工程

| R&N knowledge engineering 步骤 | OXN 对应物 | 是否存在 |
|---|---|---|
| knowledge acquisition | 工程师写 Asset | ✅ 但性质不同——不是提取知识给空机器，是沉淀经验边界给满载 AI |
| knowledge representation | Asset MD 声明式 | ✅ 但表示的是边界线索，不是推理原料 |
| knowledge base | `.openxenon/assets/` | ✅ 但不是 inference engine 的消费源，是 AI 的参照锚点 |
| inference engine | — | ❌ OXN 不推理（ADR-0074） |
| validation | Probe 验证 | ✅ 但验证的是 AI 产出，不是知识库本身 |

**Asset 不是知识，是边界线索**：

- R&N knowledge base = 给 inference engine 的推理原料（agent 没有知识，需要外部注入）
- OXN Asset = 给 AI Agent 的约束线索（AI 已有知识，需要边界约束其使用）

工程师写 Asset 不是在做 knowledge acquisition（提取知识给空机器），是在做 **boundary acquisition**（沉淀经验边界给满载 AI）。Asset 的内容是工程师的经验边界（Term #15 三边界：domain/workflow/stack），不是领域知识本身。

### D3: 这解释了 OXN 存在的最深层前提

ADR-0072 命名了 Referent 结构。ADR-0073 给了判据。ADR-0077 给了机制（目标→边界参照转换）。本 ADR 给了**前提**——为什么需要边界参照而不是知识注入：

```
前提（ADR-0078）：LLM agent 是 knowledge-full，缺的是边界不是知识
    │
    ▼
机制（ADR-0077）：OXN 把工程师目标转换为边界参照
    │
    ▼
结构（ADR-0072）：Referent——为非确定器官提供确定参照锚点
    │
    ▼
判据（ADR-0073）：四轴判据集（补偿非确定性 / agent 级别 / floor-ceiling / 满足非优化）
```

## Consequences

### 正面

1. **前提→机制→结构→判据闭环完成**——ADR-0078（前提）→ ADR-0077（机制）→ ADR-0072（结构）→ ADR-0073（判据）。OXN 的存在逻辑从"为什么需要"到"如何做"到"是什么"到"怎么判断"完整闭环。
2. **Asset 本质澄清**——Asset 不是知识（不是给空机器的推理原料），是边界线索（给满载 AI 的约束参考）。这纠正了可能把 Asset 类比为 R&N knowledge base 的误导。
3. **Term #21 脚手架回溯解释**——Asset 作为"脚手架"不是从零构建世界模型的材料，是帮助 AI 应用已有知识（LLM 预训练）的约束脚手架。
4. **解释 LLM agent vs R&N agent 的根本差异**——不是能力差异（LLM 是 R&N agent 的子集，已有所有组件），是稳定性差异（LLM 非确定，R&N agent 确定）。OXN 补偿的是稳定性差异，不是能力差异（ADR-0073 判据 2）。

### 负面 / 限制

1. **Asset 可能被误读为"知识"**——Asset 的 MD 格式看起来像知识库条目，容易让人以为 OXN 在做知识工程。需要在文档中持续强调"Asset = 边界线索 ≠ 知识"。
2. **"LLM 已有知识"是统计意义**——LLM 的知识是统计学习的，不等同于工程师的精确知识。Asset 边界线索的一个作用是帮 AI 区分"统计上像对但实际不对"的知识使用。
3. **LLM 有过多知识，Asset 聚焦知识使用**——LLM 不只有领域知识，有大量知识（含非当前构建软件所需的）。Asset 的边界作用不只是约束知识使用，还**聚焦**知识使用——让 LLM 从海量知识中专注当前领域（Term #23 补充）。

### 中性

1. **Insight 的定位不变**——Insight 仍是边界参照的效能反馈原料（ADR-0077 D3 中性 1）。但可以从 knowledge-full 视角补充理解：Insight 统计的是"AI 的已有知识在边界约束下的使用效能"。
2. **概率边界是下一代方向**——当前阶段 Probe 返回 true/false（确定性边界）。未来 OXN 可能通过概率定义边界（更适应 LLM 与现实软件的不确定性）。当前不做因工程师尚不具备这方面知识经验——"我的边界决定 OXN 当前开发边界"是边界工程范式对 OXN 自身开发的递归应用（Term #23）。概率统计仍将是原料（确定公式计算），不决定下一步或 Asset 演化——AI Agent 与工程师决定。

## Alternatives Considered

### Alt-1: OXN 做的是"面向 AI 消费的知识工程"

**否决**。这个描述隐含 Asset = knowledge，但 Asset 是边界线索不是知识。LLM 已有知识，不需要 OXN 注入。把 Asset 称为"知识"会误导设计方向（往知识库/inference engine 方向发展，而非边界参照方向）。

### Alt-2: 合并进 ADR-0077

**否决**。ADR-0077 记录机制（目标→边界参照转换），0078 记录前提（为什么是边界而非知识）。职责分离。合并会让 0077 从"机制 ADR"膨胀为"前提+机制 ADR"，模糊层次。

### Alt-3: 仅 CONTEXT-MAP 行，不写 ADR

**否决**。这个洞察是 OXN 存在的最深层前提（解释了为什么是边界工程而非知识工程），且修正了一个容易误解的方向（Asset ≠ 知识）。不写 ADR 会让这个前提隐没在对照表行里，不利于后续设计决策引用。

## References

- [ADR-0072 OXN 参照系定位](./0072-oxn-as-referent-for-nondeterministic-agent.md) — Referent 结构命名
- [ADR-0073 OXN 实现边界判据](./0073-oxn-implementation-boundary-criteria.md) — 判据 2（agent 级别：补偿非确定性不是能力）
- [ADR-0077 Utility 归属与目标→边界转换](./0077-utility-owns-ai-oxn-converts-goal-to-boundary.md) — 机制（本 ADR 提供前提）
- [ADR-0074 Insight 原料非推理](./0074-insight-ingredient-not-reasoner.md) — OXN 不推理
- `CONTEXT-MAP.md` Term #16（Asset 全声明式）+ Term #21（脚手架）+ Term #22（knowledge engineering）
