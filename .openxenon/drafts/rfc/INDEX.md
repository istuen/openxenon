# ADR 索引

> **来源**：2026-07-04 docs-tmp-cleanup work 抽取 + 2026-07-09 doc-unify-layout 救援 + 2026-07-10 v0.6.1-alpha.4 ADR 追加 + 2026-07-12 三边界框架 ADR 追加 + 2026-07-17 archive-mirror-structure Superseded 段抽出 + 2026-07-21 术语精简立法 (0066/0067/0068) + 2026-07-23 auditTrail 废除 (0071) + 2026-07-23 OXN 参照系定位 (0072) + 2026-07-23 OXN 实现边界判据 (0073) + 2026-07-23 Insight 原料非推理 (0074) + 2026-07-23 Round loop 定位修订 (0075) + 2026-07-23 对抗关系归属与跨 LLM 参照 (0076) + 2026-07-23 Utility 归属与目标→边界转换 (0077) + 2026-07-23 LLM agent knowledge-full 与边界工程 (0078) + 2026-07-23 Asset 全体是 Ontology 与形式化推理保留 (0079) + 2026-07-23 错误与冲突处理术语统一与新增错误规范 (0080) + 2026-07-24 OXN 统一错误体系框架 (0081) + 2026-07-25 OXN Diagnostic 统一 (0082)
> **总计**：63 条活跃 ADR（来自 v0.0 ~ v0.7 共 9 个版本的讨论记录）+ **6 条 Superseded 已归档**（详见 `.archived/docs/adrs/`）+ 8 条 0040-0047 已归档于 `2026-07-05-archive-0040-0047-memory-series-superseded.md`
> **OXP 首批**：2026-07-22 首批 3 条 ADR promote 到 [docs/rfc/zh-cn/](../../docs/rfc/zh-cn/)（详见下方"已 promote 的 OXP"段）
> **位置**：`.openxenon/drafts/rfc/`（对内-沉淀层，append-only）+ `.openxenon/.archived/docs/adrs/`（Superseded 历史归档）
> **约定**：决策一旦记录不编辑不删除；被推翻时新 ADR 标记旧 ADR 为 Superseded；Superseded ADR 在 v0.6.1-alpha.4 起物理归档到 `.archived/`

## 状态图例

| 状态 | 含义 | 数量 |
|---|---|---|
| ✅ **Adopted** | 已落 SSOT + 代码 | 43 |
| 🟡 **Partially Adopted** | 部分已落，部分待办 | 5 |
| 💡 **Proposed** | 待 v0.7+ 落地 | 11 |
| ⛔ **Superseded** | 被推翻（v0.6.1-alpha.4 起归档到 `.archived/docs/adrs/`） | 6 |

## 已归档 Superseded (2026-07-17 archive-mirror-structure 抽出)

| ADR | 标题 | 归档位置 |
|---|---|---|
| 0019 | Blueprint Type 范式 | [`.archived/docs/adrs/0019-blueprint-type-paradigm.md`](../../.archived/docs/adrs/0019-blueprint-type-paradigm.md) |
| 0033 | IAP 对外命名分歧 | [`.archived/docs/adrs/0033-iap-public-naming-disagreement.md`](../../.archived/docs/adrs/0033-iap-public-naming-disagreement.md) |
| 0034 | Work 前置精准阻断 vs Daemon 全局崩溃 | [`.archived/docs/adrs/0034-work-precise-block-not-daemon-cascade.md`](../../.archived/docs/adrs/0034-work-precise-block-not-daemon-cascade.md) |
| 0036 | canonical.oxn 命名约定(已废除) | [`.archived/docs/adrs/0036-canonical-oxn-naming-superseded.md`](../../.archived/docs/adrs/0036-canonical-oxn-naming-superseded.md) |
| 0048 | library/external Asset 子目录方案 | [`.archived/docs/adrs/0048-asset-library-external-scheme.md`](../../.archived/docs/adrs/0048-asset-library-external-scheme.md) |
| 0053 | Superseded ADR-0048 墓碑 | [`.archived/docs/adrs/0053-superseded-0048-library-external-scheme.md`](../../.archived/docs/adrs/0053-superseded-0048-library-external-scheme.md) |

