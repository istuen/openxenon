---
entity: rfc
id: RFC-0007
theme: domain-positioning
status: Accepted
date: 2026-07-26
supersedes: []
superseded-by: ~
related:
  - ADR-0059: docs/adrs/0059-domain-reference-model-v2.md
  - ADR-0060: docs/adrs/0060-domain-vocabulary-boundary.md
  - ADR-0068: docs/adrs/0068-daemon-responsibility-boundary.md
  - ADR-0069: docs/adrs/0069-asset-bootstrap-completeness.md
  - ADR-0070: docs/adrs/0070-glossary-domain-sync.md
  - ADR-0072: docs/adrs/0072-oxn-as-referent-for-nondeterministic-agent.md
  - ADR-0073: docs/adrs/0073-oxn-implementation-boundary-criteria.md
  - ADR-0077: docs/adrs/0077-utility-owns-ai-oxn-converts-goal-to-boundary.md
  - ADR-0078: docs/adrs/0078-llm-agent-knowledge-full-oxn-does-boundary-engineering.md
  - ADR-0079: docs/adrs/0079-asset-is-ontology-formal-reasoning-deferred.md
  - ADR-0027: docs/adrs/0027-domain-as-ssot-governance.md
  - ADR-0034: docs/adrs/0034-work-precise-block-not-daemon-cascade.md
synced-at: 2026-07-27
landing-reason: declarative
---

# RFC-0007: Domain 词汇架构与 OXN 定位——Referent 参照系 + 边界工程 + Ontology

> **类型**：RFC（OpenXenon 规范）
> **主题**：domain-positioning
> **状态**：✅ Accepted（核心冻结，仅可追加 errata 段）
<!-- allow-version -->
> **批次**：2026-07-26 v0.7 RFC 首批 promote（Phase 2）
<!-- /allow-version -->
> **合并**：OXP-0003（Daemon 职责边界）→ 本 RFC

## 摘要

OXN 项目的产品定位 + Domain 词汇架构的顶层规范——**Domain 引用模型 v2**（sub→root references + term desc MD link + 自动 backlinks）+ **Domain 词汇边界**（What vs How 双层判据，禁 How 层指向 docs/）+ **OXN = 非确定性智能体的确定性参照系**（Referent 统一设计模式）+ **OXN 实现边界四判据**（补偿非确定性 / agent 级别 / floor-ceiling / 满足非优化）+ **Asset 全体是 Ontology**（边界 = Ontology 定义）+ **OXN 做边界工程不做知识工程**（LLM agent knowledge-full）+ **Goal→Boundary 转换机制**（不可知→可观测）+ **Daemon 职责边界**（不监听 FS / 不阻断 / 只监听状态与事件）+ **Asset 自举完整性**（最小 6 个 Asset）+ **Glossary ↔ Domain 同步机制**（Domain 是 SSOT）。

## 决策要点

### D1：Domain 引用模型 v2（ADR-0059）

**`references` 字段方向不变**（sub → root）——硬依赖 DAG，B 缺失则 A 编译失败。root 自给自足（`references: []`）。

**term 级 MD 链接代替 composes 字段**——root → sub 单向表达 has sub-Domain：

```md
### Work
- desc: 人机协作的工作空间。E2 工程实现见 [`oxn-work-domain`](./oxn-work-domain.md)。
```

**自动 backlinks**——双源 union：(a) sub→root references 反向索引；(b) root→sub MD link 反向索引。不存储在文件里，运行时计算。

**Domain 引用 ≠ 论文引用**——Domain 可拆分/合并/重写（动态重构），论文不可改（单调累积）。`citations` 字段是"当前影响半径"，不是"价值评分"。

### D2：Domain 词汇边界 What/How 判据（ADR-0060）

<!-- allow-version -->
**重写测试**："如果 OpenXenon 用 Rust 重写、或 v0.8 把内部实现改名（如 md-pipeline 改名为 unified-ast-bridge），这个词还需存在么？"
<!-- /allow-version -->

- 仍需存在 → Domain 收（"是什么"）
- 不需存在 → 迁 Stack/docs（"怎么实现"）

**Domain 词汇 4 分类**：

| 分类 | 含义 | 归宿 |
|---|---|---|
| 产品词汇 | 业务对象 | Domain |
| 特性词汇（技术） | 项目特定技术领域词 | Domain |
| 实现词汇（技术） | 代码路径 / 实现状态 | Stack / docs |
| 通用技术词 | TypeScript / Bun / unified | Stack |

