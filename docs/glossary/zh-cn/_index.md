---
title: 术语表
---
synced-at: 2026-07-22
---

# 术语表

> OpenXenon 外部手册引用术语的统一汇集地。
> 内部定义来自 `.openxenon/assets/domains/`（SSOT），但外部读者无须感知该目录；本页是手册可见的权威表。
> 历史术语精简（ADR-0066/0067）：废弃 Verdict / ProbeVerdict / Taint / TrustChain / EvidenceChainTriple / Notary / AuditChain / 判决书 / PASSED-FAILED；新增 ProbeOutcome / outcome / Report / BoundaryDeviation。

## 按主题分类

| 主题 | 适用范围 |
|---|---|
| [核心术语](./core-terms) | OpenXenon 是什么、IAP 三阶段、E1-E4 实体（OxnDomain 抽取） |
| [引擎术语](./engine-terms) | L0-L3 分层、Kernel/Infra/OXL/Daemon、错误契约、四层确定性（OxnEngineDomain 抽取） |
| [资产术语](./asset-terms) | Asset 五类、三边界、AssetKind、Paper 结构（OxnAssetDomain 抽取） |
| [工作术语](./work-terms) | Work/Task/Slot/Part/Probe/Round/IAP 三阶段（OxnWorkDomain 抽取） |
| [证明术语](./proof-terms) | Proof/Probe/ProbeOutcome/outcome/Report/Frozen/Trace（OxnProofDomain 抽取） |
| [洞察术语](./insight-terms) | Insight、跨 Proof 累积、审计追踪（OxnInsightDomain 抽取） |
| [CLI 术语](./cli-terms) | 命令/参数/i18n/Skill/配置（OxnCliDomain 抽取） |

## 按字母速查（合并）

### A-E

