# Context Map

> OpenXenon 是一个多 context 词汇架构：8 个 Domain .md 文件共同构成项目术语权威源。
> 本文件是入口索引；各 Domain 文件是各 context 的精确定义。
>
> **v0.7 新增**：OxnProjectDomain（项目工程元层）—— 定义文档三情态分离（Asset / RFC / Doc）、
> 内置 Asset 两层机制（`@oxn/` + `@prj/`）、自举种子豁免（src/builtin/）。

## Contexts

| Context | 文件 | 职责 |
|---|---|---|
| **OxnDomain** | [.openxenon/assets/domains/oxn-domain.md](./.openxenon/assets/domains/oxn-domain.md) | OpenXenon 顶层领域；产品词汇边界 |
| **OxnEngineDomain** | [.openxenon/assets/domains/oxn-engine-domain.md](./.openxenon/assets/domains/oxn-engine-domain.md) | OXN Engine 领域；L0-L3 分层、Kernel/Infra、错误契约 |
| **OxnAssetDomain** | [.openxenon/assets/domains/oxn-asset-domain.md](./.openxenon/assets/domains/oxn-asset-domain.md) | Asset 业务领域；5 类 AssetKind + 论文结构 |
| **OxnWorkDomain** | [.openxenon/assets/domains/oxn-work-domain.md](./.openxenon/assets/domains/oxn-work-domain.md) | Work 业务领域；IAP 三阶段 + Round + 证据链 |
| **OxnProofDomain** | [.openxenon/assets/domains/oxn-proof-domain.md](./.openxenon/assets/domains/oxn-proof-domain.md) | Proof 业务领域；Probe + Trace + 客观事实采集 |
| **OxnInsightDomain** | [.openxenon/assets/domains/oxn-insight-domain.md](./.openxenon/assets/domains/oxn-insight-domain.md) | Insight 业务领域；涌现层 + 跨 Work 模式 |
| **OxnCliDomain** | [.openxenon/assets/domains/oxn-cli-domain.md](./.openxenon/assets/domains/oxn-cli-domain.md) | OXN CLI 领域；命令 + i18n + Skill |
| **OxnProjectDomain** | [.openxenon/assets/domains/oxn-project-domain.md](./.openxenon/assets/domains/oxn-project-domain.md) | OXN 项目工程领域（v0.7+）；文档三情态 + 内置 Asset 两层 + 自举种子豁免 |

## Relationships

```
OxnDomain（root，无 references）
    │
    ▼ referenced by
OxnEngineDomain ──────────────┐
    │                          │
    ▼                          ▼
OxnAssetDomain         OxnCliDomain
    │                          │
    ▼                          │
OxnWorkDomain                   │
    │                          │
    ├─────► OxnProofDomain ────┘
    │
    ▼
OxnInsightDomain（reference 全部 6 个业务 context）

OxnProjectDomain（v0.7+，reference oxn-domain + oxn-engine-domain + oxn-asset-domain，
                单向补父域未说的元层词汇；不向下引用其他子域）
```

- **OxnDomain → 所有子 Domain**：单向引用，root 不被引用
- **OxnEngineDomain → OxnAssetDomain**：Engine 消费 Asset 边界
- **OxnAssetDomain → OxnCliDomain**：CLI 消费 Asset 类型
- **OxnWorkDomain → OxnAssetDomain + OxnProofDomain**：Work 编排 Asset + 产出 Proof
- **OxnInsightDomain → 全部 6 个 context**：Insight 涌现层跨 Work 推理，消费所有 context
- **OxnProjectDomain → oxn-domain/oxn-engine-domain/oxn-asset-domain**：项目工程元层，引用父域 + 资产相关子域；自身不被任何子域引用（避免环形依赖）

## 核心术语锐化（来自 2026-07-21 / 07-22 / 07-23 grilling session）

> 以下是 OpenXenon 产品定位的核心术语，每个都有明确语义边界。
> **2026-07-23 锐化**（ADR-0072）：OXN Engine **不是智能体**，是非确定性智能体（LLM Agent）的**确定性参照系**（Referent）——为 AI 三个本有但非确定的器官各提供稳定参照锚点。现有 PEAS 映射三处错（A/S 归属错、P 缺失未标注），本次整体重写。

