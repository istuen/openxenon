---
entity: adr
version: 1.0.0
status: Accepted
date: 2026-07-23
supersedes: null
superseded-by: null
related:
  - .openxenon/drafts/rfc/0072-oxn-as-referent-for-nondeterministic-agent.md
  - .openxenon/CONTEXT-MAP.md
  - .openxenon/assets/domains/oxn-domain.md
  - .openxenon/drafts/rfc/0066-terminology-simplification.md
  - .openxenon/drafts/rfc/0067-no-judgment-principle.md
---

# ADR-0073: OXN 实现边界判据——四轴判据集

> **状态**：✅ Accepted
> **日期**：2026-07-23
> **来源**：2026-07-23 grilling session 第二轮（domain-modeling + grill-with-docs skill）
> **影响层**：实现边界决策 + 架构守卫判据

## Context

**触发问题**：ADR-0072 命名了 OXN 的"参照系"（Referent）定位——为非确定性智能体提供确定性参照锚点。但"哪些功能该实现、哪些不该实现"的判据尚未成文。历史决策（如 ADR-0066/0067 彻底不判、信息隐藏、Round 手动触发）都凭直觉，缺乏统一的边界判据集。

本次 grilling session 第二轮用 R&N 四个术语（环境类型 / agent program types / rationality / problem formulation）逐一对照，产出四个正交判据。这四个判据两两正交，覆盖 OXN 实现边界的四个维度：**补偿什么 / 升到哪级 / 提哪限 / 路径怎么判**。

**关键纠正**：盘问过程中曾推演"drift recovery"（OXN 修复 LLM 漂移）作为 Referent 的功能描述——被否决。正确功能描述是**标记参照**（像飞行检查清单/地图路标），不是修复 LLM。OXN 的存在本身就是确定性，是工程师了解 AI 的工具，不是修复 AI 的工具。此纠正记录于 D5，防止后续误用。

## Decision

### D1: 补偿方向判据（来自 R&N 环境类型）

**判据**：OXN 补偿 **agent 非确定性**，不补偿**环境性质**。

R&N 环境类型六轴（可观测/确定性/情节性/静态性/离散性/主体数）决定 agent 需要什么能力。但 OXN 不补偿环境缺陷——软件项目本身是动态环境，AI 通过工具持续感知是 AI 自己的事。OXN 补偿的是 agent 缺陷（LLM 注意力机制的非确定性）。

| 维度 | 该实现 | 不该实现 |
|---|---|---|
| 补偿对象 | agent 非确定性（参照锚点） | 环境性质（持续感知、环境适配） |

### D2: agent 级别判据（来自 R&N agent program types）

**判据**：OXN 把 LLM Agent 从"不可靠 type 2-3"升级到"可靠 type 2-3"，**不进 type 4**。

R&N 四级：simple reflex / model-based / goal-based / utility-based。LLM Agent 裸奔 = 不可靠 type 2-3（有世界模型但漂移、有目标但解释变异）。OXN 参照升级可靠性但不升 type 4——utility（性能度量）由 ADR-0066/0067 故意外包给工程师。

但 utility 不是完全缺失——以"工程师经验积累"形态存在于工程师侧（非线性，如代码抽象复用、测试用例复用）。Insight 产出 pattern 建议，utility 决策在工程师。

| 维度 | 该实现 | 不该实现 |
|---|---|---|
| agent 级别 | 升级 type 2-3 可靠性的参照 | type 4 效用机制（自动合格判定、质量评分） |

### D3: floor/ceiling 判据（来自 R&N rationality）

**判据**：OXN 提高 **floor**（下限参照），不提高 **ceiling**（上限机制）。

R&N 理性 = 单 agent 最大化 P 期望。OXN 里 P 在工程师脑子里，无单一主体能做 R&N 理性选择——理性是**分布式**的：AI 伪理性 + 工程师真理性 + OXN 对齐参照。

LLM = 图书馆 + 图书馆管理员（自带数据 + 注意力机制），基于外部指令做选择。非确定性贯穿三段：工程师大脑 → 编写指令 → AI 理解。OXN 把前两段变确定性 Asset。

