---
entity: adr
version: 1.0.0
status: Accepted
date: 2026-07-23
supersedes: null
superseded-by: null
related:
  - .openxenon/CONTEXT-MAP.md
  - .openxenon/assets/domains/oxn-domain.md
  - .openxenon/drafts/rfc/0066-terminology-simplification.md
  - .openxenon/drafts/rfc/0067-no-judgment-principle.md
  - .openxenon/drafts/rfc/0057-trust-chain-core-model.md
---

# ADR-0072: OXN = 非确定性智能体的确定性参照系

> **状态**：✅ Accepted
> **日期**：2026-07-23
> **来源**：2026-07-23 grilling session（domain-modeling + grill-with-docs skill）
> **影响层**：产品定位 + 术语架构 + PEAS 映射修订

## Context

**触发问题**：`CONTEXT-MAP.md` 自 2026-07-21 grilling session 起用 PEAS 框架描述 OpenXenon 的三方协作（Asset=E / Work=A / Proof=S / Report=外部呈现）。但该映射从未经过 Russell & Norvig《人工智能：一种现代方法》原义的严格盘问。本次 grilling session 用 R&N 七个核心术语（智能体结构 / 世界模型 / 感知器 / 执行器 / 动作 / 解 / 图）逐一对照 OXN 既有词汇，发现 PEAS 映射存在三处错误，且 OXN 相对 R&N 的根本定位此前未被命名。

**R&N 的核心假设**（与 OXN 现实的冲突）：

1. R&N 假定**单一理性智能体**，拥有并信任自己的器官（世界模型/传感器/执行器）。OXN 是**三方协作**（工程师 / AI Agent / OXN Engine），且 LLM Agent 的器官基于注意力机制——**非确定性**：上下文漂移 + 指令解释变异。
2. R&N 假定 agent 自带**性能度量**并最大化之。OXN 由 ADR-0066/0067 立法"彻底不判"，P 被故意外包给工程师。
3. R&N 假定 agent **自更新世界模型**、**自主搜索状态空间**。OXN 里 Asset 对 AI 不可改、Round 手动触发有界。

**盘问的关键转折**：早期假设"OXN 为 AI Agent 外化器官"——被否决。正确论断是"**参照**"而非"外化"：LLM Agent 本来就有这三个器官（世界模型=上下文窗口、传感器=工具 I/O、性能度量=指令解释），只是非确定。OXN 不替 agent 长器官，而是为 agent 本有但不可信的器官提供**确定性参照锚点**——agent 拿自己的非确定版本去对齐这个稳定参照。

## Decision

### D1: OXN Engine 不是智能体，是非确定性智能体的确定性参照系

OXN Engine 是确定性程序，不是 R&N 意义上的智能体（无性能度量、无动作选择、无自主搜索）。LLM Agent（OpenCode/Codex 等）才是智能体。OXN 的角色：为 LLM Agent 三个本有但非确定的器官，各提供稳定参照锚点。

| agent 器官 | agent 自有版本（非确定） | OXN 参照版本（确定） |
|---|---|---|
| 世界模型 | LLM 上下文（漂移衰减） | Asset |
| 传感器 | AI 工具 I/O（变异） | Probe |
| 执行器 | AI 工具调用（变异） | OXN writer（frozen/verdict） |

参照版本与 agent 自有版本**性质相反**恰恰是对的设计——参照之所以是参照，正因为它不随 agent 的概率波动而变。R&N 没有给这种关系命名（R&N 假定 agent 自有自信任器官，不需要外部参照）。

### D2: R&N 七核心术语 ↔ OXN 对照表

| # | R&N 术语 | OXN 对应物 | 关键偏离 |
|---|---|---|---|
| 1 | 智能体结构 | AI Agent（非 OXN Engine） | OXN 是参照系非智能体；为 AI 三个非确定器官提供稳定锚点 |
| 2 | 世界模型 | Asset（只读参照，唯一） | 只有读侧有对应；写侧拆成三角色协议（AI 提案→OXN 记录→工程师升格），无单一更新函数 |
| 3 | 感知器 | AI 工具 I/O + Probe（双轨） | R&N 单一自有传感器→OXN 分裂两套；Probe 是 OXN 确定性传感器，AI 主动调用自证 |
| 4 | 执行器 | AI 工具调用 + OXN writer（双轨） | 对称分裂；Work 不是执行器，是 AI 调用 OXN 确定性通道的协议 |
| 5 | 动作 | OXN CLI 调用 + AI 工具调用（双轨） | 原子性锚在 CLI 边界；Task 是解的原子动作，CLI 是记录的原子动作；OXN 无动作选择函数 |
| 6 | 解 | Work（解的目标参照） | AI 把上下文按 Blueprint 写成 Work 作解参照；OXN 不做业务 goal-test，Work 自带结构性完成参照 |
| 7 | 图 | Task DAG + Blueprint slot DAG | Task DAG = 状态探索图参照（AI 编排），slot DAG = 静态模板源（工程师沉淀）；Round = 元搜索非对象搜索 |

