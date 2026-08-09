---
entity: domain
name: OxnDomain
abstract: OpenXenon 顶层领域（Asset 结构 v2：Group → Axiom → Theorem）。
references: []
citations: 0
synced-at: 2026-08-08
---

# Domain: OxnDomain

> v1.0.0 (2026-08-08): 收编为 Asset 结构 v2 三层模型。## Terms: OpenXenon → ## Concept，## Invariants → ## Boundary；术语与 invariant 语义锁定。

## Concept

### OpenXenon
- 工程师定义 AI Agent 协作边界的工具（slogan）。正定义：工程师通过 OXN 定义 Asset，作为 AI Agent 在 Work 约束的协作边界，由 Proof 验证其成果。以 Skills 形式注入 AI Agent 工作台（Cursor / OpenCode / Codex / Claude Code）。OXN 本身不是 AI Agent，而是 AI Agent 之上的工具层。

### OXN
- OpenXenon 缩写。

### OXN CLI
- OpenXenon 交互入口之一。具体领域见 [`oxn-cli-domain`](./oxn-cli-domain.md)。

### OXN Engine
- OpenXenon 核心引擎。具体领域见 [`oxn-engine-domain`](./oxn-engine-domain.md)。

### OXL
- OpenXenon Language，OpenXenon 的特定领域语言（DSL），用于声明与校验 OXN 实体。具体领域见 [`oxn-engine-domain.OXL`](./oxn-engine-domain.md#oxl)。

### IAP
- 工程师定义意图（Intent），AI Agent 对齐执行（Align），OXN 验证记录（Proof）。

### Intent
- 人机协作的软件目标，AI Agent 对齐的工作对象。

### Align
- 人机协作的工作过程，AI Agent 遵守边界并收敛执行。

### Proof
- OXN Engine 记录的协作**过程**证明（不是协作结果证明）；物理产物四件套 `frozen.json` + `outcome.md` + `trace.jsonl` + `state.json`（🆕 v0.7.0 RFC-0027 PR-F D6 修正：oxn-domain 三件套 → proof-domain 四件套，统一为四件套避免歧义）；OXN 只记录事实不评判合格；具体领域见 [`oxn-proof-domain`](./oxn-proof-domain.md)。

### Asset
- 工程师为 AI 协作定义的**环境约束**；5 类 AssetKind（domain/workflow/stack/blueprint/assetmap）。具体领域见 [`oxn-asset-domain`](./oxn-asset-domain.md)。
- 🆕 v0.6.4: AssetKind=roadmap 回收为 assetmap（break-change）。
- 别名：**Boundary**（🆕 v0.7.0 RFC-0027 PR-F D10：原独立 Axiom 合并到 Asset 定义）—— Asset 即边界，Asset 全部内容是 AI Agent 不可逾越的工程契约。

### Boundary
- 🆕 v0.7.0 RFC-0027 PR-F（D10）：删 Axiom（Asset 别名，合并到 Asset 定义）；语义保留到 Asset Axiom 注释。

### Work
- 人机协作的工作空间，衔接 Asset 与 Proof；AI Agent 在 Asset 边界内自主工作（create → read Blueprint → write Context → orchestrate Tasks → execute → 汇报 → react → finalize）；具体领域见 [`oxn-work-domain`](./oxn-work-domain.md)。

### Insight
- 洞察 IAP 并提供涌现的可能性。具体领域见 [`oxn-proof-domain`](./oxn-proof-domain.md#insight)（🆕 v0.6.4 PR-B：合并自 `oxn-insight-domain`）。

### Hall
- 研讨厅，人机协作范围内的中央枢纽。

### Daemon
- 🆕 v0.7.0 RFC-0027 PR-F（D4）：canonical 归 `oxn-engine-domain.md §Daemon`（L0-L3 架构 SSOT）；本 Axiom 删（避免重复定义）。

### Referent
- 参照系——为非确定性智能体（LLM Agent）的本有但非确定器官（世界模型/传感器/执行器），提供确定性参照锚点。OXN 的统一设计模式：Asset 参照世界模型、Probe 参照传感器、OXN writer 参照执行器、CLI 调用参照动作、Work 参照解、Task DAG 参照状态探索图。参照版本与 agent 自有版本性质相反（参照必须稳定，不被被参照者改）。ADR-0072。

### Floor
- 下限参照——OXN 为 AI Agent 的局部最优全局非优情况提供的确定性保底参照。Asset + Work 专注某个目标，构成 AI 选择动作时的 floor。OXN 提高 floor 不提高 ceiling（ADR-0073 判据 3）。

### Ceiling
- 上限机制——AI Agent 自身能力的天花板，OXN 不介入。AI 可涌现比工程师更优的选择（反向帮助工程师积累经验、沉淀 Asset），ceiling 由 LLM 能力决定，不受 OXN 限制。与 Floor 对偶。ADR-0073 判据 3。

## Boundary

### ProductIdentity
- OpenXenon = OXN CLI + OXN Engine。

### RootNoDownwardRef
- 本 Domain 是唯一 root Domain；references 为空；其他 Domain 在 references 字段中引用本 Domain。

### ProductBoundary
- 本 Domain 定义 OpenXenon 产品词汇边界。

### ThreeTopConceptsClosedLoop
- Intent + Align + Proof 三者构成产品核心机制闭环。