> 物理归档约定:从 `.openxenon/drafts/rfc/` mv 到 `.openxenon/.archived/docs/adrs/`,保留原文件名以维持编号可追溯。原 INDEX 描述(主题分类)已从本索引删除；新 ADR 引用 Superceded 决策时使用 `.archived/docs/adrs/00XX-*.md` 相对链接。

## 主题分类索引

> 仅含 52 条活跃 ADR；⛔ Superseded 已移至"已归档 Superseded"段。

### 1. OXL / Blueprint 哲学（8 条）

### 2. Kernel / L0 边界（7 条）

| ADR | 标题 | 状态 |
|---|---|---|
| [0008](./0008-probe-observation-vs-verdict.md) | ProbeObservation vs ProbeOutcome 二元公理 | ✅ Adopted |
| [0009](./0009-architectural-guard-tests-trace-before-state.md) | 架构守护测试 + Trace-before-State 写入顺序 | ✅ Adopted |
| [0010](./0010-path-port-injection.md) | PathPort 注入原理 | ✅ Adopted |
| [0011](./0011-evidence-chain-triple.md) | 证据链三件套（frozen.json + trace.jsonl + state.json） | ✅ Adopted |
| [0013](./0013-no-langium-type-leak-acl.md) | L1 contracts 不允许 Langium 类型泄露（ACL 守则） | ✅ Adopted |
| [0037](./0037-part-resolver-moved-to-l2-work.md) | part-resolver 从 Kernel 迁 L2 Work 的依据 | ✅ Adopted |
| [0068](./0068-daemon-responsibility-boundary.md) | Daemon 职责边界（运行时状态监听 + 事件监听） | ✅ Adopted |

### 3. AI 协作哲学（9 条）

| ADR | 标题 | 状态 |
|---|---|---|
| [0012](./0012-main-sub-agent-audit-chain.md) | Main/Sub Agent 审计链哲学 | ✅ Adopted |
| [0020](./0020-intent-align-unified-matrix.md) | Intent/Align 统一矩阵（Blueprint=Intent, Work=Align） | ✅ Adopted |
| [0022](./0022-guided-adaptive-unmanaged-ai-modes.md) | Guided / Adaptive / Unmanaged 三模式 AI 执行 | 💡 Proposed |
| [0031](./0031-proof-notary-not-judge.md) | Proof = 客观事实记录 ≠ 裁判 | ✅ Adopted |
| [0032](./0032-pi-vs-opencode-selection.md) | Pi vs OpenCode 选型最终结论 | ✅ Adopted |
| [0057](./0057-trust-chain-core-model.md) | 三方协作模型——OpenXenon 的核心模型（工程师↔OXN↔AI 三方拓扑） | ✅ Adopted |
| [0058](./0058-minimum-trust-closure.md) | 最小闭环（v0.6.1 Scope = 四层确定性） | ✅ Adopted |
| [0067](./0067-no-judgment-principle.md) | 彻底不判原则的代码贯彻 | ✅ Adopted |
| [0076](./0076-adversarial-ownership-and-cross-llm-referent.md) | 对抗关系归属与跨 LLM 参照锚点（软对抗两层分离 + ADR-0012 跨 LLM 扩展） | ✅ Adopted |

### 4. Work / Asset（10 条）

