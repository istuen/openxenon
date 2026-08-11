---
entity: domain
name: OxnAssetDomain
abstract: OXN Asset 业务领域（Asset 结构 v2：Group → Axiom → Theorem）。
references:
  - oxn-engine-domain
  - oxn-cli-domain
  - oxn-domain
  - oxn-work-domain
  - oxn-project-domain
citations: 0
synced-at: 2026-08-09
---

# Domain: OxnAssetDomain

## Concept

### Asset
- Asset 是工程师为 AI 协作定义的**环境约束**；5 类 AssetKind（domain / workflow / stack / blueprint / assetmap）；Work 引用 Asset（单向）；创建后强校验（planLock + content_hash），不被 Work 改写。

### AssetKind
- Asset 5 类收敛枚举（domain / workflow / stack / blueprint / assetmap）。

### AssetMap
- AssetKind=assetmap 的语义别名（首选术语）——meta 索引层，AI 路由入口（6 scene 路由表 + Domain/Blueprint 索引）；不参与 references DAG。
  与版本计划文档 "Roadmap"（`dev/versions/`）不同情态（定义性 Asset vs 描述性 Doc）、不同位置。
  v0.6.4: AssetKind 枚举值同步从 `roadmap` 改为 `assetmap`（全面回收 Roadmap 术语）。

### AssetPaper
- Asset 论文结构 3 字段不变量：abstract + references + citations 缺一不可。学术论文↔Asset 映射。

### PlanLock
- Asset 创建后强校验卡（与 Work planLock 等效），锁 fileHash + citations + DAG；漂移触发 IAP_ALIGN_LOCK_HASH_MISMATCH。

### kind-isolation
- references 仅同 AssetKind 原则；跨 kind 组合由 Blueprint 承担，跨 kind 导航由 Roadmap scene.links 承担。

### External
- 边界内 `## Externals` H2 category，从 Asset 类型降级；url/path 二选一 + kind enum + 状态索引。

### Operation
- Stack Tool 的命名调用声明（name + command template + desc），住进 Stack 文件 `## Tools ### <tool>` 下的 `operations` 子段。Blueprint slot 通过 `operate: [op-name...]` 数组引用 Operation 名；work-context-builder 在 lock 期解析为可消费快照注入 WorkContextResult，让 AI Agent 在 Task 内零推理拿到应运行的命令。
- 与 Probe（验证参照）正交：Operation = 执行参照（AI Agent 跑），Probe = 验证参照（OXN 跑）。设计上独立，实践中常成对（如 `test` Operation + `test-pass` Probe）。
- 命名独立：Operation 用动词原形（test/lint/build），Probe 用结果态（test-pass/lint-check/ts-compiles）。operate 是参照不是门禁，验证由 observe Probe 独立承担。

### OnboardingStarter
- 项目消费者 onboarding 用的 5 个内置 Asset（doc-md-domain / md-author-workflow / md-stack / md-author-blueprint / md-system），物理位置 `src/builtin/projects/starter/`，走 `@oxn/` 公共层；通过 `oxn onboard --new` 复制到 `<project>/.openxenon/assets/`（@prj/ 层）。5 起手 Asset 是 onboarding 的最小可用集（替代旧 6 Asset 列表）。

### ProjectBootstrap
- 5 起手 Asset 复制到 `<project>/.openxenon/assets/` 并完成 `oxn asset check` 校验的过程。包含 3 步：(1) `oxn onboard --new` 触发复制；(2) 工程师填项目专属内容；(3) `oxn asset check` 验证 5 Asset 完整性。Proof-First 模式下 bootstrap 可选；完整 IAP 模式下 bootstrap 必走。

### OnboardingPath
- 项目消费者 onboarding 3 入口路径：`oxn onboard --new`（新项目入口）/ `oxn onboard --existing --proof-first`（存量 B1：先 Proof-First 5 分钟）/ `oxn onboard --existing --bootstrap`（存量 B2：AI 探索建 Asset）。入口探测：`oxn onboard --detect`（基于 package.json / compose.yaml / Cargo.toml / pyproject.toml 4 类信号）。Skill 入口：复用 `/oxn-work`，通过 Blueprint 区分场景。

