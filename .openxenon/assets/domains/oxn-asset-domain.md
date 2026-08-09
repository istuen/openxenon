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

> v1.1.0 (2026-08-09): 🆕 PR-D（Q7 B 方案）强化 Inv15（references 语法：bare name + parent-kind metadata）+ 新增 Inv30（ReferencesSyntaxCanonical：bare name canonical + `@md/...` deprecated 兼容）。
v1.0.0 (2026-08-08): 收编为 Asset 结构 v2 三层模型（## Group → ### Axiom → - Theorem），原 Terms/Bans/Invariants 三段并入。语义锁定；不修改 invariants 含义。

## Concept

### Asset
- Asset 是工程师为 AI 协作定义的**环境约束**；5 类 AssetKind（domain / workflow / stack / blueprint / assetmap）；Work 引用 Asset（单向）；创建后强校验（planLock + content_hash），不被 Work 改写。

### AssetKind
- Asset 5 类收敛枚举（domain / workflow / stack / blueprint / assetmap），v0.6.1-alpha.4 三边界框架收敛结果；🆕 v0.6.4 roadmap → assetmap 全面回收。

### AssetMap
- AssetKind=assetmap 的语义别名（首选术语）——meta 索引层，AI 路由入口（6 scene 路由表 + Domain/Blueprint 索引）；不参与 references DAG。
  与版本计划文档 "Roadmap"（`dev/versions/`）不同情态（定义性 Asset vs 描述性 Doc）、不同位置。
  🆕 v0.6.4: AssetKind 枚举值同步从 `roadmap` 改为 `assetmap`（v0.7 RFC-0013 D4 原锁定枚举值不变，但 v0.6.4 设计决定全面回收 Roadmap 术语）。

### AssetPaper
- Asset 论文结构 3 字段不变量（ADR-0051）：abstract + references + citations 缺一不可。学术论文↔Asset 映射。

### PlanLock
- Asset 创建后强校验卡（与 Work planLock 等效），锁 fileHash + citations + DAG；漂移触发 IAP_ALIGN_LOCK_HASH_MISMATCH。

### kind-isolation
- references 仅同 AssetKind 原则；跨 kind 组合由 Blueprint 承担，跨 kind 导航由 Roadmap scene.links 承担；ADR-0054。

### External
- 边界内 `## Externals` H2 category，从 Asset 类型降级；url/path 二选一 + kind enum + 状态索引；ADR-0056。

### Operation
- Stack Tool 的命名调用声明（name + command template + desc），住进 Stack 文件 `## Tools ### <tool>` 下的 `operations` 子段。Blueprint slot 通过 `operate: [op-name...]` 数组引用 Operation 名；work-context-builder 在 lock 期解析为可消费快照注入 WorkContextResult，让 AI Agent 在 Task 内零推理拿到应运行的命令。
- 与 Probe（验证参照）正交：Operation = 执行参照（AI Agent 跑），Probe = 验证参照（OXN 跑）。设计上独立，实践中常成对（如 `test` Operation + `test-pass` Probe）。
- 命名独立：Operation 用动词原形（test/lint/build），Probe 用结果态（test-pass/lint-check/ts-compiles）。operate 是参照不是门禁（与 ADR-0066/0067 一致），验证由 observe Probe 独立承担。
- 来源：design-stack-operation-referent Draft（2026-08-07 grilling）。

### OnboardingStarter
- 项目消费者 onboarding 用的 5 个内置 Asset（doc-md-domain / md-author-workflow / md-stack / md-author-blueprint / md-system），物理位置 `src/builtin/projects/starter/`，走 RFC-0011 `@oxn/` 公共层；通过 `oxn onboard --new` 复制到 `<project>/.openxenon/assets/`（@prj/ 层）。5 起手 Asset 是 onboarding 的最小可用集（替代 ADR-0069 D1 的 6 Asset）。ADR-0089 D1。

### ProjectBootstrap
- 5 起手 Asset 复制到 `<project>/.openxenon/assets/` 并完成 `oxn asset check` 校验的过程。包含 3 步：(1) `oxn onboard --new` 触发复制；(2) 工程师填项目专属内容；(3) `oxn asset check` 验证 5 Asset 完整性。Proof-First 模式下 bootstrap 可选；完整 IAP 模式下 bootstrap 必走。ADR-0089 D2。

