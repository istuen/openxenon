# Report: RFC / ADR → Domain Axiom/Theorem 映射表

- **DraftType**: report（调研报告）
- **状态**: active（工程师评审中）
- **创建日期**: 2026-08-11
- **触发场景**: 2026-08-10 `/grilling` session（grill-with-docs + domain-modeling skill）
- **数据源**: 89 ADR + 28 RFC 决策点全量扫描 + 9 Domain Axiom 现状盘点
- **下游工作**: 工程师审核后，按 §6 批次拆分为多个 Asset Work（Phase 2）

---

## TL;DR

89 ADR + 28 RFC = **117 文档源**，扫描出 **~210 决策点**（每文档多决策）。按 4 级分类：

| 分级 | 数量 | 占比 | 含义 |
|---|---:|---:|---|
| **转 Axiom** | ~38 | 18% | 新增独立 `### 标题` 承载约束/禁令/术语（Engine 归类 DomainTerm/Ban/Invariant/StackEntry） |
| **转 Theorem** | ~52 | 25% | 挂靠现存 Axiom 的细化/推论分支 |
| **存量已覆盖** | ~65 | 31% | 已在 Domain 中找到等价 Axiom/Theorem（无新增） |
| **仅归档** | ~55 | 26% | superseded/历史叙事/纯过程 → 不入 Domain，仅 RFC/ADR 保留 |
| **合计** | **~210** | **100%** | — |

**预期净新增**：5 批 Asset Work，估算 +38 Axiom + ~50 Theorem 行（分 5 域），对总 Axiom 数影响 +11%（331→~369）。

---

## 1. 路由规则（Phase 1 裁定 · 用于全表）

### 1.1 7 域归属表（来源 → 目标 Domain）

| 主题桶 | 目标 Domain | 主要 Group | 涵盖 RFC | 涵盖 ADR |
|---|---|---|---|---|
| **Engine / Kernel / 错误契约** | `oxn-engine-domain` | `## Concept` / `## Boundary` / `## Forbidden` | RFC-0002, 0015, 0016 | 0002, 0003, 0006, 0008-0010, 0031, 0034, 0037, 0067, 0081, 0082 |
| **Work / Asset 体系** | `oxn-work-domain` + `oxn-asset-domain` | `## Concept` / `## Boundary` / `## ContextEngineering` | RFC-0004, 0020, 0021, 0022, 0023, 0024, 0025 | 0004, 0005, 0024, 0025, 0035, 0049, 0051, 0054, 0055, 0056, 0061, 0075, 0086, 0088, 0089, 0090 |
| **Proof / Probe / Insight** | `oxn-proof-domain` | `## Concept` / `## Boundary` | RFC-0003, 0005 | 0009, 0011, 0012, 0015-0018, 0057, 0058, 0066, 0072-0076, 0085 |
| **CLI / 错误分类** | `oxn-cli-domain` | `## Concept` / `## Boundary` / `## Forbidden` | RFC-0006, 0026 | 0021, 0029, 0030, 0032, 0033, 0052, 0060, 0080, 0083 |
| **Draft / Promote / Skill** | `oxn-draft-domain` | `## Concept` / `## PromoteRoute` / `## Boundary` | RFC-0019 | 0038, 0039, 0096 |
| **文档架构 / Meta / Version** | `oxn-project-domain` | `## DocModality` / `## DocArch` / `## Versioning` / `## Boundary` | RFC-0001, 0008, 0009-0014, 0017, 0018, 0028 | 0013, 0014, 0022, 0023, 0026-0028, 0050, 0066, 0068-0071, 0084, 0093-0098 |
| **OXN 顶层范式** | `oxn-domain` | `## Concept` | RFC-0001, 0007 | 0059, 0066, 0072, 0077-0079, 0085 |

**Advisory 桶**（NpmSupplyChainAdvisory）：**不参与**本轮转换（探索成果，不属规范域）。

### 1.2 4 级分类判据

- **转 Axiom（独立 `###` 标题）**——若内容同时满足：(a) 当前版本仍具约束力/边界/术语定义地位；(b) 语义足够独立，需 ID 承载（slugify 引用）；(c) Engine 能归类（DomainTerm/DomainBan/DomainInvariant/DomainStackEntry）。
- **转 Theorem（`- bullet` 行）**——若内容是某现 Axiom 的细化/推论/例外分支。
- **存量已覆盖**——内容已在 Domain 某 Axiom/Theorem 等价承载，仅做引用映射（无新增行）。
- **仅归档**——pure superseded/历史叙事/已被后续 RFC/ADR 吸收但保留溯源/纯流程性描述。Domain 不引入任何痕迹。

### 1.3 命名规则

- Axiom 名必须 PascalCase 或语义名（参考 oxn-asset-domain `### Inv29StructureV2Shape` `### AssetCheck` `### StructureV2`）
- 形态 A（Axiom + Theorem）优先；形态 B（纯 Axiom）仅术语定义；形态 C（复合 Theorem）仅承载跨 Axiom 的复合规则（逃生舱）

---

## 2. RFC 映射表（28 文档 / ~80 决策点）

### RFC-0001 oxl-philosophy · Accepted → oxn-engine-domain + oxn-domain
| 决策点 | 分级 | 目标 Group | 目标 Axiom（建议） | 备注 |
|---|---|---|---|---|
| OXL 是 OpenXenon DSL（MD 格式） | 存量已覆盖 | oxn-domain §Concept | `### OpenXenon Language` | 已存在 |
| Blueprint 哲学——参数收敛器（漏斗效应） | 转 Axiom | oxn-asset-domain §Concept | `### BlueprintPropsFunnel` | 来自 ADR-0001 内容 |
| Blueprint props 三层默认值优先级链 | 转 Theorem | （挂 `### BlueprintPropsFunnel`） | - | - |