### AssetCheck
- 5 起手 Asset 完整性校验（替代旧"数量下限校验"）：校验项 — Domain ≥ 1（必含 doc-md-domain）/ Workflow ≥ 1（必含 md-author-workflow）/ Stack ≥ 1（必含 md-stack）/ Blueprint ≥ 1（必含 md-author-blueprint）/ AssetMap ≥ 1（必含 md-system）。缺任一 → 提示运行 `oxn onboard --new`；不阻断 Proof-First 模式。

### StructureV2
- Asset 正文 v2 统一结构：`## Group → ### Axiom → - Theorem`；Blueprint 特例：`## Use <Asset Type> + ## Slot + 顶层 ### Scope / ### Context Template`。3 形态（Axiom + Theorem / 纯 Axiom / 纯 Theorem）均合法。Group 名 free-form，Engine 不解释业务含义。

### BlueprintPropsFunnel
- Blueprint props ≠ Part props 合集，是**漏斗**：Blueprint 通过硬编码 / 拼接 / 默认值吸收子层复杂度；Blueprint 充当"参数收敛器"，简化上层调用。
- **三层默认值优先级链**（高到低）：(1) 父层显式（Blueprint / Task `--param`）；(2) 本层 default（Blueprint 的 params.default）；(3) 子层 schema default（Part / Probe 的 props.default）。
- **Task 命令行参数简短**（只需关心 Blueprint 暴露面）；Part 内部细节对调用者隐藏。
- **变更同步要求**：Part 改名 / 删除属性时需同步检查 Blueprint 引用。
- Blueprint props funnel 原则贯穿 OXL `params` 求值链；改 partName 不破坏索引（partId 主键独立）。

### GlossaryTwoTierSSOT
- 术语双层 SSOT 架构——`.openxenon/assets/domains/*.md`（9 文件，~333 term headings）作**内部 SSOT**（OXN Runtime / Engine / AI Agent 视角），`docs/product/zh-cn/concepts/glossary.md`（单文件，~317 unique terms）作**外部 SSOT**（用户 / 文档读者视角）。
- **Domain 承载所有 inv/ban**——Domain 是术语权威定义源（含 inv + ban + 设计理念 + 来源标注）；glossary 不复制 inv/ban（DRY）。
- **单向同步**——新增/编辑/删除术语的唯一入口是 Domain 文件；glossary 是生成产物（通过 `scripts/sync-domain-glossary.ts` 覆盖式生成）；方向 Domain → glossary，绝不允许反向。
- **glossary 结构**——单页（不是 `docs/glossary/zh-cn/*.md` 多文件），按字母升序排序（A-E / F-L / M-R / S-Z 三段）；glossary-ref 字段由 sync 脚本反向填入。
- **Sync 守门**——`scripts/sync-domain-glossary.ts` 读取 9 个 Domain 文件，合并去重后写 glossary；术语定义变更必须重跑 sync（pre-commit 校验）。

### SyncDomainGlossaryEntry
- Domain → glossary 单向同步脚本唯一入口——`bun scripts/sync-domain-glossary.ts --write`（CLI：`oxn domain sync-glossary --write`）。
- **输入**——9 个 Domain 文件（`.openxenon/assets/domains/*.md`）；读取 `### Axiom`/`### Term` H3 标题 + bullet 描述。
- **输出**——`docs/product/zh-cn/concepts/glossary.md`（覆盖式写入）；术语按字母升序分组（A-E / F-L / M-R / S-Z）；保留 SYNC:START/END sentinel 之外的手工导读/索引但术语本体不手工编辑。
- **多 Domain 同名 term 收敛**——同 slug 跨域出现时（实测 ~12 处），sync 脚本保留 canonical 域版本（oxn-asset-domain 优先）他域做引用；重名 term 列出所有源域。
- **守门约束**——`scripts/check-doc-boundary.ts` 三条 glossary 规则启用（Phase 3 完成后）：glossary 不可手工编辑 SYNC 区域 + 概念页不可重定义 term + sync 产物注册为 generated。

