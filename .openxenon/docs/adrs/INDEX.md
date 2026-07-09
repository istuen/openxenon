# ADR 索引

> **来源**：2026-07-04 docs-tmp-cleanup work 抽取 + 2026-07-09 doc-unify-layout 救援
> **总计**：47 条 ADR（来自 v0.0 ~ v0.6.1-alpha.0 共 7 个版本的讨论记录）
> **位置**：`.openxenon/docs/adrs/`（对内-沉淀层，append-only）
> **约定**：决策一旦记录不编辑不删除；被推翻时新 ADR 标记旧 ADR 为 Superseded

## 状态图例

| 状态 | 含义 | 数量 |
|---|---|---|
| ✅ **Adopted** | 已落 SSOT + 代码 | 18 |
| 🟡 **Partially Adopted** | 部分已落，部分待办 | 6 |
| 💡 **Proposed** | 待 v0.7+ 落地 | 10 |
| ⛔ **Superseded** | 被推翻但有史料价值 | 5 |

## 主题分类索引

### 1. OXL / Blueprint 哲学（5 条）

| ADR | 标题 | 状态 |
|---|---|---|
| [0001](./0001-blueprint-props-funnel-effect.md) | Blueprint props 漏斗效应 + 三层默认值优先级 | ✅ Adopted |
| [0002](./0002-probe-default-rules-five-level-priority.md) | Probe default 规则 + 五级参数优先级链 | ✅ Adopted |
| [0003](./0003-runtime-isolation-frozen-naming.md) | 运行期隔离 + frozen 命名规则 | ✅ Adopted |
| [0019](./0019-blueprint-type-paradigm.md) | Blueprint Type 范式（task/plan/explore） | ✅ Adopted |
| [0021](./0021-intent-align-observe-keyword-separation.md) | Intent / Align / Observe 四关键字分离 | ✅ Adopted |

### 2. Kernel / L0 边界（6 条）

| ADR | 标题 | 状态 |
|---|---|---|
| [0008](./0008-probe-observation-vs-verdict.md) | ProbeObservation vs ProbeVerdict 二元公理 | ✅ Adopted |
| [0009](./0009-architectural-guard-tests-trace-before-state.md) | 架构守护测试 + Trace-before-State 写入顺序 | ✅ Adopted |
| [0010](./0010-path-port-injection.md) | PathPort 注入原理 | ✅ Adopted |
| [0011](./0011-evidence-chain-triple.md) | 证据链三件套（frozen.json + trace.jsonl + state.json） | ✅ Adopted |
| [0013](./0013-no-langium-type-leak-acl.md) | L1 contracts 不允许 Langium 类型泄露（ACL 守则） | ✅ Adopted |
| [0037](./0037-part-resolver-moved-to-l2-work.md) | part-resolver 从 Kernel 迁 L2 Work 的依据 | ✅ Adopted |

### 3. AI 协作哲学（6 条）

| ADR | 标题 | 状态 |
|---|---|---|
| [0012](./0012-main-sub-agent-audit-chain.md) | Main/Sub Agent 审计链哲学 | ✅ Adopted |
| [0020](./0020-intent-align-unified-matrix.md) | Intent/Align 统一矩阵（Blueprint=Intent, Work=Align） | ✅ Adopted |
| [0022](./0022-guided-adaptive-unmanaged-ai-modes.md) | Guided / Adaptive / Unmanaged 三模式 AI 执行 | 💡 Proposed |
| [0031](./0031-proof-notary-not-judge.md) | Proof = 公证人 ≠ 裁判 | ✅ Adopted |
| [0032](./0032-pi-vs-opencode-selection.md) | Pi vs OpenCode 选型最终结论 | ✅ Adopted |
| [0033](./0033-iap-public-naming-disagreement.md) | IAP 对外命名分歧（Intent/Align/Verify vs "出证明"） | ⛔ Superseded |

### 4. Work / Asset（8 条）

| ADR | 标题 | 状态 |
|---|---|---|
| [0004](./0004-arsenal-resolver-priority-chain.md) | ArsenalResolver 优先级链（Project > Global > Builtin） | ✅ Adopted |
| [0005](./0005-strategic-correction-running-time-isolation.md) | LSP/Monorepo/北极星战略纠偏 | ✅ Adopted |
| [0024](./0024-partid-primary-key-atomic-write.md) | partId 主键 + atomic-write | ✅ Adopted |
| [0025](./0025-task-sandbox-local-vs-namespace.md) | Task 沙箱豁免 + `./` vs `@` namespace 纪律 | ✅ Adopted |
| [0026](./0026-skill-three-partition-intent-align-proof.md) | Skills 三分（oxn-intent / oxn-align / oxn-proof） | 🟡 Partial |
| [0027](./0027-domain-as-ssot-governance.md) | Domain 作为 SSOT 的工程化治理 | 🟡 Partial |
| [0035](./0035-catalog-json-probe-excluded.md) | catalog.json + Probe-excluded 规则 | ✅ Adopted |
| [0036](./0036-canonical-oxn-naming-superseded.md) | canonical.oxn 命名约定（已废除） | ⛔ Superseded |