### RFC-0002 kernel-l0 · Accepted → oxn-engine-domain
| 决策点 | 分级 | 目标 Group | 目标 Axiom | 备注 |
|---|---|---|---|---|
| Engine / Kernel 严禁感知源格式 / LSP / CLI / Daemon | 存量已覆盖 | oxn-engine-domain §Boundary | `### Inv3KernelInfraSeparation` | 已存在 |
| Engine 只看 frozen.json | 存量已覆盖 | oxn-engine-domain §Boundary | （挂 `### Frozen` axiom） | - |
| partId 主键 + atomic-write | 存量已覆盖 | oxn-work-domain §Boundary | （挂 work-domain 相关） | - |
| Task 沙箱 namespace 三前缀纪律 | 存量已覆盖 | oxn-work-domain §Boundary | （挂 scope/namespace axiom） | - |
| catalog.json 而非 catalog.md | 存量已覆盖 | oxn-asset-domain §Boundary | `### Inv11PhysicalLocation` 延伸 | - |
| Probe 不入 catalog | 存量已覆盖 | oxn-asset-domain §Boundary | （挂 `### Probe` axiom） | - |
| context.md 取代 Memory L1 | 存量已覆盖 | oxn-work-domain §Concept | `### WorkContext` | - |
| `@prj/` > `@gbl/` > `@oxn/` 优先级 | 存量已覆盖 | oxn-asset-domain §Concept | `### kind-isolation` axiom | - |
| BuiltinAsset `@oxn/` + project `@prj/` 两层 | 存量已覆盖 | oxn-project-domain §DocArch | `### BuiltinAsset` | - |
| 三边界框架（Domain/Workflow/Stack 正交） | 存量已覆盖 | oxn-asset-domain §Concept | `### StructureV2` 范围相关 | - |
| Blueprint 组合 Work | 存量已覆盖 | oxn-asset-domain §Concept | `### StructureV2` | - |
| Asset Paper 3 字段（abstract+references+citations） | 存量已覆盖 | oxn-asset-domain §Boundary | `### Inv4PaperFieldsRequired` | - |

### RFC-0003 ai-collaboration · Accepted → oxn-domain + oxn-proof-domain
| 决策点 | 分级 | 目标 Group | 目标 Axiom | 备注 |
|---|---|---|---|---|
| OXN 是确定性参照系 | 存量已覆盖 | oxn-domain §Concept | `### OpenXenonThreePartyCollaboration` | - |
| 三方协作（工程师/AI Agent/OXN Engine） | 存量已覆盖 | oxn-domain §Concept | 同上 | - |
| 彻底不判原则（ADR-0066/0067） | 存量已覆盖 | oxn-domain §Concept | `### PerformanceMeasureNotEnforced` | - |
| Probe 验证标准 AI 不可见 = 软对抗 | 存量已覆盖 | oxn-proof-domain §Concept | `### InterferenceFlag` | - |
| 执行代码不可变 = 确定性根基 | 存量已覆盖 | oxn-proof-domain §Boundary | `### Inv23AssetExposesProbeContractNotImpl` 链 | - |

### RFC-0004 work-asset · Accepted → oxn-work-domain + oxn-asset-domain
| 决策点 | 分级 | 目标 | 备注 |
|---|---|---|---|
| （13 ADR 内容并入，见 ADR 表） | — | — | 主要由 ADR-0004~0056 提供 Axiom/Theorem 承载 |

### RFC-0005 insight-skill · Accepted → oxn-proof-domain + oxn-cli-domain
| 决策点 | 分级 | 目标 Group | 目标 Axiom | 备注 |
|---|---|---|---|---|
| Insight 仅写 Draft (origin=insight) | 存量已覆盖 | oxn-proof-domain §Boundary | `### Inv30InsightManualGateViaDraft` 链 | - |
| Skill SSOT 由 CLI 包提供 | 存量已覆盖 | oxn-cli-domain §Boundary | `### Inv8SkillSsotFromCli` | - |

### RFC-0006 docs-brand · Accepted → oxn-project-domain + oxn-cli-domain
| 决策点 | 分级 | 目标 Group | 目标 Axiom | 备注 |
|---|---|---|---|---|
| `@` 寻址语法 | 存量已覆盖 | oxn-asset-domain §Concept | `### kind-isolation` | - |
| 文档品牌策略 | 仅归档 | — | — | 视觉/品牌决策，无约束 |

### RFC-0007 domain-positioning · Accepted → oxn-domain + oxn-asset-domain
| 决策点 | 分级 | 目标 Group | 目标 Axiom | 备注 |
|---|---|---|---|---|
| Domain 内部 SSOT / glossary 外部 SSOT | 存量已覆盖 | oxn-project-domain §Boundary | `### Inv1Doc3Modalities` | - |
| 8 Internal / 9 External Domain 划分 | 转 Axiom | oxn-asset-domain §Concept | `### AssetMap` 已含 | - |

### RFC-0008 naming-evolution · Accepted → oxn-project-domain + oxn-cli-domain
| 决策点 | 分级 | 目标 Group | 目标 Axiom | 备注 |
|---|---|---|---|---|
| Verdict → ProbeOutcome 重命名 | 存量已覆盖 | oxn-proof-domain §Concept | `### ProbeOutcome` | - |
| Taint → InterferenceFlag 合并 | 存量已覆盖 | oxn-proof-domain §Forbidden | （挂 `### InterferenceFlag`） | - |
| 三态 COMPLETED/DEVIATED/INCONCLUSIVE | 存量已覆盖 | oxn-proof-domain §Concept | `### ProbeOutcomeThreeStates` | - |
| outcome 聚合结构替换 verdict 字段 | 存量已覆盖 | oxn-proof-domain §Concept | `### OutcomeAggregateStructure` | - |

### RFC-0009 doc-three-modalities · Accepted → oxn-project-domain
| 决策点 | 分级 | 目标 | 备注 |
|---|---|---|---|
| Asset/RFC/Doc 三情态分离 | 存量已覆盖 | oxn-project-domain §Boundary | `### Inv1Doc3Modalities` |

### RFC-0010 frozen-errata · Accepted → oxn-project-domain
| 决策点 | 分级 | 目标 Group | 目标 Axiom | 备注 |
|---|---|---|---|---|
| RFC frozen + errata 演进策略 | 存量已覆盖 | oxn-project-domain §EvolutionStrategy | （挂 `### EvolutionStrategy`） | - |
| Supersede 走新 RFC + superseded-by 字段 | 存量已覆盖 | oxn-project-domain §Boundary | （挂 EvolutionStrategy） | - |

### RFC-0011 builtin-asset-two-layer · Accepted → oxn-asset-domain + oxn-project-domain
| 决策点 | 分级 | 目标 Group | 目标 Axiom | 备注 |
|---|---|---|---|---|
| `@oxn/` builtin + `@prj/` project 两层 | 存量已覆盖 | oxn-asset-domain §Boundary | `### Inv3BuiltinAssetTwoLayer`（oxn-project-domain `### BuiltinAsset`） | - |

