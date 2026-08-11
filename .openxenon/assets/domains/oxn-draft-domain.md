---
entity: domain
name: OxnDraftDomain
abstract: |
  OpenXenon Draft 体系领域（Asset 结构 v2：Group → Axiom → Theorem）——定义 Draft 工作稿（未提升的描述性内容）、DraftType（report/issue/design）、
  DraftLifecycle（create → archive | discard）、DraftTarget（rfc/asset/work/**goal**）、Skeleton（per-target 模板）、DraftOrigin（human | insight）、PromoteRoute。
references:
  - oxn-domain
  - oxn-project-domain
  - oxn-asset-domain
citations: 0
synced-at: 2026-08-09
---

# Domain: OxnDraftDomain

> OpenXenon Draft 体系领域——定义未提升的描述性工作稿 + Promote 路由的全部概念边界。
> 与 OxnAssetDomain（E1 Asset）和 docs/ Doc（已提升）形成三角：Draft → Asset/Doc 是单向 promote 关系。
> 本域仅定义概念 + 边界规则，不描述 CLI 实现（CLI 在 @openxenon/engine/Draft + packages/cli/src/commands/draft.ts）。
>
> 与 `oxn-draft-promote-domain.md` 合并。Promote 相关概念（PromoteRoute / SkeletonForking / PromoteLifecycle / TargetDispatchTable / PromoteBoundaryIsolation）并入本域 `## PromoteRoute` 段；Promote 相关 invariant（Inv1-7）并入 `## Boundary` 段。单向 references：本域 → oxn-asset-domain + oxn-project-domain + oxn-domain（原 promote 域对本域的 back-reference 已删除）。

## Concept

### Draft
- 未提升的描述性工作稿（Descriptive Modality 草稿态）；物理位置 `.openxenon/drafts/`（可经 `.oxnrc` `draftDir` 字段配）；CLI 创建 + 工程师 / AI Agent 填写 + 工程师主动 promote（经 draft-promote-router Blueprint）。
- v0.6.2-alpha.3 起支持 2 种创建模式：
- **空白模式**（默认）：`oxn draft create <name> --prefix <report|issue|design>` 创建 0 bytes 文件（D22/D33/D37 撤销决议的延续）。
- **Skeleton 模式**：`oxn draft create <name> --target <rfc|asset|work> [--kind <5 kinds>]` 调 draft-skeleton-fork Workflow，从 `.openxenon/draft-skeletons/<target>[-<kind>].md` 派生含 frontmatter + H2 段的骨架（v0.6.3 Fix #1 移到 boundary 顶层）。
- 关键约束：v0.6.2-alpha.3 后 Draft 可选携带 frontmatter hint（`promote-target` / `promote-kind`），但仍不是 Asset，不参与 Asset 生命周期。
- 生命周期：create → (promote → archive | discard) | archive | discard。

### DraftType
- Draft 用途分类——3 类：report（调研报告） / issue（问题记录） / design（设计稿）。映射到文件名前缀（Q-S1/Q-S5）：
- `report` → `report-<name>.md`
- `issue` → `issue-<name>.md`
- `design` → `design-<name>.md`
- 无 prefix → `<name>.md`（generic）
- 与 DraftTarget 不同（D9+D-α）：DraftType 仅是文件名 metadata（标识用途），DraftTarget 是 algorithmic 路由（标识去向）。
- 例：`design-foo.md`（要设计 foo）→ promote-target=asset（推到 Asset）。
- 状态转移：active → archived（archive 命令，保留历史）；active → discarded（discard --force，物理删除）。
- Q-S7 锁定：6 命令 = create + list + archive + discard + promote + retarget（最小完整周期）。

### DraftTarget
- Draft Promote 路由去向——4 值枚举（v0.5.0 D2 起；Q-T1 + D2）：
- `rfc`：目标为 RFC（落盘 docs/rfcs/zh-cn/RFC-XXXX-<theme>.md），由 promote-target-aware-workflow Blueprint 路由。
- `asset`：目标为 5 类 Asset（落盘 .openxenon/assets/{kind}/{name}.md），按 `--kind` 分支。
- `work`：目标为 Work（落盘 .openxenon/works/<id>/work.md），不细分子类型（v0.6.0 D3 起 draft-promote --target=work 拒收，引导走 goal → `oxn goal work`）。
- `goal`（v0.5.0 新增）：目标为 Goal（落盘 dev/pool/<slug>.md），promote 完成后 auto `git checkout -b feat/goal-<slug> dev`。
- Goal = 规划期承诺单元；与 DraftTarget=work 区别：work=IAP 执行（多轮），goal=IAP 准备（单 commitment）。
- physical isolation：dev/pool/ 是 dev/ 元层（v0.6.2-alpha.2 起治理）；.openxenon/works/ 是 .openxenon 边界。
- 物理载体：Draft 文件 frontmatter `promote-target: <rfc|asset|work|goal>`（v0.6.2-alpha.3 起，可选）。
- 路由规则：详见 `## PromoteRoute` 段 §TargetDispatchTable（v0.5.0 起 8 sub-target）。

### DraftSkeleton
- per-target 模板——含 frontmatter（必填字段占位）+ H2 段（按目标类型，例如 RFC 的 `## 决策` / Domain 的 `## Terms`）+ TODO 占位。
- 物理位置：`.openxenon/draft-skeletons/<target>[-<kind>].md`（v0.6.3 Fix #1 移到 boundary 顶层，避开 blueprint index）。
- frontmatter：`entity: skeleton`（v0.6.3 Q1 独立 entity）+ `target-entity`（fork 后的目标 entity）。
- 派生方式（推荐）：draft-skeleton-fork Workflow 调 `asset-create` workflow 的 fork-template slot，从骨架源拷贝。
- 关键区别：Skeleton **不是** Draft 内置 template 机制（B-α 决议），独立 entity 标识不与其他 AssetKind 混淆。

### DraftOrigin
- v0.4.0（D1 2026-08-07）起：Draft producer 标识字段，frontmatter `origin: human | insight`，默认 `human`。
- `human`（默认）：工程师手写探索稿、reflection、issue 记录。
- `insight`：由 OXN Insight 系统生成；落地路径为 `.openxenon/drafts/<drafttype>-<slug>.md`。
- 5 类原 Intent Pool 类型 → 3 DraftType 映射由 oxn-proof-domain.md §InsightDraftMapping 锁定；
- origin 字段由 Insight 注入，不允许工程师从 insight 退回 human（避免追溯链断裂）。
- origin 不影响 promote 路由（仍是 rfc/asset/work 3 类），仅标识 producer；
- list 可按 `oxn draft list --origin=insight` 过滤（CLI v0.4.0 新增 flag）。
- Origin 不参与 AssetLifecycle（不参与 citations）；仅 Draft 内部 metadata。

### Skeleton
- per-target 模板文件的实体类型（v0.6.3 Q1 新增）。
- frontmatter：`entity: skeleton` 标识模板自身（不与任何目标 entity 混淆）+ `target-entity: <rfc|domain|workflow|stack|blueprint|assetmap|work>` 标识 fork 目标。
- 物理位置：`.openxenon/draft-skeletons/`（boundary 顶层）。
- 7 个内置模板：`rfc.md` / `asset-{domain,workflow,stack,blueprint,assetmap}.md` / `work.md`。
- 落盘方式：`oxn init` 自动写入（如果不存在）。
- 与 AssetKind 关系：Skeleton **不是** AssetKind 第 6 类（5 AssetKind 封闭性保持：domain/workflow/stack/blueprint/assetmap）。
- 与 Draft 关系：Skeleton 是 Draft 的**前置模板**（与 `.openxenon/drafts/` 平行），不是 Draft 实例。
- 自由度（v0.6.3 Q3）：工程师可手写 Draft，不强制从 skeleton 派生。

### DraftPromoteLifecycle
- Draft Promote 阶段（v0.6.2-alpha.3 新增）——4 阶段：
- `gather`：router Blueprint 读 Draft frontmatter + body。
- `validate-skeleton`：校验 frontmatter 字段 + H2 段结构（含必填字段检查）。
- `fork-missing`：缺字段时从 skeleton 模板补全（保留工程师填写的内容）。
- `dispatch-target`：按 promote-target 路由到 3 类目标执行体（rfc / asset / work）。
- 不走 Work IAP：Draft promote 是单次路由 + 转换，不分 Intent / Align / Proof 三阶段。
- **4 阶段事务性**——promote 全程单次 transactional；任何阶段失败回滚源 Draft 不变。
- **promote ≠ 状态转移**——promote 后源 Draft 文件保留；工程师决定是否 archive / discard。
- **目标 3 类封闭**——rfc / asset / work 三类 target；goal 是 v0.2 新增的扩展（详见 PromoteRoute）。

### DraftPathConfig
- 可经 `.oxnrc` `draftDir` 字段配（v0.6.2 新增；走 ProjectConfig.draftDir）。
- 含 2 子目录：active 根（默认 drafts/）+ archived 子目录（默认 drafts/.archived/）。
- 前缀 `.` 让 list/archive 默认不显示（除非显式 --include-archived）。
- v0.6.3 Fix #1：skeleton 物理位置 `.openxenon/draft-skeletons/`（boundary 顶层），v0.6.2-alpha.3 原 `.openxenon/assets/blueprints/draft-skeletons/` 设计错误已修正。

### DraftCLI
- 物理实现：`packages/cli/src/commands/draft.ts` + `@openxenon/engine/Draft`。
- v0.6.2 4 命令（create / list / archive / discard）；v0.6.2-alpha.3 增 2 命令（promote / retarget）。
- 与 `oxn work` / `oxn proof` 平级；不与 `oxn asset` 混（Draft 不走 Asset 生命周期，Q-S4 不引入"通道"术语）。
- **CLI 与 Engine 分离**——CLI 仅命令编排，所有业务逻辑经 Engine → Infra Module；CLI 不内嵌 template/校验逻辑。

### DraftCompanionAsset
- draft-skeleton-fork Workflow（v0.6.2-alpha.3 新）：派生 skeleton。
- draft-promote-router Blueprint（v0.6.2-alpha.3 新）：总路由 + 4 阶段生命周期。
- promote-target-aware-workflow Blueprint（v0.6.2-alpha.3 重构，原 4 件合并）：3 target 通用 promote。
- 详见 .openxenon/assets/blueprints/draft-promote-router.md 等。
- **Blueprint 单一入口**——所有 promote 走 promote-target-aware-workflow Blueprint；不允许 CLI 拼装 Work（详见 Inv6DraftPromoteSingleEntry）。

### FutureExtension
- v0.6.2-alpha.3 部分实现（Asset 层 + 路由命令）；剩余（execute mode 自动跟踪、content 校验 Probe 化）待 v0.7.x scene-based Roadmap 收敛后再决。
- D8 推迟扩展：AI Agent 自动推断 promote-target（基于内容关键字）；多人协同 Draft（lock/concurrent edit）。
- v0.6.3 Q2 推迟：skeleton 版本号 + sync 机制；skeleton 演进通知；OXN_DRAFT_SKELETON_NOT_FOUND 加可发现性 hint。

## PromoteRoute

### PromoteRoute
- promote-target=rfc → promote-target-aware-workflow Blueprint + rfc 分支（落盘 `docs/rfcs/zh-cn/RFC-XXXX-<theme>.md`）
- promote-target=asset + promote-kind={domain|workflow|stack|blueprint|assetmap} → promote-target-aware-workflow Blueprint + asset-<kind> 分支（落盘 `.openxenon/assets/{kind}/{name}.md`）
- promote-target=work → promote-target-aware-workflow Blueprint + work 分支（落盘 `.openxenon/works/<id>/work.md`；v0.3.0 D3 起拒收）
- promote-target=goal（v0.2.0 新增）→ promote-target-aware-workflow Blueprint + promote-draft-goal 子任务（落盘 `dev/pool/<slug>.md` + auto `git checkout -b feat/goal-<slug> dev`）
- 物理载体：frontmatter `promote-target: <rfc|asset|work|goal>` + `promote-kind: <5 AssetKind>`（仅 asset 时需要）
- 默认值：`--target auto` 模式下，若未声明则报错 `OXN_DRAFT_PROMOTE_TARGET_MISSING`
- **8 行 dispatch 表封闭**——`TargetDispatchTable` 8 行映射，新增 target 必须修改 router + dispatch 表。

### SkeletonForking
- skeleton 派生规则：v0.6.2-alpha.3 起 Draft 创建时（`--target` 模式）从 `.openxenon/draft-skeletons/<target>[-<kind>].md` 派生（v0.6.3 Fix #1 移到 boundary 顶层）
- 7 个 skeleton 模板（v0.6.2-alpha.3 全部建）：rfc.md（frontmatter: entity=rfc + 5 H2 段）；asset-{domain,workflow,stack,blueprint,assetmap}.md（各 frontmatter: entity=<kind>, version=0.1.0 + 对应 H2 段）；work.md（frontmatter: workId, intent, createdAt, status=aligning, currentRound, references + `## Intent`/`## Roadmap`/`## Loop History`/`## Key Observations` H2 段）
- 派生方式：draft-skeleton-fork Workflow 调 fork-template slot（Asset 形式），源文件必含 OXN 形式的 frontmatter + H2 占位（不允许纯空白）

### PromoteLifecycle
- gather：draft-promote-router 读 Draft frontmatter + body，校验 Draft 存在 + promote-target 字段不缺
- validate-skeleton：校 frontmatter 字段 + H2 段结构（对照 PromoteRoute 的目标骨架清单）；缺字段报错 `OXN_DRAFT_PROMOTE_VALIDATE_FAILED`，列出缺失清单
- fork-missing：从 skeleton 模板补全缺字段（保留工程师填写的内容）；不修改工程师已填字段
- dispatch-target：按 PromoteRoute 调 promote-target-aware-workflow Blueprint 的对应分支（rfc / asset-<kind> / work），Work 执行后续 gather/author/validate/promote 4 Boundary
- 关键约束：promote 不分 Intent / Align / Proof 三阶段（与 Work IAP 不同）；是单次 transactional 操作

### TargetDispatchTable
- 路由 translate 表——把 Draft target 语法转成 promote-target-aware-workflow Blueprint 内部 task name（v0.2.0 D2 起 8 行）
- promote-target=rfc（无 promote-kind）→ 内部 task = `promote-rfc`
- promote-target=asset + promote-kind=domain → 内部 task = `promote-asset-domain`
- promote-target=asset + promote-kind=workflow → 内部 task = `promote-asset-workflow`
- promote-target=asset + promote-kind=stack → 内部 task = `promote-asset-stack`
- promote-target=asset + promote-kind=blueprint → 内部 task = `promote-asset-blueprint`
- promote-target=asset + promote-kind=assetmap → 内部 task = `promote-asset-assetmap`
- promote-target=work（无 promote-kind）→ 内部 task = `promote-work`（v0.3.0 D3 起拒收）
- promote-target=goal（v0.2.0 D2 新增，无 promote-kind）→ 内部 task = `promote-draft-goal`
- 物理载体：promote-target-aware-workflow Blueprint 的 H2 `## Slot` 段 `### SubTargetDispatch`，每条 task 一个 target

### PromoteBoundaryIsolation
- Draft promote 仅跨 3 类 Target 输出目录（docs/rfcs/zh-cn/ / .openxenon/assets/ / .openxenon/works/），不写其他目录
- 边界规则 1：`.openxenon/drafts/` → `docs/rfcs/zh-cn/` 仅经 draft-promote-router + promote-target-aware-workflow（rfc 分支）
- 边界规则 2：`.openxenon/drafts/` → `.openxenon/assets/{kind}/` 仅经 draft-promote-router + promote-target-aware-workflow（asset 分支）
- 边界规则 3：`.openxenon/drafts/` → `.openxenon/works/<id>/` 仅经 draft-promote-router + promote-target-aware-workflow（work 分支）
- 边界规则 4：`.openxenon/draft-skeletons/` → `.openxenon/drafts/` 走 draft-skeleton-fork Workflow（v0.6.3 Fix #1 修正路径，骨架单调入 Draft）

### PromoteCompanionAsset
- draft-promote-router Blueprint（v0.6.2-alpha.3 新）：总路由 + 4 阶段生命周期。
- promote-target-aware-workflow Blueprint（v0.6.2-alpha.3 重构，原 4 件合并）：3 target 通用 promote。
- draft-skeleton-fork Workflow（v0.6.2-alpha.3 新）：派生 skeleton。
- draft-promote-tooling Stack（v0.6.2-alpha.3 新）：frontmatter 解析 + H2 段校验工具栈。
- draft-skeletons/<target>[-<kind>].md（v0.6.2-alpha.3 新，7 件）：per-target 模板。

### PromoteFutureExtension
- v0.6.2-alpha.3 落地 7 个 skeleton + 4 阶段 router + 3 target dispatch
- 后续 v0.7.x 扩展方向：AI Agent 自动推断 promote-target（基于内容关键字）；多人协同 Draft（lock / concurrent edit / merge）；Promote 时自动生成 changelog 段（与 .changes/ 集成）；Per-target Probe（rfc-promote-hook / asset-promote-hook）

## Forbidden

### ForbiddenDraftBuiltinTemplate
- draft-template
- draft-template-builtin
- draft-template-internal
- desc: Draft **自身模块不内置** template 机制（D22/D33/D37 撤销）。内建 Template 已由 draft-skeleton-fork Workflow + draft-skeletons/<target>.md 模板库取代（v0.6.2-alpha.3 决议）。Draft engine 不含任何 template / frontmatter-required 逻辑；骨架派生是 Asset 层职责。5.4 过度设计教训：D22 错误地把 template 写入 Draft engine；新版改为 Asset 派生的 skeleton fork。

### ForbiddenDraftFrontmatterRequired
- draft-frontmatter-required
- draft-frontmatter-mandatory
- draft-must-have-frontmatter
- desc: Draft **不强制** frontmatter（v0.6.2-alpha.3 锁定）。frontmatter 是可选 hint（仅在 `--target` 指定时由 skeleton fork 注入 `promote-target` / `promote-kind`）。空白 Draft（0 bytes + 无 frontmatter）完全合法；`oxn draft create --prefix` 仍走空白模式。验证：不被 draft-promote-router 校验为非法（只是 promote 时缺 promote-target 需 `--target auto` 推导或手动指定）。

### ForbiddenDraftAsAsset
- draft-asset-promote

### ForbiddenDraftPrefixV060D46
- draft-prefix-doc
- draft-prefix-domain
- draft-prefix-draft
- draft-prefix-glossary
- draft-prefix-onboarding
- draft-prefix-oxn
- draft-prefix-probe
- draft-prefix-product
- draft-prefix-proof
- draft-prefix-rfc
- draft-prefix-ssot
- draft-prefix-sync
- draft-prefix-terminology
- draft-prefix-test
- draft-prefix-v0
- draft-prefix-work
- desc: v0.6.0（§4.6 2026-08-07）起：DRAFT_PREFIXES 锁 3 类（report/issue/design），其他 prefix 创建 throw `OXN_DRAFT_TYPE_INVALID`。历史漂移 prefix（doc- / domain- / draft- / glossary- / ... / v0- / work-）禁止新建；现有非合规 drafts 由 owner 2 周内决策（升 RFC / 升 Goal / 留 Draft 加前缀 / 归档）；例外：`rfc/` 子目录允许（独立 subdir）；兼容期 v0.7.x 起 1 版本；之后严格拒收；audit 数据：`.openxenon/works/d-drafttype-governance/audit-prefixes.md`。

## Boundary

### Inv1DraftIsDescriptiveModality
- Draft = 描述性情态（Descriptive Modality）的前置状态——未提升前不参与版本控制、不参与跨层引用、不被 Work / Asset / Proof / Insight 消费。
- v0.6.2-alpha.3 后 promote 走 draft-promote-router Blueprint（4 阶段：gather → validate-skeleton → fork-missing → dispatch-target），从 drafts/ 读源文件，落到目标位置（docs/rfcs/ 或 .openxenon/assets/ 或 .openxenon/works/）。
- promote 后源 Draft 文件不变（不是状态转移，是拷贝）。工程师决定是否 archive / discard。

### Inv2DraftNoProbe
- OXN 不执行 Draft 创建逻辑业务——CLI 调 Engine → Infra Module（fs.writeFileSync 或 fork skeleton 后 writeFileSync），无 Probe 验证。
- v0.6.2-alpha.3 起：blank 模式（默认）逻辑不变；skeleton 模式（`--target`）调 draft-skeleton-fork Workflow，由 Asset 层返回 skeleton 字符串。
- 5.1 洞察：Proof-First 是验证器不是执行器。19 个 Probe 全部是 read-only 观察，不是 write 操作。
- Draft 创建不需要验证（创建行为本身是证据），所以不需要 Probe 守护。

### Inv3DraftDirIsolation
- Draft 文件夹隔离——`.openxenon/drafts/` 是边界内的本地暂存区，不对外发布，不被远程同步。
- 4 个边界规则（从 oxn-project-domain 继承，未来可迁移）：
- `.openxenon/drafts/` 项目草稿 → ADR/RFC 暂存禁止（草稿不应引用自身）；
- `.openxenon/drafts/rfc/` ADR/RFC 暂存 → 项目 Asset 禁止（应通过 docs/ 概念页）；
- `docs/dev/` → `.openxenon/drafts/` 禁止（开发手册不可引用 ADR 暂存内部）。
- v0.6.3 Fix #1 修正：`.openxenon/draft-skeletons/` 是 Skeleton 形式存在（独立 entity，独立边界），不是 Draft（不在 `.openxenon/drafts/` 内），也不是 Blueprint（不在 `.openxenon/assets/blueprints/` 内）。

### Inv4DraftIndependentOfAssetLifecycle
- Draft 创建不依赖 Asset Lifecycle——CLI 直接调 engine.createDraft，无 asset.create 中间层。
- v0.6.2-alpha.3 起例外：skeleton 模式下调 draft-skeleton-fork Workflow（Asset 层）派生 skeleton，再写文件。
- Draft 与 Asset 平行：Asset 5 类型（domain/workflow/stack/blueprint/assetmap）不含 draft。
- Draft 也不属于 3 情态中的任意一种——它是 Doc 的前置状态，不独立成情态（5.3 决策）。

### Inv5DraftSkeletonRecommended
- Draft skeleton 推荐派生——`oxn draft create --target X` 模式推荐从 `.openxenon/draft-skeletons/<target>[-<kind>].md` 派生骨架，但不强制（v0.6.3 Q3 放开）。
- 机制：draft-skeleton-fork Workflow 调 fork-template slot，源路径校验由 Asset path resolver 守门。
- 兜底：若 skeleton 模板缺失（target/kind 组合未建），CLI 报 `OXN_DRAFT_SKELETON_NOT_FOUND`（推荐性 hint，不阻塞）。
- 自由度：工程师可手写 Draft + 自行加 frontmatter hint（`promote-target` / `promote-kind`）——只接受不带 target 的基础命令。
- v0.6.3 锁定。v0.6.2-alpha.3 原"必须派生"约束已废除。

### Inv6DraftPromoteSingleEntry
- Draft Promote 路由单一入口——所有 target 路由都通过 draft-promote-router Blueprint，不允许 CLI 直接拼装 Work。
- v0.6.2-alpha.3 锁定。CLI 不调 `oxn work create --blueprint`；统一调 `oxn draft promote` → router。
- 兜底：若 router 未知 target，draft-promote-router 报 `OXN_DRAFT_PROMOTE_TARGET_UNKNOWN` 并列出已支持 target。

### Inv7SkeletonIndependentEntity
- Skeleton 独立 entity——`.openxenon/draft-skeletons/` 下的 7 个模板文件 frontmatter `entity: skeleton`，不与任何 AssetKind 混淆（v0.6.3 Q1 锁定）。
- 物理意义：skeleton 是"模板"（独立的第 9 种 entity），不是"实例"（5 AssetKind + rfc/work 都不是）。
- `target-entity` 字段标识 fork 后的目标 entity（`rfc` / `domain` / `workflow` / `stack` / `blueprint` / `assetmap` / `work`）。
- 不被任何 AssetKind 校验器误拾取（blueprint index / domain index / workflow index 都不会扫 `.openxenon/draft-skeletons/`）。
- 与 inv-3 边界规则协同：`.openxenon/draft-skeletons/` 在 boundary 顶层（draft-skeleton-fork Workflow 入口）。

### Inv8OriginIdentifiesProducerV040
- v0.4.0（D1 2026-08-07）起：Draft frontmatter `origin: human | insight`，默认 `human`。
- origin 不影响 promote 路由（仍走 rfc / asset / work 3 类）；
- origin 不参与 Asset citations（仅 Draft 内部 metadata）；
- origin=insight 不允许工程师改写为 human（避免追溯链断裂；强约束，写校验见 `oxn draft edit --origin` 错误返回）；
- 工程师可改写 origin=human → origin=insight（罕见：标记自己的反思为可追溯项；现状不限，但需在 commit msg 说明）；
- origin 不强制必填（向后兼容 v0.6.x 旧 Draft）；新 Draft 创建默认 origin=human。

### Inv9DraftListFilterByOriginV040
- `oxn draft list --origin=human|insight` 按 producer 过滤（v0.4.0 新增）；无 origin= 列出全部（向后兼容）。
- 行为：`oxn draft list --origin=insight` 列出所有 insight 生成的 Draft（含 v0.6.x 已存 draft 中由 `--from-insight` 生成的，可能缺 origin 字段——按 origin=insight 默认兼容）。
- 配合 oxn-proof-domain.md §Inv30InsightManualGateViaDraft 闸门使用。

### Inv10DraftTargetGoalPairV050
- v0.5.0（D2 2026-08-07）起：`oxn draft promote --target=goal --goal-slug=<slug>` 把 Draft 升华为 Goal。
- 强约束：
- `--target=goal` **必须**附 `--goal-slug=<slug>`（CLI 拒收裸 `goal` target）；slug 必匹配 Draft name（一致性格式）；
- promote 后源 Draft mtime 不变（继承 inv-4）；
- promote 后目标 `dev/pool/<slug>.md` 前置 frontmatter 必含 `id` / `theme` / `priority` / `status: planned` / `scheduled-version: ~` / `branch: feat/goal-<slug>` / `source: draft`（Goal 形式约定见 §2.2 Goal 定义，从骨架派生）；
- promote 后自动 `git checkout -b feat/goal-<slug> dev`（dev 不存在则基于 main）；分支已存在不创建，报 `OXN_DRAFT_PROMOTE_GOAL_BRANCH_EXISTS`；
- Goal 与 promote-target=work 互斥（work = IAP 执行；goal = IAP 准备）；
- promote 失败不得有残留：分支未创建 / 文件未写 → 整事务回滚。

### Inv11DraftTargetWorkRejectedV050D3
- v0.6.0（D3 2026-08-07）起：`oxn draft promote --target=work` 全部拒收（CLI + Engine 双层）。
- 接收 `--target=work` 时立即抛 `OXN_DRAFT_PROMOTE_TARGET_WORK_REMOVED`：
- 引导文案：`oxn draft promote --target goal --goal-slug <slug>`；Goal 已 scheduled 后用 `oxn goal work <slug>`（D5+）转 Work IAP 执行；
- 历史目标：原 `target=work` 概念与 Goal 路径重叠（IAP 准备阶段 ⇄ IAP 执行阶段）；引入 Goal 后两者解耦（§inv-10 promote-target=goal）；
- 兼容期：v0.7.x 起 1 版本；后续彻底移除 `--target work` CLI flag + `promote-work` sub-target。

### Inv12DrafttypeStrictLockV060D46
- v0.6.0（§4.6 2026-08-07）起：`oxn draft create --prefix <X>` 严格锁 3 类——`report` / `issue` / `design`。
- 其他 prefix 创建 throw `OXN_DRAFT_TYPE_INVALID`：
- 接受的 3 prefix：`report`（调研报告）、`issue`（问题记录）、`design`（设计稿）；
- 历史漂移 prefix（如 `doc-`、`draft-`、`work-`、`v0-`、`oxn-`、`onboarding-`、`test-`、`rfc-` 等）一律禁止新建；
- 例外：`rfc/` 子目录允许（独立 subdir，不走 DraftType 政策）；
- 现存非合规 drafts（设计稿 audit-prefixes.md）：**不强制迁移**，由各自 owner 2 周内决策（升 RFC / 升 Goal / 留 Draft 加前缀 / 归档）；
- 兼容期：v0.7.x 起 1 版本；之后严格拒收。
- 强制落点：`packages/engine/src/Draft/skeleton.ts` `DRAFT_PREFIXES` 仍 3 值；
- CLI `oxn draft create` + `oxn draft retarget --new-kind` 同步校验。
- 详见 `.openxenon/works/d-drafttype-governance/audit-prefixes.md`。

### Inv13MonthlyCleanupCycleV060D46
- v0.6.0（§4.6 2026-08-07）起：每月 1 号自动归档 inactive drafts。
- 触发：`oxn draft list --inactive --older-than 90d --archive` 跑（**destructive**）；
- "inactive" 定义：mtime > 90d 的 active draft（不在 `.archived/`）；
- 行为：列出符合条件 drafts + 自动 `oxn draft archive <name>` 跑；
- 警告：默认 dry-run 输出列示，工程师手动 ack 后真跑；
- 调度实现：GitHub Actions cron（每月 1 号 0:00 UTC）；本地可用 `oxn draft list --inactive --older-than 90d` 触发手动；
- 备份：archived 物理位置 `.openxenon/drafts/.archived/`（按 `archive` 命令既定行）；
- 兜底：失败不阻塞 release-cut；超期 draft 不影响 IAP。
- 设计约束：cleanup cycle 是"软治理"，不替代 owner 主动决策；与 §4.6 一次性归类互为补充。

### Inv14PromoteRouterSingleEntry
- 禁止绕过：CLI 不允许直接 `oxn work create --blueprint promote-target-aware-workflow` 跳 router。
- 兜底：router 路由前 check caller-stack，确保来自 oxn draft 子命令；非法调用报 `OXN_DRAFT_PROMOTE_NOT_ROUTED`。

### Inv15Promote4StagesNoSkip
- 禁止短路：例如 validate-skeleton 失败后不允许直接 dispatch。
- 兜底：每阶段用独立 transaction，失败回滚；下次 retry 走完整流程。

### Inv16SkeletonAsset1To1
- 校验时机：draft-skeleton-fork Workflow 调 fork-template slot 后，对照 AssetKind 编译器要求（如 Domain 编译要求 `## Terms` H2 段）。
- 兜底：若目标 compiler 校验失败，fork 不动文件，CLI 报 `OXN_DRAFT_SKELETON_TARGET_MISMATCH`。

### Inv17PromoteSourceDraftUnchanged
- 工程师决定是否 archive / discard（oxn draft archive / discard 命令）。
- 兜底：promote-target-aware-workflow 完成 dispatch-target 后，校验源 Draft 文件 mtime 未变。

### Inv18RetargetExplicit
- 不允许直接编辑 frontmatter 改 promote-target（避免绕过 router 的 fork-missing 阶段）。
- 兜底：retarget 重新调 draft-skeleton-fork 派生新骨架，保留工程师已填的 H2 段内容。

### Inv19PromoteDraftGoalV020
- 强约束 1：`oxn draft promote --target=goal --goal-slug=<slug>` 必须同时带 `--goal-slug`
- 强约束 2：Goal entry 落 `dev/pool/<slug>.md`
- 强约束 3：promote 后 auto `git checkout -b feat/goal-<slug> dev`（dev 不存在则基于 main；分支已存在则报 `OXN_DRAFT_PROMOTE_GOAL_BRANCH_EXISTS`）
- 强约束 4：Goal frontmatter 必含 `id` / `theme` / `priority` / `status: planned` / `scheduled-version: ~` / `branch: feat/goal-<slug>` / `source: draft`
- 强约束 5：promote-target=goal 与 promote-target=work 互斥（Work IAP ↔ Goal IAP 准备）
- 强约束 6：失败事务回滚——分支未创建 + 文件未写 → 整事务回滚

### Inv20PromoteTargetWorkDeprecatedV030
- 拒收时机：
- CLI 层：`packages/cli/src/commands/draft.ts` `promote` 子命令收到 `--target=work` 立即抛 `OXN_DRAFT_PROMOTE_TARGET_WORK_REMOVED`（vs CLI 不抛 + Engine 兜底）。
- Engine 层：`promote.ts` Phase 2 select-target 拦截 `target === 'work'`，同样抛 `OXN_DRAFT_PROMOTE_TARGET_WORK_REMOVED`（双层守门 + Workfrontmatter 直读或 `--target=work` 都拦）。
- 引导文案：`oxn draft promote --target goal --goal-slug <s>`。Goal 已 scheduled 后由 `oxn goal work <slug>` CLI（D5 待落地）转 Work。
- 兼容期：v0.7.x 起 1 版本；后续彻底移除 `promote-work` sub-target + `--target work` CLI flag（届时 §TargetDispatchTable 7 行只剩 rfc / asset-{5} / goal）。
- 物理路径：`oxn draft --target work` 退出码 1 + 显式 deprecation 错误码，便于上层脚本识别。
- 兜底：CLI 不绕过 Engine；Engine 不绕过 router（draft-promote-router Blueprint）。