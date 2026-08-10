# Probe 系数与 Slot 成本 Grilling 记录

> **日期**：2026-08-01
> **参与者**：工程师 + AI Agent
> **目标**：检查 OpenXenon 能否为 Probe 引入"系数"作为验证权重 + 为 Blueprint slot 引入"成本"作为实现成本，并设计实现路径
> **状态**：archived（Grilling 收束，决议已达成）
> **关联**：RFC-0013-versioning-policy / oxn-proof-domain / oxn-asset-domain / ADR-0066/0067（彻底不判）/ Term #23（概率边界 deferred）/ trust-baseline.ts

---

## 1. 会话起点

工程师提出的问题：
1. Probe 能否引入"系数"作为验证权重？比如默认 fs-exist 是 1（因为其确定性与稳定性很明确），而如果通过其包装的则是 [0,1] 之间
2. Blueprint slot 能否增加"cost"作为实现成本？越高表示越可能难以验证或复杂性高，低则说明确定性很高

通过 `/grilling` session（domain-modeling 技能）盘查，发现：
- **Probe 系数**：架构上**完全不存在**（ProbeOutcome 是严格 3 态布尔值，聚合是纯计数，无任何 weight/coefficient/confidence/score）
- **Slot 成本**：架构上**完全不存在**（SlotSlimSchema 只有 name/deps/observe，纯拓扑结构）
- **两个提议都触及宪法性约束**：ADR-0066/0067（彻底不判）+ Term #23（概率边界 deferred）+ trust-baseline.ts（拒绝阈值调参）

### 1.1 覆盖矩阵（盘查起点）

| 维度 | 现状 | 证据 |
|---|---|---|
| Probe 权重/系数/置信度 | 无 | `probe-port.ts:21-38`（3 态布尔值）；`proof-frozen-writer.ts:45-79`（纯计数聚合） |
| Slot 成本/难度/复杂度 | 无 | `per-work-blueprints-merger.ts:28-32`（SlotSlimSchema = name/deps/observe） |
| Probe 封装/组合 | 无 | 所有 19 个 probe 全是原子；无 ProbeInvocation 嵌套 |
| 描述性 vs 判决性元数据 | 已有先例 | `interferenceFlags` 记录但不作判定；`overallPassRate` 事后统计（ADR-0074 原料提供者） |
| probe-stats.json 基础设施 | 已有 | `.openxenon/.cache/probe-stats.json`（probe-stats-schema.ts:55-62） |
| Roadmap suggest 排序因子 | 已有 jaccard | `suggest.ts:36-69`（0.6 name + 0.4 desc jaccard） |

---

## 2. 五轮 Grilling 演进

### 第 1 轮：提议语义锐化

**关键反问 1**："系数"有三种可能解读，区别巨大：
- **A. 判决权重**（聚合 = 加权和）→ 违反 ADR-0066/0067
- **B. 结果置信度**（probe 返回 [0,1]）→ = Term #23 推迟的概率边界
- **C. 描述性元数据**（存 frozen.json，不改变判定）→ 与 `interferenceFlags` 同构

**关键反问 2**："cost" 混了两个正交维度：
- **验证难度**（难证明正确）vs **实现复杂度**（难构建）
- 例：复杂算法易验证，简单 UI 微调难验证 → 这两个是 ORTHOGONAL 的

**关键反问 3**：场景压力测试
- 场景 1：diagnose (fs-exists 系数 1) 失败 + verify (test-pass 系数 1) 通过 → 加权后仍 DEVIATED → 系数对判定无影响
- 场景 2：[0,1] 探针返回 0.7 → 谁设阈值？= 阈值调参哲学（trust-baseline.ts:5 拒绝）
- 场景 3：slot.cost = high → OXN 当前不基于 cost 路由/warn/排序 → cost 是空标签

### 第 2 轮：组合方式（嵌套 vs Slot 级）

工程师澄清：Probe 内部可调用其他 Probe 作为自身验证方式（如 content-check 调用 fs-exists），但 slot/task 级组合"更灵活"，选择多 Probe 组合系数也高。

**收敛**：放弃 Probe 嵌套（路径 A，greenfield 架构层），改用 slot/task 级 Probe 组合（路径 B，复用现有 `slot.observe` 结构）。