### RFC-0012 bootstrap-exemption · Accepted → oxn-project-domain
| 决策点 | 分级 | 目标 Group | 目标 Axiom | 备注 |
|---|---|---|---|---|
| 自举种子豁免仅限 src/builtin/ | 存量已覆盖 | oxn-project-domain §Boundary | `### Inv4BootstrapSeedExemption` | - |

### RFC-0013 versioning-policy · Accepted → oxn-project-domain + oxn-cli-domain
| 决策点 | 分级 | 目标 Group | 目标 Axiom | 备注 |
|---|---|---|---|---|
| 版本号中性（frontmatter 不带 version） | 存量已覆盖 | oxn-project-domain §Versioning | `### Version` axiom | - |
| Dev > Release 版本号卫生 | 存量已覆盖 | oxn-project-domain §Versioning | `### VersionHygiene` | - |
| 版本号注入无 build metadata | 存量已覆盖 | oxn-cli-domain §Concept | `### VersionHygiene` | - |
| patch 不走 alpha | 存量已覆盖 | oxn-project-domain §Versioning | （挂 `### Version`） | - |

### RFC-0014 asset-injection-mechanism · Accepted → oxn-asset-domain
| 决策点 | 分级 | 目标 Group | 目标 Axiom | 备注 |
|---|---|---|---|---|
| Asset 注入机制（RAG vs Asset 抉择） | 仅归档 | — | — | 决策已落，无新增 Axiom |

### RFC-0015 proof-system-overhaul · Draft → oxn-proof-domain + oxn-engine-domain
| 决策点 | 分级 | 目标 Group | 目标 Axiom | 备注 |
|---|---|---|---|---|
| 完整 Proof 体系重整 | 仅归档 | — | — | Draft 状态；多内容已通过 RFC-0003 + ADR-0066 落地 |

### RFC-0016 generic-verification-probes · Draft → oxn-proof-domain
| 决策点 | 分级 | 目标 | 备注 |
|---|---|---|---|
| 通用验证 Probe 扩展 | 仅归档 | — | Draft；后续可单独策划 |

### RFC-0017 terminology-two-tier-ssot · Draft → oxn-project-domain + oxn-asset-domain
| 决策点 | 分级 | 目标 Group | 目标 Axiom | 备注 |
|---|---|---|---|---|
| Domain 内部 SSOT + glossary 外部 SSOT | 转 Axiom | oxn-asset-domain §Concept | `### GlossaryTwoTierSSOT`（新 Axiom） | Draft，需 promote 后新增；现无 Axiom 直接承载 |
| glossary 单页 + 字母序 | 存量已覆盖 | （挂 `### GlossaryTwoTierSSOT`） | - | - |
| `scripts/sync-domain-glossary.ts` 唯一入口 | 转 Axiom | oxn-asset-domain §Concept | `### SyncDomainGlossaryEntry`（新） | - |

### RFC-0018 project-engineering-meta · Accepted → oxn-project-domain
| 决策点 | 分级 | 目标 | 备注 |
|---|---|---|---|
| Meta 层入口 = AGENTS.md | 存量已覆盖 | oxn-project-domain §Boundary | `### Inv6Meta4Layer` |
| CONTEXT-MAP.md 重构决策 | 仅归档 | — | — | 由 RFC-0028 撤销 |
| Asset/Doc/Draft/Meta 4 层 SSOT | 存量已覆盖 | oxn-project-domain §Boundary | `### Inv1Doc3Modalities` + `### Inv6Meta4Layer` |
| R&N 32 术语对照（附录 A） | 仅归档 | — | — | 哲学映射，转 ContextEngineering §AssetPeasRole 等价承载（已存在） |

### RFC-0019 draft-promote-routing · Draft → oxn-draft-domain
| 决策点 | 分级 | 目标 | 备注 |
|---|---|---|---|
| Draft promote 单一入口 router Blueprint | 存量已覆盖 | oxn-draft-domain §Boundary | `### Inv6DraftPromoteSingleEntry` + `### Inv14PromoteRouterSingleEntry` |
| 4-stage 生命周期 | 存量已覆盖 | oxn-draft-domain §Concept | `### DraftPromoteLifecycle` |

### RFC-0020 three-boundary-blueprint-elevation · Accepted → oxn-asset-domain + oxn-work-domain
| 决策点 | 分级 | 目标 Group | 目标 Axiom | 备注 |
|---|---|---|---|---|
| 三边界（Domain/Workflow/Stack）正交 | 存量已覆盖 | oxn-asset-domain §Concept | `### StructureV2` 边界相关 | - |
| Blueprint 提升组合模板 | 存量已覆盖 | oxn-asset-domain §Concept | `### StructureV2` | - |
| 跨 kind 引用 → Blueprint Use | 存量已覆盖 | oxn-asset-domain §Boundary | `### Inv15KindIsolationInReferences` | - |

### RFC-0021 domain-hierarchy-restructure · Accepted → oxn-asset-domain
| 决策点 | 分级 | 目标 | 备注 |
|---|---|---|---|
| Domain 三层架构（frontmatter+meta+concept+invariants） | 存量已覆盖 | oxn-asset-domain §Boundary | `### Inv29StructureV2Shape` |

### RFC-0022 ideal-data-flow · Accepted → oxn-work-domain
| 决策点 | 分级 | 目标 Group | 目标 Axiom | 备注 |
|---|---|---|---|---|
| Blueprint→Work→Task 数据流契约（P0-P8） | 存量已覆盖 | oxn-work-domain §Concept | `### WorkContext` / `### TaskContext` / `### PlanLockFiveHash` | - |

### RFC-0023 asset-paper-schema · Partially Accepted → oxn-asset-domain
| 决策点 | 分级 | 目标 Group | 目标 Axiom | 备注 |
|---|---|---|---|---|
| Asset Paper 4→3 字段（abstract+references+citations） | 存量已覆盖 | oxn-asset-domain §Boundary | `### Inv4PaperFieldsRequired` | - |
| 图渲染 deferred v0.7.0 | 仅归档 | — | — | 后续 work |

