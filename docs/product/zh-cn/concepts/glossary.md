---
title: 术语表
entity: glossary
generated-by: scripts/sync-domain-glossary.ts
synced-at: 2026-08-09
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

### Affected Package Family


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#affected-package-family) — 受同一维护者账号控制的包簇。本事件中 keyv maintainer 同时拥有
keyv / flat-cache / file-entry-cache / cacheable-request / cacheable / @cacheable/* /
cache-manager / ecto，任一成员被攻陷意味着整簇失守。

### Align


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#align) — 人机协作的工作过程，AI Agent 遵守边界并收敛执行。

### Artifact


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#artifact) — Align 阶段产出的物理事实（被 Probe 观测的对象），路径必须落在 Work 沙盒内或宿主项目目录。

### Asset


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#asset) — Asset 是工程师为 AI 协作定义的**环境约束**；5 类 AssetKind（domain / workflow / stack / blueprint / assetmap）；Work 引用 Asset（单向）；创建后强校验（planLock + content_hash），不被 Work 改写。
- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#asset) — 见 [`oxn-asset-domain`](./oxn-asset-domain.md#asset)。本文域内特指"Project 资产"——住 `.openxenon/assets/`。
- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#asset) — 工程师为 AI 协作定义的**环境约束**；5 类 AssetKind（domain/workflow/stack/blueprint/assetmap）。具体领域见 [`oxn-asset-domain`](./oxn-asset-domain.md)。

### AssetCheck


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#assetcheck) — 5 起手 Asset 完整性校验（替代 ADR-0069 G1 "数量下限校验"）：校验项 — Domain ≥ 1（必含 doc-md-domain）/ Workflow ≥ 1（必含 md-author-workflow）/ Stack ≥ 1（必含 md-stack）/ Blueprint ≥ 1（必含 md-author-blueprint）/ AssetMap ≥ 1（必含 md-system）。缺任一 → 提示运行 `oxn onboard --new`；不阻断 Proof-First 模式。ADR-0089 D3 + D4。

### AssetKind


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#assetkind) — Asset 5 类收敛枚举（domain / workflow / stack / blueprint / assetmap），v0.6.1-alpha.4 三边界框架收敛结果；🆕 v0.6.4 roadmap → assetmap 全面回收。

### AssetMap


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#assetmap) — AssetKind=assetmap 的语义别名（首选术语）——meta 索引层，AI 路由入口（6 scene 路由表 + Domain/Blueprint 索引）；不参与 references DAG。
与版本计划文档 "Roadmap"（`dev/versions/`）不同情态（定义性 Asset vs 描述性 Doc）、不同位置。
🆕 v0.6.4: AssetKind 枚举值同步从 `roadmap` 改为 `assetmap`（v0.7 RFC-0013 D4 原锁定枚举值不变，但 v0.6.4 设计决定全面回收 Roadmap 术语）。
- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#assetmap) — 🆕 v0.7.0 RFC-0027 PR-F（D3）：canonical 归 `oxn-asset-domain.md §AssetMap`；本域仅保留指向。

### AssetPaper


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#assetpaper) — Asset 论文结构 3 字段不变量（ADR-0051）：abstract + references + citations 缺一不可。学术论文↔Asset 映射。

### BirthCert


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#birthcert) — Work 静态门禁卡（.work 目录），写一次后只读（OS chmod 0o444），含 assets + context + diagnostics。

### Boundary


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#boundary) — 🆕 v0.7.0 RFC-0027 PR-F（D10）：删 Axiom（Asset 别名，合并到 Asset 定义）；语义保留到 Asset Axiom 注释。

### BuiltinAsset


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#builtinasset) — 随 OXN 版本发布的内置 Asset；住 `src/builtin/`；通过 `@oxn/` scope 解析；项目可用 `@prj/` override。自举种子——手动创建不经 Work，后续变更走 asset-evolve Work。

### Ceiling


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#ceiling) — 上限机制——AI Agent 自身能力的天花板，OXN 不介入。AI 可涌现比工程师更优的选择（反向帮助工程师积累经验、沉淀 Asset），ceiling 由 LLM 能力决定，不受 OXN 限制。与 Floor 对偶。ADR-0073 判据 3。

### Citation


- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#citation) — 🆕 v0.6.4 PR-B（合并自 `oxn-insight-domain`）：资产反向引用计数 + 影响半径（impactRadius: low/medium/high/critical），自动维护、归档保留。

### CliInputError


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#cliinputerror) — 用户 CLI 输入错的契约类。轨道 3。

### Command


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#command) — CLI 命令解析（Command/SubCommand/Arg）层。

### Community Spread


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#community-spread) — 蠕虫利用第一代受害者机器上已经获取的 npm publish token，
把自己重新打包成 math_init.js 版本 + 加 preinstall，再以该 token 的发布权 push 到所有
该 token 有权发布的包。因此社区扩散感染的目标包与原 keyv 家族无业务关系
（如 @picsart/ai-sdk / @qlik/embed-runtime），但发布时间仍是 2026-08-04~05。

### Compromised Version


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#compromised-version) — 已被官方或权威来源（GitHub Security Advisory / npm audit / Aikido Intel）标注为恶意的具体包版本号。
本事件覆盖 16 个包 × 精确版本（11 原生感染 + 5 社区扩散）。

### Daemon


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#daemon) — 🆕 v0.7.0 RFC-0027 PR-F（D4）：canonical（吸收 oxn-domain + engine-domain 旧内容）。
- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#daemon) — 🆕 v0.7.0 RFC-0027 PR-F（D4）：canonical 归 `oxn-engine-domain.md §Daemon`（L0-L3 架构 SSOT）；本 Axiom 删（避免重复定义）。

### DefinitionalModality


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#definitionalmodality) — 定义性情态——回答"X 是什么"的文档；住 `.openxenon/assets/{kind}/*.md`（E1 Asset）；自举种子允许手动创建（见 Bootstrap Seed Exemption）。

### DescriptiveModality


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#descriptivemodality) — 描述性情态——回答"怎么用 X"的文档；住 `docs/{product,dev}/{zh-cn,en}/*.md`；产品手册与开发手册。

### DevVersion


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#devversion) — 通过 `npm link`（仓库 dist/cli.js）注册的 oxn 全局 bin；mutable（每次 rebuild 改变）；仅贡献者 + 内部 dogfood 使用。配合 `scripts/oxn-switch.sh` 的 `pnpm oxn:dev` 操作。

### Distribution


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#distribution) — CLI 分发层（Dev Version / Release Version / Version Hygiene 三 Axiom）。

### Draft


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#draft) — 未提升的描述性工作稿（Descriptive Modality 草稿态）；物理位置 `.openxenon/drafts/`（可经 `.oxnrc` `draftDir` 字段配）；CLI 创建 + 工程师 / AI Agent 填写 + 工程师主动 promote（经 draft-promote-router Blueprint）。

### DraftCLI


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#draftcli) — 物理实现：`packages/cli/src/commands/draft.ts` + `@openxenon/engine/Draft`。

### DraftCompanionAsset


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#draftcompanionasset) — draft-skeleton-fork Workflow（v0.6.2-alpha.3 新）：派生 skeleton。

### DraftOrigin


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#draftorigin) — v0.4.0（D1 2026-08-07）起：Draft producer 标识字段，frontmatter `origin: human | insight`，默认 `human`。

### DraftPathConfig


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#draftpathconfig) — 可经 `.oxnrc` `draftDir` 字段配（v0.6.2 新增；走 ProjectConfig.draftDir）。

### DraftPromoteLifecycle


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#draftpromotelifecycle) — Draft Promote 阶段（v0.6.2-alpha.3 新增）——4 阶段：

### DraftSkeleton


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#draftskeleton) — per-target 模板——含 frontmatter（必填字段占位）+ H2 段（按目标类型，例如 RFC 的 `## 决策` / Domain 的 `## Terms`）+ TODO 占位。

### DraftTarget


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#drafttarget) — Draft Promote 路由去向——4 值枚举（v0.5.0 D2 起；Q-T1 + D2）：

### DraftType


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#drafttype) — Draft 用途分类——3 类：report（调研报告） / issue（问题记录） / design（设计稿）。映射到文件名前缀（Q-S1/Q-S5）：

### External


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#external) — 边界内 `## Externals` H2 category，从 Asset 类型降级；url/path 二选一 + kind enum + 状态索引；ADR-0056。

## F-L

### FixRecord


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#fixrecord) — 开发者面向的 bug 修复记录；住 `dev/fix/`；比 Version Fragment 更详细（含根因分析、调试过程）。

### Floor


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#floor) — 下限参照——OXN 为 AI Agent 的局部最优全局非优情况提供的确定性保底参照。Asset + Work 专注某个目标，构成 AI 选择动作时的 floor。OXN 提高 floor 不提高 ceiling（ADR-0073 判据 3）。

### Frozen


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#frozen) — Work finalize 后的不可变证据文件（frozen.json），生成后只读（chmod 0o444 + content_hash + signature）；包含 outcome 聚合结构（ADR-0067）+ boundary deviations 标记；三件套之一（详见 Proof）。

### FutureExtension


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#futureextension) — v0.6.2-alpha.3 部分实现（Asset 层 + 路由命令）；剩余（execute mode 自动跟踪、content 校验 Probe 化）待 v0.7.x scene-based Roadmap 收敛后再决。

### Goal


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#goal) — 承诺层规划单元——1:1 锁定一个 IAP 准备分支（`feat/goal-&lt;slug&gt;`）+ 一份 Work + 一个清晰边界。

### Hall


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#hall) — 研讨厅，人机协作范围内的中央枢纽。

### IAP


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#iap) — 工程师定义意图（Intent），AI Agent 对齐执行（Align），OXN 验证记录（Proof）。

### IAPError


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#iaperror) — 业务流转中预期内错误的契约类。轨道 1，AI 消费受众。

### Indicator of Compromise (IOC)


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#indicator-of-compromise-ioc) — 失陷指标 — 可被静态扫描识别的恶意特征。本事件 IOC 三类：
(1) 文件哈希：setup.mjs / Math_Symbol.js / math_init.js 三组 SHA-256
(2) 文件名：setup.mjs / Math_Symbol.js / math_init.js（项目内任何非 node_modules 路径命中即告警）
(3) 包脚本：preinstall 指向 setup.mjs / Math_Symbol.js / math_init.js（任何 package.json 内含此 preinstall 即告警）

### Infra


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#infra) — 🆕 v0.7.0 RFC-0027 PR-F（D4）：canonical（吸收 proof-domain 内容）。
- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#infra) — 🆕 v0.7.0 RFC-0027 PR-F（D4）：canonical 归 `oxn-engine-domain.md §Infra`（L0-L3 架构 SSOT）；本 Axiom 删（避免重复定义）。

### Insight


- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#insight) — 🆕 v0.6.4 PR-B（合并自 `oxn-insight-domain`）：Insight 是 E4 涌现层；整体论 vs 前三层还原论；只输出协作态势信号（边界使用/触碰/Loop 收敛/退出模式），不输出代码质量评分；永不自动回写 Asset。
- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#insight) — 洞察 IAP 并提供涌现的可能性。具体领域见 [`oxn-proof-domain`](./oxn-proof-domain.md#insight)（🆕 v0.6.4 PR-B：合并自 `oxn-insight-domain`）。

### InsightDraftMapping


- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#insightdraftmapping) — 🆕 v0.6.4 PR-B（合并自 `oxn-insight-domain`）：Insight 输出类型 → DraftType 映射（D1 锁定）：

### Intent


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#intent) — 人机协作的软件目标，AI Agent 对齐的工作对象。

### IntentPoolDeprecated


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#intentpooldeprecated) — Intent Pool v3 已退役（v0.4.0 / D1 2026-08-07）—— 设计稿 .openxenon/drafts/design-version-iteration-redesign.md D1 决策。

### InterferenceFlag


- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#interferenceflag) — 🆕 v0.6.4 PR-B（合并自 `oxn-probe-domain`）：信号污染标记 = L1-Infra Provider 在 IO 时检测到的干扰信号；是 "Taint / Boundary Deviation / InterferenceFlag" 三个旧术语的**唯一收敛目标**（ADR-0086 + ADR-0066）

### Kernel


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#kernel) — 🆕 v0.7.0 RFC-0027 PR-F（D4）：canonical（吸收 proof-domain 内容）。
- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#kernel) — 🆕 v0.7.0 RFC-0027 PR-F（D4）：canonical 归 `oxn-engine-domain.md §Kernel`（L0-L3 架构 SSOT）；本 Axiom 删（避免重复定义）。

### kind-isolation


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#kind-isolation) — references 仅同 AssetKind 原则；跨 kind 组合由 Blueprint 承担，跨 kind 导航由 Roadmap scene.links 承担；ADR-0054。

### Locale


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#locale) — CLI i18n 区域设置层（zh-CN 兜底 / resolveLocale 优先级）。

### Lockfile Audit


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#lockfile-audit) — 对 bun.lock / pnpm-lock.yaml / package-lock.json 三类锁文件做静态扫描的方法：
解析 → 提取所有 (name, version) → 与 Compromised Version 黑名单交叉 → 0 命中才算 clean。
本项目当前存在两个 lockfile，需分别审计。

### Lockfile Pin


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#lockfile-pin) — 在 lockfile 中显式固定到某个具体版本（含 ^/~ 范围）的行为。
本次事件关键教训：依赖的 major version 跳跃（keyv v4 → v6、flat-cache v4 → v6）才能让攻击者
引入新的恶意 preinstall；保留旧 major + 只升 patch 是当前最经济的 mitigation。

### Loop


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#loop) — Work 核心动态过程（三相模型 Phase 2）；物质运动态；所有变化被 trace 记录；ADR-0006。

## M-R

### MetaModality


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#metamodality) — 项目工程元情态——回答"OXN 自己怎么组织"的文档；住仓库根 + `dev/` + `.changes/`。包含 5 类项目工程文档（README.md / AGENTS.md / CONTEXT-MAP.md / .changes/ / dev/）。**特例**：可与 Descriptive Modality 组合（README.md = marketing + 入口）；可与 Definitional Modality 组合（CONTEXT-MAP.md = 8 Domain 索引）。RFC-0018 锁定。

### Mini Shai-Hulud


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#mini-shai-hulud) — 本次事件的初始变种（keyv 家族第一代注入）；与完整 Shai-Hulud 区别：
Mini 通过直接 push 恶意文件到 main 分支 + 切新版本，载荷文件名为 Math_Symbol.js。
社区扩散后第二代变种改用 math_init.js，核心功能等价。

### OnboardingPath


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#onboardingpath) — 项目消费者 onboarding 3 入口路径：`oxn onboard --new`（新项目入口）/ `oxn onboard --existing --proof-first`（存量 B1：先 Proof-First 5 分钟）/ `oxn onboard --existing --bootstrap`（存量 B2：AI 探索建 Asset）。入口探测：`oxn onboard --detect`（基于 package.json / compose.yaml / Cargo.toml / pyproject.toml 4 类信号）。Skill 入口：复用 `/oxn-work`，通过 Blueprint 区分场景（ADR-0089 D6）。ADR-0089 D2。

### OnboardingStarter


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#onboardingstarter) — 项目消费者 onboarding 用的 5 个内置 Asset（doc-md-domain / md-author-workflow / md-stack / md-author-blueprint / md-system），物理位置 `src/builtin/projects/starter/`，走 RFC-0011 `@oxn/` 公共层；通过 `oxn onboard --new` 复制到 `&lt;project&gt;/.openxenon/assets/`（@prj/ 层）。5 起手 Asset 是 onboarding 的最小可用集（替代 ADR-0069 D1 的 6 Asset）。ADR-0089 D1。

### OpenXenon


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#openxenon) — 工程师定义 AI Agent 协作边界的工具（slogan）。正定义：工程师通过 OXN 定义 Asset，作为 AI Agent 在 Work 约束的协作边界，由 Proof 验证其成果。以 Skills 形式注入 AI Agent 工作台（Cursor / OpenCode / Codex / Claude Code）。OXN 本身不是 AI Agent，而是 AI Agent 之上的工具层。

### Operation


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#operation) — Stack Tool 的命名调用声明（name + command template + desc），住进 Stack 文件 `## Tools ### &lt;tool&gt;` 下的 `operations` 子段。Blueprint slot 通过 `operate: [op-name...]` 数组引用 Operation 名；work-context-builder 在 lock 期解析为可消费快照注入 WorkContextResult，让 AI Agent 在 Task 内零推理拿到应运行的命令。

### Outcome


- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#outcome) — Proof 聚合结果。在 schema 中以 `summary` 容器出现：

### OXL


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#oxl) — Engine 通过 unified 库实现 MD 语法的特性，包括编译、校验。
- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#oxl) — OpenXenon Language，OpenXenon 的特定领域语言（DSL），用于声明与校验 OXN 实体。具体领域见 [`oxn-engine-domain.OXL`](./oxn-engine-domain.md#oxl)。

### OXN


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#oxn) — OpenXenon 缩写。

### OXN CLI


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#oxn-cli) — OpenXenon 交互入口之一。具体领域见 [`oxn-cli-domain`](./oxn-cli-domain.md)。

### OXN Engine


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#oxn-engine) — OpenXenon 核心引擎。具体领域见 [`oxn-engine-domain`](./oxn-engine-domain.md)。

### OXN_CLI


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#oxn-cli) — OpenXenon 交互入口之一。

### OXnConfig


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#oxnconfig) — OXN 配置文件层（OXnConfig / ProjectConfig 两层划分）。

### OXNCrash


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#oxncrash) — OXN 引擎自身 Bug 或底线被击穿的错误契约类。轨道 2，人类消费受众。

### OXNEngine


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#oxnengine) — OpenXenon 核心引擎；记录事实不评判合格（ADR-0031）；L0-L3 分层 + E1-E4 四结构实体实现。

### Part


- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#part) — OXN 内置零件（封装可复用工程动作如 git-commit），引用 @oxn/parts/* scope。
- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#part) — Task 内 skill 执行单元（skill_context + acceptance），内联在 task.md 内不可独立成文件。

### Phase


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#phase) — 单个 IAP 阶段（Intent/Align/Proof 之一），按顺序不可跳。子步骤按阶段分别定义。

### Philosophy


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#philosophy) — 🆕 v0.7.0 RFC-0027 PR-F（D8）：删占位 Axiom。OXN Engine 哲学沉淀到 ADR-0031（记录事实不评判） + ADR-0066/0067（OXN 不判质量只记事实）；本 Axiom 已无信息量。

### PlanLock


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#planlock) — Asset 创建后强校验卡（与 Work planLock 等效），锁 fileHash + citations + DAG；漂移触发 IAP_ALIGN_LOCK_HASH_MISMATCH。
- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#planlock) — BirthCert 内不可变快照（5 组件 hash + allHash v0.7+；v0.6 兼容 3-hash），锁后任何 .md 资产漂移 → IAP_ALIGN_LOCK_HASH_MISMATCH。

### Port


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#port) — 抽象接口契约（Kernel/Infra 边界 port）。

### PrescriptiveModality


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#prescriptivemodality) — 规定性情态——回答"为什么决定 X"的文档；住 `docs/rfc/zh-cn/RFC-XXXX-&lt;theme&gt;.md`（RFC 规范）；frozen + errata 演进；只引用 `docs/glossary/`（D5）；中文 only（D10）。

### Probe


- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#probe) — 🆕 v0.6.4 PR-B（合并自 `oxn-probe-domain`）：OXN 内置探针 = "一次客观事实校验"的统一抽象。物理观测 L1-Infra Provider 执行 → 客观结果 L0-Kernel 产出 ProbeOutcome。同一个 Probe 可在多个 Proof 中被多个业务场景复用。
- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#probe) — 物理观测单元（prop 输入 + output 判定），内联在 part 内；标准必须来自 Blueprint observe 数组。

### ProbeName


- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#probename) — 🆕 v0.6.4 PR-B（合并自 `oxn-probe-domain`）：Probe 本体名 = Probe 实体自己的名字（catalog 注册名）。从 `ref` 去除 `@oxn/probes/` 前缀派生（如 `ref: "@oxn/probes/fs-exists"` → `probeName: "fs-exists"`）。

### ProbeOutcome


- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#probeoutcome) — 🆕 v0.6.4 PR-B（合并自 `oxn-probe-domain`）：L0 Kernel 产出的单个 Probe 客观结果，3 态拼写按层分层：human canonical `.md` 用 `pass` / `fail` / `inconclusive`（proof.md 人类阅读）；machine SSOT JSON 用 `COMPLETED` / `DEVIATED` / `INCONCLUSIVE`（frozen.json，uppercase + -ED 是 JSON Schema enum 惯例）；Kernel ProbeOutcome TS union 用 `PASS` / `FAIL` / `INCONCLUSIVE`（接口契约，无 -ED）

### ProjectBootstrap


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#projectbootstrap) — 5 起手 Asset 复制到 `&lt;project&gt;/.openxenon/assets/` 并完成 `oxn asset check` 校验的过程。包含 3 步：(1) `oxn onboard --new` 触发复制；(2) 工程师填项目专属内容；(3) `oxn asset check` 验证 5 Asset 完整性。Proof-First 模式下 bootstrap 可选；完整 IAP 模式下 bootstrap 必走。ADR-0089 D2。

### Proof


- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#proof) — OXN 验证 AI Agent 执行结果并记录的协作**过程**证明（不是结果证明）。执行主体 OXN Engine（ADR-0031 记录事实不评判）；物理观测 L1-Infra + 客观结果 L0-Kernel。物理产物（`frozen.json` + `outcome.md` + `trace.jsonl` + `state.json`）是副作用，**不是** Proof 术语本身。
- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#proof) — OXN Engine 记录的协作**过程**证明（不是协作结果证明）；物理产物四件套 `frozen.json` + `outcome.md` + `trace.jsonl` + `state.json`（🆕 v0.7.0 RFC-0027 PR-F D6 修正：oxn-domain 三件套 → proof-domain 四件套，统一为四件套避免歧义）；OXN 只记录事实不评判合格；具体领域见 [`oxn-proof-domain`](./oxn-proof-domain.md)。

### Provenance


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#provenance) — NPM 包构建来源证明 — 本事件中 GitHub Actions 签发的 provenance 未被伪造（攻击者控制了 maintainer GitHub 账号，
走的是正常 publish 流程 + 真实签名），所以 provenance 不能作为唯一信任门禁，必须配合 IOC + 版本黑名单双校验。

### Referent


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#referent) — 参照系——为非确定性智能体（LLM Agent）的本有但非确定器官（世界模型/传感器/执行器），提供确定性参照锚点。OXN 的统一设计模式：Asset 参照世界模型、Probe 参照传感器、OXN writer 参照执行器、CLI 调用参照动作、Work 参照解、Task DAG 参照状态探索图。参照版本与 agent 自有版本性质相反（参照必须稳定，不被被参照者改）。ADR-0072。

### ReleaseVersion


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#releaseversion) — 通过 `npm install -g @istuen/openxenon@&lt;version&gt;` 从 registry 或本地 tarball 安装的 oxn；指向预编译 `dist/cli.js`；immutable；终端用户 + CI/CD 使用。配合 `scripts/oxn-switch.sh` 的 `pnpm oxn:prod` 操作。

### RFC


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#rfc) — OpenXenon 规范（规定性文档）；住 `docs/rfc/zh-cn/RFC-XXXX-&lt;theme&gt;.md`；frozen + errata 演进策略；顺序编号 + theme 字段；中文 only；只引用 `docs/glossary/`。替代旧 ADR + OXP 双层（v0.7 废除 OXP）。

### RoadmapDeprecated


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#roadmapdeprecated) — Roadmap 概念已退役（v0.4.0 / D5+ 2026-08-07）—— 设计稿 `.openxenon/drafts/design-version-iteration-redesign.md` §2.2 决策。

### Round


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#round) — Work 多轮 IAP 循环（v0.6 新增），手动触发（`oxn work next-round`），maxIterations 硬限制（默认 3）。

## S-Z

### SchemaFieldMapping


- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#schemafieldmapping) — 🆕 v0.6.4 PR-B（合并自 `oxn-probe-domain` `## Schema` 段，Q11 b 决策改写为 Axiom）：

### Scope


- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#scope) — OXN 引用作用域（@oxn builtin / @prj 项目级；@gbl 已废弃）。

### Shai-Hulud Worm


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#shai-hulud-worm) — 2026-08-04 起活跃的 NPM 蠕虫家族名（Aikido 命名）。特征：
通过 preinstall hook 在 install 阶段自动执行；下载 Bun runtime，
再用 Bun 跑 728 KB 混淆载荷（首次注入）或社区扩散变种，
盗取 npm/GitHub/AWS/K8s/Vault/Stripe/Slack 凭据 + 自我复制到其他包。

### Skeleton


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#skeleton) — per-target 模板文件的实体类型（v0.6.3 Q1 新增）。

### Skill


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#skill) — OXN 内置给 AI 助手的技能，用于AI 助手里通过 Skill 对 OpenXenon CLI 交互。

### Slot


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#slot) — Blueprint 内拓扑节点（slot DAG），Engine 校验无环；Task 内 Part 名必须对齐 slot 名。

### StarterAsset


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#starterasset) — `oxn init --starter` 拷贝到 `.openxenon/assets/` 的 Built-in Asset 副本；用户拥有可改。与 `@oxn/` fallback 两层覆盖（D8）。

### StructureV2


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#structurev2) — Asset 正文 v2 统一结构：`## Group → ### Axiom → - Theorem`；Blueprint 特例：`## Use <Asset Type> + ## Slot + 顶层 ### Scope / ### Context Template`。3 形态（Axiom + Theorem / 纯 Axiom / 纯 Theorem）均合法。Group 名 free-form，Engine 不解释业务含义。

### Supply Chain Attack


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#supply-chain-attack) — 攻击者通过入侵合法软件包的发布链路（注册表账号 / CI / 维护者 GitHub 账号），
将恶意代码注入到被广泛信任的包版本中，让下游 install 在用户机器上自动执行。
与"个人账号劫持发垃圾包"区别：受害者信任的是包名本身（非首次接触的新包）。

### TargetFrozenJsonStructure


- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#targetfrozenjsonstructure) — 🆕 v0.6.4 PR-B（合并自 `oxn-probe-domain` `## Schema` 段，Q11 b 决策改写为 Axiom）：

### Task


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#task) — Align 执行单元，对齐 1 个 Blueprint 并可引用 N 个 Domain；内联 Part + Probe；DAG 无环（Kahn 校验）。

### Trace


- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#trace) — Work 执行轨迹（trace.jsonl），JSONL 追加式事件流；append-only + Trace-before-State（ADR-0009）。

### UseName


- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#usename) — 🆕 v0.6.4 PR-B（合并自 `oxn-probe-domain`）：业务场景名 = 一次 Probe 使用的**业务场景名**（"这次要验证什么"）。在 proof.md 是 H3 key，在 frozen.json 是 `probes` 对象的 key。字符集约束 `^[a-zA-Z0-9-]+$`（保证可作 JSON object key）。

### Version


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#version) — 回顾性发布记录——cut 时诞生，**frozen-at-cut**；住 `.changes/0-X-Y-&lt;theme&gt;.md`；`status: released`。

### VersionHygiene


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#versionhygiene) — 版本号卫生规则——Dev Version 版本号恒严格大于已发布 Release Version 版本号；OXN CLI 不注入 build metadata（git SHA / build timestamp / "dev" 标记），版本号字符串本身是 Dev/Release 在运行时的唯一区分器。流程保障：`release-cut` workflow 的 `post-publish-bump` slot 在 publish 后**立即** bump dev 到下一个 `-alpha.0`，关闭共享版本号过渡窗口。权威定义：[ADR-0083](../../docs/adrs/0083-version-hygiene-over-build-metadata.md)。
- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#versionhygiene) — 🆕 v0.7.0 RFC-0027 PR-F（D3）：canonical 归 `oxn-project-domain.md §VersionHygiene`；CLI 域仅保留指向。

### Work


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#work) — 人机协作的工作空间，衔接 Asset 与 Proof；AI Agent 在 Asset 边界内自主工作（create → read Blueprint → write Context → orchestrate Tasks → execute → 汇报 → react → finalize）；具体领域见 [`oxn-work-domain`](./oxn-work-domain.md)。
- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#work) — Work 是 E2 人机协作的工作空间；编排流程 3 IAP 阶段顺序不可跳；必经路径 create→lock→run→submit×N→finalize。

<!-- SYNC:END -->