| ADR | 标题 | 状态 |
|---|---|---|
| [0004](./0004-arsenal-resolver-priority-chain.md) | ArsenalResolver 优先级链（Project > Global > Builtin） | ✅ Adopted |
| [0005](./0005-strategic-correction-running-time-isolation.md) | LSP/Monorepo/北极星战略纠偏 | ✅ Adopted |
| [0024](./0024-partid-primary-key-atomic-write.md) | partId 主键 + atomic-write | ✅ Adopted |
| [0025](./0025-task-sandbox-local-vs-namespace.md) | Task 沙箱豁免 + `./` vs `@` namespace 纪律 | ✅ Adopted |
| [0026](./0026-skill-three-partition-intent-align-proof.md) | Skills 三分（oxn-intent / oxn-align / oxn-proof） | 🟡 Partial |
| [0027](./0027-domain-as-ssot-governance.md) | Domain 作为 SSOT 的工程化治理 | 🟡 Partial |
| [0035](./0035-catalog-json-probe-excluded.md) | catalog.json + Probe-excluded 规则 | ✅ Adopted |
| [0049](./0049-work-context-md-replaces-memory.md) | Work Context .md 取代 Memory 层 | ✅ Adopted |
| [0050](./0050-onboarding-via-starter-work.md) | 通过 Starter Work 引导新用户 | ✅ Adopted |
| [0051](./0051-asset-paper-citation-network.md) | Asset Paper 引用/引用网络方案（auditTrail 部分被 [0071](./0071-abolish-audit-trail.md) 废除） | ✅ Adopted |
| [0054](./0054-three-boundary-framework.md) | 三边界框架（Domain/Workflow/Stack 正交维度） | ✅ Adopted |
| [0055](./0055-blueprint-as-composition-template.md) | Blueprint 提升为组合模板（E1 Asset 内的隔离层） | ✅ Adopted |
| [0056](./0056-external-inline-and-status.md) | External inline 收敛 + 状态管理 | ✅ Adopted |
| [0061](./0061-data-flow-contract.md) | Blueprint → Work → Task 数据流契约（runtime 闭环 + 多视角 + DAG + Stack 注入） | ✅ Adopted |
| [0075](./0075-round-loop-as-ai-search-record.md) | Round loop 定位修订——从 OXN 强制机制改为 AI 搜索行为记录（maxIterations 硬限→Blueprint 配置 + 软反馈） | ✅ Adopted |

### 5. Insight / Skill（6 条）

| ADR | 标题 | 状态 |
|---|---|---|
| [0015](./0015-insight-four-entity-evidence-chain.md) | Insight 四实体证据链 schema | 🟡 Partial |
| [0016](./0016-ai-insight-three-donts.md) | AI 启示"三层不要" | 💡 Proposed |
| [0017](./0017-probe-stats-cross-proof-accumulation.md) | probe-stats.json 跨 proof 累积机制 | 🟡 Partial |
| [0018](./0018-lsp-readonly-fork-atomic-index-cli-proxy.md) | LSP readonly + Fork-to-Local + atomic-index + CLI proxy | ✅ Adopted |
| [0039](./0039-oxn-work-skill-restructure.md) | oxn-work Skill 重构（拆 5 references + 4 assets） | 💡 Proposed |
| [0074](./0074-insight-ingredient-not-reasoner.md) | Insight 架构边界——原料提供者非推理引擎（ADR-0073 四判据验证） | ✅ Adopted |

### 6. Docs / Brand（5 条）

| ADR | 标题 | 状态 |
|---|---|---|
| [0014](./0014-why-openxenon-motivation-narrative.md) | "Why OpenXenon" — AI 漂移根因与人格化叙事 | 💡 Proposed |
| [0023](./0023-at-addressing-no-arrow-pointer.md) | `@` 一贯寻址哲学 + `->` 伪指针否决 | ✅ Adopted |
| [0028](./0028-resource-port-cache-port-work-snapshot.md) | ResourcePort + CachePort + WorkSnapshot（待办） | 💡 Proposed |
| [0029](./0029-anchor-slot-doc-binding.md) | Anchor / Slot 文档绑定机制（待办） | 💡 Proposed |
| [0030](./0030-term-cross-reference-upstream-dag.md) | `@term/X` 跨 term 寻址 + `@upstream` DAG（待办） | 💡 Proposed |

