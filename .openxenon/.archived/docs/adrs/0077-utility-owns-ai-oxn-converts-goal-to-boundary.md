---
entity: adr
version: 1.0.0
status: Archived
date: 2026-07-23
supersedes: null
supeded-by: null
related:
  - .openxenon/drafts/rfc/0072-oxn-as-referent-for-nondeterministic-agent.md
  - .openxenon/drafts/rfc/0073-oxn-implementation-boundary-criteria.md
  - .openxenon/drafts/rfc/0074-insight-ingredient-not-reasoner.md
  - .openxenon/CONTEXT-MAP.md
archived-at: 2026-08-11
archived-by: RFC-0030-D1
---

# ADR-0077: Utility 归属 AI；OXN 的机制是目标→边界参照转换

> **状态**：✅ Accepted
> **日期**：2026-07-23
> **来源**：2026-07-23 grilling session 第六轮（domain-modeling + grill-with-docs skill）
> **影响层**：Utility 定位 + Referent 机制解释 + Probe verdict 本质 + Term #9 修订

## Context

**触发问题**：Term #18（utility theory）盘问暴露一个表面张力——Probe verdict 是 pass/fail（可能多级），看起来像退化效用函数 `U(s) ∈ {0, 1}`。如果 Probe verdict = degenerate utility，那 OXN 就有 utility 函数，与"OXN 没有 utility"（Term #9：utility 外包给工程师）矛盾。

三个候选被提出：(a) degenerate utility / (b) not utility / (c) 合并。实际答案跳出三选一，揭示了 OXN 存在的**根本机制**。

**关键发现**：

1. **Utility 是 AI Agent 自有的**——LLM 的注意力机制在回答时本身就带效能作用（推理是为了满足工程师的提问/意图）。Utility 不在工程师手里，不在 OXN 手里，在 AI 的注意力机制里。

2. **工程师的目标是 AI Agent 效能的依据**——但直接作为依据时，非确定性程度**不可知**（可能 0%，可能 100%）。工程师把目标直接喂给 LLM，LLM 可能完全遵守也可能完全忽略，这个程度是黑盒不可观测的。

3. **OXN 的机制是目标→边界参照转换**——OXN 把工程师的目标转换为边界参照（不是"一定要这么做"，而是"依据其做会提高确定性"）。这解释了 Referent（ADR-0072）存在的**原因**：直接应用目标到非确定性 agent 是不可知的，转换为边界参照后提高了可观测性和确定性。

## Decision

### D1: Utility 归属 AI Agent，不属于 OXN，也不属于工程师

| 主体 | 与 utility 的关系 | 性质 |
|---|---|---|
| **AI Agent** | utility 的拥有者 | 注意力机制即内置 utility 函数——推理为满足工程师意图，注意力分配即效用优化 |
| **工程师** | utility 的依据提供者 | 工程师的目标是 AI utility 的输入依据，但非 utility 函数本身 |
| **OXN** | 不参与 utility | 无 utility 函数，不做偏好排序，不做候选比较，不做优化 |

R&N MEU（Maximum Expected Utility）三组件在 OXN 里的归属：

| MEU 组件 | R&N 定义 | OXN 里归属 |
|---|---|---|
| U(s) 效用函数 | 状态→实数的偏好映射 | **AI 注意力机制**（内置，非显式） |
| P(outcome\|a) 概率模型 | 动作不确定性建模 | **AI 内部**（LLM 隐式建模，不可观测） |
| argmax 优化 | 候选动作中选最优 | **AI 推理过程**（注意力分配即优化） |

OXN 三组件全不参与。这和 Term #13（OXN 不搜索）、Term #15（OXN 不是 CSP solver）、Term #17（OXN 不规划）完全同构——**utility 也是 AI 自有能力，OXN 不介入**。

### D2: Probe verdict 不是退化 utility，是边界参照验证

Probe verdict（pass/warn/fail）**不是**退化效用函数 `U(s) ∈ {0, 1}`。区别：

| 维度 | 退化 utility `U(s)∈{0,1}` | Probe verdict |
|---|---|---|
| 语义 | 偏好排序（好=1，坏=0） | 约束满足检查（符合边界=pass，不符合=fail） |
| 比较对象 | 比较多个候选状态的效用 | 检查**一个给定状态**是否满足边界 |
| 优化目标 | argmax（选效用最高的） | 无优化，只判定满足/不满足 |
| 动作选择 | 隐含动作选择（选 U 最高的动作） | 不选动作（AI 自己选，OXN 只验证结果） |

Probe verdict = **边界参照的验证**（Term #15 的 CSP satisfaction checking），不是 utility。这与 ADR-0073 判据 4（确定性满足非路径优化）一致——satisfaction ≠ optimization。

### D3: OXN 的核心机制 = 目标→边界参照转换

这是本 ADR 的核心贡献——解释 Referent（ADR-0072）存在的**根本原因**：