### OnboardingPath
- 项目消费者 onboarding 3 入口路径：`oxn onboard --new`（新项目入口）/ `oxn onboard --existing --proof-first`（存量 B1：先 Proof-First 5 分钟）/ `oxn onboard --existing --bootstrap`（存量 B2：AI 探索建 Asset）。入口探测：`oxn onboard --detect`（基于 package.json / compose.yaml / Cargo.toml / pyproject.toml 4 类信号）。Skill 入口：复用 `/oxn-work`，通过 Blueprint 区分场景（ADR-0089 D6）。ADR-0089 D2。

### AssetCheck
- 5 起手 Asset 完整性校验（替代 ADR-0069 G1 "数量下限校验"）：校验项 — Domain ≥ 1（必含 doc-md-domain）/ Workflow ≥ 1（必含 md-author-workflow）/ Stack ≥ 1（必含 md-stack）/ Blueprint ≥ 1（必含 md-author-blueprint）/ AssetMap ≥ 1（必含 md-system）。缺任一 → 提示运行 `oxn onboard --new`；不阻断 Proof-First 模式。ADR-0089 D3 + D4。

### StructureV2
- Asset 正文 v2 统一结构：`## Group → ### Axiom → - Theorem`；Blueprint 特例：`## Use <Asset Type> + ## Slot + 顶层 ### Scope / ### Context Template`。3 形态（Axiom + Theorem / 纯 Axiom / 纯 Theorem）均合法。Group 名 free-form，Engine 不解释业务含义。
- 来源：design-asset-structure-unification Draft（2026-08-08 grilling）。

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
- 5 AssetKind 白名单不可混用（domain ≠ workflow ≠ stack ≠ blueprint ≠ assetmap）；H2 分类严格隔离；混用 → E_MD_CATEGORY_UNKNOWN。🆕 v0.6.4: 'roadmap' → 'assetmap'。

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
- 🆕 v0.6.4 PR-D（Q7 B 方案强化）：Asset.references 仅可引用**同 AssetKind**（bare name 强制 parent kind 推断；target name 必须在该 kind 文件夹下实际存在）。**跨 kind 引用必须用 Blueprint `## Use` 段**（显式 `kind:` 字段，例 `- workflow: oxn-workflow`）。`@md/{kind}/{name}` 形式标记 deprecated（向后兼容 v0.6.4 之前 Blueprint frontmatter）。
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
- AI 自建 Asset 必须走 Draft → Promote 路径——先 `oxn draft create` 建描述性工作稿，工程师审核后通过 `oxn work create --type asset` 走 IAP 闭环升格为正式 Asset。AI 不能直接建 Asset。Draft 是 Asset 的前置状态（描述性情态），与 Asset（定义性情态）情态分离。来源：ADR-0084（2026-07-31）。

### Inv22AssetExposesProbeContractNotImpl
- Asset 暴露 Probe 调用契约（有哪些、怎么调用）**不破坏确定性**——确定性根基是 Probe 执行代码不可变（OXN 构建产物，AI 无法修改）。Asset 暴露调用契约 ≠ 代码修改；参数化（stackTools）改变观测行为不改变执行代码。ADR-0076「验证标准 AI 不可见」是软对抗（提高针对性绕过成本）非确定性根基。来源：ADR-0072 erratum v1.0.1（2026-07-31）。

### Inv23ProjectBootstrap5Assets
- 项目消费者 onboarding 必须 bootstrap 5 起手 Asset（Domain + Workflow + Stack + Blueprint + AssetMap）。缺任一 → `oxn asset check` 报错；Missing 状态下不可进入完整 IAP。5 起手 Asset 物理位置：src/builtin/projects/starter/（RFC-0011 @oxn/ 层）；通过 `oxn onboard --new` 复制到 @prj/ 层（`<project>/.openxenon/assets/`）。5 Asset 命名：doc-md-domain / md-author-workflow / md-stack / md-author-blueprint / md-system。替代 ADR-0069 D1 "6 Asset 下限"（含 Roadmap/AssetMap）。ADR-0089 D1 + D3。边界：OXN 自身 bootstrap 仍走 RFC-0012 自举豁免（src/builtin/），**不**受本 inv 约束。

