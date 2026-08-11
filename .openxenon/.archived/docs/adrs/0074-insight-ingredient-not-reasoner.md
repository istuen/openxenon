---
entity: adr
version: 1.0.0
status: Archived
date: 2026-07-23
supersedes: null
superseded-by: null
related:
  - .openxenon/drafts/rfc/0072-oxn-as-referent-for-nondeterministic-agent.md
  - .openxenon/drafts/rfc/0073-oxn-implementation-boundary-criteria.md
  - .openxenon/CONTEXT-MAP.md
  - docs/product/zh-cn/concepts/insight.md
archived-at: 2026-08-11
archived-by: RFC-0030-D1
---

# ADR-0074: Insight 架构边界——原料提供者非推理引擎

> **状态**：✅ Accepted
> **日期**：2026-07-23
> **来源**：2026-07-23 grilling session 第三轮（domain-modeling + grill-with-docs skill）
> **影响层**：Insight 模块实现边界 + v0.7+ Insight RFC 约束

## Context

**触发问题**：ADR-0072 命名 Referent 定位，ADR-0073 立四判据。但 Insight（E4 涌现层）的具体实现边界仍模糊——`docs/product/zh-cn/concepts/insight.md` 说"AI 推理涌现，非 Engine 规则计算"，方向对，但没说清"AI 主动请求 OXN 数据"这个机制，也没显式禁止 OXN 内置推理/ML 模型。

本次 grilling session Term #12（learning agents）盘问暴露：Insight 的推理主体应是 AI 不是 OXN。OXN 提供统计原料（确定性 floor），AI 主动请求并自己推理（ceiling 不限）。这保持四判据全过。

**关键张力**：R&N learning agent 的 critic 需要 performance measure 评估动作好坏。OXN 彻底不判（ADR-0066/0067，无 P），所以 OXN 自己不能做 critic、不能做 learning element（确定性程序不更新自身逻辑）。但"学习"在 OXN 系统里确实发生——它必须是分布式的。

**双向闭环结构**（Term #12 结晶）：

```
正向（学习链）：
  工程师经验 → Asset 静态边界 → Work 动态边界上下文 → AI 执行 →
  Insight 统计原料 → 工程师学习 → （回到）工程师经验

反向（赋能链）：
  工程师沉淀 Asset → AI 从 Asset 获取更优边界 → AI 推理效能提升
```

Asset 是双向枢纽（学习产物 + 赋能起点）。

## Decision

### D1: Insight 的推理主体是 AI，不是 OXN

OXN Engine 不做推理、不做 critic、不做 learning element。OXN 提供统计原料（跨 Work 的 pattern 数据、Probe 历史统计、Citation 网络等），AI Agent 主动请求原料并自己推理出建议。

| 模型 | OXN 做什么 | AI 做什么 |
|---|---|---|
| ❌ 错误（越界） | 统计学习 + 推理建议 | 读建议 |
| ✅ 正确（本 ADR） | 提供统计原料（确定性数据） | 请求原料 + 自己推理建议 |

**机制**：AI Agent 请求 `oxn insight` 获取不同方式的信息，再做推理建议。这种实现更动态智能——推理能力随 LLM 能力升级而升级，OXN 只保证原料确定。

### D2: 四判据验证

| 判据 | Insight 设计 | 通过？ |
|---|---|---|
| 1. 补偿方向 | OXN 提供确定数据（补偿 agent 非确定） | ✅ |
| 2. agent 级别 | OXN 不做 utility 推理（不进 type 4） | ✅ |
| 3. floor/ceiling | OXN 提供统计 floor，AI 推理是 ceiling 不限 | ✅ |
| 4. 路径判据 | OXN 提供数据不评价路径好坏 | ✅ |

四判据全过。

### D3: 分布式学习模型

学习在 OXN 系统里是分布式的，三方各司其职：

| 主体 | 学习形态 | 特性 |
|---|---|---|
| AI Agent | 上下文内 transient 学习 | 学快但忘快（窗口外就忘） |
| 工程师 | 持久学习（沉淀 Asset） | 学慢但持久（Asset 冻结可累积） |
| OXN Engine | 桥接层（不学习） | 提供统计原料把 AI transient 模式转成工程师可读 pattern |

OXN 不学习（确定性程序，不更新自身逻辑）。学习发生在 AI（transient）和工程师（持久）两侧，OXN 是桥接两者的数据通道。