### RFC-0024 stack-operation-referent · Accepted → oxn-asset-domain + oxn-work-domain
| 决策点 | 分级 | 目标 Group | 目标 Axiom | 备注 |
|---|---|---|---|---|
| Operation = 执行参照；Probe = 验证参照 | 存量已覆盖 | oxn-asset-domain §Concept | `### Operation` | - |
| Blueprint slot.operate 引用 Operation | 存量已覆盖 | oxn-asset-domain §Boundary | `### Inv27OperateSubsetStackOperations` + `### Inv28OperationDisambiguation` | - |

### RFC-0025 stack-operation-followup · Accepted → oxn-asset-domain
| 决策点 | 分级 | 目标 Group | 目标 Axiom | 备注 |
|---|---|---|---|---|
| D2.4 git-stack 按需引用锁定 | 存量已覆盖 | oxn-asset-domain §Concept | `### Operation` | - |

### RFC-0026 version-iteration-redesign · Draft → oxn-project-domain
| 决策点 | 分级 | 目标 Group | 目标 Axiom | 备注 |
|---|---|---|---|---|
| Version 概念切换（前瞻 lock → 回顾 cut 记录） | 存量已覆盖 | oxn-project-domain §Versioning | `### Version` axiom | - |
| Goal 概念正名（PlanningPool → Goal） | 存量已覆盖 | oxn-project-domain §Versioning | `### Goal` axiom | - |
| Goal frontmatter 必填 6 字段 | 存量已覆盖 | oxn-project-domain §Boundary | `### Inv12GoalVersionRename` | - |
| 分支模型三层（main/dev/feat-goal） | 存量已覆盖 | oxn-project-domain §Boundary | `### Inv13BranchModelMainDevFeatGoal` | - |
| release-cut workflow 6-slot | 存量已覆盖 | oxn-project-domain §Versioning | （挂 `### Version`） | - |

### RFC-0027 asset-convergence-v070 · Accepted → 全 9 Domain
| 决策点 | 分级 | 目标 | 备注 |
|---|---|---|---|
| PR-F: Domain 收敛（D1-D14） | 存量已覆盖 | 各 Domain | PR-F commit `eb463c6` 已落地 |
| PR-G: Critical Name Collision (Scope→ReferenceScope, Part→BuiltinPart, Flag→InterferenceFlag) | 存量已覆盖 | oxn-proof-domain | 已完成（v1.1.0 v0.6.4 PR-B 合并） |
| PR-H: 6 个 Workflow 删除 + asset-create mode 化 | 存量已覆盖 | oxn-asset-domain | 已完成 |
| PR-I: AssetMap stub 标注 + scene-debug 接入 | 存量已覆盖 | oxn-asset-domain | 已完成 |

### RFC-0028 context-map-deprecation · Accepted → oxn-project-domain + 各 Domain
| 决策点 | 分级 | 目标 | 备注 |
|---|---|---|---|
| CONTEXT-MAP.md 整体删除 | 存量已覆盖 | oxn-project-domain §Boundary | `### Inv7ContextMapAssetIndexExempted` + AGENTS.md |
| Domain 内容回迁（9 段 → 12 Axiom） | 存量已覆盖 | 各 Domain | 已落地（v0.7.0） |
| 守门规则 5→4 | 存量已覆盖 | （守门脚本 `scripts/check-doc-boundary.ts`） | 已落地 |
| AGENTS.md 升格唯一 Meta 入口 | 存量已覆盖 | AGENTS.md | 已完成 |
| ADR cascade 17 个 | 仅归档 | — | 已完成 |

---

## 3. ADR 映射表（89 文档 / ~130 决策点）

### 3.1 已批量迁移入 RFC 的 ADR（48 Adopted，旧式正文 `> 状态：Adopted`）— 仅追溯，不转换

| ADR | 主题 | 入哪条 RFC |
|---|---|---|
| ADR-0001~0039（01~39 + 012/013） | 早期 OXL / Blueprint / Probe / Work / Insight 决策 | RFC-0001 ~ RFC-0008 |
| ADR-0048~0058 | Asset Library / 三边界 / 引用计数 / DAG | RFC-0004, 0020, 0021 |
| ADR-0059~0065 | OXL syntax + Domain 收敛 | RFC-0021, 0023, 0026 |

**分级**：仅归档（这些 ADR 的内容已在 theme RFC 中承载，Domain Axiom 落点已在 §2 中标注）。

### 3.2 ADR-0060 ~ 0099（带 frontmatter `status: Accepted`）— 主要本轮转换对象

#### ADR-0060 domain-vocabulary-boundary · Accepted → oxn-asset-domain
| 决策点 | 分级 | 目标 | 备注 |
|---|---|---|---|
| Domain vocabulary boundary 规则 | 存量已覆盖 | oxn-asset-domain §Boundary | `### Inv15KindIsolationInReferences` |

#### ADR-0061 data-flow-contract · Accepted → oxn-work-domain
| 决策点 | 分级 | 目标 | 备注 |
|---|---|---|---|
| Blueprint→Work→Task 7 项决策 | 存量已覆盖 | oxn-work-domain §Concept | （挂 `### PlanLockFiveHash`） |

#### ADR-0066 terminology-simplification · Accepted → oxn-domain + oxn-project-domain
| 决策点 | 分级 | 目标 Group | 目标 Axiom | 备注 |
|---|---|---|---|---|
| 术语精简：7 术语废弃 | 仅归档 | — | — | 理由已存 oxn-domain §Concept |
| 拆分 Verdict（ProbeOutcome / outcome / Report） | 存量已覆盖 | oxn-proof-domain §Concept | `### ProbeOutcome` / `### OutcomeAggregateStructure` |
| 三态字段 PASSED→COMPLETED / FAILED→DEVIATED | 存量已覆盖 | oxn-proof-domain §Concept | `### ProbeOutcomeThreeStates` |
| outcome 聚合结构 | 存量已覆盖 | oxn-proof-domain §Concept | `### OutcomeAggregateStructure` |
| Proof desc 重定义 | 存量已覆盖 | oxn-domain §Concept | `### Proof` |

#### ADR-0067 no-judgment-principle · Accepted → oxn-domain
| 决策点 | 分级 | 目标 | 备注 |
|---|---|---|---|
| OXN 彻底不判贯彻 | 存量已覆盖 | oxn-domain §Concept | `### PerformanceMeasureNotEnforced` |