```
coef(原子 Probe)        = 1
coef(Slot)             = |slot.observe|  (= probe 数量)
coef(Task)             = Σ probes in task
coef(Work)             = Σ task coefs
Work 通过率             = passedCount / totalCount  (= overallPassRate 已存在)
Task 通过率             = passedInTask / totalInTask
质量信号                = Task 通过率 vs Work 通过率 差
```

### 第 3 轮：confidence × coef 正交拆解

工程师追问：confidence 和 coef 是否可以组合？

**关键反问**：如果 coef 全=1，confidence 已是唯一权重；coef 退化为计数，与 confidence 重复。只有两种用途分工才有意义：

| 维度 | 语义 | 用途 |
|---|---|---|
| **confidence** | per-probe 事后通过率 `passCount/totalCount` | 加权通过率（统计输出） |
| **coef** | Probe 计数 | target 量级（声明输入） |

工程师接受此分工。两者正交，confidence 在统计层，coef 在声明层。

### 第 4 轮：confidence 语义二选一

工程师问："confidence 是指验证确定性（Probe 固有属性 [0,1]），还是指被使用的质量标准（统计来的 [0,1]）？"

| 解读 | 来源 | 一致性 |
|---|---|---|
| A. 固有确定性（系统硬编码 fs-exists=1.0, fuzzy=0.5） | ProbeCatalogEntry | 违背 trust-baseline.ts:5 拒绝阈值调参哲学 |
| **B. 事后统计（Proof 历史聚合）** | probe-stats.json | 与 ADR-0074（原料提供者）一致 + Term #23 边界（不引入概率模型） |

**收敛**：B。confidence = per-probe 事后通过率 = `passCount / totalCount`。已有数据（probe-stats-schema.ts:30-33）的派生计算，只需在 ProbeStatsView 加 `confidenceRate` 字段。

### 第 5 轮：执行方式 + ADR 必要性

工程师决策：
- 先写 Draft（本文件），不直接执行代码
- ADR 也先写 Draft 决策，不直接落 ADR

**逻辑**：grilling session 的产出应先沉淀为 Draft，通过 promote workflow 提升为 ADR/代码。Draft = 流动层（可编辑/删除），ADR = 规定性（frozen + errata 演进）。

---

## 3. 最终决议清单

### 3.1 术语决议（5 个新术语）

| # | 决议 |
|---|---|
| T1 | **coef (通过系数)** = Probe 计数。Task/Work 级累加。纯 count-based，衍生计算，无需新字段 |
| T2 | **confidence (置信度)** = per-probe 事后通过率 = `passCount / totalCount`。存 probe-stats.json（已存在） |
| T3 | **target (目标通过率)** = Blueprint 预设 ∈ [0,1]。仅描述性，不改变 3 态判定。存 Blueprint frontmatter + frozen.json |
| T4 | **cost (实现成本)** = per-slot ∈ [0,∞)，汇总到 Blueprint 级。Blueprint boundary + Roadmap 表格列。排序因子 |
| T5 | **质量信号** = Task 通过率 vs Work 通过率差。纯计算，Report 展示 |

### 3.2 架构约束确认（4 条重申）

| # | 决议 |
|---|---|
| A1 | **不改变 3 态判定**（COMPLETED/DEVIATED/INCONCLUSIVE 不变）—— 重申 ADR-0066/0067 彻底不判 |
| A2 | **confidence 是事后统计，非概率模型** —— 不引入贝叶斯/阈值（Term #23 仍 deferred） |
| A3 | **probe-stats.json 是 confidence 的存储载体** —— 已 gitignore（.cache/），可重建，不进 frozen.json（不可变 chmod 0o444） |
| A4 | **cost 是工程师声明，非 OXN 判定** —— OXN 不计算成本，只读工程师声明并排序 |

### 3.3 落地路径决议（3 条）

| # | 决议 |
|---|---|
| P1 | 4 块独立 Work（每块一个 `dev-workflow` Blueprint），分块执行 |
| P2 | 先写 Draft（本文件）+ ADR 草稿，再写代码 |
| P3 | frozen.json 扩展 `taskName` 字段向后兼容（旧文件 undefined），不是真正破坏性变更 |

---

## 4. 术语定义（待写入 Domain .md）

### 4.1 OxnProofDomain 新增 4 术语

#### 通过系数 (Pass Coefficient, coef)