### Referent（参照系 · OXN 统一设计模式 · ADR-0072）
- **定义**：为非确定性智能体（LLM Agent）的本有但非确定器官，提供确定性参照锚点。参照版本与 agent 自有版本性质相反恰恰是对的——参照之所以是参照，正因为它不随 agent 概率波动而变。R&N 没有给这种关系命名（R&N 假定 agent 自有自信任器官）。
- **六个参照锚点**：Asset 参照世界模型 / Probe 参照传感器 / OXN writer 参照执行器 / CLI 调用参照动作 / Work 参照解 / Task DAG 参照状态探索图
- **不是外化**：器官归 agent 自有，OXN 只提供参照锚点。参照系必须稳定，所以不能让被参照者（AI）改它。

### OpenXenon（产品定位）
- **形态**：协作工具
- **slogan**：OpenXenon 是工程师与 AI Agent 协作工具，为协作提供边界与证据
- **核心隐喻**：通道——AI Agent 通过 OXN CLI 走的部分才有证据；不走 = 通道外，工程师自负
- **三方协作模型**（2026-07-22 锐化）：
  - **工程师** = 发起方（Asset 管理 + 审查 Proof）；通过 `oxn` CLI 操作
  - **AI Agent** = 发起方（Work 内自主工作回路）；通过 OXN Skill 获得 CLI 能力（工程师部署 Skill 到 AI Agent 工作台）；**是 R&N 意义上的智能体**（有推理+感知+执行），但其器官基于注意力机制非确定
  - **OXN Engine** = 接收方（被动响应 CLI 请求，验证 ProbeOutcome + 记录 Proof）；**不是智能体**，是确定性参照系（Referent）
  - **CLI 能力完全对称**：同一套 `oxn` 命令，工程师与 AI Agent 都能调用；create Work 工程师可手动做，AI Agent 也可做

### Asset（环境约束 · 世界模型参照）
- **PEAS 角色**：E（Environment）✅ —— 工程师为 AI Agent 协作定义的边界环境
- **R&N 对照**（ADR-0072）：Asset 是**世界模型的确定性参照**——LLM 上下文是 AI 自有的世界模型（漂移衰减），Asset 是稳定的只读参照锚点。参照系只覆盖读侧；写侧拆成三角色协议（AI 提案→OXN 记录→工程师升格），无单一更新函数。
- **5 类 AssetKind**：Domain / Workflow / Stack / Blueprint / Roadmap
- **属性**：创建后强校验（planLock + content_hash），不被 Work 改写——参照系必须稳定
- **AI Agent 工作前提**：在 Asset 边界内自主工作

### Work（人机协作工作空间 · 解的目标参照 · 非执行器）
- **PEAS 角色**：~~A（Actuator）~~ ❌ **Work 不是执行器**（ADR-0072 修正）——Work 是 AI 调用 OXN 确定性通道的**协议/接口**。真正执行器分裂：AI 工具调用（非确定，改代码环境）+ OXN writer（确定，写 OXN 产物）
- **R&N 对照**（ADR-0072）：Work 是**解的目标参照**——AI 把理解的上下文按 Blueprint 写成 Work 作解参照，每个 Task = 解的原子动作。OXN 不做业务 goal-test（ADR-0066/0067），Work 自带结构性完成参照（所有 Task submitted = 结构完整，AI 可自检）
- **3 IAP 阶段**：Intent → Align → Proof
- **生命周期**：create → read Blueprint → write Context → orchestrate Tasks → execute → 汇报 → react → finalize
- **AI Agent 自主工作回路**（2026-07-22 锐化）：create → read Blueprint（理解 Domain/Workflow/Stack）→ write Context → orchestrate Tasks → execute Task → 汇报 → react（根据 ProbeOutcome 决定下一步）→ finalize