**D5 引用规则**：
- 禁止指向 docs/
- 禁止纯文本指向 docs/
- 禁止代码路径（`src/...` / `packages/.../src/...`）
- 禁止实现状态注释（`@pending-migration`）
- 允许引用 ADR（append-only）
- 允许 Domain 间 MD link（root→sub 单向）
- Invariant 自给自足（核心断言 inline）

### D3：OXN = 非确定性智能体的确定性参照系（ADR-0072）

OXN Engine 是确定性程序，**不是 R&N 意义上的智能体**（无性能度量、无动作选择、无自主搜索）。LLM Agent 才是智能体。OXN 角色：为 LLM Agent 三个本有但非确定的器官各提供稳定参照锚点：

| agent 器官 | agent 自有版本（非确定） | OXN 参照版本（确定） |
|---|---|---|
| 世界模型 | LLM 上下文（漂移衰减） | Asset |
| 传感器 | AI 工具 I/O（变异） | Probe |
| 执行器 | AI 工具调用（变异） | OXN writer（frozen/verdict） |

**R&N 七核心术语 ↔ OXN 对照表**（Term #1-#7）：

| # | R&N 术语 | OXN 对应物 | 关键偏离 |
|---|---|---|---|
| 1 | 智能体结构 | AI Agent（非 OXN Engine） | OXN 是参照系非智能体 |
| 2 | 世界模型 | Asset（只读参照，唯一） | 写侧拆三角色协议 |
| 3 | 感知器 | AI 工具 I/O + Probe（双轨） | Probe 是 OXN 确定性传感器 |
| 4 | 执行器 | AI 工具调用 + OXN writer（双轨） | Work 是通道非执行器 |
| 5 | 动作 | OXN CLI + AI 工具调用（双轨） | 原子性锚在 CLI 边界 |
| 6 | 解 | Work（解的目标参照） | 结构性完成参照 |
| 7 | 图 | Task DAG + Blueprint slot DAG | DAG = AI 搜索行为的外化记录 |

### D4：OXN 实现边界四判据（ADR-0073）

评估任何 OXN 新功能时，过四判据——任一判据命中"不该实现"则拒绝：

| # | 判据 | 维度 | 该实现 | 不该实现 |
|---|---|---|---|---|
| 1 | 补偿方向 | 补偿什么 | agent 非确定性 | 环境性质 |
| 2 | agent 级别 | 升到哪级 | type 2-3 可靠性 | type 4 效用 |
| 3 | floor/ceiling | 提哪限 | floor（下限） | ceiling（上限） |
| 4 | 路径判据 | 路径怎么判 | 确定性满足 | 路径优化 |

**drift recovery 收回记录**——曾推演"OXN 修复 LLM 漂移"作为 Referent 功能描述，**否决**。正确功能是**标记参照**（检查清单/地图路标），不是修复 LLM。

### D5：OXN 做边界工程不做知识工程（ADR-0078）

**R&N agent knowledge-empty vs LLM agent knowledge-full**：

| 维度 | R&N agent | LLM-based agent |
|---|---|---|
| 知识来源 | 外部注入 | 预训练内化 |
| 推理引擎 | inference engine | 注意力机制（隐式） |
| 稳定性 | 稳定 | **非稳定**（概率采样） |
| 缺什么 | 知识 | 边界 |

LLM agent 已有知识（knowledge-full），缺的是边界——OXN 不注入知识，提供**约束线索**让 AI 利用已有知识时提高确定性。

**前提→机制→结构→判据闭环**：
```
ADR-0078（前提）：LLM agent 是 knowledge-full，缺的是边界不是知识
    │
    ▼
ADR-0077（机制）：OXN 把工程师目标转换为边界参照
    │
    ▼
ADR-0072（结构）：Referent——为非确定器官提供确定参照锚点
    │
    ▼
ADR-0073（判据）：四轴判据集
```

### D6：Goal → Boundary 转换机制（ADR-0077）

OXN 把工程师的目标转换为边界参照——不是"必须这么做"，而是"依据其做会提高确定性"：