**定义**：Probe 在 Task/Work 中的计数权重。每个 Probe coef = 1（默认），Task coef = slot.observe 长度，Work coef = Σ task coefs。

**计算**：纯衍生计算，无持久化字段。

**一致性**：与 `totalCount`（FrozenProofSchema）等价，不引入新维度。

#### 置信度 (Confidence)

**定义**：per-probe 事后通过率 = `passCount / totalCount`。来自 Proof 历史聚合，反映 Probe 在历史使用中的可靠性。

**存储**：`.openxenon/.cache/probe-stats.json`（probe-stats-schema.ts）。已 gitignore，可重建。

**更新机制**：每次 Proof run 后增量更新（`updateProbeStats`）；Proof 删除/更新时 recompute（需新增 `recomputeProbeStats`）。

**消费**：Insight 层 `buildProbeStatsView` 加 `confidenceRate` 字段（insight-schema.ts:60-66）。

_Avoid_：确定性（determinism）、先验概率（prior probability）、阈值（threshold）

#### 目标通过率 (Target Pass Rate)

**定义**：Blueprint 预设的通过率指标 ∈ [0,1]。声明性期望，非执行门控。

**存储**：Blueprint frontmatter (`target: 0.8`) + frozen.json (`target?: number`)。

**作用**：frozen.json 记录 `target` vs `achieved`，Report 展示差距。**不改变 3 态判定**。

_Avoid_：阈值（threshold）、门控（gate）、质量标准（quality bar）

#### 质量信号 (Quality Signal)

**定义**：Task 通过率与 Work 通过率的差。反映 Task 相对 Work 的质量好坏。

**计算**：`qualitySignal = taskPassRate - workPassRate`。正数 = Task 优于 Work 平均；负数 = Task 低于 Work 平均。

**存储**：Report 层计算，不持久化。

**依赖**：frozen.json probe result 需有 `taskName` 字段（向后兼容扩展）。

### 4.2 OxnAssetDomain 新增 1 术语

#### 实现成本 (Implementation Cost)

**定义**：per-slot 工程师声明的实现复杂度 ∈ [0,∞)。Blueprint cost = Σ slot costs。

**存储**：Blueprint boundary (`- cost: 3` in .md) + Blueprint frontmatter（汇总）+ Roadmap 表格列（synced from Blueprint）。

**作用**：`oxn roadmap suggest` 排序因子（低 cost 优先）；Blueprint 选择时的参考。

_Avoid_：工作时长（work hours）、人天（person-days）、故事点（story points）—— cost 是相对值，非绝对估算

---

## 5. 设计方案

### 5.1 架构影响图

```
L0-Schema:
  ├─ insight-schema.ts:60-66    → ProbeTypeStatsViewSchema + confidenceRate
  ├─ probe-stats-schema.ts       → schemaVersion 1→2 (recompute 支持)
  ├─ proof-schema.ts:35-47       → FrozenProofProbeResultSchema + taskName (optional)
  └─ proof-schema.ts:58-68       → FrozenProofSchema + target

L0-Contract (OXL):
  ├─ blueprint.ts:48-56          → BlueprintIR + target
  ├─ blueprint.ts:41-46          → BlueprintBoundary + cost
  ├─ blueprint.ts:151-152        → extractBlueprintIR 读 frontmatter.target
  └─ blueprint.ts:215-249        → extractBoundary 读 - cost: N

L1-Infra:
  └─ probe-stats-store.ts        → recompute 路径（从 proofs/ 重新扫描）

L2-Processor:
  ├─ insight-compute.ts:67       → buildProbeStatsView 计算 confidenceRate
  ├─ probe-stats-updater.ts      → 新增 recomputeProbeStats(proofsDir)
  └─ proof-frozen-writer.ts      → 读 Blueprint.target 写入 frozen

L2-Work:
  ├─ per-work-blueprints-merger.ts:28-32  → SlotSlimSchema + cost
  └─ per-work-blueprints-merger.ts:237-397 → parseBlueprintSlim 提取 cost

L2-Roadmap:
  ├─ types.ts:19-23              → RoadmapLink + cost
  ├─ parser.ts:181-229           → parseLinksTable 读 cost 列
  └─ suggest.ts:36-69            → 排序公式加 cost 因子

L2-Proof:
  ├─ runner.ts:63-122            → executeProbe 传入 taskName
  └─ outcome-writer.ts           → 展示 target vs achieved + Task vs Work 通过率

L3-CLI:
  ├─ blueprint-renderer.ts       → 展示 cost / target
  └─ roadmap.ts                  → oxn roadmap sync 同步 cost
```

