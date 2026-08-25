---
title: 术语表
entity: glossary
generated-by: scripts/sync-domain-glossary.ts
synced-at: 2026-08-25
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

### Artifact


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#artifact) — Align 阶段产出的物理事实（被 Probe 观测的对象），路径必须落在 Work 沙盒内或宿主项目目录。

### ArtifactDeclaration


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#artifactdeclaration) — Task 内声明的预期产物路径列表（## Artifacts）；lock 时 Engine 校验 ⊆ Blueprint Scope.allow AND ∩ Scope.forbid = ∅；与运行时 Artifact（含 hash）区分。

### Asset


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#asset) — Asset 是工程师为 AI 协作定义的**环境约束**；5 类 AssetKind（domain / workflow / stack / blueprint / assetmap）；Work 引用 Asset（单向）；创建后强校验（planLock + content_hash），不被 Work 改写。
- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#asset) — 见 [`oxn-asset-domain`](./oxn-asset-domain.md#asset)。本文域内特指"Project 资产"——住 `.openxenon/assets/`。
- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#asset) — 领域知识的结构化表示（D24，）；包括 Domain、Workflow、Stack，并由 Blueprint 组合使用。

### AssetAsOntology


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#assetasontology) — Asset = Ontology 形式推理推迟——Asset 描述工程语汇的边界（Concept / Boundary / Forbidden / Slogan / ContextEngineering），但不承载 OWL/RDF 风格的自动推理；形式推理属"知识判断"，OXN 立法不管，归工程师 + AI 自然语言推理。

### AssetCheck


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#assetcheck) — 5 起手 Asset 完整性校验（替代旧"数量下限校验"）：校验项 — Domain ≥ 1（必含 doc-md-domain）/ Workflow ≥ 1（必含 md-author-workflow）/ Stack ≥ 1（必含 md-stack）/ Blueprint ≥ 1（必含 md-author-blueprint）/ AssetMap ≥ 1（必含 md-system）。缺任一 → 提示运行 `oxn onboard --new`。

### AssetKind


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#assetkind) — Asset 5 类收敛枚举（domain / workflow / stack / blueprint / assetmap）。

### AssetMap


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#assetmap) — AssetKind=assetmap 的语义别名（首选术语）——meta 索引层，AI 路由入口（6 scene 路由表 + Domain/Blueprint 索引）；不参与 references DAG。
与版本计划文档 "Roadmap"（`dev/versions/`）不同情态（定义性 Asset vs 描述性 Doc）、不同位置。
v0.6.4: AssetKind 枚举值同步从 `roadmap` 改为 `assetmap`（全面回收 Roadmap 术语）。
- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#assetmap) — AssetKind=assetmap 的语义别名（首选术语）——meta 索引层，AI 路由入口（6 scene 路由表 + Domain/Blueprint 索引）；不参与 references DAG。

### AssetPaper


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#assetpaper) — Asset 论文结构 3 字段不变量：abstract + references + citations 缺一不可。学术论文↔Asset 映射。

### AssetPeasRole


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#assetpeasrole) — PEAS E（Environment）—— Asset 是工程师为 AI Agent 协作定义的边界环境。

### banned-files


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#banned-files) — items:
这三个文件名即告警。Shai-Hulud 蠕虫的执行入口文件，合法依赖不会用到。

### banned-github-repo-pattern


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#banned-github-repo-pattern) — items:
GitHub 上 ~1300 个公开仓库匹配此 pattern，每个对应一名受害者的加密凭据包。
任何本地凭据文件（npmrc/.aws/.ssh 等）出现在这些仓库说明本地已失陷。

### banned-network-endpoints


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#banned-network-endpoints) — items:
C2 fallback + 通过以太坊主网智能合约下发新 C2 域名（攻击者可随时轮换）。
任何 runtime 出站流量命中 → 立即隔离机器。

### banned-script-patterns


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#banned-script-patterns) — items:
合法依赖不会以 setup.mjs / Math_Symbol.js 作为 preinstall hook。

### banned-versions-community-spread


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#banned-versions-community-spread) — items:
这些包本身与 keyv 家族无业务关系，但 npm publish token 被盗后被 push 新版本。
数据源：同上 Aikido 博客。

### banned-versions-primary


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#banned-versions-primary) — items:
任何 lockfile / package.json / node_modules 命中任一即阻断 install。
数据源：https://www.aikido.dev/blog/keyv-and-friends-compromised-in-npm-supply-chain-attack

### BirthCert


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#birthcert) — Work 静态资产快照（.work 目录或运行时读 work.md ## Use），含 assets（domain/blueprint fileHash 快照）。不再含 planLock（RFC-0033 D2）。

### BlueprintContextEngineering


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#blueprintcontextengineering) — 上下文工程的元结构：声明哪些 Assets 提供什么上下文（Use）+ 如何拆分为 Slot（Boundaries）+ 文件范围（Scope）+ 组装指令（Context Template）。

### BlueprintPropsFunnel


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#blueprintpropsfunnel) — Blueprint props ≠ Part props 合集，是**漏斗**：Blueprint 通过硬编码 / 拼接 / 默认值吸收子层复杂度；Blueprint 充当"参数收敛器"，简化上层调用。

### BoundaryEngineeringVsKnowledgeEngineering


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#boundaryengineeringvsknowledgeengineering) — 工程语义二分（Domain SSOT 锚定；why 记录层由 docs/rfc/zh-cn/ 承担）：边界工程（boundary engineering）= 定义"什么存在 / 什么不允许 / 什么是术语"；OXN 立法管辖。知识工程（knowledge engineering）= 把经验沉淀为可复用知识；属"价值判断"范畴，OXN 立法不管。

### BoundaryLearning


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#boundarylearning) — 经验回流 Asset 的唯一 SSOT 锚定路径（v0.7+ 收口术语，why 记录层由 docs/rfc/zh-cn/ 承担）：memory.md（Work 动态记录）→ Draft（`origin: human`）→ 工程师 review → Promote Asset。

### BuiltinAsset


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#builtinasset) — 随 OXN 版本发布的内置 Asset；住 `src/builtin/`；通过 `@oxn/` scope 解析；项目可用 `@prj/` override。自举种子——手动创建不经 Work，后续变更走 asset-evolve Work。

### BuiltinPart