```
工程师目标（utility 依据）
    │
    │  直接应用到非确定性 AI = 不可知
    ▼
OXN 转换机制
    │
    │  目标 → 边界参照
    ▼
边界参照（Referent）
    ├── Asset（知识边界参照）
    ├── Blueprint（规划边界参照）
    ├── Probe（验证边界参照）
    ├── Work（解的边界参照）
    └── Task DAG（搜索边界参照）
    │
    ▼
AI Agent 在边界参照内自主工作
    │
    └── 不可知 → 可观测（Probe verdict 留痕）
```

**Probe verdict ≠ 退化 utility**：boundary satisfaction checking ≠ utility optimization（ADR-0073 判据 4 一致）。

### D7：Asset 全体是 Ontology（ADR-0079）

Asset 全体描述"构建软件是什么、如何关联"——这是 Ontology 的定义（领域概念化的显式表达）。但 Asset 不是具体实现——实现交给 AI Agent。

| Asset 类型 | Ontology 描述的内容 |
|---|---|
| Domain | 软件的术语/不变量/边界 |
| Workflow | 工作流程的状态/角色/步骤 |
| Stack | 技术栈的约定/版本/依赖 |
| Blueprint | 工作编排的模板/slot/依赖 |

**边界 = Ontology 定义本身**——对 LLM 是可确定性的（LLM 知识库包含这些概念或可推理出）。

**形式化推理能力保留不实现**——理论上可行（数学公式推导，确定性），当前有意不做：(a) 工程师能力不具备；(b) 让 AI 实现 OXN 推理功能 → 工程师无法验证正确性 → 损害 OXN 确定性核心价值。替代路径：AI Agent 做推理（读 Asset Ontology → LLM 推理 → Insight 给工程师）。

### D8：Daemon 职责边界（ADR-0068，合并 OXP-0003）

**Daemon 三项职责**：

1. **Work 状态变化**（运行时状态监听）：Work 长时间未变化 → AI 脱通道通知；Work 状态异常（stuck / orphan / error）
2. **Task Probe 结果事件**（事件监听）：ProbeOutcome DEVIATED/INCONCLUSIVE 时通知工程师（不阻断）
3. **OXN CLI socket 事件**（事件监听）：CLI ↔ Daemon 双向通信

**不监听范围**：
- 不监听文件系统（与 ADR-0034 兼容）
- 不阻断 Work 进入 done（ADR-0067 D5）
- 不修改 Kernel 规则（inv-7 daemon-no-rule-mutate 保留）
- 不宣布 Work 完成（inv-6 infra-no-self-done 保留）

### D9：Asset 自举完整性（ADR-0069）

**最小可用 Asset 集**——新项目 bootstrap 必须包含：

| Kind | 数量下限 | 必含示例 |
|---|---|---|
| Domain | ≥ 1 | 项目专属 domain |
| Workflow | ≥ 2 | dev-workflow + doc-author |
| Stack | ≥ 1 | 项目自身 stack |
| Blueprint | ≥ 1 | oxn-blueprint 或项目专属 |
| Roadmap | ≥ 1 | oxn-system 或项目专属 |

**总计 ≥ 6 个 Asset**。自举守卫 3 项：(G1) Asset 数量下限；(G2) Blueprint 依赖完整性；(G3) Root Workflow 双轨存在（dev + doc）。

### D10：Glossary ↔ Domain 同步机制（ADR-0070）

```
Domain（SSOT）  ──manual review──>  Glossary（外部手册可见）
     ↑                                    ↓
     └────────CI check（双向）────────────┘
```

- **Domain → Glossary**：手动 review + 工具辅助（`oxn glossary sync --from-domain`）
- **Glossary → Domain**：禁止反向引用
<!-- allow-version -->
- **CI 守卫**：双向一致性检查（drift → fail build），`scripts/check-glossary-sync.ts`（v0.7.4 计划）
<!-- /allow-version -->

### D11：Domain SSOT 工程化治理（ADR-0027）

Domain 不只是 DSL 资产，也是 **SSOT（Single Source of Truth）**——领域知识 / 业务术语 / 不变规则的唯一权威来源。4 项治理要点：

#### 1. 文档强制标注 `domain:` frontmatter

`docs/zh-cn/<page>.md` 必须声明所属 Domain——通过 frontmatter `domain: <DomainId>` 显式声明归属：

```yaml
---
title: Work 概念
domain: work-domain
---
```

未声明 `domain:` 字段的 docs 页面 → CI 校验失败。

#### 2. 新 Domain 创建走 Work 流程