### 5.2 通过率计算层次

```
Probe 粒度:
  passedCount / totalCount = confidenceRate (per probe type)

Task 粒度:
  taskPassed / taskTotal = taskPassRate
  taskCoef = taskTotal (= Σ probes in task)

Work 粒度:
  workPassed / workTotal = workPassRate (= overallPassRate 已存在)
  workCoef = workTotal (= Σ task coefs)

质量信号:
  taskPassRate - workPassRate = qualitySignal

Blueprint target:
  target vs workPassRate 差距 (描述性, 不改变 3 态判定)
```

### 5.3 confidence 更新流程

```
Proof run (新建)
  └→ updateProbeStats(frozen)   # 已有, 增量更新

Proof 删除 / 更新
  └→ recomputeProbeStats(proofs/)  # 新增, 从 proofs/ 重新扫描

Insight 查询
  └→ buildProbeStatsView(stats)  # 加 confidenceRate = passCount/totalCount
```

---

## 6. 实现计划（4 块 Work）

### 块 1: confidence — 最小改动（先做）

**工作量**：3-4 文件，~150 行
**风险**：低（已有基础设施）
**Work 名**：`oxn work create probe-confidence --blueprint dev-workflow`

| 文件 | 改动 |
|---|---|
| `packages/engine/src/kernel/schemas/insight-schema.ts:60-66` | ProbeTypeStatsViewSchema + confidenceRate |
| `packages/engine/src/kernel/verdicts/insight-compute.ts:67` | buildProbeStatsView 计算 confidenceRate |
| `packages/engine/src/kernel/verdicts/probe-stats-updater.ts` | 新增 recomputeProbeStats |
| `packages/engine/src/kernel/schemas/probe-stats-schema.ts` | schemaVersion 1→2 |
| `packages/engine/src/Insight/insight-manager.ts:63-65` | 展示 per-type confidenceRate |
| 测试 | insight-compute.test.ts 加 confidenceRate 测试 |

### 块 2: cost — Blueprint + Roadmap（中等改动）

**工作量**：8-9 文件，~300 行
**风险**：中（多文件联动，Roadmap 同步机制）
**Work 名**：`oxn work create slot-cost --blueprint dev-workflow`

| 文件 | 改动 |
|---|---|
| `packages/engine/src/oxl/md-pipeline/transformers/blueprint.ts:41-46` | BlueprintBoundary + cost |
| `packages/engine/src/oxl/md-pipeline/transformers/blueprint.ts:215-249` | extractBoundary 读 - cost: N |
| `packages/engine/src/Work/per-work-blueprints-merger.ts:28-32` | SlotSlimSchema + cost |
| `packages/engine/src/Work/per-work-blueprints-merger.ts:237-397` | parseBlueprintSlim 提取 cost |
| `packages/engine/src/Roadmap/types.ts:19-23` | RoadmapLink + cost |
| `packages/engine/src/Roadmap/parser.ts:181-229` | parseLinksTable 读 cost 列 |
| `packages/engine/src/Roadmap/suggest.ts:36-69` | 排序公式加 cost 因子 |
| `packages/cli/src/commands/roadmap.ts` | oxn roadmap sync 同步 cost |
| 测试 | cost 读写 + suggest 排序测试 |

### 块 3: target — frozen.json schema 扩展（中等改动）

**工作量**：6-7 文件，~200 行
**风险**：中（frozen.json schema 扩展需向后兼容）
**Work 名**：`oxn work create proof-target --blueprint dev-workflow`

| 文件 | 改动 |
|---|---|
| `packages/engine/src/oxl/md-pipeline/transformers/blueprint.ts:48-56` | BlueprintIR + target |
| `packages/engine/src/oxl/md-pipeline/transformers/blueprint.ts:151-152` | extractBlueprintIR 读 frontmatter.target |
| `packages/engine/src/kernel/schemas/proof-schema.ts:58-68` | FrozenProofSchema + target |
| `packages/engine/src/Proof/proof-frozen-writer.ts:45-79` | buildFrozenProof 读 Blueprint.target 写入 frozen |
| `packages/engine/src/Asset/blueprint-manager.ts:8-59` | 模板加 target: 0.8 示例 |
| `packages/engine/src/Proof/outcome-writer.ts` | 展示 target vs achieved 对比 |
| 测试 | target 读写测试 |