AI 可能全局选择甚至涌现更优（反向帮助工程师积累经验、沉淀 Asset——这是 Insight 反馈链的根据），也可能局部最优全局非最优。OXN 对后者提供 floor（确定性 Asset + Work 专注某目标的保底参照），但不限制 ceiling（AI 自身能力可超工程师）。

| 维度 | 该实现 | 不该实现 |
|---|---|---|
| 作用方向 | 提高 floor（下限参照保底） | 提高 ceiling（上限机制、限制 AI 上限、替 AI 做最优选择） |

### D4: 路径判据（来自 R&N problem formulation）

**判据**：路径判据是**确定性满足**，不是**路径优化**。

R&N problem formulation 四元组 `(initial_state, actions(s), goal_test(s), path_cost)`。前三项在 OXN 里有对应（Work create / Task DAG+工具+CLI / 结构性+业务性 goal_test），但 path_cost 在 OXN 里不是"最小化代价"。

OXN 里 path_cost = slot DAG（工程师定义确定性路径边界，0→1 目标边界）+ Tasks（AI 依 Blueprint 编排）。判据不是"最优"而是"确定"——选择这些方式实现能满足工程师目标。类比：从 A 到 B，工程师告知可有哪些方式，AI 自决采用哪些或组合。

R&N 假定"最短路径"是通用理性；OXN 认为软件工程里"最短"不一定最优（多写测试可能更稳），路径判据是"确定性满足"而非"代价最小化"。

| 维度 | 该实现 | 不该实现 |
|---|---|---|
| 路径判据 | 确定性满足（满足工程师定义的边界即合格） | 路径优化（最短/最省/自动选最优路径） |

### D5: drift recovery 收回记录

盘问 Term #8（环境类型）时曾推演"drift recovery"作为 Referent 的功能描述——"当 LLM 上下文压缩/裁剪/膨胀导致注意力漂移时，参照系让 AI 能回查原本的标记"。

**此推演被否决**。原因：drift recovery 预设 OXN 在"修复 LLM 漂移"——错误框架。正确的功能描述是**标记参照**（像飞行检查清单/地图路标）：AI 执行前按目标自己规划 → 产出"标记清单"（Work + Tasks）→ 每项标记对应一个验证参照（Probe）。OXN 不强制 AI 遵守或必须验证——其存在本身就是确定性（创建出来意味着要验证，验证进度和成果反馈 AI 情况）。这种确定性是工程师了解 AI 的工具，不是修复 AI 的工具。

ADR-0072 的 Referent 定义（"参照锚点"）是准确的，不需要 errata。drift recovery 概念禁止后续 ADR/code 引用。

### D6: LLM 图书馆隐喻

LLM = 图书馆 + 图书馆管理员：自带大量数据 + 训练如何使用，根据外部指令（工程师/程序的上下文）自行解读、选择"图书"作为解释去执行动作。

非确定性贯穿三段：
1. 工程师大脑（意图形成）
2. 编写指令（意图表达）
3. AI 理解（不同 LLM / 同一 LLM 不同次理解都不同）

OXN 把前两段变成确定性 Asset。第三段（AI 理解）仍非确定，但 OXN 通过 Work/Task DAG 提供稳定参照锚点让 AI 的理解有对齐基准。

### D7: 分布式理性模型

理性在 OXN 里不是单一主体属性，而是三方协作闭环里的**分布式属性**：

| 主体 | 理性形态 | 说明 |
|---|---|---|
| AI Agent | 伪理性 | 基于指令解释做选择；可能全局选择甚至涌现更优；也可能局部最优全局非优 |
| 工程师 | 真理性 | 持有 P（性能度量）+ utility（经验积累）；做最终判定 |
| OXN Engine | 对齐参照 | 提供确定性锚点让 AI 伪理性对齐工程师真理性；不持有 P 也不做选择 |

AI 可涌现比工程师更优的选择（反向帮助工程师增加经验、沉淀 Asset——Insight 反馈链的根据）。但 AI 也可局部最优全局非最优——OXN 对此提供 floor（下限参照），不限制 ceiling。

