---
type: draft
created: 2026-07-18
status: active
abstract: |
  Domain（7 个 .md，87 个 H3 Terms）与 Doc/ADR/RFC/Pools 的全量词汇对齐分析。
  扫描范围：docs/ 产品文档 + .openxenon/docs/adrs/（47 个）+ .openxenon/docs/rfcs/（13 个）+ .openxenon/pools/（11 个）。
  输出：双向缺失术语清单 + 补充执行计划。
---

# Domain ↔ Doc 全量词汇对齐分析

## 1. 数据来源

| 来源 | 文件数 | 角色 |
|---|---|---|
| Domain（`.openxenon/assets/domains/` 7 个 .md） | 7 | **词汇权威源**（87 个 H3 Terms） |
| `docs/zh-cn/product/` 产品文档 | 10 | 用户文档 |
| `.openxenon/docs/adrs/` | 47 | ADR（append-only） |
| `.openxenon/docs/rfcs/` | 13 | RFC（定稿） |
| `.openxenon/pools/` | 11 | 探索性文档 |

### 1.1 Domain 现有 87 个 H3 Terms 清单

**oxn-domain（16）**：OpenXenon, OXN, OXN CLI, OXN Engine, OXL, IAP, Intent, Align, Proof, Asset, Boundary, Work, Verdict, Insight, Hall, Daemon

**oxn-engine-domain（9）**：OXN Engine, BuiltinAsset, Kernel, Infra, Daemon, OXL, IAPError, OXNCrash, CliInputError

**oxn-cli-domain（13）**：OXN CLI, Command, SubCommand, Arg, OutputFormat, ExitCode, Skill, SkillAdapter, AdaptersRoot, Locale, I18nKey, TFunction, LocaleBundle, OXnConfig, ProjectConfig, ProjectBoundary

**oxn-asset-domain（10）**：Asset, AssetKind, AssetMode, AssetLifecycle, PlanLock, AssetCitation, AssetDAG, AssetPaper, AssetFrontmatter, AssetFileResolver

**oxn-work-domain（16）**：Work, WorkV1, IAPPhase, Phase, Task, Slot, Part, Probe, RefPool, SkillContext, Round, BirthCert, PlanLock, AssetHash, Artifact, Frozen

**oxn-proof-domain（13）**：Proof, Probe, Part, Builtin, Scope, Registry, Kernel, Infra, Verdict, Frozen, Trace, ContentHash, Taint

**oxn-insight-domain（10）**：Insight, Pattern, CrossProofAccumulation, ModeRecommendation, AuditTrail, Citation, Pool, Raw, Audit, Judged

---

## 2. Doc/ADR/RFC/Pools 有但 Domain 缺失的术语

### 2.1 ★★★ 高优先级（用户日常交互词汇）

| 术语 | 来源 | 含义 | 建议补充到 |
|---|---|---|---|
| **Blueprint** | Doc/ADR-0055/RFC/Pools | E1 组合模板，唯一跨 AssetKind 组合实体 | `oxn-asset-domain` |
| **Workflow** | Doc/ADR-0054/RFC | E1 执行边界（slots/deps/observe），原 Blueprint 改名 | `oxn-asset-domain` |
| **Stack** | Doc/ADR-0054/RFC | E1 实现边界（runtimes/linters/testers） | `oxn-asset-domain` |
| **Domain**（as AssetKind） | Doc/ADR-0054/RFC | E1 业务边界（terms/bans/invariants） | `oxn-asset-domain` |
| **Roadmap** | Doc/ADR-0054/RFC/Pools | AI 路由入口（scene 表索引），第 5 类 AssetKind | `oxn-asset-domain` |
| **External** | Doc/ADR-0056/RFC | 边界内 `## Externals` H2 category（从 Asset 类型降级） | `oxn-asset-domain` |
| **TrustChain**（信任链） | Doc/RFC(v0.6.1)/ADR-0057 | 三方信任拓扑 工程↔OXN↔AI，Engine 的"能源" | `oxn-engine-domain` |
| **AuditChain**（审计链） | Doc/RFC/ADR-0012 | post-hoc 约束哲学，AI 行为通过 trace 事后审计 | `oxn-engine-domain` |
| **Notary**（公证人） | Doc/ADR-0031/RFC | Engine 的本质角色（vs Judge），"公证人非裁判" | `oxn-proof-domain` |
| **InterferenceFlag** | Doc(proof.md)/ADR | 12 项干扰标记（8 RED + 4 YELLOW），Taint 的具体枚举 | `oxn-proof-domain` |
| **ProbeObservation** | ADR-0008/RFC | L1 Infra 产出的物理事实（exitCode/stdout/stderr） | `oxn-proof-domain` |
| **ProbeVerdict** | ADR-0008/RFC | L0 Kernel 产出的业务判定（PASS/FAIL/INCONCLUSIVE） | `oxn-proof-domain` |
| **Loop** | ADR-0006/0007 | Work 核心动态过程（三相模型 Phase 2） | `oxn-work-domain` |