#### ADR-0068 daemon-responsibility-boundary · Accepted → oxn-project-domain + oxn-engine-domain
| 决策点 | 分级 | 目标 | 备注 |
|---|---|---|---|
| Daemon 职责边界 | 存量已覆盖 | oxn-project-domain §DocArch | `### Daemon` axiom |
| Daemon 独立性 | 存量已覆盖 | oxn-engine-domain §Boundary | `### Inv5DaemonIndependence` |

#### ADR-0069 asset-bootstrap-completeness · Accepted → oxn-asset-domain
| 决策点 | 分级 | 目标 | 备注 |
|---|---|---|---|
| 6 Asset 完整性（已被 ADR-0089 替代为 5 起手） | 仅归档 | — | — | superseded by ADR-0089 D1 |

#### ADR-0070 glossary-domain-sync · Accepted → oxn-asset-domain + oxn-project-domain
| 决策点 | 分级 | 目标 Group | 目标 Axiom | 备注 |
|---|---|---|---|---|
| glossary 与 Domain 同步约定 | 存量已覆盖 | oxn-asset-domain §Concept | （挂 RFC-0017 `### SyncDomainGlossaryEntry` 待 promote） |
| Domain term `glossary-ref` 字段 | 存量已覆盖 | oxn-asset-domain §Boundary | （挂 `### Inv4PaperFieldsRequired`） | - |

#### ADR-0071 abolish-audit-trail · Accepted → oxn-engine-domain
| 决策点 | 分级 | 目标 | 备注 |
|---|---|---|---|
| 取消 AuditChain 术语 | 存量已覆盖 | oxn-engine-domain §Concept | （挂 `### OXNEngine` 哲学） |

#### ADR-0072 oxn-as-referent-for-nondeterministic-agent · Accepted → oxn-domain + oxn-proof-domain
| 决策点 | 分级 | 目标 Group | 目标 Axiom | 备注 |
|---|---|---|---|---|
| OXN 是确定性参照系（非智能体） | 存量已覆盖 | oxn-domain §Concept | `### OpenXenonThreePartyCollaboration` |
| 6 轴环境刻画 | 存量已覆盖 | oxn-domain §Concept | `### OpenXenonThreePartyCollaboration` + AssetPeasRole |
| Errata v1.0.1：执行代码不可变 = 确定性根基 | 存量已覆盖 | oxn-proof-domain §Concept | `### InterferenceFlag` + `### Kernel` axiom |
| 6 个参照锚点 | 存量已覆盖 | oxn-domain §Concept | （挂 `### OpenXenonThreePartyCollaboration`） |

#### ADR-0073 oxn-implementation-boundary-criteria · Accepted → oxn-engine-domain
| 决策点 | 分级 | 目标 Group | 目标 Axiom | 备注 |
|---|---|---|---|---|
| 实现边界判定标准 | 转 Axiom | oxn-engine-domain §Concept | `### ImplementationBoundaryCriteria`（新 Axiom） | 现有 Boundary 段无对应 Axiom 承载 |

#### ADR-0074 insight-ingredient-not-reasoner · Accepted → oxn-proof-domain
| 决策点 | 分级 | 目标 Group | 目标 Axiom | 备注 |
|---|---|---|---|---|
| Insight = 原料提供者，非推理者 | 存量已覆盖 | oxn-proof-domain §Concept | `### Insight` |
| 7 个 Insight Invariant | 存量已覆盖 | oxn-proof-domain §Boundary | Inv30-36（已并入 v0.6.4 PR-B） |

#### ADR-0075 round-loop-as-ai-search-record · Accepted → oxn-work-domain
| 决策点 | 分级 | 目标 | 备注 |
|---|---|---|---|
| Round = AI 搜索行为记录 | 存量已覆盖 | oxn-work-domain §Concept | `### Round` axiom |
| maxIterations 软反馈 | 存量已覆盖 | oxn-work-domain §Boundary | （挂 Round axiom） |

#### ADR-0076 adversarial-ownership-and-cross-llm-referent · Accepted → oxn-proof-domain
| 决策点 | 分级 | 目标 | 备注 |
|---|---|---|---|
| Main/Sub Agent 跨 LLM 扩展 | 存量已覆盖 | oxn-proof-domain §Concept | （挂 `### Probe` axiom） |
| 验证标准 AI 不可见 = 软对抗 | 存量已覆盖 | oxn-proof-domain §Concept | `### InterferenceFlag` |
| 协作边界分层 | 存量已覆盖 | oxn-domain §Concept | `### OpenXenonThreePartyCollaboration` |

#### ADR-0077 utility-owns-ai-oxn-converts-goal-to-boundary · Accepted → oxn-domain
| 决策点 | 分级 | 目标 | 备注 |
|---|---|---|---|
| Utility Owns AI / OXN Converts Goal → Boundary | 转 Theorem | oxn-domain §Concept | （挂 `### OpenXenonThreePartyCollaboration`） |

#### ADR-0078 llm-agent-knowledge-full-oxn-does-boundary-engineering · Accepted → oxn-domain
| 决策点 | 分级 | 目标 | 备注 |
|---|---|---|---|
| LLM Agent 知识全集 vs OXN 边界工程 | 存量已覆盖 | oxn-domain §Concept | `### OpenXenonThreePartyCollaboration` |

#### ADR-0079 asset-is-ontology-formal-reasoning-deferred · Accepted → oxn-asset-domain + oxn-domain
| 决策点 | 分级 | 目标 Group | 目标 Axiom | 备注 |
|---|---|---|---|---|
| Asset 是 ontology 形式推理推迟 | 转 Axiom | oxn-asset-domain §Concept | `### AssetAsOntology`（新 Axiom） |
| 拓扑闭包校验 | 转 Theorem | oxn-asset-domain §Boundary | （挂 `### Inv5DagNoCycles`） |

#### ADR-0080 error-terminology-unification-and-governance · Accepted → oxn-engine-domain
| 决策点 | 分级 | 目标 Group | 目标 Axiom | 备注 |
|---|---|---|---|---|
| 错误分类与命名规范（superseded by ADR-0081） | 仅归档 | — | — | superseded |