### AssetAsOntology
- Asset = Ontology 形式推理推迟——Asset 描述工程语汇的边界（Concept / Boundary / Forbidden / Slogan / ContextEngineering），但不承载 OWL/RDF 风格的自动推理；形式推理属"知识判断"，OXN 立法不管，归工程师 + AI 自然语言推理。
- **拓扑闭包校验**——Asset 引用 DAG 无环（Inv5）+ 同 kind bare name（Inv15）+ 预算 N=5（Inv16）共同保证 Asset 集合的拓扑完整性（不要求形式闭包）。
- **Asset = 边界声明**——不描述"系统如何变化"（运行时语义在 Engine 内核），只描述"什么存在 / 什么不允许 / 什么是术语"。Engine 用 classifyAxiom 归并到 DomainTerm/DomainBan/DomainInvariant/DomainStackEntry 4 个原子字段（无 sub-bullet）。
- **形式推理归工程师**——若项目需严格本体推理（class hierarchy + property constraint + 自动 consistency check），应走外部工具（Protege / SHACL / OWL reasoner）；OXN 不内建形式推理机，OXN 提供稳定语汇 + 引用图。
- **OXN 与 LLMs 的边界**——LLM Agent 知识全集（世界模型）由 LLM 自带，OXN 提供 Asset 参照锚点（确定性边界）让 LLM 推理有对齐基准；两者职责分工。

## Forbidden

### ForbiddenConstructs
- ignoreAssetLock
- directWriteOxn
- copyFromOldLayout
- assetModeTask
- assetBypassWork
- AssetKindMix
- CategoryMix
- missingAbstract
- missingReferences
- missingCitations
- selfReference
- cyclicReference
- oldLayoutPath
- oxn-asset-new
- skipValidation
- forceBypass

## Boundary

### Inv1KindWhitelist
- 5 AssetKind 白名单不可混用（domain ≠ workflow ≠ stack ≠ blueprint ≠ assetmap）；H2 分类严格隔离；混用 → E_MD_CATEGORY_UNKNOWN。

### Inv2AssetModeRequiresKind
- `--type asset` 必填 `--asset-kind X`；5 AssetKind 之外的值 → OXN_INVALID_ASSET_KIND（CLI 加载期拒绝）。

### Inv3AssetModeSkipTaskDag
- Asset 模式（--type asset）不走 task DAG；不写 .work / .run；只写 .openxenon/assets/{kind}/{name}.md + planLock。

### Inv4PaperFieldsRequired
- Asset 论文结构 3 字段必填：abstract + references + citations 缺一不可；缺失 → IAP_INTENT_ASSET_INCOMPLETE。

### Inv5DagNoCycles
- Asset 引用 DAG 无环：AssetA.references 含 AssetB + AssetB.references 含 AssetA → IAP_INTENT_DAG_CYCLE（含 cycleHint）。

### Inv6NoSelfReference
- Asset 不能引用自己（v0.6.3+ hard-block）：Asset.references 含自身 → IAP_INTENT_SELF_REFERENCE。

### Inv7PlanLockHashStrict
- Asset 创建后 planLock 强校验 fileHash；漂移触发 IAP_ALIGN_LOCK_HASH_MISMATCH（与 Work planLock 4 组件 hash 等效）。

### Inv8EvolveCreatesNewVersion
- Asset 演进（--evolve-from）创建新版本，旧版 planLock 自动失效。

### Inv9ArchivePreservesCitations
- Asset 归档（`oxn asset archive X --reason Y`）：文件 mv 到 .openxenon/.archived/{kind}/X.md；citations 保留；planLock 仍可查询（只读）。

### Inv10DeleteRequiresNoRefs
- Asset 删除（`oxn asset delete X --force`）：仅当无任何引用 + 业务团队同意才能硬删；否则 → IAP_ASSET_HAS_REFS（YIELD_TO_HUMAN）。

### Inv11PhysicalLocation
- Asset 物理位置 v0.6 默认：.openxenon/assets/{kind}/X.md；v0.5 fallback：.openxenon/{kind}/X.md（保留兼容但新项目不再使用）。

### Inv12NamingConvention
- Asset 命名规范：domain PascalCase（MemberContext）；blueprint / stack / assetmap kebab-case（dev-workflow）。