```
工程师目标（utility 依据）
    │
    │  直接应用到非确定性 AI = 不可知
    │  （LLM 可能 0% 遵守，可能 100% 遵守，程度不可观测）
    │
    ▼
OXN 转换机制
    │
    │  目标 → 边界参照
    │  （不是"必须这么做"，而是"依据其做会提高确定性"）
    │
    ▼
边界参照（Referent）
    │
    ├── Asset：知识边界参照（工程师经验沉淀为声明式约束）
    ├── Blueprint：规划边界参照（静态模板锚定 AI 动态规划）
    ├── Probe：验证边界参照（确定性执行 script 验证 AI 产出）
    ├── Work：解的边界参照（结构性完成参照）
    └── Task DAG：搜索边界参照（AI 搜索行为的外化记录）
    │
    ▼
AI Agent 在边界参照内自主工作
    │
    ├── utility 仍是 AI 自己的（注意力机制）
    ├── 但有了确定性参照锚点（提高 floor，ADR-0073 判据 3）
    └── 非确定性程度从不可知变为可观测（Probe verdict 留痕）
```

**"不可知→可观测"是 OXN 的核心价值**：

- **直接应用目标**：工程师写指令→AI 读→AI 执行。非确定性程度不可知（黑盒内注意力分配不可观测，可能完全遵守也可能完全忽略）。
- **转换后**：工程师目标→OXN 边界参照（Asset/Blueprint/Probe）→AI 在参照内工作→Probe verdict 留痕。非确定性程度从"不可知"变为"可观测"（通过 Probe pass/fail 记录知道 AI 是否满足边界）。

这**不消除**非确定性（ceiling 不变，ADR-0073 判据 3），但**提高 floor**（有了边界参照，AI 更可能满足基本要求）+ **提高可观测性**（Probe verdict 留痕，工程师可追溯）。

### D4: Term #9 修订——utility 不是"外包给工程师"，是"AI 自有"

Term #9 原论断："utility 故意外包给工程师"。这是从 OXN 视角的正确描述（OXN 不管 utility），但隐含了"utility 在工程师手里"的错误暗示。

**修订**：utility 是 AI Agent 自有的（注意力机制），工程师的目标是 utility 的**依据**，但依据不等于 utility 函数本身。OXN 既不拥有 utility 也不是 utility 的执行者——OXN 把工程师目标**转换为边界参照**，让 AI 的内置 utility 机制有稳定的参照锚点。

## Consequences

### 正面

1. **Referent 有了机制解释**——ADR-0072 命名了 Referent 结构，ADR-0073 给了判据，本 ADR 解释了**为什么**需要 Referent：直接应用目标到非确定性 agent 不可知，转换为边界参照后提高确定性和可观测性。
2. **Probe verdict 本质澄清**——不是退化 utility，是边界参照验证。消除了"OXN 有没有 utility 函数"的表面张力。
3. **Term #9 修订**——utility 定位从"外包给工程师"精确化为"AI 自有，工程师提供依据，OXN 转换为边界参照"。
4. **统一模式再确认**——utility 是第 18 个被确认的"AI 自有 + OXN 参照"双轨结构（搜索/CSP/planning/utility 全同构）。

### 负面 / 限制

1. **"不可知→可观测"不等于"不可知→确定"**——Probe verdict 留痕让非确定性程度可观测，但不消除非确定性。AI 仍可能在某轮满足边界、下轮不满足。
2. **边界参照是软约束**——Asset/Blueprint 聚合后在 Work/Task Context 里提高 LLM 注意力（floor），不根本改变 LLM 黑盒（ceiling）。AI 可忽略边界，OXN 只记录忽略事实（Term #15 CSP 逻辑）。

### 中性

1. **Insight 的新定位**——Insight 统计（ADR-0074 原料提供者）现在可以理解为"边界参照的使用情况统计"：哪些 Probe 经常 fail = 哪些边界 AI 经常不满足 = 哪些确定性 floor 需要工程师调整。Insight 不推理（ADR-0074），但提供边界参照的效能反馈原料。

## Alternatives Considered

### Alt-1: Probe = degenerate utility（候选 a）

**否决**。退化 utility 隐含偏好排序和候选比较，但 Probe 只检查一个给定状态是否满足边界，不比较候选，不选动作。Satisfaction checking ≠ utility（Term #15 CSP 逻辑）。

### Alt-2: OXN 无 utility-related 结构（候选 b 纯化）

**否决**。过于绝对——OXN 体系里确实有 utility-relevant 结构（Probe 定义 floor，Insight 提供 utility 原料），只是 OXN 本身不拥有 utility 函数。完全否认会丢失"边界参照与 utility 的关系"这一结构。

### Alt-3: 合并进 ADR-0072

**否决**。ADR-0072 记录 Referent 结构命名（是什么），0077 记录目标→边界转换机制（为什么需要）。职责分离。合并会让 0072 膨胀且模糊结构与机制的层次。

## References

- [ADR-0072 OXN 参照系定位](./0072-oxn-as-referent-for-nondeterministic-agent.md) — Referent 结构命名（本 ADR 解释其存在机制）
- [ADR-0073 OXN 实现边界判据](./0073-oxn-implementation-boundary-criteria.md) — 判据 3（floor/ceiling）+ 判据 4（满足非优化）
- [ADR-0074 Insight 原料非推理](./0074-insight-ingredient-not-reasoner.md) — Insight 作为边界参照效能反馈原料
- [ADR-0012 Main/Sub Agent 审计链](./0012-main-sub-agent-audit-chain.md) — 两步验证（AI 先自验→OXN 后公证）
- `CONTEXT-MAP.md` Term #9（utility）+ Term #15（CSP）+ Term #18（utility theory）