#### ADR-0081 oxn-unified-error-framework · Accepted → oxn-engine-domain + oxn-cli-domain
| 决策点 | 分级 | 目标 Group | 目标 Axiom | 备注 |
|---|---|---|---|---|
| 全栈错误分类（Kernel / Infra / Port / CLI Input） | 存量已覆盖 | oxn-engine-domain §Concept | `### IAPError` / `### OXNCrash` / `### CliInputError` |
| 错误类层次 | 存量已覆盖 | oxn-engine-domain §Forbidden | `### ForbiddenErrorContractFamily` |

#### ADR-0082 diagnostic-unification · Accepted → oxn-engine-domain + oxn-cli-domain
| 决策点 | 分级 | 目标 Group | 目标 Axiom | 备注 |
|---|---|---|---|---|
| 非阻断诊断 + L0-L3 日志架构 | 转 Axiom | oxn-engine-domain §Concept | `### DiagnosticUnification`（新 Axiom） |
| CLI JSON envelope | 存量已覆盖 | oxn-cli-domain §Boundary | `### Inv5JsonForAi` |
| state.json schema | 存量已覆盖 | oxn-work-domain §Concept | `### BirthCert` axiom |

#### ADR-0083 version-hygiene-over-build-metadata · Accepted → oxn-cli-domain
| 决策点 | 分级 | 目标 | 备注 |
|---|---|---|---|
| 版本号注入无 build metadata | 存量已覆盖 | oxn-cli-domain §Concept | `### VersionHygiene` axiom |
| CLI 版本标识策略 | 存量已覆盖 | oxn-cli-domain §Concept | （挂 `### VersionHygiene`） |

#### ADR-0084 collaboration-boundary-layering · Accepted → oxn-domain + oxn-work-domain
| 决策点 | 分级 | 目标 Group | 目标 Axiom | 备注 |
|---|---|---|---|---|
| 协作边界分层（工程师↔AI Agent↔OXN Engine） | 存量已覆盖 | oxn-domain §Concept | `### OpenXenonThreePartyCollaboration` |
| AI 自建 Asset 必须走 Draft→Promote | 存量已覆盖 | oxn-asset-domain §Boundary | `### Inv21AiAssetViaDraft` |
| Proof 是 OXN 下限 | 存量已覆盖 | oxn-proof-domain §Concept | `### Proof` axiom |
| 边界层"通道内 vs 通道外" | 存量已覆盖 | oxn-work-domain §Concept | （挂 `### Work` axiom） |
| "证据/证明" → "验证" 替代术语 | 仅归档 | — | — | 已被 ADR-0066/0067 吸收 |

#### ADR-0085 oxn-environment-characterization · Accepted → oxn-domain
| 决策点 | 分级 | 目标 | 备注 |
|---|---|---|---|
| OXN Engine 6 轴刻画（部分可观察 + 通道内确定） | 存量已覆盖 | oxn-domain §Concept | `### OpenXenonThreePartyCollaboration` |
| 搜索问题边界 | 转 Theorem | oxn-domain §Concept | （挂 OpenXenonThreePartyCollaboration） |

#### ADR-0086 taint-trust-baseline-design · Accepted → oxn-proof-domain
| 决策点 | 分级 | 目标 Group | 目标 Axiom | 备注 |
|---|---|---|---|---|
| InterferenceFlag 信任基线设计 | 存量已覆盖 | oxn-proof-domain §Concept | `### InterferenceFlag` axiom |
| 信任基线分层（Baseline / Step / Cumulative） | 转 Axiom | oxn-proof-domain §Concept | `### TrustBaselineLadder`（新 Axiom） |

#### ADR-0087 md-single-orthogonal-point · Adopted-legacy → oxn-asset-domain
| 决策点 | 分级 | 目标 | 备注 |
|---|---|---|---|
| MD 唯一正交点（禁止平行 yaml/json 元数据） | 转 Axiom | oxn-asset-domain §Boundary | `### Inv18TemplateIsEngineSsot`（已有但语义需强化） |

#### ADR-0088 test-suite-architecture · Accepted → oxn-work-domain + oxn-asset-domain
| 决策点 | 分级 | 目标 Group | 目标 Axiom | 备注 |
|---|---|---|---|---|
| 测试/Proof 边界（E0-E3 全栈） | 转 Axiom | oxn-work-domain §Boundary | `### TestProofBoundary`（新 Axiom） |
| 测试方法论 | 转 Theorem | oxn-work-domain §Concept | （挂 `### Round` axiom） |

#### ADR-0089 onboarding-starter-assets · Accepted → oxn-asset-domain
| 决策点 | 分级 | 目标 | 备注 |
|---|---|---|---|
| 5 起手 Asset（doc-md-domain / md-author-workflow / md-stack / md-author-blueprint / md-system） | 存量已覆盖 | oxn-asset-domain §Concept | `### OnboardingStarter` axiom |
| 项目消费者 onboarding 入口 | 存量已覆盖 | oxn-asset-domain §Concept | `### OnboardingPath` axiom |
| AssetCheck 完整性校验 | 存量已覆盖 | oxn-asset-domain §Concept | `### AssetCheck` axiom |
| ProjectBootstrap 流程 | 存量已覆盖 | oxn-asset-domain §Concept | `### ProjectBootstrap` axiom |
| Inv-23 project-bootstrap-5-assets | 存量已覆盖 | oxn-asset-domain §Boundary | `### Inv23ProjectBootstrap5Assets` |
| Inv-24 starter-asset-readonly | 存量已覆盖 | oxn-asset-domain §Boundary | `### Inv24StarterAssetReadonly` |

#### ADR-0090 builtin-engine-integration · Accepted → oxn-asset-domain + oxn-engine-domain
| 决策点 | 分级 | 目标 Group | 目标 Axiom | 备注 |
|---|---|---|---|---|
| Builtin engine 集成路径 | 存量已覆盖 | oxn-asset-domain §Concept | `### BuiltinAsset` axiom |
| `@oxn/` builtin scope | 存量已覆盖 | oxn-asset-domain §Boundary | `### Inv3BuiltinAssetTwoLayer` |

#### ADR-0091 stack-operation-as-execution-referent · Accepted → oxn-asset-domain
| 决策点 | 分级 | 目标 | 备注 |
|---|---|---|---|
| Operation 作为执行参照系 | 存量已覆盖 | oxn-asset-domain §Concept | `### Operation` axiom |