### 7. Domain 词汇架构（14 条）

| ADR | 标题 | 状态 |
|---|---|---|
| [0059](./0059-domain-reference-model-v2.md) | Domain 引用模型 v2（references DAG + MD 链接代替 composes） | ✅ Adopted |
| [0060](./0060-domain-vocabulary-boundary.md) | Domain 词汇边界（What/How 判据 + 引用规则） | ✅ Adopted |
| [0052](./0052-langium-retirement-oxn-deprecation.md) | Langium 退役（作为 D2 实现词汇反复印证的案例） | ✅ Adopted |
| [0066](./0066-terminology-simplification.md) | 术语精简——废弃叙事层冗余术语，统一到 Proof | ✅ Adopted |
| [0069](./0069-asset-bootstrap-completeness.md) | Asset 自举完整性——最小可用 Asset 集规范 | ✅ Adopted |
| [0070](./0070-glossary-domain-sync.md) | Glossary ↔ Domain 同步机制 | ✅ Adopted |
| [0071](./0071-abolish-audit-trail.md) | 废除 auditTrail 字段——Asset Paper 4→3 字段 | ✅ Adopted |
| [0072](./0072-oxn-as-referent-for-nondeterministic-agent.md) | OXN = 非确定性智能体的确定性参照系（PEAS 三处错修订 + Referent 命名） | ✅ Adopted |
| [0073](./0073-oxn-implementation-boundary-criteria.md) | OXN 实现边界判据——四轴判据集（补偿方向/agent 级别/floor-ceiling/路径判据） | ✅ Adopted |
| [0077](./0077-utility-owns-ai-oxn-converts-goal-to-boundary.md) | Utility 归属 AI；OXN 机制 = 目标→边界参照转换（Term #9 修订 + Probe verdict 本质） | ✅ Adopted |
| [0078](./0078-llm-agent-knowledge-full-oxn-does-boundary-engineering.md) | LLM Agent 是 knowledge-full；OXN 做边界工程非知识工程（前提→机制→结构→判据闭环） | ✅ Adopted |
| [0079](./0079-asset-is-ontology-formal-reasoning-deferred.md) | Asset 全体是 Ontology；OXN 形式化推理能力保留不实现（边界=Ontology 定义 + AI 推理归属 + 递归边界工程） | ✅ Adopted |
| [0080](./0080-error-terminology-unification-and-governance.md) | 错误与冲突处理术语统一 + 新增错误规范机制（三层分类 + 命名规范 + 决策树 + 僵尸码清理） | ✅ Adopted |
| [0081](./0081-oxn-unified-error-framework.md) | OXN 统一错误体系框架（EngineError + CLIError 双基类 + Domain 子类 + severity 两档，取代 ADR-0080 类型层） | 💡 Proposed |
| [0082](./0082-diagnostic-unification.md) | OXN Diagnostic 统一（LoggerPort + consola 隔离层 + 单通道 logger 调用，取代 7 种碎片化 warning pattern） | 💡 Proposed |

### 8. 历史 / 命名（4 条）

| ADR | 标题 | 状态 |
|---|---|---|
| [0006](./0006-three-phase-model.md) | 三相模型（静态结构 → Loop → 静态产物） | 💡 Proposed |
| [0007](./0007-loop-observation-three-dimensions.md) | Loop 行为观测三维度（命令 + 规则 + 重试） | 💡 Proposed |
| [0038](./0038-i18n-library-selection.md) | i18n 库选型（Paraglide vs typesafe-i18n vs i18next） | 🟡 Partial |
| [0052](./0052-langium-retirement-oxn-deprecation.md) | Langium Retirement & .oxn Deprecation | ✅ Adopted |

## ADR 落地状态一览

### 已落 SSOT（31 条 · 标记 SSOT 已增补位置）

