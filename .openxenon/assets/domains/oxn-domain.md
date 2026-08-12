---
entity: domain
name: OxnDomain
abstract: OpenXenon 顶层领域（Asset 结构 v2：Group → Axiom → Theorem）。
references: []
citations: 0
synced-at: 2026-08-08
---

# OxnDomain

## Concept

### OpenXenon
- 缩写：OXN
- Slogan：工程师定义 AI Agent 协作边界的工具。
- OpenXenon = OXN CLI + OXN Engine。

### OXN CLI
- OpenXenon 交互入口之一。
- 具体领域见 [`oxn-cli-domain`](./oxn-cli-domain.md)。

### OXN Engine
- OpenXenon 核心引擎。
- 具体领域见 [`oxn-engine-domain`](./oxn-engine-domain.md)。

### OpenXenon Language
- OpenXenon 的特定领域语言（DSL），基于 MD 格式 。
- OXL 是其缩写。

### Proof
- 通过 Probes 对协作成果进行验证，并提供证明。
- 具体领域见 [`oxn-proof-domain`](./oxn-proof-domain.md)。

### Asset
- OXN 定义协作边界的知识，包括 Domain、Workflow、Stack，并由 Blueprint 组合使用。
- 具体领域见 [`oxn-asset-domain`](./oxn-asset-domain.md)。

### Work
- 人机协作的工作空间
- 具体领域见 [`oxn-work-domain`](./oxn-work-domain.md)。

### Insight
- 洞察 IAP 并提供涌现的可能性。
- 具体领域见 [`oxn-proof-domain`](./oxn-proof-domain.md#insight)。

### Hall
- 待定，研讨厅，人机协作范围内的中央枢纽。

### Daemon
- 待定，OXN Engine 后台守护进程，用于主动探测。

### OpenXenonThreePartyCollaboration
- 协作三方模型：工程师 = 发起方（Asset 管理 + 审查 Proof）/ AI Agent = 发起方（Work 内自主工作回路）/ OXN Engine = 接收方（被动响应 CLI 请求，验证 ProbeOutcome + 记录 Proof）。
- CLI 能力完全对称：同一套 `oxn` 命令，工程师与 AI Agent 都能调用。
- OXN Engine 不是智能体，是确定性参照系（Referent）。

### IAPClosedLoop
- Intent + Align + Proof 三相闭环：工程师定义意图（Intent），AI Agent 对齐执行（Align），OXN 验证记录（Proof）。
- 每相都有独立语义边界，不串相。
- 与 `oxn-work-domain §IAP 三阶段` 同义（同一对象不同视角）。

### PerformanceMeasureNotEnforced
- PEAS P 故意外包给工程师——OXN 立法"彻底不判"，不做性能度量最大化。
- outcome 聚合结构只提供各状态 Probe 数量，不聚合判定"整体合格/失败"。判定权归工程师。
- R&N 对照：R&N 假定 agent 自带性能度量并最大化；OXN 的 P 不在系统内，在工程师脑子里。

## Slogan

### EngineeringDefinesAgentBoundary
- OpenXenon 的唯一产品目标（Domain SSOT 锚定；why 记录层由 `docs/rfc/zh-cn/` 承担）：工程（OpenXenon）是定义 AI Agent 协作边界的工具。
- 边界三分类（与 E1-E3 实体对应）：静态约束边界（E1 Asset）由 Domain 词汇/禁令/不变量 + Workflow 槽位拓扑 + Stack 环境约束 + Blueprint 组合 + AssetMap 路由承载，由工程师定义、OXN 强校验；运行时上下文边界（E2 Work）由 PlanLock 5-hash（workMd / workContext / blueprints / tasks / taskContexts）封存，lock 后漂移立即阻断；客观见证边界（E3 Proof）由 chmod 0o444 + SHA-256 self-excluding content_hash 的 frozen.json 承载，只记录事实、不评判正确性。
- 三方分工（与 `### OpenXenonThreePartyCollaboration` 同构）：工程师 = 边界定义者（Asset 管理 + 边界演化判断）；AI Agent = 边界内执行者（Work 内自主工作；可在 Scope 范围内偏离路径）；OXN Engine = 客观见证者（确定性参照系；Kernel Zero IO；Infra No Verdict）。
- 与"性能度量最大化"（R&N 默认）正交：本 Axiom 把"价值判断"外包给工程师，不内建性能度量函数；见 `### PerformanceMeasureNotEnforced`。
- glossary-ref: engineering-defines-agent-boundary