> **最大发现**：5 个 AssetKind 的枚举值本身（Blueprint/Workflow/Stack/Domain/Roadmap）全部没有作为 Domain H3 terms。只有 `AssetKind` 这个元枚举名。这些是用户最常接触的词汇。

### 2.2 ★★ 中优先级（架构/哲学/设计概念）

| 术语 | 来源 | 含义 | 建议补充到 |
|---|---|---|---|
| **ThreePhaseModel**（三相模型） | ADR-0006/Doc(iap-paradigm) | Asset(静)→Loop(动)→Frozen(静)循环 | `oxn-domain` |
| **ThreeBoundaryFramework**（三边界框架） | ADR-0054/Doc/RFC | Domain/Workflow/Stack 三正交维度 | `oxn-asset-domain` |
| **kind-isolation**（原则） | ADR-0054/Doc/RFC | references 仅同 AssetKind；跨 kind 走 Blueprint/Roadmap | `oxn-asset-domain` |
| **MinimumTrustClosure**（最小信任闭环） | ADR-0058/Doc(iap-paradigm) | v0.6.1 = 四层确定性就位 | `oxn-engine-domain` |
| **FourLayerDeterminism**（四层确定性） | ADR-0058/Doc/RFC | D1 边界 + D2 验证 + D3 证据 + D4 记录 | `oxn-engine-domain` |
| **InformationHiding**（信息隐藏 / 对抗性设计） | Doc/RFC/ADR | "AI 只看该做什么，不看该满足什么" | `oxn-engine-domain` |
| **LambdaVacuum**（兰姆达真空） | RFC/AGENTS.md | L0 Kernel 零 IO 约束的正式术语 | `oxn-engine-domain` |
| **FunnelEffect**（漏斗效应） | ADR-0001/Doc(asset.md) | Blueprint props ≠ Part props 合集，是收敛器 | `oxn-asset-domain` |
| **ArsenalResolver** | ADR-0004/Doc(asset.md) | 资产解析器优先级链 @prj > @gbl > @oxn | `oxn-asset-domain` |
| **EvidenceChainTriple**（证据链三件套） | ADR-0011/Doc(work.md) | frozen.json + trace.jsonl + state.json | `oxn-work-domain` |
| **Trace-before-State** | ADR-0009/Doc(work.md) | 写 state.json 前必须先 append trace | `oxn-work-domain` |
| **IAPSubEntity**（IAP 子顶层实体） | RFC(work-unified-model) | Work = Intent + Align + Proof 三个子顶层实体 | `oxn-work-domain` |
| **CriticalHandoff**（关键衔接点） | RFC(work-unified-model) | Intent→Align(planLock) + Align→Proof(task 状态) | `oxn-work-domain` |
| **context.md**（Work 上下文） | ADR-0049/Doc(work.md) | Work 内短期记忆，取代 Memory L1 | `oxn-work-domain` |
| **partId / partName** | ADR-0024/Doc(work.md) | Part 的双键（全局唯一 vs Scope 内可读） | `oxn-work-domain` |
| **AtomicWrite** | ADR-0024 | tmp + rename 保证完整性 | `oxn-work-domain` |
| **Anchor**（文档锚点） | ADR-0029/RFC(v0.7.2) | MD `{#anchor-id}` slug，与 Slot 双向绑定 | `oxn-asset-domain` |
| **PrimaryDomain / BackgroundDomain** | RFC(v0.7.3)/Pools | Task.domain 主对齐 vs Blueprint.use 派生背景 | `oxn-work-domain` |
| **AI Three Modes**（Guided/Adaptive/Unmanaged） | RFC(v0.7.1)/ADR-0022 | AI 执行监督分级 | `oxn-cli-domain` |
| **PatternLibrary**（模式库） | RFC(v0.7)/Doc | `.openxenon/pools/insight-patterns/` | `oxn-insight-domain` |

### 2.3 ★ 低优先级（内部/未来规划/被否决概念）