### Proof（OXN 验证 + 协作过程证明 · 非传感器）
- **PEAS 角色**：~~S（Sensor）~~ ❌ **Proof 不是传感器**（ADR-0072 修正）——Proof 是 OXN 的**客观产物**。真正传感器分裂：AI 工具 I/O（非确定，agent 自有）+ Probe（确定，OXN 自有，AI 主动调用自证）
- **R&N 对照**（ADR-0072）：Probe 是 OXN 的**确定性传感器参照**——AI 自有传感器（工具 I/O）非确定，OXN 提供 Probe catalog 供 AI 选择调用，验证标准 AI 不可见（信息隐藏，防针对性绕过）。AI 主动调用 OXN 的传感器来证明自己的确定性给工程师
- **核心语义**：证明协作**过程**，不是协作结果
- **OXN 的验证器角色**（2026-07-22 锐化）：OXN 验证 AI Agent 的执行结果（ProbeOutcome 三态：COMPLETED/DEVIATED/INCONCLUSIVE），不评判执行内容的好坏
- **包含**：frozen.json + trace.jsonl + state.json 三件套 + Probe + InterferenceFlag + Boundary Deviation
- **原则**：OXN 验证事实不评判质量——"彻底不判"

### P（性能度量 · 缺失即设计 · ADR-0066/0067）
- **PEAS 角色**：P **故意外包给工程师**——OXN 由 ADR-0066/0067 立法"彻底不判"，不做性能度量最大化。outcome 聚合结构只提供各状态 Probe 数量，不聚合判定"整体合格/失败"。判定权归工程师。
- **R&N 对照**（ADR-0072）：R&N 假定 agent 自带性能度量并最大化；OXN 的 P 不在系统内，在工程师脑子里。这是 OXN 相对 R&N 的根本设计偏离——OXN 是参照系不是智能体，不最大化任何东西。

### Report（CLI 输出）
- **PEAS 角色**：外部呈现——工程师/AI 请求 OXN CLI 获取的可读报告
- **基于**：Proof 生成
- **不新判定**：只呈现 Proof 已有的客观事实

### ProbeOutcome（单 Probe 客观结果）
- **三态**：COMPLETED / DEVIATED / INCONCLUSIVE
- **中性**：探测目标是否符合预期；"完成"指探测完成，不是目标完成
- **OXN 的验证动作**：AI Agent 提交执行结果后，OXN 跑 Probe → 产出 ProbeOutcome

### outcome（Proof 级聚合结构）
- **结构**：`{completed: N, deviated: N, inconclusive: N}`
- **不聚合判定**：OXN 不做"整体合格/失败"聚合判定；只提供各状态 Probe 数量
- **判定权归工程师**

### R&N 三十二核心术语 ↔ OXN 对照表（ADR-0072 + ADR-0073 + ADR-0074 + ADR-0075 + ADR-0076 + ADR-0077 + ADR-0078 + ADR-0079 完整版）