### 块 4: 质量信号 — frozen.json 扩展 taskName

**工作量**：5-6 文件，~250 行
**风险**：中（依赖块 1-3，frozen schema 再扩展）
**Work 名**：`oxn work create quality-signal --blueprint dev-workflow`

| 文件 | 改动 |
|---|---|
| `packages/engine/src/kernel/schemas/proof-schema.ts:35-47` | FrozenProofProbeResultSchema + taskName (optional, 向后兼容) |
| `packages/engine/src/Proof/runner.ts:63-122` | executeProbe 传入 taskName 写入 result |
| `packages/engine/src/Proof/proof-frozen-writer.ts` | 聚合时按 taskName 分组计算 per-task 通过率 |
| `packages/engine/src/Proof/outcome-writer.ts` | 展示 Task vs Work 通过率对比 |
| 测试 | taskName 读写 + 质量信号计算测试 |

---

## 7. ADR 预留（2 个，待 promote）

### ADR-NNNN: Probe 系数与置信度的描述性原则

**草案摘要**：
- 决定：coef / confidence / target / cost 均为描述性元数据，不改变 3 态判定（COMPLETED/DEVIATED/INCONCLUSIVE）
- 原因：重申 ADR-0066/0067 彻底不判；判定权归工程师
- 反例：曾考虑过 confidence 加权聚合 → 违反 ADR-0066/0067
- 反例：曾考虑过 target 强制执行（achieved < target → DEVIATED）→ 同上违反

**反向条件**：如果未来需要加权聚合判定（类型 B/C 概率边界），需要新 ADR 推翻本 ADR + ADR-0066/0067。

### ADR-NNNN: confidence 统计性质澄清（Term #23 边界）

**草案摘要**：
- 决定：confidence = per-probe 事后通过率（probe-stats.json 派生），非概率模型
- 原因：Term #23 明确推迟概率边界（"当前不做因工程师不具备这方面知识经验"）
- 边界：不引入贝叶斯先验/后验；不引入阈值；不做概率推理
- 后续：概率边界留待 v0.8+（Term #23 推迟决策）

---

## 8. 未来 Work 入口

### 8.1 4 块分块 Work（顺序执行）

```
oxn work create probe-confidence --blueprint dev-workflow   # 块 1
  └─ Intent: 实现 Probe confidence（per-probe 事后通过率）
  └─ Align:
      ├─ ProbeStatsViewSchema + confidenceRate
      ├─ buildProbeStatsView 计算 confidenceRate
      └─ 新增 recomputeProbeStats (Proof 删除/更新)
  └─ Proof:
      ├─ 单元测试：insight-compute.test.ts
      └─ 手动验证：跑 3+ 个 proof run 后查看 Insight 显示 confidenceRate

oxn work create slot-cost --blueprint dev-workflow         # 块 2
  └─ Intent: 为 Blueprint slot/boundary 增加 cost 字段 + Roadmap 同步
  └─ Align: ...（见 §6 块 2）
  └─ Proof:
      ├─ 单元测试：cost 读写 + suggest 排序
      └─ E2E：oxn roadmap sync 后 cost 列正确

oxn work create proof-target --blueprint dev-workflow      # 块 3
  └─ Intent: Blueprint target 通过率预设，frozen.json 记录
  └─ Align: ...（见 §6 块 3）
  └─ Proof: ...

oxn work create quality-signal --blueprint dev-workflow    # 块 4
  └─ Intent: frozen.json 扩展 taskName + 质量信号 Report
  └─ Align: ...（见 §6 块 4）
  └─ Proof: ...
```

### 8.2 文档同步

```
oxn work create rfc-probe-coef-slot-cost --blueprint doc-rfc-workflow
  └─ Intent: 把本 Draft 提升为 RFC（acceptance 后 frozen + errata 演进）
  └─ Align:
      ├─ 本 Draft 内容 → docs/rfc/zh-cn/RFC-0014-probe-coef-slot-cost.md
      ├─ ADR-NNNN 1 + 2 → docs/adrs/
      └─ 5 术语写入 oxn-proof-domain.md + oxn-asset-domain.md
  └─ Proof:
      ├─ 边界检查：bun scripts/check-doc-boundary.ts 通过
      └─ 链接检查：RFC → glossary + ADR，无 docs/{product,dev} 反向引用
```

