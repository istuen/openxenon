---
entity: adr
version: 1.0.0
status: Accepted
date: 2026-07-23
supersedes: null
superseded-by: null
related:
  - RFC-0028
  - .openxenon/drafts/rfc/0072-oxn-as-referent-for-nondeterministic-agent.md
  - .openxenon/drafts/rfc/0073-oxn-implementation-boundary-criteria.md
  - .openxenon/drafts/rfc/0012-main-sub-agent-audit-chain.md
  - .openxenon/drafts/rfc/0068-daemon-responsibility-boundary.md
  - docs/product/zh-cn/concepts/work.md
---

# ADR-0075: Round loop 定位修订——从 OXN 强制机制改为 AI 搜索行为记录

> **状态**：✅ Accepted
> **日期**：2026-07-23
> **来源**：2026-07-23 grilling session 第四轮（domain-modeling + grill-with-docs skill）
> **影响层**：Round loop 语义 + maxIterations 机制 + Work 状态机

## Context

**触发问题**：Term #13（search strategies）盘问暴露 Round loop 的定位问题。现有设计（`work.md` §3 + `dual-state-exec.ts`）把 Round loop 作为 OXN 强制机制：`maxIterations=3` 硬限（`IAP_ALIGN_ROUND_MAX_EXCEEDED`）+ `next-round` 需显式 CLI 触发 + `roundHistory` 由 OXN 维护。

但盘问中发现 Round loop 经历了三阶段演变：

| 阶段 | Round loop 定位 | OXN 角色 |
|---|---|---|
| 原始设计 | OXN 层面硬周期（Asset-Work-Insight-Asset） | OXN 控制循环 |
| 中期 | Work 内 Round（IAP 阶段内） | OXN 强制 maxIterations=3 |
| **本 ADR** | AI Agent 自己决定是否调整 Task/Work | OXN 只记录，不强制 |

**关键论断**（Term #13 结晶）：搜索是 AI Agent 自有能力（其会一直执行，直到认为目标完成），OXN 是搜索的参照物记录。Round loop 不是 OXN 的搜索机制，是 AI 的搜索行为被 OXN 记录。

**与现有 ADR 的一致性**：本修订与 ADR-0012（审计链哲学：事后记录不预防限制）+ ADR-0068（Daemon 记录不阻断）是同一设计哲学的延续——OXN 记录并提供反馈，比强制遵守更重要。

## Decision

### D1: Round loop 是 AI 的搜索行为，OXN 记录不控制

Round loop 的搜索主体是 AI Agent，不是 OXN。AI 自己决定何时调整 Task/Work 来完成目标，OXN 全程记录做追溯。

| 维度 | 原设计（被修订） | 本 ADR |
|---|---|---|
| 搜索主体 | OXN（通过 Round 机制） | AI Agent |
| OXN 角色 | 控制循环（maxIterations 硬限） | 记录 + 提供反馈 |
| Round 触发 | OXN 强制（`next-round` CLI） | AI 决定（OXN 记录之） |
| 终止判据 | maxIterations 硬限 + verdict PASSED | AI 认为目标完成（OXN 记录 verdict 事实） |

### D2: maxIterations 从硬限改为 Blueprint 配置 + 软反馈

maxIterations 不再由 OXN 全局硬限（`IAP_ALIGN_ROUND_MAX_EXCEEDED`），改为：

| 层级 | 机制 | 行为 |
|---|---|---|
| Blueprint 配置 | `loopPolicy.maxIterations`（工程师定义） | 工程师为每类 Work 设定建议上限 |
| AI Agent 遵守 | AI 自行决定是否遵守 | OXN 不强制阻断 |
| OXN 记录 | `roundHistory` 全程记录 | 包括是否超限、超限多少 |
| OXN 反馈 | 超限时写反馈信号到 trace + state | 不阻断，标记为 LLM 推理异常信号 |

**超限的语义重新定义**：AI Agent 超过 maxIterations 仍 loop，说明发生"漂移、幻觉、自我满足"等 LLM 推理异常情况——这本身就是一种反馈信号，对工程师决策边界情况有价值。OXN 记录这个信号比强制阻断更重要。

### D3: Term #7 "元搜索"论断修订

ADR-0072 Term #7 原论断："Round loop = 元搜索（对解参照版本的搜索）"。

**修订为**：Round loop = AI 搜索行为的外化记录，不是 OXN 的搜索。Task DAG = AI 搜索计划的外化记录，不是 OXN 的搜索图。

R&N 搜索策略（BFS/DFS/A*/local search 等）假定 agent 自主搜索。OXN 不搜索——它提供 `h(n)` 参照原料（Asset/Blueprint/Probe catalog）让 AI 的 informed search 有稳定启发锚点。Uninformed search（AI 裸读代码）OXN 不介入。

### D4: 四判据验证

| 判据 | 本修订 | 通过？ |
|---|---|---|
| 1. 补偿方向 | OXN 记录搜索（补偿非确定性的可观测），不做搜索（agent 能力） | ✅ |
| 2. agent 级别 | 不进 type 4（OXN 不评价搜索好坏） | ✅ |
| 3. floor/ceiling | OXN 提供记录 floor，AI 搜索是 ceiling 不限 | ✅ |
| 4. 路径判据 | OXN 不评价路径，只记录路径事实 | ✅ |