- **Align** — 人机协作的工作过程，AI Agent 在边界内自主工作。 见 [core-terms](./core-terms#align)
- **Asset** — 工程师为 AI Agent 协作定义的环境约束。 见 [asset-terms](./asset-terms#asset)
- **AssetKind** — 资产 5 类枚举：domain / workflow / stack / blueprint / roadmap。 见 [asset-terms](./asset-terms#assetkind)
- **Blueprint** — 资产之一，跨 AssetKind 组合模板，引用 Domain + Workflow + Stack。 见 [asset-terms](./asset-terms#blueprint)
- **CliInputError** — 用户 CLI 输入错，退出码 1。 见 [engine-terms](./engine-terms#cliinputerror)
- **ContextMap** — Domain 业务实体与 L0-L3 代码分层的显式连接。 见 [engine-terms](./engine-terms#contextmap)

### F-L

- **Frozen** — Work finalize 后的不可变证据文件（frozen.json），生成后只读（chmod 0o444）。 见 [proof-terms](./proof-terms#frozen)
- **IAP** — Intent / Align / Proof 三阶段核心范式。 见 [core-terms](./core-terms#iap)
- **IAPError** — 业务流转中预期内错误，AI 消费受众。 见 [engine-terms](./engine-terms#iaperror)
- **Insight** — E4 涌现层，整体论，跨 Work 推理。 见 [insight-terms](./insight-terms#insight)
- **Intent** — 工程师定义意图，AI Agent 对齐的工作对象。 见 [core-terms](./core-terms#intent)
- **Infra** — L1 副作用/IO 执行模块，文件系统/进程/网络出入口；只回答事实不做判定。 见 [engine-terms](./engine-terms#infra)
- **Kernel** — L0 纯逻辑验证模块：验证 ProbeOutcome（COMPLETED/DEVIATED/INCONCLUSIVE），纯逻辑内核，零 IO。 见 [engine-terms](./engine-terms#kernel)

### M-R

- **OXL** — OpenXenon 特定领域语言（DSL），用于声明与校验 OXN 实体。 见 [core-terms](./core-terms#oxl)
- **OXN Engine** — OpenXenon 核心引擎，IAP 范式的执行主体；记录事实不评判合格。 见 [core-terms](./core-terms#oxn-engine)
- **OXNCrash** — 引擎自身 Bug 或底线被击穿，退出码 2。 见 [engine-terms](./engine-terms#oxncrash)
- **OpenXenon** — 工程师与 AI Agent 协作工具，为协作提供边界与证据。 见 [core-terms](./core-terms#openxenon)
- **outcome** — frozen.json 的 Proof 级聚合结构 `{completed, deviated, inconclusive}`；OXN 不做整体判定。 见 [proof-terms](./proof-terms#outcome)
- **Part** — Task 内的 skill 执行单元，内联在 task 中不可独立成文件。 见 [work-terms](./work-terms#part)
- **PathPort** — L1 注入式路径操作接口，Kernel 不直接调 path.join。 见 [engine-terms](./engine-terms#pathport)
- **PlanLock** — Asset 创建后强校验卡，锁 fileHash + citations + DAG。 见 [asset-terms](./asset-terms#planlock)
- **Probe** — OXN 内置探针（物理观测 + 客观结果）。 见 [proof-terms](./proof-terms#probe)
- **ProbeOutcome** — L0 Kernel 产出的单个 Probe 客观结果（COMPLETED/DEVIATED/INCONCLUSIVE）。 见 [proof-terms](./proof-terms#probeoutcome)
- **Proof** — OXN 验证 AI Agent 执行结果并记录的协作过程证明；三件套：frozen.json + trace.jsonl + state.json。 见 [proof-terms](./proof-terms#proof)

### S-Z

- **Report** — CLI 基于 Proof 输出的可读报告；不新判定，只呈现已有事实。 见 [proof-terms](./proof-terms#report)
- **Skill** — OXN 内置给 AI 助手的技能（/oxn-work 统一入口）。 见 [cli-terms](./cli-terms#skill)
- **Slot** — Blueprint 内拓扑节点（slot DAG），Task 内 Part 名必须对齐 slot 名。 见 [work-terms](./work-terms#slot)
- **Stack** — 资产之一，技术环境约束（language/runtime/linter/test）。 见 [asset-terms](./asset-terms#stack)
- **Task** — Align 执行单元，对齐 1 个 Blueprint，可引用 N 个 Domain。 见 [work-terms](./work-terms#task)
- **Trace** — Work 执行轨迹（trace.jsonl），append-only 事件流。 见 [proof-terms](./proof-terms#trace)
- **Work** — 人机协作的工作空间，编排流程 3 IAP 阶段顺序不可跳；AI Agent 在 Asset 边界内自主工作。 见 [core-terms](./core-terms#work)
- **Workflow** — 资产之一，执行边界（slot DAG + observe Probe）。 见 [asset-terms](./asset-terms#workflow)

## 词汇同步约定

> 本页词汇已采用通俗化措辞（与历史版本相比）：
>
> **ADR-0066 术语精简（2026-07-21）废弃以下裁判视角术语，统一到 Proof 或 OXN Engine desc**：
>
> - "公证人（Notary）" → 决策内容归入 OXN Engine desc（"记录事实不评判"）
> - "审计链（AuditChain）" → 决策内容归入 OXN Engine desc
> - "证据链三件套（EvidenceChainTriple）" → 决策内容归入 Proof desc（是技术规范不是独立术语）
> - "信任链（TrustChain）" → 决策内容归入 Proof desc
> - "污染（Taint）" → "InterferenceFlag"（12 项枚举保留，红/黄分流）
> - "Verdict" / "ProbeVerdict" → 拆分三层：ProbeOutcome（Probe 级）+ outcome 聚合结构（Proof 级）+ Report（CLI 输出）
>
> **ADR-0067 三态字段重命名**：
>
> - "判决书" → "证据记录"
> - `PASSED / FAILED / INCONCLUSIVE` → `COMPLETED / DEVIATED / INCONCLUSIVE`（"完成"指探测完成，不是目标完成）
> - 废弃 oxn-proof-domain inv-9（Probe FAIL 阻止）→ "probe-deviation-notifies-not-blocks"（通知不阻断）
> - 废弃 oxn-proof-domain inv-10（Proof 有立场判定）→ "proof-neutral-record"（中性记录不带立场）
>
> **术语上下文差异（前版本残留语义，已收敛）**：
>
> - "兰姆达真空（LambdaVacuum）" → "纯逻辑内核" → 现统一为 "LambdaVacuum"（正式术语）
> - "四层确定性" → "四层保障" → 现统一为 "FourLayerDeterminism"
> - "最小信任闭环（MinimumTrustClosure）" → "初版信任闭环" → 现统一为 "MinimumClosure"