| 术语 | 来源 | 说明 |
|---|---|---|
| **Port** (PathPort/ResourcePort/CachePort) | ADR-0010/0028/RFC(v0.7.0) | L1 注入端口抽象，内部实现（已决策加入 engine domain） |
| **WorkSnapshot** | ADR-0028/RFC | Work 全状态序列化对象（已决策加入 engine domain） |
| **CompoundProbe / IO Primitive / Provider** | Pools(spike) | T15 spike，defer，不入 main |
| **Skill Three-Partition** | ADR-0026/0039 | 已收敛为统一 oxn-work |
| **IAPAction** | Pools(ISS-002) | IAP 错误语义动作词汇（RETRY/ABORT/ESCALATE） |
| **AssetReferenceScope / AssetRefBudget** | Pools(journal) | 已作为 inv-15/inv-16 落入 Domain，缺术语主体 |
| **@term/ @upstream** | RFC(v0.8.0)/ADR-0023/0030 | 跨 term / 跨 Domain 寻址语法，v0.8 |
| **Drift / Hallucination / HallucinatorySelfConfirmation** | Doc/ADR-0014 | 痛点叙事词汇，非业务概念 |
| **BuiltinArsenal** | ADR-0004 | 被 ArsenalResolver 封装的底层 |
| **reputation.json** | ADR-0022/RFC(v0.7.1) | 未落实的信誉文件 |
| **SkillRegistry / ProbeMarketplace / EntropyMonitoring** | RFC(version-unification) | v0.8+ 远期规划 |
| **CAS Completion** | RFC(version-unification) | v1.0 远期 |

---

## 3. Domain 有但 Doc 缺失的术语

缺 23 个 Terms 未在 Glossary 出现，最关键的 10 个：

**Slot** / **Part** / **Probe** / **Verdict** / **PlanLock** / **BirthCert** / **Frozen** / **Taint** / **AssetKind** / **AssetLifecycle**

完整缺失列表：RefPool, SkillContext, Trace, ContentHash, Scope, Artifact, IAPPhase, Phase, WorkV1, AuditTrail, Citation, Pool, Pattern, IAPError, OXNCrash, CliInputError, CrossProofAccumulation, ModeRecommendation, Raw, Audit, Judged, BuiltinAsset, AssetDAG

---

## 4. 双向不一致

| 问题 | 详情 |
|---|---|
| Domain `Boundary` = Asset 别名 | Doc 用"边界"泛指但不提 `Boundary` 作为正式术语 |
| Domain `Hall` | 全 Doc/RFC/Pools 几乎不使用 |
| Domain `IAPPhase` vs Doc"IAP 三阶段" | Doc 未采用 `IAPPhase` 术语名 |
| Domain `WorkV1` vs Doc "V1 布局" | 名不一致 |
| Doc "证据链三件套" vs Domain 无对应术语 | ADR-0011 引入的 EvidenceChainTriple 未入 Domain |
| Doc "信息隐藏" vs Domain 无对应术语 | 核心设计哲学缺失 |
| Doc/RFC "信任链" vs Domain 无对应术语 | v0.6.1 核心叙事缺失 |

---

## 5. 决策记录

| 决策点 | 决策 | 备注 |
|---|---|---|
| AssetKind 枚举值是否独立 H3 | **独立 H3 terms** | Blueprint/Workflow/Stack/Domain/Roadmap/External 各自加入 oxn-asset-domain |
| TrustChain 归属 | **oxn-engine-domain** | 信任链由 Engine 驱动 |
| Port 系列是否加入 Domain | **加入 oxn-engine-domain** | PathPort/ResourcePort/CachePort/WorkSnapshot |
| Hall 处置 | **保留但补 Doc** | Domain 保留 Hall H3，后续在 Doc 补充说明 |

---

## 6. 执行计划

### 变更 1：`oxn-asset-domain` 新增 11 个 H3 Terms

