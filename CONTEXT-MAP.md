# Context Map

> OpenXenon 是一个多 context 词汇架构：9 个 Domain .md 文件共同构成项目术语权威源。
> 本文件是入口索引；各 Domain 文件是各 context 的精确定义。
>
> **0.6.x 新增**：OxnProjectDomain（项目工程元层）—— 定义文档三情态分离（Asset / RFC / Doc）、
> 内置 Asset 两层机制（`@oxn/` + `@prj/`）、自举种子豁免（src/builtin/）、
> 版本号政策（Alpha / Version Fragment / Roadmap / Fix Record / AssetMap）。详见 [RFC-0013](docs/rfc/zh-cn/RFC-0013-versioning-policy.md)。

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
| **OxnDraftDomain** | [.openxenon/assets/domains/oxn-draft-domain.md](./.openxenon/assets/domains/oxn-draft-domain.md) | OXN Draft 业务领域；描述性工作稿管理（report/issue/design） |

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
OxnDraftDomain（reference oxn-asset-domain + oxn-project-domain，
                描述性工作稿（Draft）业务边界；不向下引用其他子域）
```

- **OxnDomain → 所有子 Domain**：单向引用，root 不被引用
- **OxnEngineDomain → OxnAssetDomain**：Engine 消费 Asset 边界
- **OxnAssetDomain → OxnCliDomain**：CLI 消费 Asset 类型
- **OxnWorkDomain → OxnAssetDomain + OxnProofDomain**：Work 编排 Asset + 产出 Proof
- **OxnInsightDomain → 全部 6 个 context**：Insight 涌现层跨 Work 推理，消费所有 context
- **OxnProjectDomain → oxn-domain/oxn-engine-domain/oxn-asset-domain**：项目工程元层，引用父域 + 资产相关子域；自身不被任何子域引用（避免环形依赖）
- **OxnDraftDomain → oxn-asset-domain + oxn-project-domain**：Draft 是 Asset 的前置状态（描述性情态），同时受项目工程元层约束

## 核心术语锐化（来自 2026-07-21 / 07-22 / 07-23 grilling session）

> 以下是 OpenXenon 产品定位的核心术语，每个都有明确语义边界。
> **2026-07-23 锐化**（ADR-0072）：OXN Engine **不是智能体**，是非确定性智能体（LLM Agent）的**确定性参照系**（Referent）——为 AI 三个本有但非确定的器官各提供稳定参照锚点。现有 PEAS 映射三处错（A/S 归属错、P 缺失未标注），本次整体重写。

### Referent（参照系 · OXN 统一设计模式 · ADR-0072）
- **定义**：为非确定性智能体（LLM Agent）的本有但非确定器官，提供确定性参照锚点。参照版本与 agent 自有版本性质相反恰恰是对的——参照之所以是参照，正因为它不随 agent 概率波动而变。R&N 没有给这种关系命名（R&N 假定 agent 自有自信任器官）。
- **六个参照锚点**：Asset 参照世界模型 / Probe 参照传感器 / OXN writer 参照执行器 / CLI 调用参照动作 / Work 参照解 / Task DAG 参照状态探索图
- **不是外化**：器官归 agent 自有，OXN 只提供参照锚点。参照系必须稳定，所以不能让被参照者（AI）改它。

### OpenXenon（产品定位）
- **形态**：协作工具
- **slogan**：OpenXenon 是工程师定义 AI Agent 协作边界的工具
- **正定义**：工程师通过 OXN 定义 Asset，作为 AI Agent 在 Work 约束的协作边界，由 Proof 验证其成果
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

## 跨层引用

- 详细 R&N 32 术语对照 → [RFC-0018 附录 A](./docs/rfc/zh-cn/RFC-0018-project-engineering-meta.html#附录-a-rn-32-术语对照)
- OXN 实现边界四判据 → [RFC-0007 §D1](./docs/rfc/zh-cn/RFC-0007-domain-positioning.html#d1)
- 分布式学习闭环 → [RFC-0003 §D4](./docs/rfc/zh-cn/RFC-0003-ai-collaboration.html#d4)
- 协作边界分层 → [ADR-0084](./docs/adrs/0084-collaboration-boundary-layering.md)
- OXN 环境 6 轴刻画 → [ADR-0085](./docs/adrs/0085-oxn-environment-characterization.md)

## 文档维护约定

- Domain .md 文件是术语权威源（SSOT）
- 外部读者使用 `docs/glossary/zh-cn/`（9 个文件）作为手册可见表（v0.7+ 拟收为单页 `docs/product/zh-cn/concepts/glossary.md`，见 RFC-0017）
- 修改术语必须先修改 Domain 文件，再同步 glossary，再写新 ADR 记录决策
- 新增术语前先在 `CONTEXT-MAP.md` 确认归属 context

## 历史快照（已迁出）

详细历史（2026-07-21 / 07-22 / 07-23 / 07-27 / 07-30 / 07-31 grilling sessions + R&N 32 术语对照 + 分布式学习闭环 + 术语精简记录 + 6 次新增记录）已迁出本文件，迁入位置：

- R&N 32 术语对照 → [RFC-0018 附录 A](./docs/rfc/zh-cn/RFC-0018-project-engineering-meta.html#附录-a-rn-32-术语对照)
- 分布式学习闭环 / 四判据 → [RFC-0007 §D1](./docs/rfc/zh-cn/RFC-0007-domain-positioning.html#d1) + [RFC-0003 §D4](./docs/rfc/zh-cn/RFC-0003-ai-collaboration.html#d4)
- 术语精简 / 新增历史 → `.openxenon/drafts/rfc/context-map-history.md`（不追踪）
- AGENTS.md 0.6.x 三情态架构 → [RFC-0009 文档三情态分离](./docs/rfc/zh-cn/RFC-0009-doc-three-modalities.html)（RFC-0018 扩展为四层）

> 本文件未来仅承载 9 Domain 索引 + 9 个核心术语锐化段（≤ 100 行）。