### D3: PEAS 映射三处错误，整体重写

现有 `CONTEXT-MAP.md` PEAS 块的判决：

| PEAS | 现有映射 | 判决 | 修正 |
|---|---|---|---|
| E (Environment) | Asset | ✅ 对 | 保留 |
| A (Actuator) | Work | ❌ 错 | Work 是通道非执行器；真正执行器分裂（AI 工具调用 + OXN writer） |
| S (Sensor) | Proof | ❌ 错 | Proof 是产物非传感器；真正传感器分裂（AI 工具 I/O + Probe） |
| P (Performance) | （缺失） | ⚠️ 缺失即设计 | 显式标注：ADR-0066/0067 彻底不判，P 外包给工程师 |

PEAS 块需**整体重写**而非微调——E 对、A/S 双错、P 故意缺。本次同步修订 `CONTEXT-MAP.md`。

### D4: R&N 四个"agent 自有"动作在 OXN 里被拆成三角色协议

R&N 假定单一 agent 独占四个动作；OXN 把每个都拆成"AI 非确定执行 + OXN 确定记录 + 工程师确定性决策"三角：

| R&N 动作 | R&N 归属 | OXN 拆法 |
|---|---|---|
| 更新世界模型 | agent 自更新 | AI 提案（Task+Probe）→ OXN 记录（Proof）→ 工程师升格（IAP） |
| 选择动作 | agent 自选 `f: percept* → action` | 调用方选（AI 或工程师），OXN 被动响应 |
| goal-test | agent 自带 | 结构性（Work 自带，AI 自检）+ 业务性（工程师） |
| 搜索状态空间 | agent 自主搜索 | AI 黑箱搜索 + Task DAG 外化参照 + Round 有界监督 |

### D5: 新增术语 Referent

在 `oxn-domain.md` 新增 `Referent` 术语，作为 OXN 统一设计模式的命名：**为非确定性智能体的器官提供确定性参照锚点**。该模式贯穿 Asset/Probe/writer/CLI 调用/Work/Task DAG 六个实体。

## Consequences

### 正面

- **产品定位被命名**：OXN 相对 R&N 的根本创新（参照系）此前无名，现固化为 `Referent`。后续讨论"OXN 是不是 X"有判据——问"X 是不是为非确定器官提供确定参照"。
- **PEAS 三处错被显式修正**：避免后续基于错误映射推导设计决策。
- **R&N 术语对照表成立**：未来引入 AI 理论概念时（如环境类型、rationality、utility），有对照基准，不必重新盘问基础。
- **"参照不是外化"被记录**：防止"OXN 替 agent 长器官"的误解复发——器官归 agent 自有，OXN 只提供参照锚点。

### 负面 / 风险

- **对照表是快照**：R&N 术语映射会随 OXN 演进（如 v0.7+ Insight 涌现推理可能改变"搜索"的映射）。需在对照表标注版本。
- **PEAS 重写影响外部引用**：`CONTEXT-MAP.md` 被多处引用（7 个 Domain SSOT、glossary、docs/product）。重写后需检查下游引用是否依赖旧的"A=Work/S=Proof"表述。
- **Referent 是新词**：增加术语学习成本。但它是统一模式的命名，不引入新实体，认知收益大于成本。

### 衍生

- **CONTEXT-MAP.md PEAS 块重写**（本次落地）
- **oxn-domain.md 新增 Referent 术语**（本次落地）
- **glossary/zh-cn/core-terms.md 同步**（本次落地，ADR-0070 同步约定）
- **后续 grilling**：R&N 的 environment types / rationality / utility / problem formulation 尚未盘问，待后续 session
- **OXP promote 候选**：本 ADR 可 promote 为 OXP-0004+（待排序）

## Alternatives Considered