#### ADR-0092 stack-operation-followup · Accepted → oxn-asset-domain
| 决策点 | 分级 | 目标 Group | 目标 Axiom | 备注 |
|---|---|---|---|---|
| P3 OXL transformer 升级（regex → mdast） | 转 Axiom | oxn-asset-domain §Boundary | `### Inv31StackOxlTransformerMdast`（新） |
| D2.4 git-stack 按需引用 | 存量已覆盖 | oxn-asset-domain §Concept | `### Operation` axiom |
| P4 Skill 联动 | 存量已覆盖 | oxn-cli-domain §Concept | `### Skill` axiom |

#### ADR-0093 version-cut-record · Accepted → oxn-project-domain
| 决策点 | 分级 | 目标 | 备注 |
|---|---|---|---|
| Version 概念切换（前瞻 lock → 回顾 cut 记录） | 存量已覆盖 | oxn-project-domain §Versioning | `### Version` axiom |
| `dev/versions/` 整体退役 | 存量已覆盖 | oxn-project-domain §Versioning | `### RoadmapDeprecated` axiom |
| release-cut 触发 6-slot | 存量已覆盖 | oxn-project-domain §Versioning | （挂 `### Version`） |
| supersede 2026-07-27 RFC-0013 Errata 5+2=7 逻辑 | 仅归档 | — | — | 已 obsolete |

#### ADR-0094 goal-primary-planning · Accepted → oxn-project-domain
| 决策点 | 分级 | 目标 | 备注 |
|---|---|---|---|
| Goal 成为主规划单元 | 存量已覆盖 | oxn-project-domain §Versioning | `### Goal` axiom |
| Goal CLI 5 子命令 | 存量已覆盖 | oxn-project-domain §Versioning | （挂 `### Goal`） |

#### ADR-0095 intent-pool-v3-retired · Accepted → oxn-project-domain + oxn-proof-domain
| 决策点 | 分级 | 目标 | 备注 |
|---|---|---|---|
| Intent Pool v3 退役（5 池吸收进 Draft origin=insight） | 存量已覆盖 | oxn-project-domain §Versioning | `### IntentPoolDeprecated` axiom |
| CLI 退役 1 版本后移除 | 存量已覆盖 | oxn-project-domain §Boundary | `### Inv11IntentPoolV3Retired` |
| 5 类原 Intent Pool 类型 → 3 DraftType 映射 | 存量已覆盖 | oxn-proof-domain §Concept | `### InsightDraftMapping` axiom |

#### ADR-0096 draft-work-route-deprecated · Accepted → oxn-draft-domain
| 决策点 | 分级 | 目标 | 备注 |
|---|---|---|---|
| `promote-target=work` 已退役 | 存量已覆盖 | oxn-draft-domain §Boundary | `### Inv11DraftTargetWorkRejectedV050D3` + `### Inv20PromoteTargetWorkDeprecatedV030` |

#### ADR-0097 version-forcing-function · Accepted → oxn-project-domain
| 决策点 | 分级 | 目标 | 备注 |
|---|---|---|---|
| Version cut 三 trigger（a 时间 + b 最小 Goal + c 变更） | 存量已覆盖 | oxn-project-domain §Versioning | （挂 `### Version`） |

#### ADR-0098 branch-model-main-dev-feat · Accepted → oxn-project-domain
| 决策点 | 分级 | 目标 | 备注 |
|---|---|---|---|
| 分支三层 main/dev/feat-goal | 存量已覆盖 | oxn-project-domain §Boundary | `### Inv13BranchModelMainDevFeatGoal` |

#### ADR-0099 adr-landing-mandatory · Accepted → scripts（守门层）
| 决策点 | 分级 | 目标 Group | 目标 Axiom | 备注 |
|---|---|---|---|---|
| ADR Accepted 必须 filesystem 落地清单 + pre-commit | 转 Axiom | oxn-project-domain §Boundary | `### Inv14AdrAcceptedLandingRequired`（新 Axiom） | 当前脚本 `check-adr-landing.ts` 承载，需 Axiom 化 |
| landing-files / landing-reason (declarative / external / postponed) | 转 Theorem | （挂 `### Inv14AdrAcceptedLandingRequired`） | - |
| pre-commit 强制检查 | 存量已覆盖 | （脚本） | - |

---

## 4. 净新增 Axiom 清单（Phase 2 目标）

总计 **~38 个新 Axiom**，分布如下：

| 归属 Domain | 新增 Axiom | 数量 |
|---|---|---:|
| oxn-asset-domain | `### GlossaryTwoTierSSOT`、`### SyncDomainGlossaryEntry`、`### BlueprintPropsFunnel`、`### AssetAsOntology` | 4 |
| oxn-cli-domain | （暂无净新增） | 0 |
| oxn-draft-domain | （暂无净新增） | 0 |
| oxn-engine-domain | `### ImplementationBoundaryCriteria`、`### DiagnosticUnification` | 2 |
| oxn-project-domain | `### Inv14AdrAcceptedLandingRequired`（即 ADR-0099 升格） | 1 |
| oxn-proof-domain | `### TrustBaselineLadder` | 1 |
| oxn-work-domain | `### TestProofBoundary` | 1 |
| oxn-domain | （转 Theorem 挂 `### OpenXenonThreePartyCollaboration`，无独立 Axiom） | 0 |
| **合计** | | **~9 独立 Axiom + 若干 Theorem** |

**注**：§3.2 中"转 Axiom"的标注里部分 Axiom 实际已存在但语义需强化（如 `### Inv18TemplateIsEngineSsot` 强化为"MD 唯一正交点"），这类不计入新增。

---

## 5. 净新增 Theorem 行（挂靠现存 Axiom 的细化）

总计 **~50 个 Theorem 行**，分布如下：

| 归属 Domain | 挂靠 Axiom | 新 Theorem 行数 |
|---|---|---:|
| oxn-asset-domain | `### BlueprintPropsFunnel` 等 | ~12 |
| oxn-cli-domain | `### VersionHygiene` 等 | ~8 |
| oxn-draft-domain | `### DraftPromoteLifecycle` 等 | ~6 |
| oxn-engine-domain | `### IAPError` / `### DiagnosticUnification` 等 | ~10 |
| oxn-project-domain | `### Version` / `### Goal` / `### Inv14AdrAcceptedLandingRequired` 等 | ~10 |
| oxn-proof-domain | `### Probe` / `### ProbeOutcome` / `### InterferenceFlag` 等 | ~10 |
| oxn-work-domain | `### Round` / `### TestProofBoundary` 等 | ~4 |
| oxn-domain | `### OpenXenonThreePartyCollaboration` | ~2 |
| **合计** | | **~62 Theorem** |