不允许工程师直接 `mkdir .openxenon/assets/domains/<new>.md` 创建新 Domain——必须走 `oxn work create <new-domain> --blueprint domain-creation-workflow`。Work 流程强制包含：(a) 与现有 Domain 的引用关系图（`references` + term desc MD link）；(b) 与 OxnBuiltinRegistry 5 类 Asset 的覆盖率检查；(c) 与 Glossary 的同步策略。

#### 3. Domain 覆盖率统计

OXN 引擎编译 Domain 时统计：

| 指标 | 含义 |
|---|---|
| `term_count` | Domain 内 term 总数 |
| `invariant_count` | invariant 总数（每 term 平均） |
| `subdomain_count` | sub→root 引用深度 |
| `backlink_count` | 自动 backlinks 数量 |
| `coverage_ratio` | term 在 Blueprint/Work 中实际被引用比例 |

低覆盖率（`< 0.3`）Domain 在 Insight 涌现层标记为"未充分使用"。

#### 4. Domain 冲突检测

同一 term 在不同 Domain 中定义不一致 → OXN 编译期告警（`E_DOMAIN_TERM_CONFLICT`）：

```
Domain A: term "Order" desc "订单实体"
Domain B: term "Order" desc "订单状态机"   // ⚠️ E_DOMAIN_TERM_CONFLICT
```

冲突解决路径：(a) 合并到单一 Domain；(b) 改名其中一个 term；(c) 通过 term desc 明确语义边界（推荐）。

**当前状态**：

- ✅ D10 Glossary ↔ Domain 同步机制（CI 双向检查）已就位
<!-- allow-version -->
- ⚠️ 文档 `domain:` frontmatter 强制（v0.7+ 落地——CI 守卫脚本待写）
- ⚠️ 新 Domain 走 Work 流程（v0.7+ 落地——Blueprint 待补）
- ⚠️ Domain 覆盖率统计（v0.7+ 落地——编译器扩展点）
- ✅ Domain 冲突检测（`E_DOMAIN_TERM_CONFLICT` 错误码已定义，编译期检测 v0.7+ 落地）
<!-- /allow-version -->

### D12：Work 前置精准阻断 vs Daemon 全局崩溃（ADR-0034）

**两类失败处理哲学**：

| 维度 | Work 前置精准阻断 | Daemon 全局崩溃 |
|---|---|---|
| 触发时机 | Probe 跑前 | Probe 跑后 + 状态异常 |
| 阻断范围 | 单 task / single work | 所有 work（全局） |
| 错误可见性 | 立即报错 `IAP_PROBE_*` | 后置通知 / 日志 |
| 适用场景 | 已知必失败的 case | 未知异常 / stuck / orphan |

**OXN 决策**：采用 **Work 前置精准阻断** 为主要机制，**Daemon 全局崩溃** 仅在以下情况触发：

- Work 状态卡死 ≥ N 分钟（`stuck-threshold`，默认 30）
- Orphan work（无对应 state.json 但有 trace.jsonl）
- Daemon 与 CLI socket 断开 > 重试上限

**Probe CLI-1 细节差异**：`oxn probe` 命令的 `--strict` 模式采用精准阻断（已知 probe schema 错误立即退出），`oxn probe --best-effort` 模式仅输出失败到 stdout 不阻断。

<!-- allow-version -->
**不监听文件系统**——本 RFC D8 已明确：Daemon 不监听 FS 变化（避免与 v0.5 file watcher 混淆），FS 变化由 Work 启动时 validate 阶段处理。
<!-- /allow-version -->

## 影响范围

- ✅ 12 ADR 全 Accept（含 ADR-0057 Superseded-by ADR-0066 已在 RFC-0003 体现）
- ✅ oxn-domain.md 新增 Referent / Floor / Ceiling 术语
- ✅ 8 个 Domain SSOT 词汇统一（What/How 双层）
- ✅ CONTEXT-MAP.md PEAS 块重写 + 7 个 Domain 关系图扩展
<!-- allow-version -->
- ✅ Daemon 模块拆分：work-state-monitor + probe-event-listener + socket-server（v0.7+）
- ✅ Asset Paper schema 4→3 字段（ADR-0071 已在 RFC-0008 合并）
- 📝 ADR-0027 Domain SSOT 4 项治理——CI 守卫脚本 v0.7+ 落地
<!-- /allow-version -->
- ✅ ADR-0034 Work 前置精准阻断——已通过 probe --strict / --best-effort 模式部分落地

## 相关术语