| ADR | 落地位置（SSOT 增补） |
|---|---|
| 0001 | `docs/product/zh-cn/concepts/asset.md` §Blueprint props 漏斗 |
| 0002 | `docs/product/zh-cn/concepts/proof.md` §Probe 五级参数链 |
| 0003 | `docs/dev/zh-cn/architecture.md` §运行期隔离 |
| 0004 | `docs/product/zh-cn/concepts/asset.md` §ArsenalResolver 优先级 |
| 0008 | `docs/dev/zh-cn/architecture.md` §ProbeObservation vs ProbeOutcome |
| 0009 | `docs/dev/zh-cn/architecture.md` §Trace-before-State |
| 0011 | `docs/product/zh-cn/concepts/work.md` §证据链三件套 |
| 0012 | `docs/dev/zh-cn/architecture.md` §Main/Sub Agent |
| 0014 | `docs/product/zh-cn/_index.md` Motivation 段 |
| 0021 | `docs/dev/zh-cn/architecture.md` §四关键字 |
| 0023 | `docs/product/zh-cn/reference/glossary.md` §`@` 哲学 |
| 0024 | `docs/product/zh-cn/concepts/work.md` §partId + atomic-write |
| 0031 | `docs/product/zh-cn/concepts/proof.md` §Proof 客观事实记录边界 |
| 0035 | `docs/product/zh-cn/concepts/asset.md` §catalog.json |
| 0052 | `packages/engine/src/oxl/langium-driver/` 删除 + `docs/dev/zh-cn/oxn-cli.md` + `docs/product/zh-cn/concepts/work.md` §Langium 退役 |
| 0054 | `docs/product/zh-cn/concepts/asset.md` §三边界框架 |
| 0055 | `docs/product/zh-cn/concepts/asset.md` §Blueprint 组合模板 + **runtime 注入 v0.7.3 P1** |
| 0057 | `docs/product/zh-cn/concepts/iap-paradigm.md` §3.1 三方协作模型 |
| 0058 | `docs/product/zh-cn/concepts/iap-paradigm.md` §13 最小闭环 |
| 0060 | **runtime 多视角注入 v0.7.3 P3**（D4/D8 纸面规范 → 落地） |
| 0061 | v0.7.3 **P1-P8 全落地 (GA)** — D1-D7 全部 runtime 闭环 |
| 0071 | `.openxenon/assets/domains/oxn-asset-domain.md` inv-4 降为 3 字段 |
| 0072 | `CONTEXT-MAP.md` PEAS 块重写 + `.openxenon/assets/domains/oxn-domain.md` 新增 Referent + `docs/glossary/zh-cn/core-terms.md` 同步 |
| 0073 | `CONTEXT-MAP.md` 对照表扩展 4 行 + 四判据小节 + `.openxenon/assets/domains/oxn-domain.md` 新增 Floor/Ceiling + `docs/glossary/zh-cn/core-terms.md` 同步 |
| 0074 | `CONTEXT-MAP.md` 对照表扩展 1 行 + 分布式学习闭环小节 |
| 0075 | `CONTEXT-MAP.md` 对照表 Term #7 修订 + Term #13 新增（代码修改待 v0.7+：`dual-state-exec.ts` maxIterations 硬限→软反馈 + `work.md` §3 修订） |
| 0076 | `CONTEXT-MAP.md` 对照表扩展 1 行（Term #14） |
| 0077 | `CONTEXT-MAP.md` 对照表扩展 1 行（Term #18）+ Term #9 修订 |
| 0078 | `CONTEXT-MAP.md` 对照表扩展 1 行（Term #22） |
| 0079 | `CONTEXT-MAP.md` 对照表扩展 1 行（Term #24） |
| 0080 | `.openxenon/drafts/error-code-registry.md`（错误码全量 SSOT）+ `.openxenon/drafts/error-conflict-handling-convergence.md`（术语统一草稿） |

### 待办（10 条 Proposed · 进 v0.7+ RFC 子 PR）