- **维持现有 PEAS 映射不动**：否决。三处映射错（A/S 归属错、P 缺失未标注），基于错误映射推导设计决策有风险。
- **把 OXN 当退化智能体**（有传感器/执行器但无性能度量）：否决。OXN 无动作选择函数、无自主搜索、无自更新模型——把它塞进"退化智能体"会扭曲 R&N 定义，且误导"OXN 应该有 P"的方向。
- **"外化器官"框架**（OXN 替 agent 长器官）：否决。LLM Agent 本来就有器官，只是非确定。"外化"预设 agent 没有器官，与事实不符。"参照"更准——参照系必须稳定，所以不能让被参照者（AI）改它。
- **只修 PEAS 不命名 Referent**：否决。参照系是贯穿七个术语的统一模式，不命名会导致每次重新解释"为什么 Asset/Probe/writer 性质都和 R&N 原义相反"。

## Errata

### Errata v1.0.1（2026-07-31）— 确定性根基锐化

**修订范围**：D1 表格"OXN 参照版本（确定）"列 + 引用段落"参照版本与 agent 自有版本性质相反恰恰是对的设计"。

**修订动机**：2026-07-31 `/grilling` session 第三轮盘问暴露，原"OXN 确定性来自信息隐藏"的表述不准确。`Probe 标准 AI 不可见`（ADR-0076）是**软对抗机制**（提高针对性绕过成本），不是确定性根基。确定性真正根基是**执行代码不可变**（OXN 构建产物）——AI 即使知道 Probe 调用契约，也无法修改 Probe 执行代码。

**修订内容**：

| 修订前 | 修订后 |
|---|---|
| 参照版本"确定" = 信息隐藏 + 代码不可变（混合表述） | 参照版本"确定" = **执行代码不可变**（明确单一根基） |
| ADR-0076 「验证标准 AI 不可见」= 确定性来源 | ADR-0076 「验证标准 AI 不可见」= **软对抗**（非确定性根基） |
| Asset 暴露 Probe 调用契约 = 破坏确定性 | Asset 暴露 Probe 调用契约 = **不破坏确定性**（参数化改变观测行为不改变代码） |

**关联变更**：

- [.openxenon/assets/domains/oxn-proof-domain.md](../../../.openxenon/assets/domains/oxn-proof-domain.md) 新增 term「确定性根基」+ inv-24 `proof-code-immutability`
- [.openxenon/assets/domains/oxn-asset-domain.md](../../../.openxenon/assets/domains/oxn-asset-domain.md) 新增 inv-22 `asset-exposes-probe-contract-not-implementation`
- [ADR-0084](./0084-collaboration-boundary-layering.md) D5：slogan 与正定义（用"验证"替代"证据/证明"）

**兼容性**：

- 本 errata 不删除原 Decision 内容，仅追加 Errata 段。
- 引用本 ADR 的下游文档（CONTEXT-MAP、glossary）按 Errata 段口径更新，不强制重写原 Decision。
- 旧 `CONTEXT-MAP.md:PEAS` 映射不受影响（Errata 仅影响 D1 表的"OXN 参照版本"列）。

## References

- [CONTEXT-MAP.md](../../../../CONTEXT-MAP.md) — PEAS 块重写落地点
- [oxn-domain.md](../../../assets/domains/oxn-domain.md) — Referent 术语新增落地点
- [ADR-0066 术语精简](./0066-terminology-simplification.md) — "判定权归工程师"立法（P 外包的法源）
- [ADR-0067 彻底不判贯彻](./0067-no-judgment-principle.md) — 三态改名 + 彻底不判原则
- [ADR-0057 三方协作模型](./0057-trust-chain-core-model.md) — 三方拓扑（本 ADR 在其基础上锐化"OXN 不是 agent"）
- [ADR-0070 Glossary ↔ Domain 同步](./0070-glossary-domain-sync.md) — glossary 同步约定
- [ADR-0076 Probe 对抗机制](./0076-probe-anti-bypass-mechanism.md) — 验证标准 AI 不可见（软对抗，非确定性根基）
- [ADR-0084 协作边界分层模型](./0084-collaboration-boundary-layering.md) — 协作边界分层（与本 ADR 互引）
- [ADR-0085 OXN 环境 6 轴刻画](./0085-oxn-environment-characterization.md) — 部分可观察 + 通道内确定（与本 ADR 互证）
- Russell & Norvig, *Artificial Intelligence: A Modern Approach* — R&N 智能体理论原义来源