| # | R&N 术语 | OXN 对应物 | 关键偏离 |
|---|---|---|---|
| 1 | 智能体结构 | AI Agent（非 OXN Engine） | OXN 是参照系非智能体 |
| 2 | 世界模型 | Asset（只读参照） | 写侧拆成三角色协议，无单一更新函数 |
| 3 | 感知器 | AI 工具 I/O + Probe（双轨） | Probe 是 OXN 确定性传感器，AI 主动调用自证 |
| 4 | 执行器 | AI 工具调用 + OXN writer（双轨） | Work 是通道非执行器 |
| 5 | 动作 | OXN CLI 调用 + AI 工具调用（双轨） | 原子性锚在 CLI 边界；OXN 无动作选择函数 |
| 6 | 解 | Work（解的目标参照） | OXN 不做业务 goal-test，Work 自带结构性完成参照 |
| 7 | 图 | Task DAG + Blueprint slot DAG | ~~Round = 元搜索~~ **修订（ADR-0075）**：Round loop = AI 搜索行为的外化记录，不是 OXN 的搜索；Task DAG = AI 搜索计划的外化记录 |
| 8 | 环境类型（六轴） | 不直接对应——补偿 agent 非确定性，不补偿环境性质 | OXN 不补偿环境缺陷；参照系是 scope-bound + temporal anchor；功能是标记参照（非 drift recovery） |
| 9 | agent program types | OXN 把 LLM 从不可靠 type 2-3 升到可靠 type 2-3，不进 type 4 | utility 故意外包给工程师；Insight 产出 pattern 建议，utility 决策在工程师 |
| 10 | rationality | 分布式理性（AI 伪理性 + 工程师真理性 + OXN 对齐参照） | OXN 提高 floor 不提高 ceiling；AI 可涌现更优但也可局部最优全局非优 |
| 11 | problem formulation | initial=Work create / actions=Task DAG+工具+CLI / goal_test=结构性+业务性 / path_cost=slot DAG+Tasks | path_cost 不是最小化代价；判据是"确定性满足"非"路径优化" |
| 12 | learning agents | 分布式学习（双向闭环） | 正向：工程师经验→Asset→Work→AI 执行→Insight 统计→工程师学习；反向：工程师沉淀 Asset→AI 获取更优边界。OXN 不做 critic/learning element；**Insight 推理主体是 AI 不是 OXN**（ADR-0074） |
| 13 | search strategies | 不直接对应——搜索是 AI Agent 自有能力，OXN 是搜索的参照物记录 | OXN 不搜索；提供 `h(n)` 参照原料（Asset/Blueprint/Probe catalog）让 AI 的 informed search 有稳定启发锚点。Uninformed search（AI 裸读代码）OXN 不介入。Round loop 不是 OXN 搜索机制，是 AI 搜索行为被 OXN 记录（ADR-0075）；maxIterations 从硬限改 Blueprint 配置 + 软反馈 |
| 14 | adversarial search | 不直接对应——对抗在 AI-vs-AI 之间，不在 OXN-vs-AI 之间 | OXN 无利益不博弈，是对抗关系的验证边界非博弈方。对抗在 AI 主子委托链（1:N，主编排 Task 子执行，或跨会话委托更小 LLM）。**软对抗两层分离**（ADR-0076）：Probe 声明 AI 可见（审计链层）+ Probe 验证标准 AI 不可见（对抗设计层）。**跨 LLM 参照**：不同 LLM 通过 OXN CLI 读持久化 context 对齐同一确定性边界 |
| 15 | constraint satisfaction | CSP 的范围与执行记录（非 CSP solver） | R&N CSP = solver 寻找满足约束的赋值。OXN 不解 CSP——承担"CSP 的范围（Asset 三边界聚焦约束）+ 执行记录（Probe 验证 + trace 记录）"。LLM 天然会逃离/修改约束（非确定），OXN 不阻止，反而记录作为工程师追溯证据。约束聚焦提高 LLM 注意力（floor），不保证全遵守（ceiling 不限） |
| 16 | knowledge representation | Asset 全是声明式（字面层）；"程序式"是执行语义分属 OXN + AI | R&N 知识表示 = agent 内部表示以推理。Asset 全是声明式（MD 文档不执行，含 `script` 也是声明式描述"要执行什么"）。执行语义分属两主体：OXN 通过 Probe script 执行（验证传感器）+ AI 也可执行（导航传感器，获取一手反馈）。同一声明式 script 因执行主体不同成为不同传感器。Asset 是给 AI 参照的外部知识表示（非 OXN 内部推理用）。Blueprint 聚合约束后在 Work/Task Context 里作为软约束边界——提高 LLM 注意力（floor），不根本改变 LLM 黑盒（ceiling）。两步验证：AI 先自验→OXN 后公证 |
| 17 | planning | Blueprint 静态模板（参照）+ AI 动态规划（执行）+ OXN 存储（载体） | R&N planning = agent 内部规划动作序列。OXN 不是 planner——三层（Work/Task/Part）是**职责分工**（工程师定义 Blueprint / OXN 存储 / AI 使用）不是规划深度。规划深度在 slot/task DAG，灵活性归 AI 发挥，不由 OXN 或工程师限死。Blueprint = 工程师沉淀的静态规划模板（参照锚点），AI 依模板做动态规划编排 Task DAG。OXN 不规划，提供规划参照 + 存储载体 + 记录规划行为。和搜索（Term #13）/CSP（Term #15）同构 |
| 18 | utility theory | **Utility 归属 AI（注意力机制）；OXN 机制 = 目标→边界参照转换** | R&N MEU = agent 内部效用函数 + 概率模型 + argmax 优化。三组件全在 AI（注意力机制即内置 utility）。工程师目标是 utility 依据，但直接应用到非确定性 AI = 不可知（0%-100% 不可观测）。**OXN 的核心机制**：把工程师目标转换为边界参照（非"必须这么做"，而是"依据其做会提高确定性"）——解释 Referent（ADR-0072）存在的根本原因：不可知→可观测。Probe verdict **不是退化 utility**，是边界参照验证（satisfaction ≠ optimization，ADR-0073 判据 4）。Term #9 修订：utility 非"外包给工程师"，是"AI 自有，工程师提供依据，OXN 转换为边界参照" |
| 19 | decision theory | **决策辅助（非决策方）；AI 在 ignorance 下决策** | R&N decision = utility + probability。两者都归属 AI（Term #18 utility + AI 隐式概率模型）。OXN 不参与 decision network 三节点（chance/decision/utility）。AI 的 utility 隐式（注意力机制不可观测），实际在 **ignorance**（最深不确定性）下决策。**OXN 不降级 ignorance→risk**——提供决策辅助：Blueprint 减少决策空间 + Asset 聚焦注意力 + Probe 反馈信号。不改变不确定性类型，提高决策质量（floor）。Insight = 决策辅助信号（非概率估计原料） |
| 20 | communication | **AI↔AI = shared blackboard；OXN↔工程师 = daemon 主动通信** | R&N communication = agent 之间直接交换信息（speech acts + protocol）。OXN 架构里 AI 主↔AI 子**不直接通信**，通过 OXN 持久化的 Work/Task Context 间接协调——OXN 是 shared blackboard（信息存储大家可见，AI 通信不需要携带上下文，通过 OXN 获取即可）。但是否携带、如何通信是 AI Agent 自己的事。**两种通信关系分离**：AI↔AI 走 shared blackboard（OXN 不主动传递，只持久化共享状态）；OXN↔工程师走 daemon 主动通信（监听 + 预警，这是不同的通信方）。通信也是 AI 自有能力，OXN 提供共享黑板参照——和搜索（Term #13）/planning（Term #17）/utility（Term #18）同构 |
| 21 | belief state | **信念锚点 + 世界模型抽象参考 + AI 构建脚手架** | R&N belief state = agent 对部分可观测环境的内部估计。**软件工程特化**：软件本身就是一种世界模型，工程师的信念状态通过编程外化为软件世界模型。AI Agent 需基于自己的信念状态理解 + 构建软件世界模型。OXN 的三重角色：(1) 信念锚点——给 AI 非确定信念提供确定性参照；(2) 世界模型抽象参考——Asset 是工程师信念外化的结构化表达（非代码本身）；(3) AI 构建脚手架——若 AI 选择 OXN，Asset/Blueprint/Work 提供构建软件世界模型的脚手架。OXN 不是 agent（Term #1）对自己的产物有确定性知识（不是 belief），对 AI 内部状态完全不可见。深化 Term #2（Asset = 世界模型参照）+ 贯通 Term #16（外部知识表示）+ Term #18（目标→边界参照转换） |
| 22 | knowledge engineering | **OXN 无知识工程；做的是边界工程（ADR-0078）** | R&N knowledge engineering = 为 knowledge-empty agent 注入知识（acquisition→representation→base→inference→validation）。**根本范式差异**：R&N agent 是 knowledge-empty（需外部注入知识），LLM agent 是 knowledge-full（预训练内化庞大知识库）。LLM-based agent 是 R&N agent 子集（成书后出现），自带所有智能体组件，但 LLM 原理决定其非稳定——这是与 R&N agent 的最大区别。OXN 不做知识工程——Asset 不是知识（不是给空机器的推理原料），是**边界线索**（给满载 AI 的约束参考）。工程师写 Asset 是 boundary acquisition 非 knowledge acquisition。前提（ADR-0078）→机制（ADR-0077）→结构（ADR-0072）→判据（ADR-0073）闭环完成 |
| 23 | uncertainty / probability | **当前阶段无概率模型（确定性边界）；下一代方向 = 概率边界；统计原料 AI/工程师消费** | R&N probability = agent 维护显式概率模型 + 贝叶斯更新信念。**三结构**：(1) Asset 聚焦知识使用——LLM 不只有领域知识，有过多知识（含非当前所需），Asset 让 LLM 从海量知识专注当前领域（补充 ADR-0078）。(2) **概率边界是 OXN 下一代核心**——当前 Probe true/false 构建确定性边界，未来通过概率定义边界（更适应 LLM 与现实软件不确定性）。当前不做因工程师不具备这方面知识经验——"我的边界决定 OXN 当前开发边界"（ADR-0078 边界工程的递归应用）。(3) OXN 可提供概率统计（贝叶斯等确定公式计算），但不决定下一步或 Asset 演化——AI Agent 与工程师决定。概率统计也是原料非推理（ADR-0074）。knowledge-full（知识维度）与 ignorance（决策维度）正交无矛盾 |
| 24 | ontology | **Asset 全体是 Ontology（ADR-0079）；边界 = Ontology 定义；形式化推理保留不实现** | R&N ontology = 领域概念化的显式表达（实体 + 属性 + 关系）+ 形式化推理（description logic）。**Asset 全体是 Ontology**——不只 Domain，所有类型（Domain/Workflow/Stack/Blueprint）都描述"构建软件是什么、如何关联"，非具体实现（实现交 AI Agent）。**边界 = Ontology 定义本身**——Asset 的边界不是外加约束，就是 Ontology 的定义；对 LLM 可确定性（LLM 知识库包含这些概念或可推理出）。**形式化推理归属 AI Agent**——OXN 无 inference engine（ADR-0074），但 AI 读 Asset Ontology 自行推理，结果作为 Insight 给工程师决策。**OXN 形式化推理能力保留不实现**——理论上可行（数学公式推导，确定性），当前不做因：(a) 工程师能力不具备；(b) 让 AI 实现 OXN 推理功能→工程师无法验证→噪音+损害 OXN 确定性。ADR-0078 边界工程的再次递归应用 |
| 25 | Bayesian networks | **当前无对应；slot/task DAG 是执行编排非概率依赖；BN 实现保留不实现** | R&N BN = DAG 编码概率依赖 + 条件概率推理。OXN 的 slot/task DAG 也是 DAG 但语义不同——后者是**执行编排**（确定性时序依赖），前者是**概率推理结构**（随机变量 + 条件概率）。两者不能类比。OXN 不做概率推理（Term #23）。**BN 实现保留不实现**——与形式化推理（ADR-0079）、概率边界（Term #23）同类保留决策。slot/task DAG 是否演化（概率化）属下一代再确认。三个保留决策形成 OXN 下一代方向集群：概率边界 + 形式化推理 + 贝叶斯网络 |
| 26 | Markov decision process | **当前无对应；属 AI 深水区，超出 OXN 轻量级定位；保留不实现** | R&N MDP = 序贯决策形式化（S/A/P/R/π\*）。OXN 有状态机（Work/Task 生命周期）但无概率转移/奖励/最优策略。OXN 状态机是马尔可夫的（当前状态决定可用命令），AI 决策是非马尔可夫的（依赖历史 Context）——但这属设计观察非 MDP 实现。**MDP 保留不实现**——进入 AI 深水区和 LLM 底层原理，对当前 OXN 是"甜点"，超出"轻量级人机协作工具"产品定位。是否引入待工程师使用 OXN 后再考虑。**保留决策集群现共四项**：概率边界（Term #23）+ 形式化推理（ADR-0079）+ 贝叶斯网络（Term #25）+ MDP（Term #26），共同边界判据 = 轻量级定位 |
| 27 | reinforcement learning | **OXN 不参与 AI 学习** | R&N RL = agent 通过试错 + reward signal 学习最优策略。Probe verdict **不是 reward**——RL reward = 标量信号驱动 policy 自动更新；Probe = 约束满足检查（pass/fail），AI 自己决定如何用 verdict。学习是 AI 自有能力（Term #12 分布式学习）。往 OXN 引入 AI 学习 = 超出边界 |
| 28 | neural networks / deep learning | **OXN 不碰（消费层 vs 实现层分离）** | LLM 底层原理。LLM 本身就是神经网络产物，OXN 消费 LLM 但不实现神经网络。消费层（OXN 使用 LLM 输出）vs 实现层（LLM 内部机制）严格分离 |
| 29 | supervised / unsupervised learning | **OXN 不碰** | 机器学习训练范式。OXN 不训练模型，不消费训练数据。Insight 统计是频率统计（ADR-0074 原料提供者）非 ML 训练 |
| 30 | hidden Markov models (HMM) | **保留不实现** | 时序概率模型，与贝叶斯网络（Term #25）/MDP（Term #26）同类保留。属下一代概率方向集群 |
| 31 | perception (vision / speech) | **OXN 不碰** | 感知模态，超出软件工程协作范围。OXN 的"感知"是 Probe（确定性验证传感器，Term #3），非视觉/语音感知 |
| 32 | robotics | **OXN 不碰** | 物理 agent 领域。OXN 服务软件工程协作，不涉及物理世界交互 |