| # | Term | desc 草案 |
|---|---|---|
| 1 | **Blueprint** | 组合模板 Asset，唯一跨 AssetKind 组合实体；引用 Domain + Workflow + Stack + Blueprint；Work 通过单一 blueprint ref 引用；ADR-0055 |
| 2 | **Workflow** | 执行边界 Asset（slots/deps/observe）；原 Blueprint 改名；slot DAG 定义执行拓扑；ADR-0054 |
| 3 | **Stack** | 实现边界 Asset（runtimes/linters/testers）；Proof 阶段直接断言；v0.6 硬要求；ADR-0054 |
| 4 | **Domain**（as AssetKind） | 业务边界 Asset（terms/bans/invariants）；注意与 oxn-domain 元域同名但角色不同；ADR-0054 |
| 5 | **Roadmap** | meta 索引层 AssetKind，AI 路由入口（scene 表索引）；不参与 references DAG |
| 6 | **External** | 边界内 `## Externals` H2 category，从 Asset 类型降级；url/path 二选一 + kind enum 6 值 + 状态索引；ADR-0056 |
| 7 | **ThreeBoundaryFramework** | Domain/Workflow/Stack 三正交维度框架，覆盖 IAP Intent 语义/结构/环境三约束；ADR-0054 |
| 8 | **FunnelEffect** | Blueprint props ≠ Part props 合集的漏斗原理；通过硬编码/拼接/默认值吸收子层复杂度；ADR-0001 |
| 9 | **ArsenalResolver** | 资产解析器优先级链 @prj > @gbl > @oxn；Work 看到的是 Resolver 而非 BuiltinArsenal；ADR-0004 |
| 10 | **Anchor** | MD `{#anchor-id}` slug 文档锚点，与 Domain term 的 `anchor` 字段双向绑定；编译期校验存在性；ADR-0029 / v0.7.2 |
| 11 | **kind-isolation** | references 仅同 AssetKind 原则；跨 kind 组合由 Blueprint 承担，跨 kind 导航由 Roadmap scene.links 承担；ADR-0054 |

### 变更 2：`oxn-engine-domain` 新增 12 个 H3 Terms

| # | Term | desc 草案 |
|---|---|---|
| 1 | **TrustChain** | 三方信任拓扑 工程（确定性主体）↔OXN（确定性层）↔AI（概率性主体）；Engine 的"能源"；ADR-0057 |
| 2 | **AuditChain** | post-hoc 审计链约束哲学；AI 行为通过 trace.jsonl 事后审计而非预防限制；slogan "做了什么都被记住"；ADR-0012 |
| 3 | **Notary** | Engine/Probe 的公证人角色（vs Judge 裁判）；记录"发生了什么"不评判"合格不合格"；ADR-0031 |
| 4 | **LambdaVacuum** | L0 Kernel 零 IO 约束的正式术语；禁 fs/net/child_process/process.env/process.std*/EventEmitter；纯逻辑真空 |
| 5 | **MinimumTrustClosure** | v0.6.1 scope = 四层确定性就位（D1 边界 + D2 验证 + D3 证据 + D4 记录）；ADR-0058 |
| 6 | **FourLayerDeterminism** | D1 确定性边界（OXL+Asset）+ D2 确定性验证（Kernel+Proof）+ D3 确定性证据（Proof）+ D4 确定性记录（Proof+Work）；ADR-0058 |
| 7 | **InformationHiding** | 对抗性设计："AI 只看该做什么，不看该满足什么"；Part 内 Probe 验证标准不可见，frozen.json/state.json 不可写 |
| 8 | **Port** | L1 Infra 注入端口抽象家族；让 L0 Kernel 跨 runtime 可移植；子类 PathPort/ResourcePort/CachePort |
| 9 | **PathPort** | L1 注入式路径操作接口；L0 不硬编码路径；NodePathPort 为 Node 实现；ADR-0010 |
| 10 | **ResourcePort** | 外部服务虚拟 FS 接口（S3/Slack/Gmail/GitHub）；只读；ADR-0028 / RFC v0.7.0 |
| 11 | **CachePort** | RAM/Redis 双模式缓存端口；热路径（probe-stats）缓存；ADR-0028 / RFC v0.7.0 |
| 12 | **WorkSnapshot** | Work 全状态可序列化对象（state.json + frozen.json + trace + references）；跨进程/跨设备传输；ADR-0028 |

### 变更 3：`oxn-proof-domain` 新增 3 个 H3 Terms

| # | Term | desc 草案 |
|---|---|---|
| 1 | **ProbeObservation** | L1 Infra 产出的物理事实（exitCode/stdout/stderr/fileList 等）；纯事实，不含判定 |
| 2 | **ProbeVerdict** | L0 Kernel 产出的业务判定（PASS/FAIL/INCONCLUSIVE）；Kernel 层 uppercase 无 -ED；frozen.json 用 PASSED/FAILED/-ED |
| 3 | **InterferenceFlag** | 12 项干扰标记枚举（8 RED: waf_detected/just_modified/detached_head/shallow_clone/sandbox_violation/network_timeout/response_truncated/permission_denied + 4 YELLOW: cdn_cache/cache_path/symlink/unknown）；Taint 的具体展开 |

### 变更 4：`oxn-work-domain` 新增 5 个 H3 Terms