| ADR | 候选 sprint |
|---|---|
| 0006 | v0.7-emergence §三相模型 |
| 0007 | v0.6.x-observability-roadmap §Loop 三维 |
| 0016 | llm-prompt.md §AI 行为指引 |
| 0022 | v0.7-emergence §三模式 AI |
| 0028 | v0.7-emergence §ResourcePort |
| 0029 | v0.7-emergence §Anchor/Slot |
| 0030 | v0.7-emergence §Domain DSL 演进 |
| 0039 | v0.7-plus-roadmap §Skill 重构 |
| 0081 | v0.8+ §统一错误体系迁移 |
| 0082 | v0.8+ §Diagnostic 统一迁移 |

## 写作约定

每条 ADR 包含 frontmatter（status / date / supersedes / superseded-by）+ 7 节结构：

```yaml
status: PROPOSED        # PROPOSED | ACCEPTED | DEPRECATED | SUPERSEDED
date: YYYY-MM-DD
supersedes: null        # ADR-NNNN (如适用)
superseded-by: null     # ADR-NNNN (如适用)
```

### ADR 7 节模板

1. **Context** — 背景与动机：是什么问题 / 决策触发？现有约束？涉及哪些利益相关者？
2. **Decision** — 决策本身（**只写决策**，不解释为什么——为什么放 Consequences 节）
3. **Consequences** — 影响与后果（正面 / 风险 / 衍生工作）
4. **Alternatives Considered**（可选但推荐）— 其他方案 A/B + 优缺点
5. **References** — 相关文档 / 链接

### 编号规则

| 区间 | 含义 | 来源 |
|---|---|---|
| `0000` | 模板 | `dev/architecture/adr/0000-template.md`（已合并到此 INDEX） |
| `0001` ~ `0047` | docs-tmp 时代 ADR | 从 `.openxenon/forges/splits/archive/docs-tmp-era/` 迁入 |
| `0048` ~ `0051` | Asset Paper 4 ADR | 从 `.openxenon/forges/splits/archive/docs-tmp-era/decisions/` 迁入 |
| `0052+` | 新 ADR | 新决策按顺序编号 |

## 已 promote 的 OXP（首批 2026-07-22）

> ADR → OXP 是单向投影。ADR 是内部 SSOT（append-only），OXP 是外部归档（accepted 后核心冻结，仅可追加 errata 段）。
> Promote 流程见 Blueprint [`doc-rfc-workflow`](../../assets/blueprints/doc-rfc-workflow.md)。

| OXP | 标题 | 来源 ADR |
|---|---|---|
| [OXP-0001](../../docs/rfc/zh-cn/OXP-0001-terminology-simplification.md) | 术语精简——废弃叙事层冗余术语，统一到 Proof | [ADR-0066](./0066-terminology-simplification.md) |
| [OXP-0002](../../docs/rfc/zh-cn/OXP-0002-no-judgment-principle.md) | 彻底不判原则的代码贯彻 | [ADR-0067](./0067-no-judgment-principle.md) |
| [OXP-0003](../../docs/rfc/zh-cn/OXP-0003-daemon-responsibility-boundary.md) | Daemon 职责边界——运行时状态监听 + 事件监听 | [ADR-0068](./0068-daemon-responsibility-boundary.md) |

> 下一批候选：OXP-0004 (ADR-0059 Domain 引用模型 v2) / OXP-0005 (ADR-0060 Domain 词汇边界) / OXP-0006 (ADR-0061 数据流契约)。

## 元数据

- **抽取 work**：docs-tmp-cleanup
- **抽取日**：2026-07-04
- **讨论跨度**：2026-05-14 → 2026-07-12（58 天）
- **涉及版本**：v0.0 → v0.6.1

---

## RFC 主题分组（v0.6.1 → v0.8.x 收敛视图）