### D8: 四判据正交性

四判据两两正交，覆盖 OXN 实现边界的四个维度：

| # | 判据 | 维度 | 该实现 | 不该实现 |
|---|---|---|---|---|
| 1 | 补偿方向 | 补偿什么 | agent 非确定性 | 环境性质 |
| 2 | agent 级别 | 升到哪级 | type 2-3 可靠性 | type 4 效用 |
| 3 | floor/ceiling | 提哪限 | floor（下限） | ceiling（上限） |
| 4 | 路径判据 | 路径怎么判 | 确定性满足 | 路径优化 |

**使用方式**：评估任何 OXN 新功能时，过四判据——任一判据命中"不该实现"则拒绝。四判据全过则符合 OXN 定位。

## Consequences

### 正面

- **边界决策有判据**：历史决策（彻底不判、信息隐藏、Round 手动）可被四判据解释；未来决策可用四判据评估。
- **判据可操作**：四判据是二值判据（该/不该），可直接做架构守卫检查清单。
- **drift recovery 误用被阻断**：D5 显式记录纠正，防止后续 ADR/code 误引。
- **LLM 隐喻可用**：图书馆隐喻为后续讨论 LLM 非确定性提供共享语言。

### 负面 / 风险

- **判据是快照**：四判据基于 R&N 术语 + 当前 OXN 架构。OXN 演进（如 v0.7+ Insight 涌现推理）可能需要扩展判据。
- **type 4 边界有张力**：Insight 的"该废弃/该改进"建议接近 type 4 推理。D2 判据说"不进 type 4"，但 Insight 产出 pattern 建议在边缘。靠"建议归工程师批"保持不越线，但需持续审视。
- **floor/ceiling 隐含 AI 能力假设**：D3 假定 AI 能力（ceiling）可超工程师。若 LLM 能力退化或边界变化，此假设需复审。

### 衍生

- **`Floor` + `Ceiling` 术语入 oxn-domain.md**（本次落地）——D3 判据的对偶概念，高频引用
- **CONTEXT-MAP 对照表扩展 4 行**（本次落地）
- **后续 grilling 可扩展判据**：Utility 深挖 / Search strategies / Adversarial search / Learning 等术语可能产出第五、六判据
- **架构守卫集成候选**：四判据可转化为 CI 检查（如"新功能 PR 必须声明过哪几判据"）——v0.8+ 计划

## Alternatives Considered

- **维持无判据**：否决。边界靠默认/直觉有遗漏风险（本次盘问前 PEAS 三处错就没人发现）。四判据把隐性判据显式化。
- **合并进 ADR-0072**：否决。ADR-0072 记录参照系定位（结构），0073 记录实现边界判据（功能），职责分离。合并会让 0072 膨胀且模糊定位与判据的层次。
- **drift recovery 作为 Referent 功能描述**：否决（见 D5）。预设 OXN 修复 LLM，错误框架。
- **把 type 4 完全禁止**：否决。Insight 的 pattern 建议在 type 4 边缘但有用。靠"建议归工程师批"的架构保持受控，而非一刀切禁止。
- **path_cost 判据用"最短路径"**：否决。软件工程里"最短"不一定最优（多写测试可能更稳）。确定性满足比路径优化更贴合 OXN 语境。

## References

- [ADR-0072 OXN 参照系定位](./0072-oxn-as-referent-for-nondeterministic-agent.md) — Referent 结构命名（本 ADR 在其上加功能判据）
- [CONTEXT-MAP.md](../../../../CONTEXT-MAP.md) — 对照表扩展落地点
- [oxn-domain.md](../../../assets/domains/oxn-domain.md) — Floor/Ceiling 术语新增落地点
- [ADR-0066 术语精简](./0066-terminology-simplification.md) — P 外包给工程师（D2 判据法源）
- [ADR-0067 彻底不判贯彻](./0067-no-judgment-principle.md) — 彻底不判原则（D2/D3 判据法源）
- Russell & Norvig, *Artificial Intelligence: A Modern Approach* — R&N 环境类型/agent program types/rationality/problem formulation 原义