### Inv13NameFileConsistency
- Asset 名称规范化：toKebab(declared) === toKebab(file_stem)；不一致 → IAP_INTENT_NAME_FILE_MISMATCH（YIELD_TO_HUMAN）。

### Inv14DuplicateNameConflict
- 重复创建同 name 资产 → OXN_ASSET_EXISTS（PATH_CONFLICT）；--force 覆盖；不静默合并。

### Inv15KindIsolationInReferences
- 解析优先级（PR-D 强化）：(1) bare name → 强制 parent kind 推断；(2) `@md/{kind}/{name}` → 显式 kind + name（deprecated）；(3) 跨 kind → 必须通过 Blueprint `## Use` 段。
- 跨 kind references 触发 IAP_INTENT_CROSS_KIND_REF（v0.6.2+ hard-block 保留）。
- 跨 kind 导航由 Roadmap scene.links 承担（不变）。

### Inv16RefsBudgetLimit
- Asset references 数量预算 N=5：单一节点 fan-out 上限（防依赖地狱）；超过触发 IAP_INTENT_REFS_BUDGET_EXCEEDED（v0.6.2+ soft-warn）；Roadmap scene.links 不受此限。

### Inv17LeafAssetLegitimacy
- Leaf Asset legitimacy：Asset.references=[] 是合法 leaf 节点；叶子 Asset 可被 Work/Task/Roadmap 引用，不要求必须有引用方；僵尸判断由 Roadmap 是否引用 + citations==0 + 创建后未使用 共同决定。

### Inv18TemplateIsEngineSsot
- Asset 模板（assets/{kind}.md）是 OXN Engine 的 SSOT；CLI 创建时复用模板；禁止 in-place 改模板（改动必须走 PR）。

### Inv19CitationsAutoIncrement
- Asset 引用方（Work/Task/Asset）变更后，引用目标 citations 字段自动 +1；不需手工改。

### Inv20NotMixedWithWork
- Asset 不与 Work 混用：同一 .openxenon/ 目录下 Asset（.md）与 Work（.md）互不引用；Asset 通过 @prj 寻址被 Work 引用。

### Inv21AiAssetViaDraft
- AI 自建 Asset 必须走 Draft → Promote 路径——先 `oxn draft create` 建描述性工作稿，工程师审核后通过 `oxn work create --type asset` 走 IAP 闭环升格为正式 Asset。AI 不能直接建 Asset。Draft 是 Asset 的前置状态（描述性情态），与 Asset（定义性情态）情态分离。

### Inv22AssetExposesProbeContractNotImpl
- Asset 暴露 Probe 调用契约（有哪些、怎么调用）**不破坏确定性**——确定性根基是 Probe 执行代码不可变（OXN 构建产物，AI 无法修改）。Asset 暴露调用契约 ≠ 代码修改；参数化（stackTools）改变观测行为不改变执行代码。「验证标准 AI 不可见」是软对抗（提高针对性绕过成本）非确定性根基。

### Inv23ProjectBootstrap5Assets
- 项目消费者 onboarding 必须 bootstrap 5 起手 Asset（Domain + Workflow + Stack + Blueprint + AssetMap）。缺任一 → `oxn asset check` 报错；Missing 状态下不可进入完整 IAP。5 起手 Asset 物理位置：src/builtin/projects/starter/（@oxn/ 层）；通过 `oxn onboard --new` 复制到 @prj/ 层（`<project>/.openxenon/assets/`）。5 Asset 命名：doc-md-domain / md-author-workflow / md-stack / md-author-blueprint / md-system。替代旧"6 Asset 下限"（含 Roadmap/AssetMap）。边界：OXN 自身 bootstrap 仍走自举豁免（src/builtin/），**不**受本 inv 约束。

### Inv24StarterAssetReadonly
- 5 起手 Asset 在 src/builtin/projects/starter/ 路径下为只读（chmod 0o444）；工程师不直接修改源模板，调整通过 `oxn onboard --existing --bootstrap` 派生项目专属 Asset。避免模板污染；类比自举豁免。