> **状态图例**：✅ 已实现 / 📝 Draft / 💡 Proposed / 🟢 Accepted / 📦 已归档（合并到他处）
> **抽取日**：2026-07-21（基于 OpenXenon 协作生命周期 v0.8 设计讨论）

### 1. Asset Paper 完整版

| RFC | 状态 | 核心交付 |
|---|---|---|
| [v0.6.3-asset-paper-schema-rfc.md](./v0.6.3-asset-paper-schema-rfc.md) | 🟡 Partial | Asset schema 3 字段（abstract/references/citations）+ 引用 DAG 基础（auditTrail 已被 [ADR-0071](./0071-abolish-audit-trail.md) 废除） |
| [0-7-0-asset-graph changelog](../../changes/0-7-0-asset-graph.md) | 📝 planned | Asset 影响图 + Hall 集成 + citations 增量计算 + Impact Radius |

### 2. Domain 引用体系

| RFC | 状态 | 核心交付 |
|---|---|---|
| [v0.7-domain-hierarchy-restructure-rfc.md](./v0.7-domain-hierarchy-restructure-rfc.md) | ✅ 已实现于 v0.6.1 | 三层 Domain 架构（Root + Package + Module） |
| ADR-0059 / ADR-0060 | ✅ Adopted | Domain 引用模型 v2 + 词汇边界 |
| [v0.8.0-term-upstream-dag-rfc.md](./v0.8.0-term-upstream-dag-rfc.md) | 📝 Draft | `@term/X` 跨 term 寻址 + `@upstream` 域间 DAG |

### 3. 数据流契约

| RFC | 状态 | 核心交付 |
|---|---|---|
| [v0.7.3-ideal-data-flow-rfc.md](./v0.7.3-ideal-data-flow-rfc.md) | ✅ 已实现于 v0.6.1 | Blueprint → Work → Task runtime 接通 P0-P8 |
| ADR-0061 | ✅ Adopted | data-flow-contract 官方契约 |

### 4. Langium 切割

| RFC | 状态 | 核心交付 |
|---|---|---|
| [oxn-deprecation-rfc.md](./oxn-deprecation-rfc.md) | ✅ 已实现于 v0.6.1（原规划 v0.7.0，实际提前） | Langium 删除 + .oxn 全量移除 + CLI 清理 |

### 5. Probe 体系演进（v0.8.1 合并）

| RFC | 状态 | 核心交付 |
|---|---|---|
| [v0.8.1-probe-system-evolution-rfc.md](./v0.8.1-probe-system-evolution-rfc.md) | 📝 Draft | **合并 3 份**：追溯机制 + 内外接口严格分离 + 目标成果类型分类（TargetType + OutcomeCategory） |
| [v0.8.1-proof-traceability-rfc.md](./v0.8.1-proof-traceability-rfc.md) | 📦 已归档 → v0.8.1-probe-system-evolution | 追溯机制（partExecutions + trace.jsonl + frozen.json 不可篡改 + traceability-report） |
| [v0.8.4-probe-outcome-type-rfc.md](./v0.8.4-probe-outcome-type-rfc.md) | 📦 已归档 → v0.8.1-probe-system-evolution | 目标成果类型分类（TargetType + OutcomeCategory） |
| （v0.8.3-probe-internal-external 未写过，已合并） | 📦 合并到 v0.8.1 | Probe 内外接口严格分离 |

### 6. Work 模型 + AI 三模式

| RFC | 状态 | 核心交付 |
|---|---|---|
| [work-unified-model-rfc.md](./work-unified-model-rfc.md) | ✅ 已实现于 v0.6.1 | 4 决策整合（Asset 创建统一 + Work 引用收敛 + Round 改进 + 3 IAP phase） |
| [v0.7.1-ai-three-modes-rfc.md](./v0.7.1-ai-three-modes-rfc.md) | 📝 Draft | AI 三模式分级（Guided/Adaptive/Unmanaged） |

### 7. v0.7.x 协作效率层