- [Referent](/product/zh-cn/concepts/glossary.html#referent) — OXN 统一设计模式
- [Floor](/product/zh-cn/concepts/glossary.html#floor) — 下限参照
- [Ceiling](/product/zh-cn/concepts/glossary.html#ceiling) — 上限机制（OXN 不介入）
- [Domain](/product/zh-cn/concepts/glossary.html#domain) — E1 业务词汇 SSOT
- [Asset](/product/zh-cn/concepts/glossary.html#asset) — E1 静态边界（= Ontology）
- [Daemon](/product/zh-cn/concepts/glossary.html#daemon) — OXN Engine 后台守护进程
- [Built-in Asset](/product/zh-cn/concepts/glossary.html#built-in-asset) — `@oxn/` scope 内置

## 相关决策

- [ADR-0059](../../adrs/0059-domain-reference-model-v2.md) — Domain 引用模型 v2（2026-07-16）
- [ADR-0060](../../adrs/0060-domain-vocabulary-boundary.md) — Domain 词汇边界（2026-07-17）
- [ADR-0068](../../adrs/0068-daemon-responsibility-boundary.md) — Daemon 职责边界（2026-07-21）
- [ADR-0069](../../adrs/0069-asset-bootstrap-completeness.md) — Asset 自举完整性（2026-07-22）
- [ADR-0070](../../adrs/0070-glossary-domain-sync.md) — Glossary ↔ Domain 同步（2026-07-22）
- [ADR-0072](../../adrs/0072-oxn-as-referent-for-nondeterministic-agent.md) — OXN 参照系定位（2026-07-23）
- [ADR-0073](../../adrs/0073-oxn-implementation-boundary-criteria.md) — 四轴判据（2026-07-23）
- [ADR-0077](../../adrs/0077-utility-owns-ai-oxn-converts-goal-to-boundary.md) — Utility + Goal→Boundary（2026-07-23）
- [ADR-0078](../../adrs/0078-llm-agent-knowledge-full-oxn-does-boundary-engineering.md) — LLM knowledge-full（2026-07-23）
- [ADR-0079](../../adrs/0079-asset-is-ontology-formal-reasoning-deferred.md) — Asset 是 Ontology（2026-07-23）
- [ADR-0027](../../adrs/0027-domain-as-ssot-governance.md) — Domain SSOT 4 项治理要点（2026-06-17，Partially Adopted → RFC 采纳）
- [ADR-0034](../../adrs/0034-work-precise-block-not-daemon-cascade.md) — Work 前置精准阻断 vs Daemon 全局崩溃（2026-07-02，Partially Adopted → RFC 采纳）
- [OXP-0003（已删除）](./README.md) — 内容已合并入本 RFC；OXP 文件于 2026-07-26 Phase 3 删除

## Errata

<!-- allow-version -->
### v1.0.1 (2026-07-26)
<!-- /allow-version -->

- **ADR 引用路径修正**：原 `## 相关决策` 段链接指向 `.openxenon/drafts/rfc/00XX-*.md`，该路径在 Phase 3 ADR 归档后已失效（72 文件已移至 `.openxenon/.archived/docs/adrs/`）。现镜像到 `docs/adrs/`，RFC 链接指向 `../../adrs/00XX-*.md`（docs/ 内部，无跨层）。frontmatter `related` 同步更新为 `docs/adrs/00XX-*.md`。
- **修复触发**：grilling #7 发现 body markdown 链接死链 + 失效 frontmatter refs；边界检查器因错误相对路径漏报。
- **符合 RFC-0009 D4**：ADR 引用现在遵循"仅 related 段可引 docs/adrs/"规则。

### 2026-07-27 errata

- **新增 D11 Domain SSOT 4 项治理 + D12 Work 前置精准阻断**：ADR-0027 / ADR-0034 内容已并入 RFC 正文（之前仅作为 ADR 归档留存）。Domain SSOT 4 项治理（frontmatter 强制 / 走 Work 流程 / 覆盖率统计 / 冲突检测）部分已在 D10 体现，本次补全 4 项治理要点与代码路径。Work 前置精准阻断哲学与 `--strict` / `--best-effort` 双模式已落地。
- **frontmatter related 增补**：ADR-0027 / ADR-0034。
- **影响范围段**：10 ADR → 12 ADR。

> 本段用于后续追加修正说明。核心决策自 RFC-0007 Accepted 起冻结。