四判据全过。

### D5: 与审计链哲学的一致性

本修订与现有 ADR 的设计哲学一致：

| ADR | 原则 | 本 ADR 延续 |
|---|---|---|
| ADR-0012 | 审计链：事后记录不预防限制 | Round loop 记录不强制 |
| ADR-0068 | Daemon：记录不阻断 | maxIterations 超限不阻断，记反馈 |
| ADR-0066/0067 | 彻底不判 | OXN 不评价搜索好坏，只记录事实 |

OXN 的核心价值是**忠实记录 + Probe 验证**——记录并提供反馈比强制遵守更重要。

## Consequences

### 正面

- **与审计链哲学一致**：Round loop 从"强制机制"回归"记录机制"，和 ADR-0012/0068/0066/0067 形成统一设计哲学。
- **AI 搜索能力不被 OXN 限制**：AI 可根据目标复杂度自主决定 Round 次数，OXN 只记录。这是 floor/ceiling 判据的实例。
- **超限成为有价值的反馈信号**：AI 超限 loop 说明 LLM 推理异常，这对工程师决策边界情况有价值（可能需要调整 Asset/Blueprint）。
- **Blueprint 配置灵活性**：工程师可为不同类型 Work 设定不同 maxIterations（探索类高、修复类低）。

### 负面 / 风险

- **AI 可能无限 loop**：无硬限时 AI 可能陷入死循环。靠 Blueprint maxIterations 软建议 + OXN 反馈信号 + 工程师介入来缓解。
- **`IAP_ALIGN_ROUND_MAX_EXCEEDED` 错误码废弃**：现有代码（`dual-state-exec.ts`）的硬限逻辑需修改为软反馈。这是 breaking change。
- **`roundHistory` 语义变化**：从"OXN 控制的 Round 记录"变为"AI 搜索行为的观测记录"。下游消费方（Insight）需适应。
- **Work 状态机调整**：`next-round` CLI 仍存在但语义从"强制触发"变为"记录 AI 的 Round 决定"。

### 衍生

- **CONTEXT-MAP 对照表**：Term #13 新增 + Term #7 修订标注（历史 2026-07-27 落地；v0.7+ RFC-0028 §D2 内容已回迁 oxn-work-domain.md §WorkAsSolutionReference + §Round）
<!-- allow-version -->
- **代码修改待办**（v0.7+）：
<!-- /allow-version -->
  - `dual-state-exec.ts`：`maxIterations` 硬限改软反馈
  - `IAP_ALIGN_ROUND_MAX_EXCEEDED` 错误码：降级为 warning 或废弃
  - `roundHistory`：保留全程记录，增加"超限"标记字段
  - Blueprint schema：`loopPolicy.maxIterations` 字段标准化
<!-- allow-version -->
- **`work.md` 文档更新**：§3 Round loop 描述修订（v0.7+）
<!-- /allow-version -->
- **Insight 消费**：超限信号作为 Insight 的统计原料（ADR-0074 原料提供者定位的实例）

## Alternatives Considered

- **维持 maxIterations 硬限**：否决。与审计链哲学（ADR-0012/0068）冲突——OXN 不该强制阻断 AI 行为，只该记录。且硬限限制了 AI 处理复杂目标的能力（ceiling 被限）。
- **完全删除 maxIterations**：否决。工程师需要为 AI 设定建议边界（Blueprint 配置），AI 也需要参照点。完全删除失去 floor 参照。
- **maxIterations 全局配置**：否决。不同类型 Work 需要不同上限（探索类高、修复类低），应 per-Blueprint 配置。
- **OXN 主动终止超限 Work**：否决。违反 ADR-0068（Daemon 不阻断）+ 彻底不判原则。OXN 记录并提供反馈，工程师决定是否终止。

## References

- [ADR-0072 OXN 参照系定位](./0072-oxn-as-referent-for-nondeterministic-agent.md) — Term #7 元搜索论断（本 ADR 修订）
- [ADR-0073 OXN 实现边界判据](./0073-oxn-implementation-boundary-criteria.md) — 四判据验证
- [ADR-0012 Main/Sub Agent 审计链](./0012-main-sub-agent-audit-chain.md) — 事后记录不预防限制（本 ADR 延续）
- [ADR-0068 Daemon 职责边界](./0068-daemon-responsibility-boundary.md) — 记录不阻断（本 ADR 延续）
- [ADR-0066 术语精简](./0066-terminology-simplification.md) — 彻底不判
- [ADR-0074 Insight 原料非推理](./0074-insight-ingredient-not-reasoner.md) — 超限信号作为 Insight 原料
- [RFC-0028 CONTEXT-MAP 退役](../rfc/zh-cn/RFC-0028-context-map-deprecation.md) — v0.7+ 对照表内容已回迁各 Domain 文件
- [AGENTS.md](../../../../AGENTS.md) — 唯一 Meta 层入口
<!-- allow-version -->
- [Work 概念文档](../../../docs/product/zh-cn/concepts/work.md) — §3 Round loop（待 v0.7+ 修订）
<!-- /allow-version -->
- Russell & Norvig, *Artificial Intelligence: A Modern Approach* — 搜索策略原义