| RFC | 状态 | 核心交付 |
|---|---|---|
| [v0.7-emergence-rfc.md](./v0.7-emergence-rfc.md) | ✅ Approved | Insight 审核闭环 + 模式库 + Mermaid + Hall v0.5 |
| [v0.7.0-infra-ports-rfc.md](./v0.7.0-infra-ports-rfc.md) | 📝 Draft | Infra Ports（ResourcePort + CachePort + WorkSnapshot） |
| [v0.7.2-anchor-slot-rfc.md](./v0.7.2-anchor-slot-rfc.md) | 📝 Draft | Anchor / Slot 文档双向绑定 |

### 8. Domain scope（待写）

| 主题 | 状态 | 备注 |
|---|---|---|
| v0.8.2 domain-scope | 📝 待写 | Domain `appliesTo` globs 字段 + 路径匹配 |

### 9. version-unification 冲突说明

| RFC | 状态 | 备注 |
|---|---|---|
| [version-unification-rfc.md](./version-unification-rfc.md) | 📝 Draft | **meta-RFC**：原规划 v0.8.x 主题已被实际 RFC 取代（详见 §冲突说明） |

### 10. 架构参考

| RFC | 状态 | 核心交付 |
|---|---|---|
| [openxenon-architecture-from-adrs.md](./openxenon-architecture-from-adrs.md) | 📝 Draft | 从 30 条 Adopted + 5 条 Partial ADR 反向提取架构图景（原版） |
| [openxenon-architecture-from-adrs-simplified.md](./openxenon-architecture-from-adrs-simplified.md) | 📝 Draft | 简化版（剥离过时机制 + 词汇简化） |

---

### v0.8.x RFC 现状一览

| 版本 | RFC | 核心交付 | 状态 |
|---|---|---|---|
| v0.8.0 | [term-upstream-dag](./v0.8.0-term-upstream-dag-rfc.md) | `@term/X` + `@upstream` DAG | 📝 Draft |
| **v0.8.1** | [**probe-system-evolution**](./v0.8.1-probe-system-evolution-rfc.md) | **追溯 + 内外拆 + 目标成果分类** | **📝 Draft（合并 3 份）** |
| v0.8.2 | domain-scope | Domain `appliesTo` 字段 | 📝 待写 |
| v0.8.3 | （已合并到 v0.8.1） | — | — |
| v0.8.4 | （已合并到 v0.8.1） | — | — |
| v0.8.5+ | AI 登记预期成果 | 启用 `SubmitTaskParams.evidence` | 📝 待写 |

---

### RFC 落地路径

```
v0.6.1（已发布，当前版本）
  │
  ├── Asset Paper 3 字段           ✅ 实现
  ├── 三边界框架 + Blueprint 提升  ✅ 实现
  ├── Domain 三层架构               ✅ 实现
  ├── 数据流契约 P0-P8             ✅ 实现
  ├── Langium 切割 + .oxn 移除     ✅ 实现
  └── Work 4 决策整合              ✅ 实现
  │
  ▼
v0.7.0（planned 2026-11-15）
  ├── Insight 审核闭环 + 模式库    📝 Approved
  ├── Infra Ports                  📝 Draft
  └── Asset 影响图 + Hall v0.5    📝 planned
  │
  ▼
v0.7.1（planned 2026-12-15）
  └── AI 三模式分级               📝 Draft
  │
  ▼
v0.7.2（planned 2027-01-15）
  └── Anchor/Slot 文档绑定        📝 Draft
  │
  ▼
v0.8.0（planned 2027-02-15）
  └── `@term/X` + `@upstream` DAG  📝 Draft
  │
  ▼
v0.8.1（planned 2027-03+）
  └── Probe 体系演进              📝 Draft（合并）
        ├── 追溯机制（record-not-block）
        ├── 内外接口严格分离
        └── 目标成果类型分类
  │
  ▼
v0.8.2+（待规划）
  ├── Domain scope                📝 待写
  └── AI 登记预期成果             📝 待写
```