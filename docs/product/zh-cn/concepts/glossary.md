---
title: 术语表
entity: glossary
generated-by: scripts/sync-domain-glossary.ts
synced-at: 2026-08-06
---

# 术语表

> 本页是 OpenXenon 项目的对外术语词典，**单一权威源**。
>
> 内部定义来自 `.openxenon/assets/domains/`（Asset 视角），本页是面向用户的精简字典。
> 修改术语请编辑 Asset Domain 文件，本页通过 sync 脚本自动重建。
>
> **多 Domain 定义说明**：同名 term 在多个 Domain 视角下可能有不同描述。**冲突判定由工程师 + AI 负责**，sync 脚本仅如实合并。

## 字母速查
- [A-E](#a-e)
- [F-L](#f-l)
- [M-R](#m-r)
- [S-Z](#s-z)

<!-- SYNC:START -->
## A-E

### Align


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#align) — 人机协作的工作过程，AI Agent 遵守边界并收敛执行。

### Artifact


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#artifact) — Align 阶段产出的物理事实（被 Probe 观测的对象），路径必须落在 Work 沙盒内或宿主项目目录。

### ArtifactDeclaration


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#artifactdeclaration) — Task 内声明的预期产物路径列表（## Artifacts）；lock 时 Engine 校验 ⊆ Blueprint Scope.allow AND ∩ Scope.forbid = ∅；与运行时 Artifact（含 hash）区分；来源 design-blueprint-context-template。

### Asset


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#asset) — Asset 是工程师为 AI 协作定义的**环境约束**；5 类 AssetKind（domain/workflow/stack/blueprint/roadmap）；Work 引用 Asset（单向）；创建后强校验（planLock + content_hash），不被 Work 改写。
- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#asset) — 见 [`oxn-asset-domain`](./oxn-asset-domain.md#asset)。本文域内特指"Project 资产"——住 `.openxenon/assets/`。
- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#asset) — 工程师为 AI 协作定义的**环境约束**；5 类 AssetKind（domain/workflow/stack/blueprint/roadmap）。具体领域见 [`oxn-asset-domain`](./oxn-asset-domain.md)。

### Asset Check


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#asset-check) — 5 起手 Asset 完整性校验（替代 ADR-0069 G1 "数量下限校验"）：
校验项 — Domain ≥ 1（必含 doc-md-domain）/ Workflow ≥ 1（必含 md-author-workflow）/
Stack ≥ 1（必含 md-stack）/ Blueprint ≥ 1（必含 md-author-blueprint）/
AssetMap ≥ 1（必含 md-system）。
缺任一 → 提示运行 `oxn onboard --new`；不阻断 Proof-First 模式。
ADR-0089 D3 + D4。

### AssetKind


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#assetkind) — Asset 5 类收敛枚举（domain / workflow / stack / blueprint / roadmap），v0.6.1-alpha.4 三边界框架收敛结果。

### AssetMap


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#assetmap) — AssetKind=roadmap 的语义别名（首选术语）——meta 索引层，AI 路由入口（6 scene 路由表 + Domain/Blueprint 索引）；不参与 references DAG。
与版本计划文档 "Roadmap"（`dev/versions/`）不同情态（定义性 Asset vs 描述性 Doc）、不同位置。原别名 "Roadmap" 已废弃（RFC-0013 D4）。
- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#assetmap) — AssetKind=roadmap 的语义别名——OXN 系统导航索引（6 scene 路由表 + Domain/Blueprint 索引）；
AI 路由入口。不是版本路线图。
与 Roadmap（版本计划文档）不同情态、不同位置。原别名 "Roadmap" 已废弃，避免与版本计划文档混淆（RFC-0013 D4）。
AssetKind 枚举值保持 `roadmap`（代码不改），glossary 主术语为 AssetMap。

### AssetPaper


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#assetpaper) — Asset 论文结构 3 字段不变量（ADR-0051）：abstract + references + citations 缺一不可。学术论文↔Asset 映射。

### BirthCert


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#birthcert) — Work 静态门禁卡（.work 目录），写一次后只读（OS chmod 0o444），含 assets + context + diagnostics。

### Blueprint


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#blueprint) — AssetKind 之一，唯一跨 AssetKind 组合实体；通过 `## Refs` 引用 Domain + Workflow + Stack + 其他 Blueprint；Work 通过单一 blueprint ref 引用。ADR-0055。

### Boundary


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#boundary) — Asset 的别名。

### Built-in Asset


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#built-in-asset) — 随 OXN 版本发布的内置 Asset；住 `src/builtin/`；通过 `@oxn/` scope 解析；
项目可用 `@prj/` override。自举种子——手动创建不经 Work，后续变更走 asset-evolve Work。
v0.6 Registry mock 与 `.md` 文件 SSOT 不一致（F1）；D18 收窄 Phase 4 范围（仅 probes+blueprints）。
**别名（已合并）**：Builtin / BuiltinAsset（glossary 不再单独列出）

### Ceiling


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#ceiling) — 上限机制——AI Agent 自身能力的天花板，OXN 不介入。AI 可涌现比工程师更优的选择（反向帮助工程师积累经验、沉淀 Asset），ceiling 由 LLM 能力决定，不受 OXN 限制。与 Floor 对偶。ADR-0073 判据 3。

### Citation


- [oxn-insight-domain](/openxenon/assets/domains/oxn-insight-domain.md#citation) — 资产反向引用计数 + 影响半径（impactRadius: low/medium/high/critical），自动维护、归档保留。

### CliInputError


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#cliinputerror) — 用户 CLI 输入错的契约类。轨道 3。

### context.md


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#context-md) — Work 内上下文文件（works/&lt;id&gt;/context.md）；AI Agent 按 Blueprint ## Context Template 从 ## Use 引用的 Assets 组装；纳入 PlanLock 5-hash（workContextHash）；lock 前写完；来源 design-blueprint-context-template Draft（2026-08-06 grilling）。

### ContextTemplate


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#contexttemplate) — Blueprint 内上下文组装指令段（## Context Template）；可选，缺省 Engine 用内置默认模板（基于 Use refs + Boundaries + Goal 推导）；Blueprint 可覆写默认（如 bug-fix-blueprint 在 diagnose 段加"证据落盘"指令）；来源 design-blueprint-context-template。

### Daemon


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#daemon) — OXN Engine 后台守护进程；负责运行时状态监听（Work 长时间未变化 → 通知工程师）+ 事件监听（Probe DEVIATED/INCONCLUSIVE 通知 + CLI socket 事件）；不监听文件系统，不阻断 Work，不修改 Kernel 规则；ADR-0068。
- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#daemon) — OXN Engine 后台守护进程，监听人机协作的变化与边界预警。

### Definitional Modality


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#definitional-modality) — 定义性情态——回答"X 是什么"的文档；住 `.openxenon/assets/{kind}/*.md`（E1 Asset）；自举种子允许手动创建（见 Bootstrap Seed Exemption）。

### Descriptive Modality


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#descriptive-modality) — 描述性情态——回答"怎么用 X"的文档；住 `docs/{product,dev}/{zh-cn,en}/*.md`；产品手册与开发手册。

### Dev Version


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#dev-version) — 通过 `npm link`（仓库 dist/cli.js）注册的 oxn 全局 bin；mutable（每次 rebuild 改变）；仅贡献者 + 内部 dogfood 使用。配合 `scripts/oxn-switch.sh` 的 `pnpm oxn:dev` 操作。

### Domain


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#domain) — AssetKind 之一，业务边界（terms/bans/invariants）；与 oxn-domain 元域同名但角色不同——此处为 AssetKind 枚举值。

### Draft


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#draft) — 未提升的描述性工作稿（Descriptive Modality 草稿态）；物理位置 `.openxenon/drafts/`（可经 `.oxnrc` `draftDir` 字段配）；CLI 创建 + 工程师 / AI Agent 填写 + 工程师主动 promote（经 draft-promote-router Blueprint）。
v0.6.2-alpha.3 起支持 2 种创建模式：
关键约束：v0.6.2-alpha.3 后 Draft 可选携带 frontmatter hint（`promote-target` / `promote-kind`），但仍不是 Asset，不参与 Asset 生命周期。
生命周期：create → (promote → archive | discard) | archive | discard。

### DraftPromoteLifecycle


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#draftpromotelifecycle) — Draft Promote 阶段（v0.6.2-alpha.3 新增）——4 阶段：
1. `gather`：router Blueprint 读 Draft frontmatter + body。
2. `validate-skeleton`：校验 frontmatter 字段 + H2 段结构（含必填字段检查）。
3. `fork-missing`：缺字段时从 skeleton 模板补全（保留工程师填写的内容）。
4. `dispatch-target`：按 promote-target 路由到 3 类目标执行体（rfc / asset / work）。
不走 Work IAP：Draft promote 是单次路由 + 转换，不分 Intent / Align / Proof 三阶段。
可经 `.oxnrc` `draftDir` 字段配（v0.6.2 新增；走 ProjectConfig.draftDir）。
含 2 子目录：active 根（默认 drafts/）+ archived 子目录（默认 drafts/.archived/）。
前缀 `.` 让 list/archive 默认不显示（除非显式 --include-archived）。
v0.6.3 Fix #1：skeleton 物理位置 `.openxenon/draft-skeletons/`（boundary 顶层），v0.6.2-alpha.3 原 `.openxenon/assets/blueprints/draft-skeletons/` 设计错误已修正。
物理实现：`packages/cli/src/commands/draft.ts` + `@openxenon/engine/Draft`。
v0.6.2 4 命令（create / list / archive / discard）；v0.6.2-alpha.3 增 2 命令（promote / retarget）。
与 `oxn work` / `oxn proof` 平级；不与 `oxn asset` 混（Draft 不走 Asset 生命周期，Q-S4 不引入"通道"术语）。
draft-skeleton-fork Workflow（v0.6.2-alpha.3 新）：派生 skeleton。
draft-promote-router Blueprint（v0.6.2-alpha.3 新）：总路由 + 4 阶段生命周期。
promote-target-aware-workflow Blueprint（v0.6.2-alpha.3 重构，原 4 件合并）：3 target 通用 promote。
详见 .openxenon/assets/blueprints/draft-promote-router.md 等。
v0.6.2-alpha.3 部分实现（Asset 层 + 路由命令）；剩余（execute mode 自动跟踪、content 校验 Probe 化）待 v0.7.x scene-based Roadmap 收敛后再决。
D8 推迟扩展：AI Agent 自动推断 promote-target（基于内容关键字）；多人协同 Draft（lock/concurrent edit）。
v0.6.3 Q2 推迟：skeleton 版本号 + sync 机制；skeleton 演进通知；OXN_DRAFT_SKELETON_NOT_FOUND 加可发现性 hint。

### DraftSkeleton


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#draftskeleton) — per-target 模板——含 frontmatter（必填字段占位）+ H2 段（按目标类型，例如 RFC 的 `## 决策` / Domain 的 `## Terms`）+ TODO 占位。
物理位置：`.openxenon/draft-skeletons/&lt;target&gt;[-&lt;kind&gt;].md`（v0.6.3 Fix #1 移到 boundary 顶层，避开 blueprint index）。
frontmatter：`entity: skeleton`（v0.6.3 Q1 独立 entity）+ `target-entity`（fork 后的目标 entity）。
派生方式（推荐）：draft-skeleton-fork Workflow 调 `asset-create` workflow 的 fork-template slot，从骨架源拷贝。
关键区别：Skeleton **不是** Draft 内置 template 机制（B-α 决议），独立 entity 标识不与其他 AssetKind 混淆。

### DraftTarget


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#drafttarget) — Draft Promote 路由去向——3 值枚举（Q-T1）：
物理载体：Draft 文件 frontmatter `promote-target: <rfc|asset|work>`（v0.6.2-alpha.3 新增，可选）。
路由规则：详见 .openxenon/assets/domains/oxn-draft-promote-domain.md §Invariants。

### DraftType


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#drafttype) — Draft 用途分类——3 类：report（调研报告） / issue（问题记录） / design（设计稿）。映射到文件名前缀（Q-S1/Q-S5）：
与 DraftTarget 不同（D9+D-α）：DraftType 仅是文件名 metadata（标识用途），DraftTarget 是 algorithmic 路由（标识去向）。
例：`design-foo.md`（要设计 foo）→ promote-target=asset（推到 Asset）。
状态转移：active → archived（archive 命令，保留历史）；active → discarded（discard --force，物理删除）。
Q-S7 锁定：6 命令 = create + list + archive + discard + promote + retarget（最小完整周期）。

### External


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#external) — 边界内 `## Externals` H2 category，从 Asset 类型降级；url/path 二选一 + kind enum + 状态索引；ADR-0056。

## F-L

### Fix Record


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#fix-record) — 开发者面向的 bug 修复记录；住 `dev/fix/`；比 Version Fragment 更详细（含根因分析、调试过程）。
不对外公开（dev/ 是开发者手册，不是产品文档）。
与 Version Fragment 互补——fix record 给开发者，fragment 给用户（RFC-0013 D3）。

### Floor


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#floor) — 下限参照——OXN 为 AI Agent 的局部最优全局非优情况提供的确定性保底参照。Asset + Work 专注某个目标，构成 AI 选择动作时的 floor。OXN 提高 floor 不提高 ceiling（ADR-0073 判据 3）。

### forbidden-draft-promote-as-asset


- [oxn-draft-promote-domain](/openxenon/assets/domains/oxn-draft-promote-domain.md#forbidden-draft-promote-as-asset) — Draft Promote 不产生新 AssetKind——Draft 自身不是 Asset（OxnDraftDomain forbidden-draft-as-asset）。
Promote 的产物落到 3 类 Target 之一（RFC / Asset / Work），不引入第 4 类。
Draft 命名空间与 Asset 命名空间分离（drafts/ vs assets/）：即使同名 Draft + Asset 也无冲突。

### Frozen


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#frozen) — Work finalize 后的不可变证据文件（frozen.json），生成后只读（chmod 0o444 + content_hash + signature）；包含 outcome 聚合结构（ADR-0067）+ boundary deviations 标记；三件套之一（详见 Proof）。

### IAP


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#iap) — 工程师定义意图（Intent），AI Agent 对齐执行（Align），OXN 验证记录（Proof）。

### IAPError


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#iaperror) — 业务流转中预期内错误的契约类。轨道 1，AI 消费受众。

### Infra


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#infra) — L1 副作用/IO 执行模块；负责OpenXenon 跟 外部宿主环境的出入口，包括文件、网络等具有副作用的交互。
- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#infra) — L1 副作用 / IO 执行模块：只回答事实不做判定（不能给自己盖章）；3 个 IO Primitive（io.stat/io.read/io.exec）通过 ProviderRegistry 暴露。

### Insight


- [oxn-insight-domain](/openxenon/assets/domains/oxn-insight-domain.md#insight) — Insight 是 E4 涌现层；整体论 vs 前三层还原论；只输出协作态势信号（边界使用/触碰/Loop 收敛/退出模式），不输出代码质量评分；永不自动回写 Asset。
- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#insight) — 洞察 IAP 并提供涌现的可能性。具体领域见 [`oxn-insight-domain`](./oxn-insight-domain.md)。
研讨厅，人机协作范围内的中央枢纽。

### Intent


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#intent) — 人机协作的软件目标，AI Agent 对齐的工作对象。

### InterferenceFlag


- [oxn-probe-domain](/openxenon/assets/domains/oxn-probe-domain.md#interferenceflag) — 信号污染标记 = L1-Infra Provider 在 IO 时检测到的干扰信号。是 "Taint / Boundary Deviation / InterferenceFlag" 三个旧术语的**唯一收敛目标**（ADR-0086 + ADR-0066）。
**真实枚举 = 9 RED + 3 YELLOW = 12 项**（trust-baseline.ts:23-36；domain 旧注释 "8 RED + 4 YELLOW" 是历史勘误）：
| RED（短路 → INCONCLUSIVE） | YELLOW（透传 + 记录） |
|---|---|
| waf_detected, just_modified, detached_head, shallow_clone, sandbox_violation, network_timeout, response_truncated, permission_denied, unknown | cdn_cache, cache_path, symlink |
RED/YELLOW 不可配置（ADR-0086：信任是系统决策不是用户决策）。

### Kernel


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#kernel) — L0 纯逻辑验证模块；通过 Infra 调用带副作用的 Probe 来观测客观事实并验证。
- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#kernel) — L0 纯逻辑验证模块（记录事实不评判 ADR-0031）：零 IO 约束，只接受 Infra 观测产出 ProbeOutcome，不调 fs/net/child_process。

### kind-isolation


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#kind-isolation) — references 仅同 AssetKind 原则；跨 kind 组合由 Blueprint 承担，跨 kind 导航由 Roadmap scene.links 承担；ADR-0054。

### Loop


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#loop) — Work 核心动态过程（三相模型 Phase 2）；物质运动态；所有变化被 trace 记录；ADR-0006。

## M-R

### memory.md


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#memory-md) — Work 级动态记忆文件（works/&lt;id&gt;/memory.md，Phase 2 实现）；Loop History + Key Observations + Round Notes；不纳入 PlanLock；append-only 追加；原 context.md 定义（ADR-0049）实体名改为 memory.md。

### Meta Modality


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#meta-modality) — 项目工程元情态——回答"OXN 自己怎么组织"的文档；住仓库根 + `dev/` + `.changes/`。包含 5 类项目工程文档（README.md / AGENTS.md / CONTEXT-MAP.md / .changes/ / dev/）。**特例**：可与 Descriptive Modality 组合（README.md = marketing + 入口）；可与 Definitional Modality 组合（CONTEXT-MAP.md = 8 Domain 索引）。RFC-0018 锁定。

### Onboarding Path


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#onboarding-path) — 项目消费者 onboarding 3 入口路径：
入口探测：`oxn onboard --detect`（基于 package.json / compose.yaml / Cargo.toml / pyproject.toml 4 类信号）。
Skill 入口：复用 `/oxn-work`，通过 Blueprint 区分场景（ADR-0089 D6）。
ADR-0089 D2。

### Onboarding Starter


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#onboarding-starter) — 项目消费者 onboarding 用的 5 个内置 Asset（doc-md-domain / md-author-workflow / md-stack / md-author-blueprint / md-system），
物理位置 `src/builtin/projects/starter/`，走 RFC-0011 `@oxn/` 公共层；
通过 `oxn onboard --new` 复制到 `&lt;project&gt;/.openxenon/assets/`（@prj/ 层）。
5 起手 Asset 是 onboarding 的最小可用集（替代 ADR-0069 D1 的 6 Asset）。
ADR-0089 D1。

### OpenXenon


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#openxenon) — 工程师定义 AI Agent 协作边界的工具（slogan）。正定义：工程师通过 OXN 定义 Asset，作为 AI Agent 在 Work 约束的协作边界，由 Proof 验证其成果。以 Skills 形式注入 AI Agent 工作台（Cursor / OpenCode / Codex / Claude Code）。OXN 本身不是 AI Agent，而是 AI Agent 之上的工具层。

### outcome


- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#outcome) — Proof 聚合结果。在 schema 中以 `summary` 容器出现：
```json
"summary": {
"outcome": "DEVIATED",      // 3 态（INCONCLUSIVE > DEVIATED > COMPLETED 优先级）
"totalCount": 4,
"passedCount": 3,
"failedCount": 1,
"inconclusiveCount": 0
}
```
**禁止**：在 aggregate 层直接使用 `outcome` 字段名（撞名 ProbeOutcome 专用字段，
详见 oxn-probe-domain.md inv-27），必须用 `summary.<...>` 形式。
`passed: boolean` 是 v0.1 legacy 兼容字段，将随 v0.8 移除。

### OXL


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#oxl) — Engine 通过 unified 库实现 MD 语法的特性，包括编译、校验。
- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#oxl) — OpenXenon Language，OpenXenon 的特定领域语言（DSL），用于声明与校验 OXN 实体。具体领域见 [`oxn-engine-domain.OXL`](./oxn-engine-domain.md#oxl)。

### OXN


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#oxn) — OpenXenon 缩写。

### OXN CLI


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#oxn-cli) — OpenXenon 交互入口之一。
- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#oxn-cli) — OpenXenon 交互入口之一。具体领域见 [`oxn-cli-domain`](./oxn-cli-domain.md)。

### OXN Engine


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#oxn-engine) — OpenXenon 核心引擎；记录事实不评判合格（ADR-0031）；L0-L3 分层 + E1-E4 四结构实体实现。
- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#oxn-engine) — OpenXenon 核心引擎。具体领域见 [`oxn-engine-domain`](./oxn-engine-domain.md)。

### OXNCrash


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#oxncrash) — OXN 引擎自身 Bug 或底线被击穿的错误契约类。轨道 2，人类消费受众。

### Part


- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#part) — OXN 内置零件（封装可复用工程动作如 git-commit），引用 @oxn/parts/* scope。
- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#part) — Task 内 skill 执行单元（skill_context + acceptance），内联在 task.md 内不可独立成文件。

### Phase


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#phase) — 单个 IAP 阶段（Intent/Align/Proof 之一），按顺序不可跳。子步骤按阶段分别定义。

### PlanLock


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#planlock) — Asset 创建后强校验卡（与 Work planLock 等效），锁 fileHash + citations + DAG；漂移触发 IAP_ALIGN_LOCK_HASH_MISMATCH。
- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#planlock) — BirthCert 内不可变快照（3 组件 hash + allHash），锁后任何 .md 资产漂移 → IAP_ALIGN_LOCK_HASH_MISMATCH。

### PlanningPool


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#planningpool) — 规划池——前瞻性规划备选集合；住 `dev/pool/`；`status: planned`；**frontmatter 不含 version 字段**。
与 Roadmap（`dev/versions/`）是同一类文档的两个生命周期阶段：备选 vs 已绑版本。
frontmatter 必填：`id` (slug) / `theme` / `priority` (low/medium/high) / `status` / `created-at` /
`scheduled-version`（未绑为 `~`，scheduling 后改为 `0.X.Y`）。
入池条件：(a) RFC 主题已定（非 spike），(b) 有最小 RFC 草稿或 ADR 引用，(c) 工程师 mental commit 会做。
出池条件 (scheduling)：工程师 mental commit 绑版本 → `git mv dev/pool/&lt;slug&gt;.md dev/versions/0-X-Y-&lt;slug&gt;.md` + 补 `version` 字段。
来源：2026-07-27 grilling session C-OC2 决策；RFC-0013 Errata 2026-07-27 补 dev/pool/。

### Prescriptive Modality


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#prescriptive-modality) — 规定性情态——回答"为什么决定 X"的文档；住 `docs/rfc/zh-cn/RFC-XXXX-&lt;theme&gt;.md`（RFC 规范）；frozen + errata 演进；只引用 `docs/glossary/`（D5）；中文 only（D10）。

### Probe


- [oxn-probe-domain](/openxenon/assets/domains/oxn-probe-domain.md#probe) — OXN 内置探针 = "一次客观事实校验"的统一抽象。物理观测 L1-Infra Provider 执行 → 客观结果 L0-Kernel 产出 ProbeOutcome。同一个 Probe 可在多个 Proof 中被多个业务场景复用。
- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#probe) — 物理观测单元（prop 输入 + output 判定），内联在 part 内；标准必须来自 Blueprint observe 数组。

### probeName


- [oxn-probe-domain](/openxenon/assets/domains/oxn-probe-domain.md#probename) — Probe 本体名 = Probe 实体自己的名字（catalog 注册名）。从 `ref` 去除 `@oxn/probes/` 前缀派生（如 `ref: "@oxn/probes/fs-exists"` → `probeName: "fs-exists"`）。

### ProbeOutcome


- [oxn-probe-domain](/openxenon/assets/domains/oxn-probe-domain.md#probeoutcome) — L0 Kernel 产出的单个 Probe 客观结果。**3 态拼写是设计分层**（proof-frozen-writer.ts:11-25 记录）：
| 层 | 拼写 | 用途 |
|---|---|---|
| human canonical `.md` | `pass` / `fail` / `inconclusive` | proof.md 人类阅读 |
| machine SSOT JSON | `COMPLETED` / `DEVIATED` / `INCONCLUSIVE` | frozen.json（uppercase + -ED 是 JSON Schema enum 惯例） |
| Kernel ProbeOutcome TS union | `PASS` / `FAIL` / `INCONCLUSIVE` | 接口契约（无 -ED） |
映射边界在 `buildFrozenProof` / `proof-compiler.ts`。"完成"指探测完成，不是目标完成。`outcome` 字段仅 Probe 内部专用（aggregate 层不可用，详见 inv-27）。

### Project Bootstrap


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#project-bootstrap) — 5 起手 Asset 复制到 `&lt;project&gt;/.openxenon/assets/` 并完成 `oxn asset check` 校验的过程。
包含 3 步：(1) `oxn onboard --new` 触发复制；(2) 工程师填项目专属内容；
(3) `oxn asset check` 验证 5 Asset 完整性。
Proof-First 模式下 bootstrap 可选；完整 IAP 模式下 bootstrap 必走。
ADR-0089 D2。

### promote-boundary-isolation


- [oxn-draft-promote-domain](/openxenon/assets/domains/oxn-draft-promote-domain.md#promote-boundary-isolation) — Draft promote 仅跨 3 类 Target 输出目录（docs/rfcs/zh-cn/ / .openxenon/assets/ / .openxenon/works/），不写其他目录。
4 条边界规则（继承自 oxn-draft-domain inv-3 + 增 1 条）：
draft-promote-router Blueprint（v0.6.2-alpha.3 新）：总路由 + 4 阶段生命周期。
promote-target-aware-workflow Blueprint（v0.6.2-alpha.3 重构，原 4 件合并）：3 target 通用 promote。
draft-skeleton-fork Workflow（v0.6.2-alpha.3 新）：派生 skeleton。
draft-promote-tooling Stack（v0.6.2-alpha.3 新）：frontmatter 解析 + H2 段校验工具栈。
draft-skeletons/&lt;target&gt;[-&lt;kind&gt;].md（v0.6.2-alpha.3 新，7 件）：per-target 模板。
v0.6.2-alpha.3 落地 7 个 skeleton + 4 阶段 router + 3 target dispatch。
后续 v0.7.x 扩展：

### PromoteLifecycle


- [oxn-draft-promote-domain](/openxenon/assets/domains/oxn-draft-promote-domain.md#promotelifecycle) — Draft Promote 4 阶段（v0.6.2-alpha.3 锁）：
1. **gather**：draft-promote-router 读 Draft frontmatter + body，校验 Draft 存在 + promote-target 字段不缺。
2. **validate-skeleton**：校 frontmatter 字段 + H2 段结构（对照 PromoteRoute 的目标骨架清单）；缺字段报错 `OXN_DRAFT_PROMOTE_VALIDATE_FAILED`，列出缺失清单。
3. **fork-missing**：从 skeleton 模板补全缺字段（保留工程师填写的内容）；不修改工程师已填字段。
4. **dispatch-target**：按 PromoteRoute 调 promote-target-aware-workflow Blueprint 的对应分支（rfc / asset-&lt;kind&gt; / work），Work 执行后续 gather/author/validate/promote 4 Boundary。
关键约束：promote 不分 Intent / Align / Proof 三阶段（与 Work IAP 不同）；是单次 transactional 操作。

### PromoteRoute


- [oxn-draft-promote-domain](/openxenon/assets/domains/oxn-draft-promote-domain.md#promoteroute) — Draft → Target 路由映射表——3 条规则（Q-T1）：
物理载体：frontmatter `promote-target: <rfc|asset|work>` + `promote-kind: <5 AssetKind>`（仅 asset 时需要）。
默认值：`--target auto` 模式下，若未声明则报错 `OXN_DRAFT_PROMOTE_TARGET_MISSING`。

### Proof


- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#proof) — OXN 验证 AI Agent 执行结果并记录的协作**过程**证明（不是结果证明）。执行主体 OXN Engine
（ADR-0031 记录事实不评判）；物理观测 L1-Infra + 客观结果 L0-Kernel。物理产物（`frozen.json`
+ `outcome.md` + `trace.jsonl` + `state.json`）是副作用，**不是** Proof 术语本身。
聚合结果字段详见 `### outcome`（下方）；IAP 阶段名 = Proof Domain 实例化之一
（与 Intent/Align 并列，但当前已少用 Intent/Align）。
- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#proof) — OXN Engine 记录的协作**过程**证明（不是协作结果证明）；包含 frozen.json + trace.jsonl + state.json 三件套；OXN 只记录事实不评判合格；具体领域见 [`oxn-proof-domain`](./oxn-proof-domain.md)。

### Referent


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#referent) — 参照系——为非确定性智能体（LLM Agent）的本有但非确定器官（世界模型/传感器/执行器），提供确定性参照锚点。OXN 的统一设计模式：Asset 参照世界模型、Probe 参照传感器、OXN writer 参照执行器、CLI 调用参照动作、Work 参照解、Task DAG 参照状态探索图。参照版本与 agent 自有版本性质相反（参照必须稳定，不被被参照者改）。ADR-0072。

### Release Version


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#release-version) — 通过 `npm install -g @istuen/openxenon@&lt;version&gt;` 从 registry 或本地 tarball 安装的 oxn；指向预编译 `dist/cli.js`；immutable；终端用户 + CI/CD 使用。配合 `scripts/oxn-switch.sh` 的 `pnpm oxn:prod` 操作。

### RFC


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#rfc) — OpenXenon 规范（规定性文档）；住 `docs/rfc/zh-cn/RFC-XXXX-&lt;theme&gt;.md`；frozen + errata 演进策略；
顺序编号 + theme 字段；中文 only；只引用 `docs/glossary/`。替代旧 ADR + OXP 双层（v0.7 废除 OXP）。

### Roadmap


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#roadmap) — AssetKind=roadmap 的历史术语别名。**已废弃**——主术语改为 **AssetMap**（RFC-0013 D4），避免与版本计划文档（`dev/versions/`，同名 Roadmap）混淆。AssetKind 枚举值在代码中仍为 `roadmap`（不变），glossary 主术语为 AssetMap。
- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#roadmap) — 前瞻性版本计划文档——描述未来版本将包含什么；住 `dev/versions/`；`status: planned`；frontmatter 必填 `version`。
允许引用 `.openxenon/` 内部 RFC 草稿、sprint 设计稿（`dev/ → .openxenon/` ✅）。
版本转正后归档（不删除）到 `.openxenon/.archived/dev/versions/`。
注意：与 AssetKind=roadmap（AssetMap）是不同概念，术语不混用（RFC-0013 D4）。
仅当 entry 从 `PlanningPool` scheduling 后才放入 `dev/versions/`；当前 `dev/versions/` 为空。

### Round


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#round) — Work 多轮 IAP 循环（v0.6 新增），手动触发（`oxn work next-round`），maxIterations 硬限制（默认 3）。

## S-Z

### Scope


- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#scope) — OXN 引用作用域（@oxn builtin / @prj 项目级；@gbl 已废弃）。
- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#scope) — Blueprint 内文件范围声明段（## Scope）；allow/forbid glob 列表；静态锁定，PlanLock 保护；与 Blueprint ## Use 引用机制正交（Scope 是文件边界，Use 是 Asset 引用）；来源 design-blueprint-context-template。

### Skeleton


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#skeleton) — per-target 模板文件的实体类型（v0.6.3 Q1 新增）。
frontmatter：`entity: skeleton` 标识模板自身（不与任何目标 entity 混淆）+ `target-entity: <rfc|domain|workflow|stack|blueprint|roadmap|work>` 标识 fork 目标。
物理位置：`.openxenon/draft-skeletons/`（boundary 顶层）。
7 个内置模板：`rfc.md` / `asset-{domain,workflow,stack,blueprint,roadmap}.md` / `work.md`。
落盘方式：`oxn init` 自动写入（如果不存在）。
与 AssetKind 关系：Skeleton **不是** AssetKind 第 6 类（5 AssetKind 封闭性保持：domain/workflow/stack/blueprint/roadmap）。
与 Draft 关系：Skeleton 是 Draft 的**前置模板**（与 `.openxenon/drafts/` 平行），不是 Draft 实例。
自由度（v0.6.3 Q3）：工程师可手写 Draft，不强制从 skeleton 派生。

### SkeletonForking


- [oxn-draft-promote-domain](/openxenon/assets/domains/oxn-draft-promote-domain.md#skeletonforking) — skeleton 派生规则——v0.6.2-alpha.3 起 Draft 创建时（`--target` 模式）从 `.openxenon/draft-skeletons/&lt;target&gt;[-&lt;kind&gt;].md` 派生（v0.6.3 Fix #1 移到 boundary 顶层）。
7 个 skeleton 模板（v0.6.2-alpha.3 全部建）：
派生方式：draft-skeleton-fork Workflow 调 fork-template slot（Asset 形式），源文件必含 OXN 形式的 frontmatter + H2 占位（不允许纯空白）。

### Skill


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#skill) — OXN 内置给 AI 助手的技能，用于AI 助手里通过 Skill 对 OpenXenon CLI 交互。

### Slot


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#slot) — Blueprint 内拓扑节点（slot DAG），Engine 校验无环；Task 内 Part 名必须对齐 slot 名。

### Stack


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#stack) — AssetKind 之一，实现边界（runtimes/linters/testers）；Proof 阶段直接断言。v0.6 硬要求。ADR-0054。

### Starter Asset


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#starter-asset) — `oxn init --starter` 拷贝到 `.openxenon/assets/` 的 Built-in Asset 副本；
用户拥有可改。与 `@oxn/` fallback 两层覆盖（D8）。
存在后后续变更走 asset-evolve Work。RFC-0012 锁定（meta-RFC）。
Supersede 走新 RFC 标 superseded-by / supersedes。RFC-0010 锁定（meta-RFC）。RFC-0013 D6 移除 version 字段（对齐业界标准）。
格式 `0.6.2-alpha.0` < `0.6.2`。允许多次迭代。patch 不走 alpha。
开启条件：minor 由工程师人工确认；major 必经。一旦开启必须走完到 stable（不能跳过该版本）。
转正条件：工程师人工 sign-off（无自动条件）。RFC-0013 锁定（meta-RFC）。

### TargetDispatchTable


- [oxn-draft-promote-domain](/openxenon/assets/domains/oxn-draft-promote-domain.md#targetdispatchtable) — 路由 translate 表——把 Draft target 语法转成 promote-target-aware-workflow Blueprint 内部 task name：
| promote-target | promote-kind | 内部 task |
|---|---|---|
| rfc | (none) | `promote-rfc` |
| asset | domain | `promote-asset-domain` |
| asset | workflow | `promote-asset-workflow` |
| asset | stack | `promote-asset-stack` |
| asset | blueprint | `promote-asset-blueprint` |
| asset | roadmap | `promote-asset-roadmap` |
| work | (none) | `promote-work` |
物理载体：promote-target-aware-workflow Blueprint 的 H2 `## Tasks` 段，每条 task 一个 target。

### Task


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#task) — Align 执行单元，对齐 1 个 Blueprint 并可引用 N 个 Domain；内联 Part + Probe；DAG 无环（Kahn 校验）。

### TaskContext


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#taskcontext) — Task 级上下文内容（语义层）；AI Agent 从 WorkContext 按 Blueprint ## Boundaries 的每个 Slot 拆分；每个 TaskContext 携带 WorkContext 中与该 Slot 相关的子集 + 该 Slot 的 acceptance；纳入 PlanLock 5-hash（taskContextsHash）；来源 design-blueprint-context-template。

### TaskMemory


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#taskmemory) — Task 级动态记忆内容；Round 间追加；不纳入 PlanLock；来源 design-blueprint-context-template。

### Trace


- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#trace) — Work 执行轨迹（trace.jsonl），JSONL 追加式事件流；append-only + Trace-before-State（ADR-0009）。

### useName


- [oxn-probe-domain](/openxenon/assets/domains/oxn-probe-domain.md#usename) — 业务场景名 = 一次 Probe 使用的**业务场景名**（"这次要验证什么"）。在 proof.md 是 H3 key，在 frozen.json 是 `probes` 对象的 key。字符集约束 `^[a-zA-Z0-9-]+$`（保证可作 JSON object key）。

### Version Fragment


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#version-fragment) — 回顾性变更日志片段；住 `.changes/0-X-Y-*.md`；版本转正时落盘；`status: released`。
不引用 `.openxenon/` 内部路径（boundary 规则）。
package.json 为版本号 SSOT，8 文件一致性由 version-check 强制（RFC-0013 D5）。

### Version Hygiene


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#version-hygiene) — 版本号卫生规则——Dev Version 版本号恒严格大于已发布 Release Version 版本号；OXN CLI 不注入 build metadata（git SHA / build timestamp / "dev" 标记），版本号字符串本身是 Dev/Release 在运行时的唯一区分器。流程保障：`release-cut` workflow 的 `post-publish-bump` slot 在 publish 后**立即** bump dev 到下一个 `-alpha.0`，关闭共享版本号过渡窗口。权威定义：[ADR-0083](../../docs/adrs/0083-version-hygiene-over-build-metadata.md)。
- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#version-hygiene) — Dev Version 与 Release Version 在运行时的唯一区分器——dev 版本号恒严格大于已发布 release 版本号。OXN CLI **不**注入 build metadata（git SHA / build timestamp / "dev" 标记）；版本号字符串本身是唯一信号。判据：`oxn --version` 在 dev shell 与 release shell 输出不同字符串。关闭歧义窗口的流程保障：`release-cut` workflow 的 `post-publish-bump` slot 在 publish 后**立即** bump 3 个 package.json 到下一个 `-alpha.0`。

### Work


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#work) — 人机协作的工作空间，衔接 Asset 与 Proof；AI Agent 在 Asset 边界内自主工作（create → read Blueprint → write Context → orchestrate Tasks → execute → 汇报 → react → finalize）；具体领域见 [`oxn-work-domain`](./oxn-work-domain.md)。
- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#work) — Work 是 E2 人机协作的工作空间；编排流程 3 IAP 阶段顺序不可跳；必经路径 create→lock→run→submit×N→finalize。

### WorkContext


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#workcontext) — Work 级上下文内容（语义层）；AI Agent 按 Blueprint Context Template 从 Use refs 引用的 Domain/Workflow/Stack 提取相关 Terms/Invariants/Slots 编写；同一 Blueprint 的 N 个 Work 的 WorkContext 结构一致（除 Goal 外）；来源 design-blueprint-context-template。

### Workflow


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#workflow) — AssetKind 之一，执行边界（slot DAG + observe Probe），原 Blueprint 改名；AssetKind=workflow。ADR-0054。

### WorkMemory


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#workmemory) — Work 级动态记忆内容；Round 间追加；不纳入 PlanLock；与 PlanLock 保护的 WorkContext 形成"声明 vs 动态"二分；来源 design-blueprint-context-template。

<!-- SYNC:END -->