- [oxn-probe-domain](/openxenon/assets/domains/oxn-probe-domain.md#builtinpart) — Builtin Probe 资产的物理结构（builtin catalog）。

### Citation


- [doc-md-domain](/openxenon/assets/domains/doc-md-domain.md#citation) — glossary-ref: /openxenon/assets/domains/doc-md-domain.md#citation

### CliInputError


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#cliinputerror) — 用户 CLI 输入错的契约类。轨道 3。

### CodeBlock


- [doc-md-domain](/openxenon/assets/domains/doc-md-domain.md#codeblock) — glossary-ref: /openxenon/assets/domains/doc-md-domain.md#codeblock

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

### ContextMD


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#contextmd) — Work 内上下文文件（works/&lt;id&gt;/context.md）；AI Agent 按 Blueprint ## Context Template 从 ## Use 引用的 Assets 组装。

### ContextTemplate


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#contexttemplate) — Blueprint 内上下文组装指令段（## Context Template）；可选，缺省 Engine 用内置默认模板（基于 Use refs + Boundaries + Goal 推导）；Blueprint 可覆写默认（如 bug-fix-blueprint 在 diagnose 段加"证据落盘"指令）。

### DefinitionalModality


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#definitionalmodality) — 定义性情态——回答"X 是什么"的文档；住 `.openxenon/assets/{kind}/*.md`（E1 Asset）；自举种子允许手动创建（见 Bootstrap Seed Exemption）。

### DeprecatedConstructsV040


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#deprecatedconstructsv040) — intent-pool
v0.4.0（D1 2026-08-07）起禁止新建/引用——Intent Pool v3 退役并吸收进 Draft：

### DescriptiveModality


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#descriptivemodality) — 描述性情态——回答"怎么用 X"的文档；住 `docs/{product,dev}/{zh-cn,en}/*.md`；产品手册与开发手册。

### DevVersion


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#devversion) — 通过 `npm link`（仓库 dist/cli.js）注册的 oxn 全局 bin；mutable（每次 rebuild 改变）；仅贡献者 + 内部 dogfood 使用。配合 `scripts/oxn-switch.sh` 的 `pnpm oxn:dev` 操作。

### DiagnosticUnification


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#diagnosticunification) — 全栈非阻断诊断统一——所有非阻断问题（warning/diagnostic）走 `LoggerPort` 接口（4 档 LogLevel：debug/info/warn/error），不再用 `warnings: string[]` 返回值或 `console.warn/error`/`process.stderr.write` 副作用。函数签名只返回业务数据，warning 走 logger 单通道。

### Distribution


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#distribution) — CLI 分发层（Dev Version / Release Version / Version Hygiene 三 Axiom）。

### Draft


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#draft) — 未提升的描述性工作稿（Descriptive Modality 草稿态）；物理位置 `.openxenon/drafts/`（可经 `.oxnrc` `draftDir` 字段配）；CLI 创建 + 工程师 / AI Agent 填写 + 工程师主动 promote（经 draft-promote-router Blueprint）。

### DraftCLI


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#draftcli) — 物理实现：`packages/cli/src/commands/draft.ts` + `@openxenon/engine/Draft`。

### DraftCompanionAsset


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#draftcompanionasset) — draft-skeleton-fork Workflow（v0.6.2-alpha.3 新）：派生 skeleton。

### DraftOrigin


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#draftorigin) — v0.4.0 起引入 Draft producer 标识字段（origin）；v0.7+ Insight 删除后 origin 恒为 `human`。

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

### DriftObservableNotBlocking


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#driftobservablenotblocking) — 🆕 RFC-0033 D4：workMd hash 变化时不阻断 submit。submit 时读 trace.jsonl 找上次 SUBMIT 的 workMdHash；不一致 append 一条 ASSET_DRIFT 事件（不阻断）。指纹数 = submit 次数；多次 DRIFT = Blueprint 或 AI 遇到问题（可观测不硬编码判断）。

### EngineeringDefinesAgentBoundary


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#engineeringdefinesagentboundary) — OpenXenon 的唯一产品目标（Domain SSOT 锚定；why 记录层由 `docs/rfc/zh-cn/` 承担）：工程（OpenXenon）是把领域知识结构化为 AI Agent 协作确定性源的工具（D24，）。

### EscapeHatchAxiomNameCarrying


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#escapehatchaxiomnamecarrying) — 逃生舱 A：Axiom 命名承载——拆多 Axiom 平铺（`### Inv1` / `### Inv1A` / `### Inv1B`），命名承载层级；Engine 用 `slugify(H3)` 做 ID，序号不解析。

### EscapeHatchCrossAssetReference


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#escapehatchcrossassetreference) — 逃生舱 C：跨 Asset 引用——同 kind `references`（Inv15 + Inv16 预算 N=5）/ 跨 kind Blueprint `## Use`（显式 `kind:` 字段）/ 跨 kind 导航 AssetMap `scene.links`；Engine DAG 校验防环（Inv5DagNoCycles）。

### EscapeHatchFieldLoadNested


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#escapehatchfieldloadnested) — 逃生舱 D：field-load Axiom 内嵌（Blueprint/Stack 限定豁免）——Tool `operations:` / Slot `observe/operate/deps:` / Use `path/kind:` / Scope `allow/forbid:` / Context Template `business/process/...`；OXN 守门明确豁免（`scripts/check-asset-structure.ts:295-301`）。

### EscapeHatchGroupSwitch


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#escapehatchgroupswitch) — 逃生舱 B：Group 切换——新主题开新 `## Group`（`## Concept` / `## Boundary` / `## Foundation` 等皆 free-form）。

### External


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#external) — 边界内 `## Externals` H2 category，从 Asset 类型降级；url/path 二选一 + kind enum + 状态索引。

## F-L

### Figure


- [doc-md-domain](/openxenon/assets/domains/doc-md-domain.md#figure) — glossary-ref: /openxenon/assets/domains/doc-md-domain.md#figure

### FixRecord


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#fixrecord) — 开发者面向的 bug 修复记录；住 `dev/fix/`；比 Version Fragment 更详细（含根因分析、调试过程）。

### forbidden-constructs


- [doc-md-domain](/openxenon/assets/domains/doc-md-domain.md#forbidden-constructs) — items:

### ForbiddenConstructs


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#forbiddenconstructs) — ignoreAssetLock
- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#forbiddenconstructs) — L2Domain
- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#forbiddenconstructs) — oxn-pool-create
- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#forbiddenconstructs) — WorkV0Layout

### ForbiddenCrossLayerImports


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#forbiddencrosslayerimports) — docs-to-openxenon
文档三层严格隔离 + Meta 层隔离（v0.3.0 起）：

### ForbiddenDraftAsAsset


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#forbiddendraftasasset) — draft-asset-promote

### ForbiddenDraftBuiltinTemplate


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#forbiddendraftbuiltintemplate) — draft-template

### ForbiddenDraftFrontmatterRequired


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#forbiddendraftfrontmatterrequired) — draft-frontmatter-required

### ForbiddenDraftPrefixV060D46


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#forbiddendraftprefixv060d46) — draft-prefix-doc

### ForbiddenErrorContractFamily


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#forbiddenerrorcontractfamily) — HARD_FAIL

### ForbiddenMetaInternalCoupling


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#forbiddenmetainternalcoupling) — readme-to-rfc
项目工程元层内部互引限制（v0.3.0 起）：

### FutureExtension


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#futureextension) — v0.6.2-alpha.3 部分实现（Asset 层 + 路由命令）；剩余（execute mode 自动跟踪、content 校验 Probe 化）待 v0.7.x scene-based Roadmap 收敛后再决。

### GatingPlugin


- [DSHPresetMount](/openxenon/assets/domains/DSHPresetMount.md#gatingplugin) — 守门 plugin（`~/.config/dsh/init.d/oxn-guard.js`），限制 preset 内允许调用的命令子集，避免 agent 任意 `bash`；可选但推荐。

### GlossaryTwoTierSSOT


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#glossarytwotierssot) — 术语双层 SSOT 架构——`.openxenon/assets/domains/*.md`（9 文件，~333 term headings）作**内部 SSOT**（OXN Runtime / Engine / AI Agent 视角），`docs/product/zh-cn/concepts/glossary.md`（单文件，~317 unique terms）作**外部 SSOT**（用户 / 文档读者视角）。

### Goal


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#goal) — 承诺层规划单元——1:1 锁定一个 IAP 准备分支（`feat/goal-&lt;slug&gt;`）+ 一份 Work + 一个清晰边界。
- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#goal) — Goal CLI 子命令集（v0.6.0 起 5 子命令）：

### HashAsSubmitFingerprint


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#hashassubmitfingerprint) — 🆕 RFC-0033 D3：Hash 语义从"防改锁"重定义为"submit 时刻的完成指纹"。submit 时算 work.md 的 sha256 hex，记入 trace.jsonl 的 SUBMIT 事件属性 workMdHash。改 work.md 不阻断 submit，仅可观测。

### IAP


- [DSHPresetMount](/openxenon/assets/domains/DSHPresetMount.md#iap) — Identity / Align / Proof 三轴模型；本 Domain 关心 Identity 维度（preset 的 persona / tool 声明 / 命令白名单）。

### IAPClosedLoop（理念叙事层，D10）


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#iapclosedloop-d10) — Intent + Align + Proof 三相闭环：工程师定义意图（Intent），AI Agent 对齐执行（Align），OXN 验证记录（Proof）。

### IAPError


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#iaperror) — 业务流转中预期内错误的契约类。轨道 1，AI 消费受众。

### ImplementationBoundaryCriteria


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#implementationboundarycriteria) — OXN 实现边界的四轴正交判据集——评估任何 OXN 新功能时过四判据，任一判据命中"不该实现"则拒绝；四判据全过则符合 OXN 定位。两两正交覆盖四个维度：补偿什么 / 升到哪级 / 提哪限 / 路径怎么判。

### Indicator of Compromise (IOC)


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#indicator-of-compromise-ioc) — 失陷指标 — 可被静态扫描识别的恶意特征。本事件 IOC 三类：
(1) 文件哈希：setup.mjs / Math_Symbol.js / math_init.js 三组 SHA-256
(2) 文件名：setup.mjs / Math_Symbol.js / math_init.js（项目内任何非 node_modules 路径命中即告警）
(3) 包脚本：preinstall 指向 setup.mjs / Math_Symbol.js / math_init.js（任何 package.json 内含此 preinstall 即告警）

### Infra


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#infra) — L1 副作用 / IO 执行模块：只回答事实不做判定（不能给自己盖章）；3 个 IO Primitive（io.stat/io.read/io.exec）通过 ProviderRegistry 暴露。

### IntentPoolDeprecated


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#intentpooldeprecated) — Intent Pool v3 已退役（v0.4.0 / D1 2026-08-07）—— 设计稿 .openxenon/drafts/design-version-iteration-redesign.md D1 决策。

### inv-1: lockfile-zero-ioc-match


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#inv-1-lockfile-zero-ioc-match) — value: |
本项目的 bun.lock 与 pnpm-lock.yaml 两份 lockfile 必须 0 命中 banned-versions-primary 与
banned-versions-community-spread 两个黑名单。校验时机：
(1) pre-commit hook（每次 commit）
(2) CI pipeline（每次 PR / push）
(3) oxn asset check 期间（引用本 Domain 的 Work lock 期）
命中 → 阻断并提示升级到 safe version（见 inv-2）。

### inv-1: section-h2-rule


- [doc-md-domain](/openxenon/assets/domains/doc-md-domain.md#inv-1-section-h2-rule) — value: 文档 H1 仅用于标题（每文档唯一）；H2 为节；H3 为子节；H4 及以下不支持。

### inv-2: codeblock-language-required


- [doc-md-domain](/openxenon/assets/domains/doc-md-domain.md#inv-2-codeblock-language-required) — value: 围栏代码块必须含 language 标识（\`\`\`ts / \`\`\`bash 等）；缺失 → md-stack lint 失败。

### inv-2: prefer-legacy-major-for-affected-family


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#inv-2-prefer-legacy-major-for-affected-family) — value: |
对于 banned-versions-primary 列出的 11 个包，在它们发布 safe patch 之前，
工程上必须固定到中毒版本之前的最旧 major（lockfile pin）。
当前本项目实际锁定的版本：
推导路径：eslint@10.5.0 → file-entry-cache@^8.0.0 → flat-cache@^4.0.0 → keyv@^4.5.4
禁止任何 PR 把上述包升到 major +1 以上的版本，除非 Aikido / npm security advisory 明确标记 safe。

### inv-3: link-validated-at-precommit


- [doc-md-domain](/openxenon/assets/domains/doc-md-domain.md#inv-3-link-validated-at-precommit) — value: 所有链接（内/外/锚）必须通过 `markdown-link-check`（md-stack 工具链）；失败 → pre-commit 阻断。

### inv-3: no-malicious-file-in-source-tree


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#inv-3-no-malicious-file-in-source-tree) — value: |
项目源码树（含 packages/**、src/**、oxn-vscode/**、.openxenon/**、docs/**）内禁止出现
setup.mjs / Math_Symbol.js / math_init.js 三个文件名。
扫描工具：find . -name 'setup.mjs' -not -path '*/node_modules/*' -not -path '*/.pnpm/*' -not -path '*/.bun/*'
扫描结果必须为空；命中即报错并阻断 commit。

### inv-4: citation-numbering-unique


- [doc-md-domain](/openxenon/assets/domains/doc-md-domain.md#inv-4-citation-numbering-unique) — value: 同一文档内引用编号 n 唯一；数字连续从 1 开始；`## References` 段按编号排列。

### inv-4: no-suspicious-preinstall


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#inv-4-no-suspicious-preinstall) — value: |
本项目任何 package.json 的 scripts 段禁止包含以 node setup.mjs / node Math_Symbol.js /
node math_init.js 开头的 preinstall / install / postinstall hook。
合法依赖不会用这种命名作为 hook。
即使是 pnpm / bun / npm 的 onlyBuiltDependencies 白名单也不应包含这三类文件路径。

### inv-5: dual-lockfile-cross-check


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#inv-5-dual-lockfile-cross-check) — value: |
本项目同时存在 bun.lock（bun 原生格式）+ pnpm-lock.yaml（pnpm YAML 格式）两份 lockfile。
任何依赖变更必须在两份中同步（pnpm 作为权威，bun.lock 通过 pnpm install 重建后由 bun 校验一致）。
防止任一 lockfile 单独被篡改（攻击者改 bun.lock 但 pnpm-lock.yaml 是干净镜像会暴露）。
CI 校验：两边都跑 oxn asset validate 同一份黑名单。

### inv-6: registry-mirror-tracking


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#inv-6-registry-mirror-tracking) — value: |
本项目当前通过 npmmirror 镜像（registry.npmmirror.com）拉取包，
镜像源对 IOC 版本的下架存在滞后窗口。
必须在镜像源未下架前用 lockfile 哈希 + 黑名单双校验兜底，不能仅依赖镜像源审查。
镜像源 URL 变更（换回官方 npmjs）属于结构性变更，需走 PR + 双 lockfile 重生成。

### inv-7: audit-cadence


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#inv-7-audit-cadence) — value: |
本 Domain 词汇扩展遵循事件驱动 + 季度回归双节奏：
(1) 事件驱动：Aikido / GitHub Security Advisory / npm audit 公布新事件 → 24h 内追加 Terms/Bans
(2) 季度回归：每季度跑一次 oxn asset validate + 完整 lockfile 重审计，
对照本 Domain banned-versions-* 黑名单，确认所有锁定版本仍然 safe。
历史事件归档走 banned-versions-archived-{yyyymm} 命名（如 banned-versions-archived-202608）。

### inv-8: advisory-aggregate-policy


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#inv-8-advisory-aggregate-policy) — value: |
同一供应链事件覆盖多个包时，必须聚合到单一 Domain（本资产）而非为每个包新建 Domain。
理由：(1) 16 包共享同一攻击链特征 + 同一波次时间窗；(2) AI Agent 路由时按 supply-chain 关键词
即可定位本 Domain，无需逐包遍历；(3) 后续同类事件可复用本 Domain 的 IOC 校验器骨架。
跨事件（不同时间窗 / 不同攻击家族）才考虑拆 Domain。

### Inv10AdaptersRootNoOverlap


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#inv10adaptersrootnooverlap) — AdaptersRoot 互不重叠：opencode→.opencode/skills/；claude→.claude/skills/；agents→.agents/skills/。

### Inv10DeleteRequiresNoRefs


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#inv10deleterequiresnorefs) — Asset 删除（`oxn asset delete X --force`）：仅当无任何引用 + 业务团队同意才能硬删；否则 → IAP_ASSET_HAS_REFS（YIELD_TO_HUMAN）。

### Inv10DevCanRefRfcDrafts


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#inv10devcanrefrfcdrafts) — dev/ 可引用 RFC + sprint 设计稿（v0.3.0 起）——Roadmap（dev/versions/）与 PlanningPool（dev/pool/）作为前瞻性规划，可引用 .openxenon/drafts/rfc/ + .openxenon/drafts/sprint/ 作为探索稿溯源。check-doc-boundary.ts `dev-allow-rfc-ref` 规则允许此引用模式。

### Inv10DraftTargetGoalPairV050


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#inv10drafttargetgoalpairv050) — v0.5.0（D2 2026-08-07）起：`oxn draft promote --target=goal --goal-slug=&lt;slug&gt;` 把 Draft 升华为 Goal。

### Inv10V0MigrateRequired


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#inv10v0migraterequired) — V0 布局必须先 oxn work migrate 才能走 V1 路径；V0 直接 run → IAP_ALIGN_V0_LEGACY_BLOCKED。

### Inv11ConfigTwoLayer


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#inv11configtwolayer) — OxnConfig（.oxnrc，git tracked）只存 leaderMode；ProjectConfig（.openxenon/.config，git ignored）存 mode/locale/debug/tools 等。

### Inv11DraftTargetWorkRejectedV050D3


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#inv11drafttargetworkrejectedv050d3) — v0.6.0（D3 2026-08-07）起：`oxn draft promote --target=work` 全部拒收（CLI + Engine 双层）。

### Inv11IntentPoolV3Retired


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#inv11intentpoolv3retired) — Intent Pool v3 退役——5 池机制（research/design/issue/audit/journal）吸收进 Draft（origin=human， Insight 删除）。

### Inv11MigratedV0Preserve


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#inv11migratedv0preserve) — MigratedV0Dir 保留 V0 备份供审计；OXN 不自动清，工程师手动清理（避免误删导致不可恢复）。

### Inv11PhysicalLocation


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#inv11physicallocation) — Asset 物理位置 v0.6 默认：.openxenon/assets/{kind}/X.md；v0.5 fallback：.openxenon/{kind}/X.md（保留兼容但新项目不再使用）。

### Inv12DrafttypeStrictLockV060D46


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#inv12drafttypestrictlockv060d46) — v0.6.0（§4.6 2026-08-07）起：`oxn draft create --prefix &lt;X&gt;` 严格锁 3 类——`report` / `issue` / `design`。

### Inv12GoalVersionRename


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#inv12goalversionrename) — v0.6.0（D5+ 2026-08-07）起：Goal / Version 概念正名——

### Inv12KebabCommand


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#inv12kebabcommand) — 命令名 kebab-case（与 Skill ID 命名一致）；OXN 不强制 PascalCase / kebab-case 风格，只强制声明 vs 文件规范化后一致（跨平台一致性保障）。

### Inv12NamingConvention


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#inv12namingconvention) — Asset 命名规范：domain PascalCase（MemberContext）；blueprint / stack / assetmap kebab-case（dev-workflow）。

### Inv12RefFailFast


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#inv12reffailfast) — Work 引用 Asset 用 domain X ref @prj/{dir}/{name}；@prj 寻址必须实际存在（CLI 加载期 fail-fast）。

### Inv13BranchModelMainDevFeatGoal


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#inv13branchmodelmaindevfeatgoal) — v0.6.0（§4.7 2026-08-07）起：分支模型三层——

### Inv13MonthlyCleanupCycleV060D46


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#inv13monthlycleanupcyclev060d46) — v0.6.0（§4.6 2026-08-07）起：每月 1 号自动归档 inactive drafts。

### Inv13NameFileConsistency


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#inv13namefileconsistency) — Asset 名称规范化：toKebab(declared) === toKebab(file_stem)；不一致 → IAP_INTENT_NAME_FILE_MISMATCH（YIELD_TO_HUMAN）。

### Inv13OxnConfigPackage


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#inv13oxnconfigpackage) — CLI 顶层统一走 `oxn-config` 包；不允许直接读 .oxnrc 字符串拼接。

### Inv13TaskPartSlotAlign


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#inv13taskpartslotalign) — Task 内 Part 名必须对齐 Blueprint Slot 名；不对齐 → work run 时找不到对齐目标（DEP_NOT_FOUND）。

### Inv13TraceAppendOnly


- [oxn-probe-domain](/openxenon/assets/domains/oxn-probe-domain.md#inv13traceappendonly) — Trace（work-trace.jsonl）只能追加写、不能重写；append-only 约束；Trace-before-State。

### Inv14AdrAcceptedLandingRequired


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#inv14adracceptedlandingrequired) — ADR Accepted 必须配套 filesystem 落地清单 + pre-commit 强制校验——ADR 接受（`Status: Accepted`）时**必须**在 frontmatter 结构化声明 filesystem 落地清单（`landing-files:`），并经 pre-commit 强制校验。落地不全 → 阻止 ADR Accepted。

### Inv14CliViaEngineBarrel


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#inv14cliviaenginebarrel) — CLI 必须通过 packages/engine barrel 消费 Engine 公共 API，严禁 import `@openxenon/engine/src/...` 穿透（从 oxn-engine-domain.inv-4 前半承接）。

### Inv14DuplicateNameConflict


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#inv14duplicatenameconflict) — 重复创建同 name 资产 → OXN_ASSET_EXISTS（PATH_CONFLICT）；--force 覆盖；不静默合并。

### Inv14PromoteRouterSingleEntry


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#inv14promoteroutersingleentry) — 禁止绕过：CLI 不允许直接 `oxn work create --blueprint promote-target-aware-workflow` 跳 router。

### Inv14TaskDagNoCycles


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#inv14taskdagnocycles) — Work 内 task DAG 必须无环（Kahn's algorithm 校验）；有环 → IAP_INTENT_DAG_CYCLE（YIELD_TO_HUMAN，含 cycleHint）。

### Inv15AssetKindNotShortcut


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#inv15assetkindnotshortcut) — --asset-kind 走标准 Work 流程（不是短路）；oxn asset create 是 alias（内部调 oxn work create --asset-kind）。

### Inv15CliDaemonSocket


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#inv15clidaemonsocket) — cli↔daemon 仅走 unix socket + JSON payload；payload schema 唯一权威由 Engine 包提供；cli 必须 import 共享类型，不得自造（从 oxn-engine-domain.inv-8 承接）。

### Inv15DevGuideInterface


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#inv15devguideinterface) — root `dev/` 与 `docs/dev/zh-cn/` 是**两个独立入口**，不可互替——

### Inv15KindIsolationInReferences


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#inv15kindisolationinreferences) — 解析优先级（PR-D 强化）：(1) bare name → 强制 parent kind 推断；(2) `@md/{kind}/{name}` → 显式 kind + name（deprecated）；(3) 跨 kind → 必须通过 Blueprint `## Use` 段。

### Inv15Promote4StagesNoSkip


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#inv15promote4stagesnoskip) — 禁止短路：例如 validate-skeleton 失败后不允许直接 dispatch。

### Inv16CliDomainUnidirectionalRef


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#inv16clidomainunidirectionalref) — 本域与 oxn-domain 单向引用：CLI 子域补父域未说的部分，重名 term（OXN CLI）不重定义；错误类型术语归 Engine 域，本域 references 含 oxn-engine-domain 用于消费侧 TopCatch / ExitCode 映射引用；不向下引用 oxn-asset-domain。

### Inv16CliRequiredArgs


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#inv16clirequiredargs) — oxn work run --work-file 必填；oxn work submit --work-name + --task 必填；少参数 → OXN_CLI_INPUT_ERROR。

### Inv16RefsBudgetLimit


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#inv16refsbudgetlimit) — Asset references 数量预算 N=5：单一节点 fan-out 上限（防依赖地狱）；超过触发 IAP_INTENT_REFS_BUDGET_EXCEEDED（v0.6.2+ soft-warn）；Roadmap scene.links 不受此限。

### Inv16SkeletonAsset1To1


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#inv16skeletonasset1to1) — 校验时机：draft-skeleton-fork Workflow 调 fork-template slot 后，对照 AssetKind 编译器要求（如 Domain 编译要求 `## Terms` H2 段）。

### Inv17LeafAssetLegitimacy


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#inv17leafassetlegitimacy) — Leaf Asset legitimacy：Asset.references=[] 是合法 leaf 节点；叶子 Asset 可被 Work/Task/Roadmap 引用，不要求必须有引用方；僵尸判断由 Roadmap 是否引用 + citations==0 + 创建后未使用 共同决定。

### Inv17NoCreateNewAlias


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#inv17nocreatenewalias) — oxn work new 已在 v1.0 移除；CLI 拒绝 unknown command 'new'（不能是别名）；统一用 oxn work create。

### Inv17PromoteSourceDraftUnchanged


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#inv17promotesourcedraftunchanged) — 工程师决定是否 archive / discard（oxn draft archive / discard 命令）。

### Inv18RetargetExplicit


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#inv18retargetexplicit) — 不允许直接编辑 frontmatter 改 promote-target（避免绕过 router 的 fork-missing 阶段）。

### Inv18TemplateIsEngineSsot


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#inv18templateisenginessot) — Asset 模板（assets/{kind}.md）是 OXN Engine 的 SSOT；CLI 创建时复用模板；禁止 in-place 改模板（改动必须走 PR）。

### Inv19CitationsAutoIncrement


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#inv19citationsautoincrement) — Asset 引用方（Work/Task/Asset）变更后，引用目标 citations 字段自动 +1；不需手工改。

### Inv19PromoteDraftGoalV020


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#inv19promotedraftgoalv020) — 强约束 1：`oxn draft promote --target=goal --goal-slug=&lt;slug&gt;` 必须同时带 `--goal-slug`

### Inv1BuiltinProbeTypes


- [oxn-probe-domain](/openxenon/assets/domains/oxn-probe-domain.md#inv1builtinprobetypes) — Builtin 探针类型必须是 fs_exists / fs_not_exists / fs_match / shell_exec 之一（v0.1 范围）。

### Inv1CliDecomposition


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#inv1clidecomposition) — OXN CLI = 命令解析（Command/SubCommand/Arg）+ 错误消费（TopCatch 4 档分流 / ExitCode）+ I18n + Skill 分发 + Config 加载；任何 CLI 行为必须可拆解到这些子模块。

### Inv1Doc3Modalities


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#inv1doc3modalities) — 文档三情态严格分离——Asset（定义性，回答"是什么"）+ RFC（规定性，回答"为什么决定"）+ Doc（描述性，回答"怎么用"），三者各居其位，互不依赖。三情态全集中的任意两情态组合是设计错误信号。

### Inv1DraftIsDescriptiveModality


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#inv1draftisdescriptivemodality) — Draft = 描述性情态（Descriptive Modality）的前置状态——未提升前不参与版本控制、不参与跨层引用、不被 Work / Asset 消费。

### Inv1IAPPhasesNoSkip


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#inv1iapphasesnoskip) — 生命周期顺序不可跳：create → run → submit；违反 → IAPError 拒绝。

### Inv1KindWhitelist


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#inv1kindwhitelist) — 5 AssetKind 白名单不可混用（domain ≠ workflow ≠ stack ≠ blueprint ≠ assetmap）；H2 分类严格隔离；混用 → E_MD_CATEGORY_UNKNOWN。

### Inv1LayerVsPhase


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#inv1layervsphase) — L0-L3 与 P0-P3 是两个正交概念：L0-L3 描述代码分层，P0-P3 描述产品路线图。

### Inv20NotMixedWithWork


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#inv20notmixedwithwork) — Asset 不与 Work 混用：同一 .openxenon/ 目录下 Asset（.md）与 Work（.md）互不引用；Asset 通过 @prj 寻址被 Work 引用。

### Inv20PromoteTargetWorkDeprecatedV030


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#inv20promotetargetworkdeprecatedv030) — 拒收时机：

### Inv20WorkPrecheckOnlyThisWork


- [oxn-probe-domain](/openxenon/assets/domains/oxn-probe-domain.md#inv20workprecheckonlythiswork) — workPrecheck 仅阻断该 Work（其他 Work 不受影响）。

### Inv21AiAssetViaDraft


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#inv21aiassetviadraft) — AI 自建 Asset 必须走 Draft → Promote 路径——先 `oxn draft create` 建描述性工作稿，工程师审核后通过 `oxn work create --type asset` 走 IAP 闭环升格为正式 Asset。AI 不能直接建 Asset。Draft 是 Asset 的前置状态（描述性情态），与 Asset（定义性情态）情态分离。

### Inv21RunAllowRerunPending


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#inv21runallowrerunpending) — oxn work run 行为变更：state.status=pending/running 时允许重新调用（re-run 自动重置 deviated/running task → pending，completed 保留）；state.status ∈ {completed, deviated, error}（已 submit）时拒绝，报 OXN_WORK_ALREADY_FINALIZED。

### Inv22ArtifactInSandbox


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#inv22artifactinsandbox) — Artifact 路径必须落在 Work 沙盒内或宿主项目目录。

### Inv22AssetExposesProbeContractNotImpl


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#inv22assetexposesprobecontractnotimpl) — Asset 暴露 Probe 调用契约（有哪些、怎么调用）**不破坏确定性**——确定性根基是 Probe 执行代码不可变（OXN 构建产物，AI 无法修改）。Asset 暴露调用契约 ≠ 代码修改；参数化（stackTools）改变观测行为不改变执行代码。「验证标准 AI 不可见」是软对抗（提高针对性绕过成本）非确定性根基。

### Inv22ProbeFromBlueprint


- [oxn-probe-domain](/openxenon/assets/domains/oxn-probe-domain.md#inv22probefromblueprint) — Probe 标准必须来自 Blueprint 的 observe 数组，不能由运行时追加。

### Inv23ProbePassImpliesFixed


- [oxn-probe-domain](/openxenon/assets/domains/oxn-probe-domain.md#inv23probepassimpliesfixed) — 单向 Blueprint 修复语义——ProbeOutcome=COMPLETED 即意味着该 Boundary 的目标已满足 = fixed，无需显式"fixed" 状态。DEVIATED → 工程师读 Report → 开**新 Work**（同一 Blueprint 或调整后）—— 非 Blueprint retry，非自动 loop（D6，）。

### Inv23ProjectBootstrap5Assets


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#inv23projectbootstrap5assets) — 项目消费者 onboarding 必须 bootstrap 5 起手 Asset（Domain + Workflow + Stack + Blueprint + AssetMap）。缺任一 → `oxn asset check` 报错；Missing 状态下不可进入完整 IAP。5 起手 Asset 物理位置：src/builtin/projects/starter/（@oxn/ 层）；通过 `oxn onboard --new` 复制到 @prj/ 层（`&lt;project&gt;/.openxenon/assets/`）。5 Asset 命名：doc-md-domain / md-author-workflow / md-stack / md-author-blueprint / md-system。替代旧"6 Asset 下限"（含 Roadmap/AssetMap）。边界：OXN 自身 bootstrap 仍走自举豁免（src/builtin/），**不**受本 inv 约束。

### Inv23TraceAppendOnly


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#inv23traceappendonly) — work-trace.jsonl 只能追加写，不能重写。SUBMIT / ASSET_DRIFT（RFC-0033 D3/D4）也是 append-only。

### Inv24ProbeCodeImmutability


- [oxn-probe-domain](/openxenon/assets/domains/oxn-probe-domain.md#inv24probecodeimmutability) — Probe 执行代码不可变是确定性根基——OXN 构建产物（其他项目消费构建后的 OXN，无法修改代码）。Asset 暴露 Probe 调用契约不破坏确定性；Probe 执行可由 Asset 派生参数（stackTools）参数化——参数化改变观测行为不改变代码。

### Inv24ProbeFromBlueprint


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#inv24probefromblueprint) — Probe 标准必须来自 Blueprint 的 observe 数组（Intent 阶段），不能由 Align 阶段运行时追加。

### Inv24StarterAssetReadonly


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#inv24starterassetreadonly) — 5 起手 Asset 在 src/builtin/projects/starter/ 路径下为只读（chmod 0o444）；工程师不直接修改源模板，调整通过 `oxn onboard --existing --bootstrap` 派生项目专属 Asset。避免模板污染；类比自举豁免。

### Inv25BlueprintScopeDeclarative


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#inv25blueprintscopedeclarative) — Blueprint `## Scope` 段声明 allow/forbid 文件 glob（静态锁定，PlanLock 保护）：allow 为允许修改的文件路径 glob 列表，缺省工程根全树（`**`）；forbid 为禁止修改的文件路径 glob 列表，缺省空列表；与 Blueprint `## Use` 引用机制正交（Use = Asset 引用；Scope = 文件边界）；不新增 Probe；lock 时由 inv-35 (artifacts-within-scope) 校验 Task ArtifactDeclaration ⊆ Scope。

### Inv25DomainBlueprintIsolated


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#inv25domainblueprintisolated) — Domain 与 Blueprint 必须在不同文件、互不引用：业务 Intent 不知道技术 Intent，技术 Intent 不知道业务 Intent。

### Inv26BlueprintContextTemplateOptional


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#inv26blueprintcontexttemplateoptional) — Blueprint `## Context Template` 段可选：缺省 Engine 用内置默认模板（基于 Use refs + Boundaries + Goal 推导）；Blueprint 可覆写默认（如 bug-fix-blueprint 在 diagnose 段加"证据落盘"指令）。Blueprint 不复制 Asset 内容 —— 只声明"去哪取什么"（与 inv-26 域/蓝图隔离原则一致）；AI Agent 按 Goal 自己判断从引用的 Domain 取哪些 Terms/Invariants。

### Inv26NoUpstreamNoDownstream


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#inv26noupstreamnodownstream) — 没有上游对象就不允许产生下游对象：没有 Domain 时 Blueprint 不许使用未定义的 term。

### Inv26Probe5LayerNaming


- [oxn-probe-domain](/openxenon/assets/domains/oxn-probe-domain.md#inv26probe5layernaming) — Probe 的 5 层名：`probeName` = 本体名（catalog 注册名）；`useName` = 业务场景名（key 字符集 `^[a-zA-Z0-9-]+$`）；`ref` = scope + 本体名（`@oxn/probes/&lt;probeName&gt;`）；`probeType` = runtime 派发键（snake_case）；file = 实现文件（`packages/engine/src/infra/probes/&lt;probeName&gt;.ts`）。5 层不可省略、不可互换。

### Inv27OperateSubsetStackOperations


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#inv27operatesubsetstackoperations) — Blueprint slot.operate 里的每个 name 必须在 Blueprint 引用的 Stack tool.operations 中可解析：lock 期 work-validator 对每个 slot.operate[] 项跑 (name → Stack tool.operations[name]) 校验；不可解析 → IAP_INTENT_OPERATION_NOT_FOUND（YIELD_TO_HUMAN），列出缺失 name + 引用的 Stack 名；校验范围：Blueprint.use.stack[] 引用的所有 Stack 文件 union。

### Inv27OutcomeProbeOnly


- [oxn-probe-domain](/openxenon/assets/domains/oxn-probe-domain.md#inv27outcomeprobeonly) — `outcome` 字段是 Probe 内验证结果专用；per-probe `outcome` 字段位置 `probes[&lt;useName&gt;].outcome`。

### Inv27UpstreamFrozenThenDownstream


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#inv27upstreamfrozenthendownstream) — 上游冻结后下游才能展开：Blueprint 未通过 oxn blueprint validate → Work 不许实例化。

### Inv28OperationDisambiguation


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#inv28operationdisambiguation) — Blueprint 引用的 Stack 集合内，若两个 tool 声明同名 operation（同一 operation.name 出现在不同 tool.operations 下），lock 期报 IAP_INTENT_OPERATION_AMBIGUOUS（YIELD_TO_HUMAN），列出冲突 tool 名 + operation 名。修复方式：operate 项使用 tool:operation 限定名（如 `bun-test:test`），Engine 解析时按限定名直接定位。operation 名在 Stack 集合内默认要求唯一（不限定名场景）；Blueprint 引用多 Stack 时跨 Stack 同名 operation 也触发此校验。

### Inv28TaskNoReverseBlueprint


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#inv28tasknoreverseblueprint) — Task 执行结果不能反改 Blueprint 声明（真相解释权单向，不允许对齐结果回灌意图）。

### Inv293StateSpellingLayered


- [oxn-probe-domain](/openxenon/assets/domains/oxn-probe-domain.md#inv293statespellinglayered) — Probe 验证的 3 态拼写分层（human canonical `.md` lowercase / machine SSOT JSON uppercase -ED / Kernel ProbeOutcome TS union uppercase 无 -ED）是设计；禁止在边界外互换。

### Inv29StructureV2Shape


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#inv29structurev2shape) — Asset 正文统一为 `## Group → ### Axiom → - Theorem` 三层结构；Blueprint 特例 `## Use <Asset Type> + ## Slot + 顶层 ### Scope / ### Context Template`。形态 A（Axiom + Theorem）/ 形态 B（纯 Axiom）/ 形态 C（纯 Theorem）均合法。守门脚本 `bun scripts/check-asset-structure.ts` 接入 pre-commit。

### Inv2AssetModeRequiresKind


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#inv2assetmoderequireskind) — `--type asset` 必填 `--asset-kind X`；5 AssetKind 之外的值 → OXN_INVALID_ASSET_KIND（CLI 加载期拒绝）。

### Inv2BuiltinVersionMonotonic


- [oxn-probe-domain](/openxenon/assets/domains/oxn-probe-domain.md#inv2builtinversionmonotonic) — Builtin 资产版本（_version）单调递增，不可降级。

### Inv2DomainContextMap


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#inv2domaincontextmap) — Domain 实体（用户业务域）与 L0-L3 宪法（OXN 元域）通过 ContextMap 显式连接，不可互相包含。

### Inv2DraftNoProbe


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#inv2draftnoprobe) — OXN 不执行 Draft 创建逻辑业务——CLI 调 Engine → Infra Module（fs.writeFileSync 或 fork skeleton 后 writeFileSync），无 Probe 验证。

### Inv2ExitCodes


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#inv2exitcodes) — 进程退出码：0=成功 / 1=IAPError 或 CliInputError / 2=OXNCrash 或未知异常；二轨不混：IAPError 走 stdout JSON，OXNCrash 走 stderr stack。

### Inv2RfcSotDecisionLayer


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#inv2rfcsotdecisionlayer) — **RFC/ADR = 规定性决策记录层（why）**——回答"为什么决定 X"的文档；住 `docs/rfc/zh-cn/RFC-XXXX-&lt;theme&gt;.md`；frozen + errata 演进策略；中文 only。

### Inv30ChannelOnlyTracking


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#inv30channelonlytracking) — Work 追踪只覆盖 OXN 通道内行为（state.json + trace.jsonl 记录状态机事件），不记录 AI Agent 在通道外的行为（读代码、试方案、放弃、推理过程）。通道外 = OXN 边界外，OXN 不强制 AI 留在通道内。通道内追踪是协作边界的**特征**（非缺陷）——chat 提供推理可见性（临时），Work 提供证据持久性（持久），两者信息源不交叉是设计选择。

### Inv30ReferencesSyntaxCanonical


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#inv30referencessyntaxcanonical) — 解析边界固定在 `extractReferences()` + `resolveReference()`（`packages/engine/src/Asset/internal/reference-checker.ts`）；reverse index key 用 `${kind}::${name}` 形式归一化（消除 false negative）。

### Inv34ArtifactsWithinScope


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#inv34artifactswithinscope) — Task ArtifactDeclaration ⊆ Blueprint Scope.allow AND ∩ Scope.forbid = ∅：run 时 Engine 对每个 Task ## Artifacts 段中每个 path 跑 glob 校验；违反 → IAP_INTENT_SCOPE_VIOLATION (YIELD_TO_HUMAN)，列出违规 path + Scope 段。Scope 段不存在时，allow 默认为工程根全树（`**`），forbid 为空（向后兼容）。

### Inv35OperateIsReferenceNotGate


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#inv35operateisreferencenotgate) — operate 声明 AI Agent 的执行参照，**不是**强制门禁。OXN 不验证 AI 是否实际运行了 operate 中的命令（通道外行为不可追踪，inv-30 channel-only-tracking）—— 验证由 observe Probe 独立承担（AI 经 CLI 跑 Probe，ProbeOutcome 记 Work trace，D27）。operate 与 observe 正交：同一命令 AI 跑一遍 + Probe 跑一遍的冗余是设计特征（AI 跑是工作流先自检，Probe 跑是工具能力检查），非缺陷。与「OXN 不判质量只记事实」一致：OXN 不评判 AI 是否遵循 operate，只记录 Probe 验证结果。

### Inv3AssetModeSkipTaskDag


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#inv3assetmodeskiptaskdag) — Asset 模式（--type asset）不走 task DAG；不写 .work / .run；只写 .openxenon/assets/{kind}/{name}.md + planLock。

### Inv3BuiltinAssetTwoLayer


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#inv3builtinassettwolayer) — Built-in Asset 两层覆盖——`@oxn/` scope fallback（编译时内置）+ `@prj/` scope override（项目资产），后者优先。Phase 4 收窄为 probes + blueprints（D18）。

### Inv3BuiltinNoPrjDep


- [oxn-probe-domain](/openxenon/assets/domains/oxn-probe-domain.md#inv3builtinnoprjdep) — Builtin 资产不依赖任何 @prj 资产（避免循环引用）。

### Inv3DraftDirIsolation


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#inv3draftdirisolation) — Draft 文件夹隔离——`.openxenon/drafts/` 是边界内的本地暂存区，不对外发布，不被远程同步。

### Inv3KernelInfraSeparation


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#inv3kernelinfraseparation) — Kernel 与 Infra 司法/行政分离：Kernel 验证 ProbeOutcome（COMPLETED/DEVIATED/INCONCLUSIVE）；Infra 只回答事实不做判定；Kernel 不能直接执行 Task；Infra 不能绕过 Daemon 自己宣布 Work 完成。Kernel 全面禁用 fs/net/child_process/process.env/process.std*/EventEmitter。Kernel 不做"整体合格/失败"聚合判定。

### Inv3TopCatchShunt


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#inv3topcatchshunt) — TopCatch 4 档分流：IAPError / OXNCrash / CliInputError / Crash 兜底；Crash 兜底绝不暴露给 AI（属于 OXNCrash 语义）。

### Inv4BootstrapSeedExemption


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#inv4bootstrapseedexemption) — 自举种子豁免仅限 src/builtin/——项目 `.openxenon/assets/` 资产变更必须经 Work 流转；src/builtin/ 内置资产可手动创建（bootstrap）。两者边界清晰。

### Inv4DraftIndependentOfAssetLifecycle


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#inv4draftindependentofassetlifecycle) — Draft 创建不依赖 Asset Lifecycle——CLI 直接调 engine.createDraft，无 asset.create 中间层。

### Inv4IAPErrorActionYield


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#inv4iaperroractionyield) — IAPError 的 action 字段 v1.0.2 后仅 YIELD_TO_HUMAN 一种（AI 不能自己改，必须叫人）。

### Inv4KernelZeroIo


- [oxn-probe-domain](/openxenon/assets/domains/oxn-probe-domain.md#inv4kernelzeroio) — Kernel 永远不触碰物理世界：不调用 fs.existsSync / 任何 IO（fs.* / net.* / child_process 一律不出现）。

### Inv4MonorepoBoundary


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#inv4monorepoboundary) — Monorepo 包边界：packages/cli 不能 import packages/engine 内部模块，仅走 packages/engine 公共 API；packages/engine 不能 import packages/cli（engine 是被依赖方）。

### Inv4PaperFieldsRequired


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#inv4paperfieldsrequired) — Asset 论文结构 3 字段必填：abstract + references + citations 缺一不可；缺失 → IAP_INTENT_ASSET_INCOMPLETE。

### Inv5DagNoCycles


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#inv5dagnocycles) — Asset 引用 DAG 无环：AssetA.references 含 AssetB + AssetB.references 含 AssetA → IAP_INTENT_DAG_CYCLE（含 cycleHint）。

### Inv5DraftSkeletonRecommended


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#inv5draftskeletonrecommended) — Draft skeleton 推荐派生——`oxn draft create --target X` 模式推荐从 `.openxenon/draft-skeletons/&lt;target&gt;[-&lt;kind&gt;].md` 派生骨架，但不强制（v0.6.3 Q3 放开）。

### Inv5InfraNoVerdict


- [oxn-probe-domain](/openxenon/assets/domains/oxn-probe-domain.md#inv5infranoverdict) — Infra 只回答事实，不做判定：Infra 不能宣布 COMPLETED / DEVIATED（不能给自己盖章）。

### Inv5JsonForAi


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#inv5jsonforai) — AI 调用必须传 --json；CLI 默认 human 模式走 t() 翻译；human 模式禁止硬编码英文/中文（biome lint 拒绝）。

### Inv5ProjectDomainUnidirectional


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#inv5projectdomainunidirectional) — 本域单向引用父域 oxn-domain——本域补父域未说的部分（项目工程元词汇）；不向下引用其他子域（oxn-engine-domain/oxn-asset-domain 等只作为术语引用，不作为 references 字段直接依赖）。

### Inv5RunBeforeSubmit


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#inv5runbeforesubmit) — run 成功后才能 submit：缺 .run/state.json → IAP_ALIGN_WORK_NOT_RUNNING (YIELD_TO_HUMAN)。

### Inv6DefaultLocale


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#inv6defaultlocale) — DEFAULT_LOCALE = 'zh-CN' 是唯一权威兜底；CLI / Skill / 文档站点全用此值；en locale 已废弃（不允许独立维护）。

### Inv6DraftPromoteSingleEntry


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#inv6draftpromotesingleentry) — Draft Promote 路由单一入口——所有 target 路由都通过 draft-promote-router Blueprint，不允许 CLI 直接拼装 Work。

### Inv6EngineDomainUnidirectionalRef


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#inv6enginedomainunidirectionalref) — 本域与 oxn-domain 单向引用：Engine 子域补父域未说的部分，重名 term（OXN Engine）不重定义；不向下引用 oxn-cli-domain/oxn-asset-domain。

### Inv6InfraNoSelfDone


- [oxn-probe-domain](/openxenon/assets/domains/oxn-probe-domain.md#inv6infranoselfdone) — Infra 不能自己宣布 Work 完成（行政不能给自己盖章）。

### Inv6Meta4Layer


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#inv6meta4layer) — 项目工程元层 4 类文档各居其位（v0.3.0 起；v0.4.0 D5+ 调整；v0.7.0 撤销 CONTEXT-MAP.md）——README.md / AGENTS.md / .changes/ / dev/{fix,pool}/ 各自有 RFC 锁定引用规则，互不混用。

### Inv6NoSelfReference


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#inv6noselfreference) — Asset 不能引用自己（v0.6.3+ hard-block）：Asset.references 含自身 → IAP_INTENT_SELF_REFERENCE。

### Inv7EngineRootDomain


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#inv7enginerootdomain) — 本 Domain 定义 OpenXenon 引擎层词汇边界。

### Inv7LocaleResolvePriority


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#inv7localeresolvepriority) — resolveLocale 优先级：--locale flag > config.locale > LANG env > DEFAULT ('zh-CN')。

### Inv7PlanLockHashStrict


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#inv7planlockhashstrict) — Asset 创建后 planLock 强校验 fileHash；漂移触发 IAP_ALIGN_LOCK_HASH_MISMATCH（与 Work planLock 4 组件 hash 等效）。

### Inv7SkeletonIndependentEntity


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#inv7skeletonindependententity) — Skeleton 独立 entity——`.openxenon/draft-skeletons/` 下的 7 个模板文件 frontmatter `entity: skeleton`，不与任何 AssetKind 混淆（v0.6.3 Q1 锁定）。

### Inv8EvolveCreatesNewVersion


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#inv8evolvecreatesnewversion) — Asset 演进（--evolve-from）创建新版本，旧版 planLock 自动失效。

### Inv8KernelNoDirectTask


- [oxn-probe-domain](/openxenon/assets/domains/oxn-probe-domain.md#inv8kernelnodirecttask) — Kernel 不能直接执行 Task（立法不能行政）。

### Inv8OriginIdentifiesProducerV040


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#inv8originidentifiesproducerv040) — v0.7+ Insight 删除后：Draft frontmatter `origin: human`（唯一值）。

### Inv8ReadmeIntroductionSloganSync


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#inv8readmeintroductionslogansync) — README.md 与 docs/product/zh-cn/introduction.md slogan 双向同步（v0.6.2-alpha.2 锁定）—— README.md 是仓库根入口（含 GitHub 渲染），introduction.md 是 VitePress 产品入口。两者 slogan 一致；v0.6.2-alpha.2 同时替换 13 个文件（CONTEXT-MAP + README + docs/ + glossary/）。

### Inv8SkillSsotFromCli


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#inv8skillssotfromcli) — Skill SSOT 唯一来源由 CLI 包提供；不允许手写英文 Skill 字典（CLI init 时自动从 zh-CN 镜像）。

### Inv9ArchivePreservesCitations


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#inv9archivepreservescitations) — Asset 归档（`oxn asset archive X --reason Y`）：文件 mv 到 .openxenon/.archived/{kind}/X.md；citations 保留；planLock 仍可查询（只读）。

### Inv9AssetKindViaWork


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#inv9assetkindviawork) — --asset-kind X 走标准 Work 流程（Phase C）：选 asset-create workflow + 4 task 骨架；不再是短路。

### Inv9ChangesCanRefRfcAdr


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#inv9changescanrefrfcadr) — .changes/ 可引用 RFC + ADR 追溯当前版本包含内容（v0.3.0 起）—— Version Fragment 在版本转正时落盘，可引用 docs/adrs/ 与 docs/rfc/zh-cn/ 标记交付。check-doc-boundary.ts `changes-allow-rfc-ref` 规则允许此引用模式。

### Inv9DraftListFilterByOriginV040


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#inv9draftlistfilterbyoriginv040) — `oxn draft list --origin=human` 按 producer 过滤；无 origin= 列出全部（向后兼容）。

### Inv9InitCompilesThreeAdapters


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#inv9initcompilesthreeadapters) — oxn init 默认同时把同一份 SSOT Skill 编译到 3 套 AdaptersRoot（opencode/claude/agents）；compileAllSkills(toolIds, ...) 是入口。

### Inv9ProbeDeviationNotifiesNotBlocks


- [oxn-probe-domain](/openxenon/assets/domains/oxn-probe-domain.md#inv9probedeviationnotifiesnotblocks) — ProbeOutcome DEVIATED 时不阻断 Work；OXN 不阻断，只记录结果到 Work trace（D27，）。

### Kernel


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#kernel) — L0 纯逻辑验证模块（记录事实不评判）：零 IO 约束，只接受 Infra 观测产出 ProbeOutcome，不调 fs/net/child_process。

### kind-isolation


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#kind-isolation) — references 仅同 AssetKind 原则；跨 kind 组合由 Blueprint 承担，跨 kind 导航由 Roadmap scene.links 承担。

### LeafByDesignEngineIRAtomicity


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#leafbydesignengineiratomicity) — 根因 1：Engine IR atomicity——`classifyAxiom()` 把 Axiom 内容归并到 `DomainTerm / DomainBan / DomainInvariant / DomainStackEntry` 4 个 atomic 字段，无 SubTheorem 容器；sub-bullet 被 Engine 丢弃（`packages/engine/src/oxl/md-pipeline/transformers/domain.ts:74-141`）。

### LeafByDesignKnowledgeJudgment


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#leafbydesignknowledgejudgment) — 根因 3：知识判断隔离——定理依赖属"知识判断"，OXN 立法不管，归工程师 + AI 自然语言推理。

### LeafByDesignReferentStability


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#leafbydesignreferentstability) — 根因 2：参照系稳定性——OXN 是确定性参照系，管结构稳定不管推理质量；嵌套 list 把"软推理"硬化为"硬层级"，污染 LLM 推理灵活性。

### Link


- [doc-md-domain](/openxenon/assets/domains/doc-md-domain.md#link) — glossary-ref: /openxenon/assets/domains/doc-md-domain.md#link

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


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#loop) — Work 核心动态过程；物质运动态；所有变化被 trace 记录（D13）。

## M-R

### MemoryMD


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#memorymd) — Work 级动态记忆文件（works/&lt;id&gt;/memory.md，Phase 2 实现）；Loop History + Key Observations + Round Notes；不纳入 PlanLock；append-only 追加；原 context.md 实体名改为 memory.md。

### MetaModality


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#metamodality) — 项目工程元情态——回答"OXN 自己怎么组织"的文档；住仓库根 + `dev/` + `.changes/`。包含 4 类项目工程文档（README.md / AGENTS.md / .changes/ / dev/）。**特例**：可与 Descriptive Modality 组合（README.md = marketing + 入口）。v0.7+ 撤销 CONTEXT-MAP.md Meta 层归属，Meta 层入口由 AGENTS.md §AI Agent 唯一入口段统一承担。

### Mini Shai-Hulud


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#mini-shai-hulud) — 本次事件的初始变种（keyv 家族第一代注入）；与完整 Shai-Hulud 区别：
Mini 通过直接 push 恶意文件到 main 分支 + 切新版本，载荷文件名为 Math_Symbol.js。
社区扩散后第二代变种改用 math_init.js，核心功能等价。

### MountValidate


- [DSHPresetMount](/openxenon/assets/domains/DSHPresetMount.md#mountvalidate) — 「让新 preset 在 DSH session 内可见 + 跑通最小 smoke test」的动作集合；包含 4 步：filesystem → restart → inspect → smoke。

### OnboardingPath


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#onboardingpath) — 项目消费者 onboarding 2 入口路径：`oxn onboard --new`（新项目入口）/ `oxn onboard --existing --bootstrap`（存量：AI 探索建 Asset）。入口探测：`oxn onboard --detect`（基于 package.json / compose.yaml / Cargo.toml / pyproject.toml 4 类信号）。Skill 入口：复用 `/oxn-work`，通过 Blueprint 区分场景。

### OnboardingStarter


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#onboardingstarter) — 项目消费者 onboarding 用的 5 个内置 Asset（doc-md-domain / md-author-workflow / md-stack / md-author-blueprint / md-system），物理位置 `src/builtin/projects/starter/`，走 `@oxn/` 公共层；通过 `oxn onboard --new` 复制到 `&lt;project&gt;/.openxenon/assets/`（@prj/ 层）。5 起手 Asset 是 onboarding 的最小可用集（替代旧 6 Asset 列表）。

### OpenXenon


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#openxenon) — 缩写：OXN

### OpenXenon Language


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#openxenon-language) — OpenXenon 的特定领域语言（DSL），基于 MD 格式 。

### OpenXenonThreePartyCollaboration


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#openxenonthreepartycollaboration) — 协作三方模型：工程师 = 发起方（Asset 管理）/ AI Agent = 发起方（Work 内自主工作回路）/ OXN Engine = 接收方（被动响应 CLI 请求，提供 Probe 工具能力 + 记录协作过程）。

### Operate


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#operate) — Blueprint slot 内执行参照数组（`## Boundaries ### &lt;slot&gt; - operate: [name...]`）；声明 AI Agent 在该 slot 应运行的 Operation 名列表。work-context-builder 在 lock 期解析 BlueprintIR.boundaries[].operate → 匹配 Blueprint 引用的 Stack tool.operations → 注入 WorkContextResult.slotOperations（只到 name，不注入完整 command）。AI Agent 从 Task context 看到 operation 名 → 从已注入的 stackTools 解析 command → 执行。

### Operation


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#operation) — Stack Tool 的命名调用声明（name + command template + desc），住进 Stack 文件 `## Tools ### &lt;tool&gt;` 下的 `operations` 子段。Blueprint slot 通过 `operate: [op-name...]` 数组引用 Operation 名；work-context-builder 在 lock 期解析为可消费快照注入 WorkContextResult，让 AI Agent 在 Task 内零推理拿到应运行的命令。

### OXL


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#oxl) — Engine 通过 unified 库实现 MD 语法的特性，包括编译、校验。

### OXN CLI


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#oxn-cli) — OpenXenon 交互入口之一。

### OXN Engine


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#oxn-engine) — OpenXenon 核心引擎。

### OXN_CLI


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#oxn-cli) — OpenXenon 交互入口之一。

### OXnConfig


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#oxnconfig) — OXN 配置文件层（OXnConfig / ProjectConfig 两层划分）。

### OXNCrash


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#oxncrash) — OXN 引擎自身 Bug 或底线被击穿的错误契约类。轨道 2，人类消费受众。

### OXNEngine


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#oxnengine) — OpenXenon 核心引擎；记录事实不评判合格；L0-L3 分层 + E1-E4 四结构实体实现。

### Part


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#part) — Task 内 skill 执行单元（skill_context + acceptance），内联在 task.md 内不可独立成文件。

### PerformanceMeasureNotEnforced


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#performancemeasurenotenforced) — PEAS P 故意外包给工程师——OXN 立法"彻底不判"，不做性能度量最大化。

### Phase


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#phase) — Work 生命周期阶段（create/run/submit 之一），按顺序不可跳。子步骤按阶段分别定义。

### PlanLock


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#planlock) — Asset 创建后强校验卡（与 Work planLock 等效），锁 fileHash + citations + DAG；漂移触发 IAP_ALIGN_LOCK_HASH_MISMATCH。

### PlanLockFiveHash


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#planlockfivehash) — v0.7+ 结构：`workMdHash + workContextHash + blueprintsHash + tasksHash + taskContextsHash → allHash`。

### Port


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#port) — 抽象接口契约（Kernel/Infra 边界 port）。

### PrescriptiveModality


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#prescriptivemodality) — 规定性情态——回答"为什么决定 X"的文档；住 `docs/rfc/zh-cn/RFC-XXXX-&lt;theme&gt;.md`（RFC 规范）；frozen + errata 演进；只引用 `docs/glossary/`（D5）；中文 only（D10）。

### Preset


- [DSHPresetMount](/openxenon/assets/domains/DSHPresetMount.md#preset) — DSH agent preset = `~/.dsh/.agent-presets/&lt;id&gt;/{preset.yml, agent.cordis.yml}` 目录；shipped preset 由部署自带，自定义 preset 由用户 fork 后置于 home 目录。

### Probe


- [oxn-probe-domain](/openxenon/assets/domains/oxn-probe-domain.md#probe) — (1) **builtin 探针**：`packages/engine/src/builtin/probes/*.ts`（Engine 内置实现）。
- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#probe) — 物理观测单元（prop 输入 + output 判定），内联在 part 内；标准必须来自 Blueprint observe 数组。

### ProbeName


- [oxn-probe-domain](/openxenon/assets/domains/oxn-probe-domain.md#probename) — Probe 本体名 = Probe 实体自己的名字（catalog 注册名）。从 `ref` 去除 `@oxn/probes/` 前缀派生（如 `ref: "@oxn/probes/fs-exists"` → `probeName: "fs-exists"`）。

### ProbeOutcome


- [oxn-probe-domain](/openxenon/assets/domains/oxn-probe-domain.md#probeoutcome) — Probe 验证结果三态：COMPLETED / DEVIATED / INCONCLUSIVE（D27，）。

### ProbeOutcomeThreeStates


- [oxn-probe-domain](/openxenon/assets/domains/oxn-probe-domain.md#probeoutcomethreestates) — 三态：COMPLETED / DEVIATED / INCONCLUSIVE。

### ProjectBootstrap


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#projectbootstrap) — 5 起手 Asset 复制到 `&lt;project&gt;/.openxenon/assets/` 并完成 `oxn asset check` 校验的过程。包含 3 步：(1) `oxn onboard --new` 触发复制；(2) 工程师填项目专属内容；(3) `oxn asset check` 验证 5 Asset 完整性。bootstrap 必走。

### ProjectRoot


- [doc-md-domain](/openxenon/assets/domains/doc-md-domain.md#projectroot) — glossary-ref: /openxenon/assets/domains/doc-md-domain.md#projectroot

### PromoteBoundaryIsolation


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#promoteboundaryisolation) — Draft promote 仅跨 3 类 Target 输出目录（docs/rfcs/zh-cn/ / .openxenon/assets/ / .openxenon/works/），不写其他目录

### PromoteCompanionAsset


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#promotecompanionasset) — draft-promote-router Blueprint（v0.6.2-alpha.3 新）：总路由 + 4 阶段生命周期。

### PromoteFutureExtension


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#promotefutureextension) — v0.6.2-alpha.3 落地 7 个 skeleton + 4 阶段 router + 3 target dispatch

### PromoteLifecycle


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#promotelifecycle) — gather：draft-promote-router 读 Draft frontmatter + body，校验 Draft 存在 + promote-target 字段不缺

### PromoteRoute


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#promoteroute) — promote-target=rfc → promote-target-aware-workflow Blueprint + rfc 分支（落盘 `docs/rfcs/zh-cn/RFC-XXXX-&lt;theme&gt;.md`）

### Provenance


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#provenance) — NPM 包构建来源证明 — 本事件中 GitHub Actions 签发的 provenance 未被伪造（攻击者控制了 maintainer GitHub 账号，
走的是正常 publish 流程 + 真实签名），所以 provenance 不能作为唯一信任门禁，必须配合 IOC + 版本黑名单双校验。

### RelativePath


- [doc-md-domain](/openxenon/assets/domains/doc-md-domain.md#relativepath) — glossary-ref: /openxenon/assets/domains/doc-md-domain.md#relativepath

### ReleaseVersion


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#releaseversion) — 通过 `npm install -g @istuen/openxenon@&lt;version&gt;` 从 registry 或本地 tarball 安装的 oxn；指向预编译 `dist/cli.js`；immutable；终端用户 + CI/CD 使用。配合 `scripts/oxn-switch.sh` 的 `pnpm oxn:prod` 操作。

### RFC


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#rfc) — OpenXenon 规范（规定性文档）；住 `docs/rfc/zh-cn/RFC-XXXX-&lt;theme&gt;.md`；frozen + errata 演进策略；顺序编号 + theme 字段；中文 only；只引用 `docs/glossary/`。替代旧 ADR + OXP 双层（v0.7 废除 OXP）。

### RoadmapDeprecated


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#roadmapdeprecated) — Roadmap 概念已退役（v0.4.0 / D5+ 2026-08-07）—— 设计稿 `.openxenon/drafts/design-version-iteration-redesign.md` §2.2 决策。

### Roster


- [DSHPresetMount](/openxenon/assets/domains/DSHPresetMount.md#roster) — DSH 进程启动时物化的 agent preset 名册（`agentPresets.list()` 返回的 `[{id, trust, path}]` 数组）；shipped preset 必出现，自定义 preset 仅在「进程启动时目录已存在」时才出现。

## S-Z

### SchemaFieldMapping


- [oxn-probe-domain](/openxenon/assets/domains/oxn-probe-domain.md#schemafieldmapping) — Probe 本体名 `probeName`（string）：从 `ref` 去除 `@oxn/probes/` 前缀派生。

### Scope


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#scope) — Blueprint 内文件范围声明段（## Scope）；allow/forbid glob 列表；静态锁定，PlanLock 保护；与 Blueprint ## Use 引用机制正交（Scope 是文件边界，Use 是 Asset 引用）。

### Section


- [doc-md-domain](/openxenon/assets/domains/doc-md-domain.md#section) — glossary-ref: /openxenon/assets/domains/doc-md-domain.md#section

### Shai-Hulud Worm


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#shai-hulud-worm) — 2026-08-04 起活跃的 NPM 蠕虫家族名（Aikido 命名）。特征：
通过 preinstall hook 在 install 阶段自动执行；下载 Bun runtime，
再用 Bun 跑 728 KB 混淆载荷（首次注入）或社区扩散变种，
盗取 npm/GitHub/AWS/K8s/Vault/Stripe/Slack 凭据 + 自我复制到其他包。

### Skeleton


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#skeleton) — per-target 模板文件的实体类型（v0.6.3 Q1 新增）。

### SkeletonForking


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#skeletonforking) — skeleton 派生规则：v0.6.2-alpha.3 起 Draft 创建时（`--target` 模式）从 `.openxenon/draft-skeletons/&lt;target&gt;[-&lt;kind&gt;].md` 派生（v0.6.3 Fix #1 移到 boundary 顶层）

### Skill


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#skill) — OXN 内置给 AI 助手的技能，用于AI 助手里通过 Skill 对 OpenXenon CLI 交互。

### Slot


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#slot) — Blueprint 内拓扑节点（slot DAG），Engine 校验无环；Task 内 Part 名必须对齐 slot 名。

### SlotFoldingRule


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#slotfoldingrule) — 4 通用 slot：`retrieve` / `design` / `develop` / `test`（v2 基础）。5 专用 slot：`cli-add` / `ts-implement` / `refactor` / `git-branch`（v0.6.4 PR-C 折入自原独立 Workflow）。

### SmokeWork


- [DSHPresetMount](/openxenon/assets/domains/DSHPresetMount.md#smokework) — 验证用最小 work 实例，调用 `oxn work create + validate + lock + run` 端到端；若 preset 实际挂载，AI 能跑通最小 work 流程。

### StandingKey


- [DSHPresetMount](/openxenon/assets/domains/DSHPresetMount.md#standingkey) — DSH process 物化后用于查询 preset 挂载状态的 inspector key；调用 `agentPresets.standingKeyFor(&lt;id&gt;)` 验证是否成功挂载。

### StarterAsset


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#starterasset) — `oxn init --starter` 拷贝到 `.openxenon/assets/` 的 Built-in Asset 副本；用户拥有可改。与 `@oxn/` fallback 两层覆盖（D8）。

### StructureV2


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#structurev2) — Asset 正文 v2 统一结构：`## Group → ### Axiom → - Theorem`；Blueprint 特例：`## Use <Asset Type> + ## Slot + 顶层 ### Scope / ### Context Template`。3 形态（Axiom + Theorem / 纯 Axiom / 纯 Theorem）均合法。Group 名 free-form，Engine 不解释业务含义。

### Supply Chain Attack


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#supply-chain-attack) — 攻击者通过入侵合法软件包的发布链路（注册表账号 / CI / 维护者 GitHub 账号），
将恶意代码注入到被广泛信任的包版本中，让下游 install 在用户机器上自动执行。
与"个人账号劫持发垃圾包"区别：受害者信任的是包名本身（非首次接触的新包）。

### SyncDomainGlossaryEntry


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#syncdomainglossaryentry) — Domain → glossary 单向同步脚本唯一入口——`bun scripts/sync-domain-glossary.ts --write`（CLI：`oxn domain sync-glossary --write`）。

### TargetDispatchTable


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#targetdispatchtable) — 路由 translate 表——把 Draft target 语法转成 promote-target-aware-workflow Blueprint 内部 task name（v0.2.0 D2 起 8 行）

### Task


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#task) — Align 执行单元，对齐 1 个 Blueprint 并可引用 N 个 Domain；内联 Part + Probe；DAG 无环（Kahn 校验）。

### TaskContext


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#taskcontext) — Task 级上下文内容（语义层）；AI Agent 从 WorkContext 按 Blueprint ## Boundaries 的每个 Slot 拆分；每个 TaskContext 携带 WorkContext 中与该 Slot 相关的子集 + 该 Slot 的 acceptance。

### TaskContextPerSlotSplit


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#taskcontextperslotsplit) — Task 级上下文内容（AI Agent 从 WorkContext 按 Blueprint `## Boundaries` 的每个 Slot 拆分）。

### TaskMemory


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#taskmemory) — Task 级动态记忆内容；Round 间追加；不纳入 PlanLock。

### Theorem


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#theorem) — Asset 结构第 3 层节点；物理形态 `- &lt;text&gt;` bullet 行；隶属于最近 `### Axiom`（无主 Axiom 时为形态 C Composite Theorem，归当前 Group）；设计为叶子节点（不可任意 list 嵌套）；MD 语法底层支持无限嵌套（CommonMark / GFM / mdast 无深度上限），OXN 拒绝是设计选择非技术限制。

### TheoremEscapeHatch


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#theoremescapehatch) — 必须表达 Theorem 深度时的逃生舱索引：4 类详见下方 Axioms（AxiomNameCarrying / GroupSwitch / CrossAssetReference / FieldLoadNested）。

### UseName


- [oxn-probe-domain](/openxenon/assets/domains/oxn-probe-domain.md#usename) — 业务场景名 = 一次 Probe 使用的**业务场景名**（"这次要验证什么"）。字符集约束 `^[a-zA-Z0-9-]+$`（保证可作 JSON object key）。

### Version


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#version) — 回顾性发布记录——cut 时诞生，**frozen-at-cut**；住 `.changes/0-X-Y-&lt;theme&gt;.md`；`status: released`。
- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#version) — Version CLI 子命令集（v0.6.0 起 4 子命令）：

### VersionHygiene


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#versionhygiene) — 版本号卫生规则——Dev Version 版本号恒严格大于已发布 Release Version 版本号；OXN CLI 不注入 build metadata（git SHA / build timestamp / "dev" 标记），版本号字符串本身是 Dev/Release 在运行时的唯一区分器。流程保障：`release-cut` workflow 的 `post-publish-bump` slot 在 publish 后**立即** bump dev 到下一个 `-alpha.0`，关闭共享版本号过渡窗口。
- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#versionhygiene) — CLI 域视角：dev 版本号严格大于 release（OXN CLI 不注入 build metadata；`oxn --version` 在 dev vs release 输出不同字符串）；判据 + 流程保障详见 project-domain。

### Work


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#work) — DAG 协作空间（D15/D13，）；Goal → Tasks（有 deps 无环），上下文沿边流动。
- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#work) — Work 是 DAG 协作空间（D15/D13）；编排流程 create→run→submit 顺序不可跳（D10/RFC-0033 D1 简化）。

### WorkAsSolutionReference


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#workassolutionreference) — PEAS 解的目标参照——AI 把理解的上下文按 Blueprint 写成 Work 作解参照，每个 Task = 解的原子动作。

### WorkContext


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#workcontext) — Work 级上下文内容（语义层）；AI Agent 按 Blueprint Context Template 从 Use refs 引用的 Domain/Workflow/Stack 提取相关 Terms/Invariants/Slots 编写；同一 Blueprint 的 N 个 Work 的 WorkContext 结构一致（除 Goal 外）。

### WorkContextStaticPlanLockProtected


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#workcontextstaticplanlockprotected) — Work 级上下文内容（AI Agent 按 Blueprint Context Template 从 Use refs 引用的 Assets 组装）。

### WorkMemory


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#workmemory) — Work 级动态记忆内容；Round 间追加；不纳入 PlanLock；与 PlanLock 保护的 WorkContext 形成"声明 vs 动态"二分。

<!-- SYNC:END -->