### OXN 实现边界四判据（ADR-0073）

> 评估任何 OXN 新功能时，过四判据——任一判据命中"不该实现"则拒绝。四判据全过则符合 OXN 定位。

| # | 判据 | 维度 | 该实现 | 不该实现 |
|---|---|---|---|---|
| 1 | 补偿方向 | 补偿什么 | agent 非确定性 | 环境性质 |
| 2 | agent 级别 | 升到哪级 | type 2-3 可靠性 | type 4 效用 |
| 3 | floor/ceiling | 提哪限 | floor（下限参照保底） | ceiling（上限机制） |
| 4 | 路径判据 | 路径怎么判 | 确定性满足 | 路径优化 |

### 分布式学习闭环（ADR-0074）

> **Insight 的推理主体是 AI，不是 OXN**。OXN 提供统计原料（确定性 floor），AI 主动请求并自己推理（ceiling 不限）。OXN 不做 critic、不做 learning element（确定性程序不更新自身逻辑）。

**双向闭环**（Asset 是双向枢纽）：

```
正向（学习链）：
  工程师经验 → Asset 静态边界 → Work 动态边界上下文 → AI 执行 →
  Insight 统计原料 → 工程师学习 → （回到）工程师经验

反向（赋能链）：
  工程师沉淀 Asset → AI 从 Asset 获取更优边界 → AI 推理效能提升
```