### 5. Insight / Skill（5 条）

| ADR | 标题 | 状态 |
|---|---|---|
| [0015](./0015-insight-four-entity-evidence-chain.md) | Insight 四实体证据链 schema | 🟡 Partial |
| [0016](./0016-ai-insight-three-donts.md) | AI 启示"三层不要" | 💡 Proposed |
| [0017](./0017-probe-stats-cross-proof-accumulation.md) | probe-stats.json 跨 proof 累积机制 | 🟡 Partial |
| [0018](./0018-lsp-readonly-fork-atomic-cli-proxy.md) | LSP readonly + Fork-to-Local + atomic-index + CLI proxy | ✅ Adopted |
| [0039](./0039-oxn-work-skill-restructure.md) | oxn-work Skill 重构（拆 5 references + 4 assets） | 💡 Proposed |

### 6. Docs / Brand（5 条）

| ADR | 标题 | 状态 |
|---|---|---|
| [0014](./0014-why-openxenon-motivation-narrative.md) | "Why OpenXenon" — AI 漂移根因与人格化叙事 | 💡 Proposed |
| [0023](./0023-at-addressing-no-arrow-pointer.md) | `@` 一贯寻址哲学 + `->` 伪指针否决 | ✅ Adopted |
| [0028](./0028-resource-port-cache-port-work-snapshot.md) | ResourcePort + CachePort + WorkSnapshot（待办） | 💡 Proposed |
| [0029](./0029-anchor-slot-doc-binding.md) | Anchor / Slot 文档绑定机制（待办） | 💡 Proposed |
| [0030](./0030-term-cross-reference-upstream-dag.md) | `@term/X` 跨 term 寻址 + `@upstream` DAG（待办） | 💡 Proposed |

### 7. 历史 / 命名（4 条）

| ADR | 标题 | 状态 |
|---|---|---|
| [0006](./0006-three-phase-model.md) | 三相模型（静态结构 → Loop → 静态产物） | 💡 Proposed |
| [0007](./0007-loop-observation-three-dimensions.md) | Loop 行为观测三维度（命令 + 规则 + 重试） | 💡 Proposed |
| [0034](./0034-work-precise-block-not-daemon-cascade.md) | Work 前置精准阻断 vs Daemon 全局崩溃 | ⛔ Superseded |
| [0038](./0038-i18n-library-selection.md) | i18n 库选型（Paraglide vs typesafe-i18n vs i18next） | 🟡 Partial |

## ADR 落地状态一览

### 已落 SSOT（18 条 · 标记 SSOT 已增补位置）

| ADR | 落地位置（SSOT 增补） |
|---|---|
| 0001 | `docs/zh-cn/asset.md` §Blueprint props 漏斗 |
| 0002 | `docs/zh-cn/proof.md` §Probe 五级参数链 |
| 0003 | `docs/zh-cn/architecture.md` §运行期隔离 |
| 0004 | `docs/zh-cn/asset.md` §ArsenalResolver 优先级 |
| 0008 | `docs/zh-cn/architecture.md` §ProbeObservation vs Verdict |
| 0009 | `docs/zh-cn/architecture.md` §Trace-before-State |
| 0011 | `docs/zh-cn/work.md` §证据链三件套 |
| 0012 | `docs/zh-cn/core-concepts.md` §Main/Sub Agent |
| 0014 | `docs/{zh-cn,en}/index.md` Motivation 段 |
| 0019 | `docs/zh-cn/asset.md` §Blueprint Type 范式 |
| 0021 | `docs/zh-cn/architecture.md` §四关键字 |
| 0023 | `docs/zh-cn/glossary.md` §`@` 哲学 |
| 0024 | `docs/zh-cn/work.md` §partId + atomic-write |
| 0031 | `docs/zh-cn/proof.md` §Proof 公证人边界 |
| 0035 | `docs/zh-cn/asset.md` §catalog.json |

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

## 元数据

- **抽取 work**：docs-tmp-cleanup
- **抽取日**：2026-07-04
- **讨论跨度**：2026-05-14 → 2026-07-03（50 天）
- **涉及版本**：v0.0 → v0.6.1-alpha.0