---

## 9. 关键洞察沉淀

### 9.1 "描述性元数据" 是 OXN 的统一设计模式

OXN 通过"记录但不判定"实现彻底不判（ADR-0066/0067）：
- `interferenceFlags` — 记录但不作判定
- `overallPassRate` — 事后统计
- `consecutiveFails` — 触发模式信号

新 5 术语都遵循此模式：**OXN 存，工程师/Insight 读**。

### 9.2 confidence 是已有数据派生，不是新计算

`probe-stats.json` 已有 `passCount`/`totalCount`（probe-stats-schema.ts:30-33）。confidence = `passCount/totalCount` 是已有数据的派生计算，**只需在 ProbeStatsView 加一个字段**。这是"用现有数据回答新问题"的优雅设计。

### 9.3 路径 B（slot 级组合）远比路径 A（Probe 嵌套）优雅

工程师最初设想 Probe 内部嵌套其他 Probe（路径 A），grilling 后收敛到 slot/task 级组合（路径 B）：
- 路径 A 需要新架构层（ProbeInvocation 嵌套 + L1 handler 递归执行 + L0 verdict 聚合）
- 路径 B 复用现有 `slot.observe` 结构，coef = count 衍生

**原则**：新机制最小化，复用现有结构。

### 9.4 Roadmap 排序因子应是工程师声明，非 OXN 计算

`suggest.ts:36-69` 当前用 jaccard 相似度（0.6 name + 0.4 desc）。cost 进排序时**不是让 OXN 计算成本**，而是读工程师在 Blueprint 中声明的 cost。这与 OXN 是"参照系"定位一致——OXN 不计算，只存储和呈现。

### 9.5 frozen.json 扩展向后兼容 = 不破坏

`FrozenProofProbeResultSchema` 加 `taskName?: string`（optional）。旧 frozen.json 读出来 `taskName = undefined`，Report 层处理 undefined 即可。这是真正的"向后兼容扩展"，不是破坏性变更（无需 schema version bump）。

---

## 10. 引用

- ADR-0066 / ADR-0067（彻底不判立法）
- Term #23（概率边界 deferred，CONTEXT-MAP.md:140）
- trust-baseline.ts:5-8（拒绝阈值调参哲学）
- interferenceFlags / overallPassRate / consecutiveFails（描述性元数据先例）
- ADR-0074（Insight 推理主体是 AI，OXN 是原料提供者）
- probe-stats-schema.ts（confidence 存储基础设施）
- insight-schema.ts:60-66（confidenceRate 待加位置）
- proof-schema.ts:35-47, 58-68（frozen.json 待扩展位置）
- blueprint.ts:41-46, 48-56, 151-152, 215-249（Blueprint OXL 待扩展位置）
- per-work-blueprints-merger.ts:28-32, 237-397（slot slim 待扩展位置）
- suggest.ts:36-69（Roadmap 排序待扩展位置）
- CONTEXT-MAP.md（OxnProofDomain + OxnAssetDomain 术语归属）

## 11. 决策链（一句话串联）

```
Q1（Probe 系数语义？）→ C 描述性元数据（与 interferenceFlags 同构）
Q2（系数组合方式？）→ slot/task 级，复用 observe 结构（路径 B）
Q3（confidence vs coef？）→ 正交：confidence 统计层，coef 声明层
Q4（confidence 语义？）→ B 事后统计（probe-stats.json 派生，非概率模型）
Q5（cost 粒度？）→ per-slot 汇总到 Blueprint
Q6（cost 进排序？）→ 是，从 Blueprint 同步到 Roadmap 表格列
Q7（frozen.json 扩展？）→ taskName optional 向后兼容
Q8（执行方式？）→ 4 块 Work 分块 + 先写 Draft（本文件）+ ADR 草稿
```

<!-- 已迁移：v0.7 CONTEXT-MAP.md 退役，详见 RFC-0028。文件中 CONTEXT-MAP 原文引用保留作为历史考古链，失效链接请用 git blame 追溯或参考对应 Domain / RFC。-->