---

## 6. Phase 2 分批执行计划（5 批 Asset Work）

| 批 | 目标 Domain | 来源 | 估算净新增 | 风险 | 预计工时 |
|---|---|---|---|---|---:|
| **A** | oxn-engine-domain | RFC-0002/0015/0016 + ADR-0002~0037, 0067, 0081, 0082 | 2 Axiom + 10 Theorem | 中（Kernel/Infra 改动需 Engine 层配套） | 1.5 day |
| **B** | oxn-work-domain + oxn-asset-domain | RFC-0004/0020~0025 + ADR-0049~0092 | 5 Axiom + 16 Theorem | 高（三边界 + Operation 改动涉及 Blueprint/Stack） | 2 day |
| **C** | oxn-proof-domain | RFC-0003/0005 + ADR-0011~0018, 0057~0086 | 1 Axiom + 10 Theorem | 中（Probe schema 需 Engine 校验同步） | 1.5 day |
| **D** | oxn-project-domain | RFC-0001/0008~0014/0017/0018/0028 + ADR-0066~0098 | 1 Axiom + 10 Theorem | 高（包含 Inv2RfcIsSsot 修订需走 RFC） | 2 day |
| **E** | oxn-draft-domain + oxn-cli-domain | RFC-0019/0026 + ADR-0038/0039/0083/0096 | 0 Axiom + 14 Theorem | 低 | 1 day |
| **合计** | | | **~9 Axiom + ~50 Theorem** | | **8 day** |

每批执行流程（per AGENTS.md「先建 Work」+ RFC-0019 promote routing）：
1. `oxn work create --type asset --blueprint asset-evolve` 建 Work（按 §6 批主题）
2. 修改对应 Domain 文件 + 跑 `check-asset-structure.ts` / `check-doc-boundary.ts` / `validate-dependencies.ts`
3. 跑 `bun scripts/sync-domain-glossary.ts --write` 同步 glossary
4. `oxn work submit` + 工程师审核 + PlanLock 锁定

---

## 7. Phase 3 规则修订（需 RFC 流程）

> **本节是 Phase 2 完成后才走的 RFC 修订，本 Draft 仅列目标，不展开内容**

1. **新 RFC（建议 RFC-0029）**：修订 `oxn-project-domain.md §Inv2RfcIsSsot` 语义
   - 旧："RFC 是 OXN 项目的 SSOT——所有规定性内容必须落 RFC"
   - 新："RFC/ADR = 规定性决策记录层（why）；现行约束语义 SSOT = `.openxenon/assets/domains/*.md`（Axiom/Theorem）；RFC 正文/related 引用对应 Domain 锚点作为约束解释"
2. **同步修订**：RFC README（"RFC 是 SSOT" → "RFC 是规定性决策记录，Domain 是现行约束 SSOT"）
3. **同步修订**：RFC-0017 §D1/D2 表述

**风险**：Invariant 不可直接修改（`scripts/check-doc-boundary.ts` 守门未直接守 invariant；逻辑守门在 AGENTS.md），必须由 RFC 授权。

---

## 8. Phase 4 守门扩展（`scripts/check-adr-landing.ts`）

扩展规则：
- Accepted ADR/RFC frontmatter 若无 `landing-reason`，其 `landing-files` 或 `related:` 中必须含至少一个 `.openxenon/assets/domains/*.md` 路径
- 两档模式：Phase 2 期间 pre-commit 报 warning（advisory，不阻塞）；全部批次落地后转 enforced（error，exit 1）
- `landing-reason: declarative` 豁免保留

---

## 9. 跨桶处理：存量"来源："尾注清理

按 Phase 2 各批 Work 执行时，**逐批清理**对应 Domain 中已有 ~22 处 `来源：ADR-XXXX（YYYY-MM-DD）` 尾注（git blame 保留追溯）：
- Asset-domain：~10 处
- Proof-domain：~3 处
- Work-domain：~9 处

清理范围：仅清理 Domain Axiom/Theorem 行尾的尾注（`来源：...` 模式）；保留变更标注（`🆕 v0.7.0 RFC-0027 PR-F（D11 合并）`）作为 git 历史锚。

---

## 10. 验证清单（Phase 1 完成后 · 工程师审核要点）

- [ ] 4 级分类判据（§1.2）是否被认可
- [ ] 路由分桶（§1.1）是否需调整归属
- [ ] 净新增 Axiom 清单（§4）每个新 Axiom 命名是否合理
- [ ] Phase 2 分批计划（§6）工时与风险评估是否合理
- [ ] Phase 3 Inv2 修订草案是否需要前置 RFC 评审
- [ ] Phase 4 守门扩展的两档模式（advisory → enforced）是否被认可

---

## 附录 A：来源计数核对

| 类别 | 文档数 | 决策点数（估算） |
|---|---:|---:|
| RFC（28 篇） | 28 | ~80 |
| ADR（89 篇） | 89 | ~130 |
| **合计** | **117** | **~210** |

| 分级 | 计数 |
|---|---:|
| 转 Axiom | ~38 |
| 转 Theorem | ~52 |
| 存量已覆盖 | ~65 |
| 仅归档 | ~55 |
| **合计** | **~210** |

## 附录 B：数据采集命令

```bash
# RFC 状态
for f in docs/rfc/zh-cn/RFC-*.md; do
  id=$(basename "$f" | sed 's/^RFC-\([0-9]*\)-.*/\1/')
  status=$(grep -m1 "^status:" "$f" | sed 's/status:\s*//')
  theme=$(grep -m1 "^theme:" "$f" | sed 's/theme:\s*//')
  echo "$id|$theme|$status"
done | sort -n

# ADR 状态
for f in docs/adrs/*.md; do
  id=$(basename "$f" | sed 's/^\([0-9]*\)-.*/\1/')
  status=$(grep -m1 "^status:" "$f" 2>/dev/null | sed 's/status:\s*//')
  echo "$id|$status"
done | sort -n

# Domain Axiom 清单
for f in .openxenon/assets/domains/oxn-*.md; do
  echo "=== $(basename $f) ==="
  grep "^### " "$f"
done
```