| # | Term | desc 草案 |
|---|---|---|
| 1 | **Loop** | Work 核心动态过程（三相模型 Phase 2）；物质运动态；所有变化被 trace 记录；ADR-0006 |
| 2 | **EvidenceChainTriple** | 不可变证据三件套：frozen.json（公证/只读）+ trace.jsonl（历史/append-only）+ state.json（现状/来自 trace 重放）；ADR-0011 |
| 3 | **Trace-before-State** | 写 state.json 前必须先 append trace.jsonl 的写入顺序约束；原子性是 Trace-before-State 的物理基础；ADR-0009 |
| 4 | **context.md** | Work 内短期记忆文件（works/<id>/context.md）；取代 v0.7.x Memory L1；Intent + Roadmap + LoopHistory + KeyObservations 结构；ADR-0049 |
| 5 | **CriticalHandoff** | IAP 阶段间关键衔接点；2 个守卫：Intent→Align（planLock 存在）+ Align→Proof（task 状态确定）；Engine 守卫不可移除；RFC work-unified-model |

### 变更 5：`oxn-domain` 无变更

**Hall** 保留 H3，后续需在 Doc 补充说明。

### 变更 6：Doc Glossary 扩展

从 16 行 → ~45 行，覆盖 Domain 已有 + 新增的所有用户可见术语。

**新增术语行（29 个）**：

1. IAPPhase — Work 三阶段实体（Intent/Align/Proof）
2. Phase — 单个 IAP 阶段
3. Slot — Blueprint 拓扑节点（slot DAG）
4. Part — Task 内执行单元
5. Probe — 物理观测单元
6. Verdict — 三态判定（PASSED/FAILED/INCONCLUSIVE）
7. PlanLock — 不可变快照锁
8. BirthCert — Work 出生证明
9. Frozen — Work/Proof 终态判决书
10. Trace — 追加式事件流
11. ContentHash — SHA-256 内容哈希
12. AssetKind — 5 类资产枚举
13. AssetMode — Asset 模式 Work
14. AssetLifecycle — create/evolve/archive/delete
15. Artifact — Align 轴物理产物
16. RefPool — Work 级引用池
17. SkillContext — AI 三层上下文
18. Taint — Probe Signal Taint 干扰标记体系
19. InterferenceFlag — 12 项干扰标记枚举
20. Scope — @oxn/@prj/@gbl 引用作用域
21. Hall — 研讨厅
22. IAPError / OXNCrash / CliInputError — 错误三轨
23. Pattern — 跨 Work 模式识别
24. Pool — 5 类 Intent Pool
25. AuditTrail — 修改审计链
26. TrustChain — 信任链
27. AuditChain — 审计链
28. Notary — 公证人
29. LambdaVacuum — 兰姆达真空

---

## 7. 汇总

| Domain | 现有 H3 | 新增 | 预期总数 |
|---|---|---|---|
| oxn-domain | 16 | 0 | 16 |
| oxn-engine-domain | 9 | 12 | 21 |
| oxn-cli-domain | 13 | 0 | 13 |
| oxn-asset-domain | 10 | 11 | 21 |
| oxn-work-domain | 16 | 5 | 21 |
| oxn-proof-domain | 13 | 3 | 16 |
| oxn-insight-domain | 10 | 0 | 10 |
| **合计** | **87** | **31** | **118** |

Doc Glossary：16 行 → ~45 行。

---

## 8. 待执行 Checklist

（按执行顺序）

- [ ] 1. 编辑 `oxn-asset-domain.md`：新增 11 个 H3 Terms + 对应 bans/invariants 更新
- [ ] 2. 编辑 `oxn-engine-domain.md`：新增 12 个 H3 Terms + 对应 invariants 更新
- [ ] 3. 编辑 `oxn-proof-domain.md`：新增 3 个 H3 Terms + 对应 invariants 更新
- [ ] 4. 编辑 `oxn-work-domain.md`：新增 5 个 H3 Terms + 对应 invariants 更新
- [ ] 5. 校验 domain 文件间引用关系（新增 terms 是否导致 references 需更新）
- [ ] 6. 扩展 `docs/zh-cn/product/reference/glossary.md`：新增 29 行术语
- [ ] 7. 同步 `docs/en/glossary.md`：英文术语对齐
- [ ] 8. 在 Doc 概念页补充 `Hall` 术语说明
- [ ] 9. 校验 Domain 前后一致性（术语名与 Doc 用词对齐）
- [ ] 10. 跑 `bun run typecheck` + `bun run lint` 确认无破坏