**三方学习分工**：

| 主体 | 学习形态 | 特性 |
|---|---|---|
| AI Agent | 上下文内 transient 学习 | 学快但忘快（窗口外就忘） |
| 工程师 | 持久学习（沉淀 Asset） | 学慢但持久（Asset 冻结可累积） |
| OXN Engine | 桥接层（不学习） | 提供统计原料把 AI transient 模式转成工程师可读 pattern |

**v0.7+ Insight RFC 约束**：必须遵守"原料 vs 推理"分离——任何让 OXN 自己做推理/评判/学习的实现都越界。具体统计算法/查询接口待 RFC 探索。

## 术语精简记录

本次 grilling session 废弃以下 7 个术语（统一到 Proof 或 OXN Engine）：

| 废弃词 | 原位置 | 决策内容归入 |
|---|---|---|
| TrustChain | oxn-engine-domain H3 + ADR-0057 | Proof desc |
| EvidenceChain | （未引入） | —— |
| EvidenceChainTriple | oxn-work-domain H3 + ADR-0011 | Proof desc（三件套是 Proof 的技术规范）|
| Notary | oxn-engine-domain H3 + ADR-0031 | OXN Engine desc |
| AuditChain | oxn-engine-domain H3 + ADR-0012 | OXN Engine desc |
| Taint | oxn-proof-domain H3 | InterferenceFlag（合并）|
| Verdict | oxn-proof-domain H3 + 代码 | 拆分为 ProbeOutcome + outcome + Report |

详见 ADR-0066（术语精简立法）。

## 文档维护约定

- Domain .md 文件是术语权威源（SSOT）
- 外部读者使用 `docs/glossary/zh-cn/`（7 个文件）作为手册可见表
- 修改术语必须先修改 Domain 文件，再同步 glossary，再写新 ADR 记录决策
- 新增术语前先在 `CONTEXT-MAP.md` 确认归属 context