### D4: 双向闭环

Asset 是双向枢纽：

- **正向**（学习链）：工程师经验 → Asset → Work context → AI 执行 → Insight 统计 → 工程师学习
- **反向**（赋能链）：工程师沉淀 Asset → AI 从 Asset 获取更优边界 → AI 推理效能提升

这和 ADR-0072 Term #2（Asset 是世界模型参照，写侧拆三角色协议）一致——双向闭环就是"三角色协议"（AI 提案→OXN 记录→工程师升格）的动态展开。

### D5: 实现未定但边界已定

统计学/智能学习的具体实现是待探索短板。但无论统计/学习怎么实现，**OXN 只提供原料，AI 做推理**——这个架构边界已确定。

本 ADR 不规定 Insight 的具体算法（统计方法、ML 模型、查询接口等），只规定：**任何让 OXN 自己做推理/评判/学习的实现都越界**。具体实现留给 v0.7+ Insight RFC。

## Consequences

### 正面

- **Insight 实现边界明确**：v0.7+ Insight RFC 有约束——不能内置推理引擎、不能做 critic、不能自动判定。
- **AI 能力上限不被 OXN 限制**：AI 推理能力随 LLM 升级而升级，OXN 只保证原料确定。这是 floor/ceiling 判据的实例。
- **四判据一致性验证**：Insight 是四判据的真实测试用例，四判据全过证明判据集可用。

### 负面 / 风险

- **AI 推理质量不稳定**：原料确定但推理靠 AI，不同 LLM / 同一 LLM 不同次推理结果不同。工程师需审视 AI 的 Insight 推理建议（已有 audit pool approve 闸门）。
- **原料接口设计是关键**：OXN 提供什么原料、什么格式、什么查询接口，直接决定 AI 推理质量。这是 v0.7+ Insight RFC 的核心工作。
- **"OXN 不学习"可能被质疑**：未来若有人提议让 OXN 内置 ML 模型自动优化 Probe 选择或 Asset 推荐，本 ADR 是拒绝依据。

### 衍生

- **CONTEXT-MAP 对照表扩展 Term #12**（本次落地）
- **CONTEXT-MAP 新增分布式学习闭环小节**（本次落地）
- **v0.7+ Insight RFC 约束**：必须遵守本 ADR 的"原料 vs 推理"分离
- **候选新术语**（待短板补完后入 Domain SSOT）：`DistributedLearning`（分布式学习）/ `LearningLoop`（双向闭环）—— 因实现未定，暂不入 SSOT

## Alternatives Considered

- **OXN 内置推理引擎**（让 OXN 做 Insight 推理）：否决。违反判据 2（进 type 4）+ 判据 3（OXN 做 ceiling 而非 floor）。且 OXN 是确定性程序，不更新自身逻辑。
- **OXN 做 critic**（评估 AI 动作好坏）：否决。违反 ADR-0066/0067 彻底不判，且 critic 需要 P（OXN 不持有）。
- **学习全在 AI**（OXN 不参与）：否决。AI 上下文学习是 transient，无法持久沉淀。需要 OXN 桥接 AI transient 与工程师持久。
- **学习全在工程师**（OXN 只被动记录）：部分否决。方向对但不够动态——AI 主动请求 OXN 原料再推理比工程师被动读数据更智能。
- **延迟到实现时再立法**：否决。即使具体实现未定，"原料 vs 推理"分离这个架构边界已确定，先立法防止后续走偏（如有人提议 OXN 内置 ML 模型）。

## References

- [ADR-0072 OXN 参照系定位](./0072-oxn-as-referent-for-nondeterministic-agent.md) — Referent 结构命名
- [ADR-0073 OXN 实现边界判据](./0073-oxn-implementation-boundary-criteria.md) — 四判据集（本 ADR 用四判据验证 Insight）
- [CONTEXT-MAP.md](../../../../CONTEXT-MAP.md) — 对照表 + 学习闭环落地点
- [Insight 概念文档](../../../docs/product/zh-cn/concepts/insight.md) — "AI 推理涌现，非 Engine 规则计算"（本 ADR 锐化此论断）
- [ADR-0066 术语精简](./0066-terminology-simplification.md) — 彻底不判法源
- [ADR-0067 彻底不判贯彻](./0067-no-judgment-principle.md) — 三态改名
- Russell & Norvig, *Artificial Intelligence: A Modern Approach* — learning agent 四组件原义