### Inv25BlueprintScopeDeclarative
- Blueprint `## Scope` 段声明 allow/forbid 文件 glob（静态锁定，PlanLock 保护）：allow 为允许修改的文件路径 glob 列表，缺省工程根全树（`**`）；forbid 为禁止修改的文件路径 glob 列表，缺省空列表；与 Blueprint `## Use` 引用机制正交（Use = Asset 引用；Scope = 文件边界）；不新增 Probe；lock 时由 inv-35 (artifacts-within-scope) 校验 Task ArtifactDeclaration ⊆ Scope。

### Inv26BlueprintContextTemplateOptional
- Blueprint `## Context Template` 段可选：缺省 Engine 用内置默认模板（基于 Use refs + Boundaries + Goal 推导）；Blueprint 可覆写默认（如 bug-fix-blueprint 在 diagnose 段加"证据落盘"指令）。Blueprint 不复制 Asset 内容 —— 只声明"去哪取什么"（与 inv-26 域/蓝图隔离原则一致）；AI Agent 按 Goal 自己判断从引用的 Domain 取哪些 Terms/Invariants。

### Inv27OperateSubsetStackOperations
- Blueprint slot.operate 里的每个 name 必须在 Blueprint 引用的 Stack tool.operations 中可解析：lock 期 work-validator 对每个 slot.operate[] 项跑 (name → Stack tool.operations[name]) 校验；不可解析 → IAP_INTENT_OPERATION_NOT_FOUND（YIELD_TO_HUMAN），列出缺失 name + 引用的 Stack 名；校验范围：Blueprint.use.stack[] 引用的所有 Stack 文件 union。

### Inv28OperationDisambiguation
- Blueprint 引用的 Stack 集合内，若两个 tool 声明同名 operation（同一 operation.name 出现在不同 tool.operations 下），lock 期报 IAP_INTENT_OPERATION_AMBIGUOUS（YIELD_TO_HUMAN），列出冲突 tool 名 + operation 名。修复方式：operate 项使用 tool:operation 限定名（如 `bun-test:test`），Engine 解析时按限定名直接定位。operation 名在 Stack 集合内默认要求唯一（不限定名场景）；Blueprint 引用多 Stack 时跨 Stack 同名 operation 也触发此校验。

### Inv29StructureV2Shape
- Asset 正文统一为 `## Group → ### Axiom → - Theorem` 三层结构；Blueprint 特例 `## Use <Asset Type> + ## Slot + 顶层 ### Scope / ### Context Template`。形态 A（Axiom + Theorem）/ 形态 B（纯 Axiom）/ 形态 C（纯 Theorem）均合法。守门脚本 `bun scripts/check-asset-structure.ts` 接入 pre-commit。

### Inv30ReferencesSyntaxCanonical
- 解析边界固定在 `extractReferences()` + `resolveReference()`（`packages/engine/src/Asset/internal/reference-checker.ts`）；reverse index key 用 `${kind}::${name}` 形式归一化（消除 false negative）。
- Blueprint `## Use` 段 cross-kind 组合强制显式 `kind:` 字段（`- workflow: oxn-workflow`），不加 `@md/` 前缀。
- Asset.references 数量预算 N=5（Inv16）不受影响；只是解析方式变化。

## DesignPhilosophy

### Theorem
- Asset 结构第 3 层节点；物理形态 `- <text>` bullet 行；隶属于最近 `### Axiom`（无主 Axiom 时为形态 C Composite Theorem，归当前 Group）；设计为叶子节点（不可任意 list 嵌套）；MD 语法底层支持无限嵌套（CommonMark / GFM / mdast 无深度上限），OXN 拒绝是设计选择非技术限制。

### TheoremEscapeHatch
- 必须表达 Theorem 深度时的逃生舱索引：4 类详见下方 Axioms（AxiomNameCarrying / GroupSwitch / CrossAssetReference / FieldLoadNested）。

### LeafByDesignEngineIRAtomicity
- 根因 1：Engine IR atomicity——`classifyAxiom()` 把 Axiom 内容归并到 `DomainTerm / DomainBan / DomainInvariant / DomainStackEntry` 4 个 atomic 字段，无 SubTheorem 容器；sub-bullet 被 Engine 丢弃（`packages/engine/src/oxl/md-pipeline/transformers/domain.ts:74-141`）。