### Inv24StarterAssetReadonly
- 5 起手 Asset 在 src/builtin/projects/starter/ 路径下为只读（chmod 0o444）；工程师不直接修改源模板，调整通过 `oxn onboard --existing --bootstrap` 派生项目专属 Asset。避免模板污染；类比 RFC-0012 自举豁免。ADR-0089 Consequences 风险缓解。

### Inv25BlueprintScopeDeclarative
- Blueprint `## Scope` 段声明 allow/forbid 文件 glob（静态锁定，PlanLock 保护）：allow 为允许修改的文件路径 glob 列表，缺省工程根全树（`**`）；forbid 为禁止修改的文件路径 glob 列表，缺省空列表；与 Blueprint `## Use` 引用机制正交（Use = Asset 引用；Scope = 文件边界）；不新增 Probe；lock 时由 inv-35 (artifacts-within-scope) 校验 Task ArtifactDeclaration ⊆ Scope。来源：design-blueprint-context-template Draft（2026-08-06 grilling）。

### Inv26BlueprintContextTemplateOptional
- Blueprint `## Context Template` 段可选：缺省 Engine 用内置默认模板（基于 Use refs + Boundaries + Goal 推导）；Blueprint 可覆写默认（如 bug-fix-blueprint 在 diagnose 段加"证据落盘"指令）。Blueprint 不复制 Asset 内容 —— 只声明"去哪取什么"（与 inv-26 域/蓝图隔离原则一致）；AI Agent 按 Goal 自己判断从引用的 Domain 取哪些 Terms/Invariants。来源：design-blueprint-context-template Draft（2026-08-06 grilling）。

### Inv27OperateSubsetStackOperations
- Blueprint slot.operate 里的每个 name 必须在 Blueprint 引用的 Stack tool.operations 中可解析：lock 期 work-validator 对每个 slot.operate[] 项跑 (name → Stack tool.operations[name]) 校验；不可解析 → IAP_INTENT_OPERATION_NOT_FOUND（YIELD_TO_HUMAN），列出缺失 name + 引用的 Stack 名；校验范围：Blueprint.use.stack[] 引用的所有 Stack 文件 union。来源：design-stack-operation-referent Draft（2026-08-07 grilling）。

### Inv28OperationDisambiguation
- Blueprint 引用的 Stack 集合内，若两个 tool 声明同名 operation（同一 operation.name 出现在不同 tool.operations 下），lock 期报 IAP_INTENT_OPERATION_AMBIGUOUS（YIELD_TO_HUMAN），列出冲突 tool 名 + operation 名。修复方式：operate 项使用 tool:operation 限定名（如 `bun-test:test`），Engine 解析时按限定名直接定位。operation 名在 Stack 集合内默认要求唯一（不限定名场景）；Blueprint 引用多 Stack 时跨 Stack 同名 operation 也触发此校验。来源：design-stack-operation-referent Draft（2026-08-07 grilling）。

### Inv29StructureV2Shape
- Asset 正文统一为 `## Group → ### Axiom → - Theorem` 三层结构；Blueprint 特例 `## Use <Asset Type> + ## Slot + 顶层 ### Scope / ### Context Template`。形态 A（Axiom + Theorem）/ 形态 B（纯 Axiom）/ 形态 C（纯 Theorem）均合法。守门脚本 `bun scripts/check-asset-structure.ts` 接入 pre-commit。来源：design-asset-structure-unification Draft（2026-08-08 grilling）。

### Inv30ReferencesSyntaxCanonical
- 🆕 v0.6.4 PR-D（Q7 B 方案）：references 语法统一为 **bare name**（v0.6.4 canonical），parent-kind metadata 推断。`@md/{kind}/{name}` 形式 deprecated 但保留解析兼容（Blueprint frontmatter 老代码仍能跑）。
- 解析边界固定在 `extractReferences()` + `resolveReference()`（`packages/engine/src/Asset/internal/reference-checker.ts`）；reverse index key 用 `${kind}::${name}` 形式归一化（消除 false negative）。
- Blueprint `## Use` 段 cross-kind 组合强制显式 `kind:` 字段（`- workflow: oxn-workflow`），不加 `@md/` 前缀。
- Asset.references 数量预算 N=5（Inv16）不受影响；只是解析方式变化。

## Slogan

- OXN = 工程师定义 AI Agent 协作边界的工具。
- Asset 是 AI Agent 不可篡改的工程契约。