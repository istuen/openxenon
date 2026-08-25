---
entity: domain
name: OxnDomain
abstract: OpenXenon 顶层领域（Asset 结构 v2：Group → Axiom → Theorem）。
references: []
citations: 0
synced-at: 2026-08-14
---

# OxnDomain

## Concept

### OpenXenon
- 缩写：OXN
- Slogan：把领域知识结构化为 AI Agent 协作的确定性源（D24，）。
- OpenXenon = OXN CLI + OXN Engine。

### OXN CLI
- OpenXenon 交互入口之一。
- 具体领域见 [`oxn-cli-domain`](./oxn-cli-domain.md)。

### OXN Engine
- OpenXenon 核心引擎。
- 具体领域见 [`oxn-engine-domain`](./oxn-engine-domain.md)。
- Probe 是 Engine 提供给 AI Agent 的工具能力——经 CLI（`oxn probe`）检查产物是否符合要求，结果记 Work trace（D27，）。详见 [`oxn-probe-domain`](./oxn-probe-domain.md)。

### OpenXenon Language
- OpenXenon 的特定领域语言（DSL），基于 MD 格式 。
- OXL 是其缩写。

### Asset
- 领域知识的结构化表示（D24，）；包括 Domain、Workflow、Stack，并由 Blueprint 组合使用。
- 结构化 = 选择权（工程师显式组合，非 RAG 概率检索）+ 脚手架（Blueprint 组合形态）。
- 具体领域见 [`oxn-asset-domain`](./oxn-asset-domain.md)。

### Work
- DAG 协作空间（D15/D13，）；Goal → Tasks（有 deps 无环），上下文沿边流动。
- 具体领域见 [`oxn-work-domain`](./oxn-work-domain.md)。

### OpenXenonThreePartyCollaboration
- 协作三方模型：工程师 = 发起方（Asset 管理）/ AI Agent = 发起方（Work 内自主工作回路）/ OXN Engine = 接收方（被动响应 CLI 请求，提供 Probe 工具能力 + 记录协作过程）。
- CLI 能力完全对称：同一套 `oxn` 命令，工程师与 AI Agent 都能调用。
- OXN Engine 不是智能体，是确定性参照系（Referent）。

### IAPClosedLoop（理念叙事层，D10）
- Intent + Align + Proof 三相闭环：工程师定义意图（Intent），AI Agent 对齐执行（Align），OXN 验证记录（Proof）。
- **退役到理念叙事层**——实现术语为 Asset/Work/Probe（D10，）。Proof 主权验证已删（D25），Probe 作为工具能力保留（D27）。Intent/Align 作为 Work 内阶段视角，不作为实现术语。
- 与 `oxn-work-domain §生命周期` 同义（同一对象不同视角）。

### PerformanceMeasureNotEnforced
- PEAS P 故意外包给工程师——OXN 立法"彻底不判"，不做性能度量最大化。
- 判定权归工程师。
- R&N 对照：R&N 假定 agent 自带性能度量并最大化；OXN 的 P 不在系统内，在工程师脑子里。



## Boundary

### Inv1OpenXenonCoreEntities
- OpenXenon 核心实体三件套：Asset（领域知识结构化表示，D24，）+ Work（DAG 协作空间，D15/D13，）+ Probe（OXN Engine 提供给 AI Agent 的工具能力，D27，）。
- 三实体各自独立 Domain 详细定义，oxn-domain 母文件只承担"母档案 + 三实体交叉索引"职责。

### Inv2IAPRetiredToNarrativeLayer
- IAP（Intent/Align/Proof）三相闭环已退役到理念叙事层（D10，）。
- 实现术语为 Asset/Work/Probe；IAP 仅作为 Work 内阶段视角（`oxn-work-domain §Phase`）保留叙事价值。
- Proof 主权验证已删（D25，），Probe 作为工具能力保留（D27，）。

### Inv3ThreePartyCollaborationBoundary
- 协作三方：工程师（Asset 管理 + 边界判断）/ AI Agent（Work 内自主工作）/ OXN Engine（Probe 工具能力 + 确定性参照系）。
- 三方能力边界不重叠：工程师不直接执行 Probe（走 `oxn probe` CLI）；AI Agent 不修改 Asset（v0.6.3+ hard-block）；OXN Engine 不做"价值判断"（PEAS P 外包给工程师）。
- 详见 `### PerformanceMeasureNotEnforced`。

### Inv4PlanLockRetired
- 🗑️ PlanLock 已退役（v1.3 D2）：Work 不再依赖 lock/unlock；work.md 可自由修改。
- 漂移检测改由 submit 时刻 hash + trace.jsonl SUBMIT/ASSET_DRIFT 事件承担（可观测不阻断）。
- 旧 `.work` 单文件已删除（D5）；assets 信息运行时读 work.md `## Use` 段。
## Slogan

### EngineeringDefinesAgentBoundary
- OpenXenon 的唯一产品目标（Domain SSOT 锚定；why 记录层由 `docs/rfc/zh-cn/` 承担）：工程（OpenXenon）是把领域知识结构化为 AI Agent 协作确定性源的工具（D24，）。
- 两实体（D8，）：Asset（领域知识结构化表示）由 Domain 词汇/禁令/不变量 + Workflow 槽位拓扑 + Stack 环境约束 + Blueprint 组合 + AssetMap 路由承载，由工程师定义、OXN 强校验；Work（DAG 协作空间）由 PlanLock 4-hash（workMd / workContext / blueprints / tasks / taskContexts）封存，lock 后漂移立即阻断。
- 两方分工（与 `### OpenXenonThreePartyCollaboration` 同构）：工程师 = 知识结构化者（Asset 管理 + 边界演化判断）；AI Agent = 边界内执行者（Work 内自主工作；可在 Scope 范围内偏离路径）；OXN Engine = 工具能力提供者（Probe 能力 + 确定性参照系）。
- 与"性能度量最大化"（R&N 默认）正交：本 Axiom 把"价值判断"外包给工程师，不内建性能度量函数；见 `### PerformanceMeasureNotEnforced`。
- glossary-ref: engineering-defines-agent-boundary