### LeafByDesignReferentStability
- 根因 2：参照系稳定性——OXN 是确定性参照系，管结构稳定不管推理质量；嵌套 list 把"软推理"硬化为"硬层级"，污染 LLM 推理灵活性。

### LeafByDesignKnowledgeJudgment
- 根因 3：知识判断隔离——定理依赖属"知识判断"，OXN 立法不管，归工程师 + AI 自然语言推理。

### EscapeHatchAxiomNameCarrying
- 逃生舱 A：Axiom 命名承载——拆多 Axiom 平铺（`### Inv1` / `### Inv1A` / `### Inv1B`），命名承载层级；Engine 用 `slugify(H3)` 做 ID，序号不解析。

### EscapeHatchGroupSwitch
- 逃生舱 B：Group 切换——新主题开新 `## Group`（`## Concept` / `## Boundary` / `## Foundation` 等皆 free-form）。

### EscapeHatchCrossAssetReference
- 逃生舱 C：跨 Asset 引用——同 kind `references`（Inv15 + Inv16 预算 N=5）/ 跨 kind Blueprint `## Use`（显式 `kind:` 字段）/ 跨 kind 导航 AssetMap `scene.links`；Engine DAG 校验防环（Inv5DagNoCycles）。

### EscapeHatchFieldLoadNested
- 逃生舱 D：field-load Axiom 内嵌（Blueprint/Stack 限定豁免）——Tool `operations:` / Slot `observe/operate/deps:` / Use `path/kind:` / Scope `allow/forbid:` / Context Template `business/process/...`；OXN 守门明确豁免（`scripts/check-asset-structure.ts:295-301`）。

## Slogan

- OXN = 工程师定义 AI Agent 协作边界的工具。
- Asset 是 AI Agent 不可篡改的工程契约。

## ContextEngineering

### AssetPeasRole
- PEAS E（Environment）—— Asset 是工程师为 AI Agent 协作定义的边界环境。
- R&N 对照：Asset 是世界模型的确定性参照——LLM 上下文是 AI 自有的世界模型（漂移衰减），Asset 是稳定的只读参照锚点。参照系只覆盖读侧；写侧拆成三角色协议（AI 提案 → OXN 记录 → 工程师升格），无单一更新函数。

### BlueprintContextEngineering
- 上下文工程的元结构：声明哪些 Assets 提供什么上下文（Use）+ 如何拆分为 Slot（Boundaries）+ 文件范围（Scope）+ 组装指令（Context Template）。
- 三层职责分离：Use = 聚合 / Boundaries = 结构 / Scope = 范围 / Context Template = 指令。
- 不复制内容 — Blueprint 保持纯净，只声明"去哪取"。

### WorkContextStaticPlanLockProtected
- Work 级上下文内容（AI Agent 按 Blueprint Context Template 从 Use refs 引用的 Assets 组装）。
- 位置：`works/<id>/context.md`；lock 前写完；纳入 PlanLock 5-hash；lock 后漂移 → `HASH_MISMATCH`。
- 与 `memory.md` 的二分：WorkContext = 静态结构骨架（PlanLock 锁）；`memory.md` = 动态记忆（append-only）。

### TaskContextPerSlotSplit
- Task 级上下文内容（AI Agent 从 WorkContext 按 Blueprint `## Boundaries` 的每个 Slot 拆分）。
- 位置：`works/<id>/tasks/<t>/context.md`；纳入 PlanLock 5-hash；与 `workContextHash` 分开定位 drift。

### PlanLockFiveHash
- v0.7+ 结构：`workMdHash + workContextHash + blueprintsHash + tasksHash + taskContextsHash → allHash`。
- 保障：同一 Blueprint 的 N 个 Work 的 WorkContext 结构一致（除 Goal 外）—— 跨 Work 比较 hash 一致 ⇒ 结构骨架一致。
- 与通用上下文工程的边界：通用把所有知识塞 LLM 上下文窗口无边界；OXN 每个 Work 独立 `context.md`（goal-scoped，PlanLock 锁），目标聚焦、范围隔离、可审计。
- 本质区别：OXN 的上下文工程是"声明 vs 物化"二分 — Blueprint 声明（Use + Boundaries + Scope + Context Template），Work 物化（context.md + memory.md），Task 拆分（context.md + Artifacts）。