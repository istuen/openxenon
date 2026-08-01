---
title: 术语表
entity: glossary
generated-by: scripts/sync-domain-glossary.ts
synced-at: 2026-08-01
---

# 术语表

> 本页是 OpenXenon 项目的对外术语词典，**单一权威源**。
> 内部定义来自 `.openxenon/assets/domains/`（Asset 视角），本页是面向用户的精简字典。
> 修改术语请编辑 Asset Domain 文件，本页通过 sync 脚本自动重建。

## 字母速查
- [A-E](#a-e)
- [F-L](#f-l)
- [M-R](#m-r)
- [S-Z](#s-z)

<!-- SYNC:START -->
## A-E

### AdaptersRoot

- desc: SkillAdapter 对各自 AI 助手写入其配置目录以便识别。

### Align

- desc: 人机协作的工作过程，AI Agent 遵守边界并收敛执行。

### Alpha

- desc: semver prerelease 标签（`-alpha.N` 后缀），标记 minor/major 版本的发版前迭代。

### Anchor

- desc: MD `{#anchor-id}` slug 文档锚点，与 Domain term 的 `anchor` 字段双向绑定；编译期校验存在性；ADR-0029 / RFC v0.7.2。

### ArchivedDraftDir

- desc: Draft 归档子目录；位置 `&lt;draftDir&gt;/.archived/`。archive 命令把 active 移到此；discard 命令可同时作用于 archived。

### Arg

- desc: 命令参数（必填或可选）。

### ArsenalResolver

- desc: 资产解析器优先级链 @prj > @gbl > @oxn；Work 通过 Resolver 寻址，不直接访问内置资产；ADR-0004。

### Artifact

- desc: Align 阶段产出的物理事实（被 Probe 观测的对象），路径必须落在 Work 沙盒内或宿主项目目录。

### Asset

- desc: Asset 是工程师为 AI 协作定义的**环境约束**；5 类 AssetKind（domain/workflow/stack/blueprint/roadmap）；Work 引用 Asset（单向）；创建后强校验（planLock + content_hash），不被 Work 改写。
- 视角:
  - oxn-project-domain: 见 [`oxn-asset-domain`](./oxn-asset-domain.md#asset)。本文域内特指"Project 资产"——住 `.openxenon/assets/`。
  - oxn-domain: 工程师为 AI 协作定义的**环境约束**；5 类 AssetKind（domain/workflow/stack/blueprint/roadmap）。具体领域见 [`oxn-asset-domain`](./oxn-asset-domain.md)。

### Asset 协作语义

- desc: Asset 是工程师提供给 AI Agent 的**参照机制**（OXN 三机制协作语义之一，ADR-0084）；方向：**工程师 → AI Agent**。AI 写代码时参照 Asset 边界提高确定性。**AI 自建允许**，但前提是走 Draft（`oxn draft create`）→ 工程师 Promote（走 `oxn work create --type asset --asset-kind X`），不是 AI 直接建 Asset。Asset 暴露 Probe 调用契约（有哪些、怎么调用）不破坏确定性——确定性根基是执行代码不可变（ADR-0072 erratum），参数化（stackTools）改变观测行为不改变代码。来源：ADR-0084 + ADR-0072 erratum v1.0.1。

### AssetCitation

- desc: Asset 反向引用计数（自动维护）：引用方变更 +1，archive 保留，删除要求 citations===0。

### AssetDAG

- desc: Asset `references[]` 字段构建的依赖图（无环 + 跨 kind 隔离 + 数量预算 N=5）。

### AssetFileResolver

- desc: Asset 路径解析器（resolveAssetFile / resolveAssetDir），v0.6 primary `.openxenon/assets/{kind}/{name}.md` + v0.5 fallback。

### AssetFrontmatter

- desc: Asset .md 文件的 YAML frontmatter schema（含 entity/version/name/abstract/references/citations/status 字段）。

### AssetHash

- desc: 域/蓝图文件的 SHA-256（64-hex），OXN 启动期计算并存入 BirthCert.assets。

### AssetKind

- desc: Asset 5 类收敛枚举（domain / workflow / stack / blueprint / roadmap），v0.6.1-alpha.4 三边界框架收敛结果。

### AssetLifecycle

- desc: Asset 完整生命周期 3 阶段（create / evolve / archive）+ 附 delete（需 citations==0）。

### AssetMap

- desc: AssetKind=roadmap 的语义别名（首选术语）——meta 索引层，AI 路由入口（6 scene 路由表 + Domain/Blueprint 索引）；不参与 references DAG。
- 视角:
  - oxn-project-domain: AssetKind=roadmap 的语义别名——OXN 系统导航索引（6 scene 路由表 + Domain/Blueprint 索引）；

### AssetMode

- desc: Asset 模式 Work（`oxn work create --type asset --asset-kind X`），走 IAP 闭环但跳过 task DAG；只写 .openxenon/assets/{kind}/{name}.md + planLock。

### AssetPaper

- desc: Asset 论文结构 3 字段不变量（ADR-0051）：abstract + references + citations 缺一不可。学术论文↔Asset 映射。

### Audit

- desc: Insight 审核池（生命周期阶段 2），从 raw promote（工程师手动）；资产草案 `.openxenon/assets/{kind}/{name}.md.draft`；AI 永不自动覆盖 Asset。

### AuditTrail

- desc: Asset 修改历史审计链（version + date + author + changes[]），自动维护、不可篡改；Asset 演进必填引用旧版。

### BirthCert

- desc: Work 静态门禁卡（.work 目录），写一次后只读（OS chmod 0o444），含 assets + context + diagnostics。

### Blueprint

- desc: AssetKind 之一，唯一跨 AssetKind 组合实体；通过 `## Refs` 引用 Domain + Workflow + Stack + 其他 Blueprint；Work 通过单一 blueprint ref 引用。ADR-0055。

### Bootstrap Seed Exemption

- desc: 自举种子豁免——`src/builtin/` 内置 Asset 手动创建不经 Work（self-bootstrap）；

### Boundary

- desc: Asset 的别名。

### Boundary Deviation

- desc: 边界偏离信号（frozen.json 标记），替代原"Boundary Violation"；OXN 只记录偏离不阻断，判定权归工程师；ADR-0066。

### Built-in Asset

- desc: 随 OXN 版本发布的内置 Asset；住 `src/builtin/`；通过 `@oxn/` scope 解析；

### Builtin

- desc: OXN 自带资产（@oxn scope）；版本号单调递增；不依赖任何 @prj 资产。

### BuiltinAsset

- desc: Engine 编译时内置资产（@oxn scope）；与项目资产（@prj scope）严格隔离。

### CachePort

- desc: RAM/Redis 双模式缓存端口；热路径（probe-stats）缓存；ADR-0028 / RFC v0.7.0。

### Ceiling

- desc: 上限机制——AI Agent 自身能力的天花板，OXN 不介入。AI 可涌现比工程师更优的选择（反向帮助工程师积累经验、沉淀 Asset），ceiling 由 LLM 能力决定，不受 OXN 限制。与 Floor 对偶。ADR-0073 判据 3。

### Citation

- desc: 资产反向引用计数 + 影响半径（impactRadius: low/medium/high/critical），自动维护、归档保留。

### CliInputError

- desc: 用户 CLI 输入错的契约类。轨道 3。

### Command

- desc: CLI 顶级命令，采用 citty 库。

### ContentHash

- desc: SHA-256 内容哈希（64-hex），写入时计算读取时校验；frozen.json 用 self-excluding 协议。签名被外部篡改 → OXN_CRASH_SIGNATURE_MISMATCH。

### context.md

- desc: Work 内短期记忆文件（works/&lt;id&gt;/context.md）；取代 v0.7.x Memory L1；Intent + Roadmap + LoopHistory + KeyObservations 结构；ADR-0049。

### CriticalHandoff

- desc: IAP 阶段间关键衔接点；2 个守卫：Intent→Align（planLock 存在）+ Align→Proof（task 状态确定）；Engine 守卫不可移除；RFC work-unified-model。

### CrossProofAccumulation

- desc: 跨 Proof 累积统计（数据源 .openxenon/.cache/probe-stats.json），用于 E4 综合推理的"统计事实底座"。Probes 不入 catalog（AI 盲区）。

### Daemon

- desc: OXN Engine 后台守护进程；负责运行时状态监听（Work 长时间未变化 → 通知工程师）+ 事件监听（Probe DEVIATED/INCONCLUSIVE 通知 + CLI socket 事件）；不监听文件系统，不阻断 Work，不修改 Kernel 规则；ADR-0068。
- 视角:
  - oxn-domain: OXN Engine 后台守护进程，监听人机协作的变化与边界预警。
- ⚠️ 冲突：desc 首句在 2 个 Domain 间不一致

### Definitional Modality

- desc: 定义性情态——回答"X 是什么"的文档；住 `.openxenon/assets/{kind}/*.md`（E1 Asset）；自举种子允许手动创建（见 Bootstrap Seed Exemption）。

### Descriptive Modality

- desc: 描述性情态——回答"怎么用 X"的文档；住 `docs/{product,dev}/{zh-cn,en}/*.md`；产品手册与开发手册。

### Dev Version

- desc: 通过 `npm link`（仓库 dist/cli.js）注册的 oxn 全局 bin；mutable（每次 rebuild 改变）；仅贡献者 + 内部 dogfood 使用。配合 `scripts/oxn-switch.sh` 的 `pnpm oxn:dev` 操作。

### Domain

- desc: AssetKind 之一，业务边界（terms/bans/invariants）；与 oxn-domain 元域同名但角色不同——此处为 AssetKind 枚举值。

### Draft

- desc: 未提升的描述性工作稿（Descriptive Modality 草稿态）；物理位置 `.openxenon/drafts/`（可经 `.oxnrc` `draftDir` 字段配）；CLI 创建 + 工程师 / AI Agent 填写 + 工程师手动 promote（不经 Work）。

### Draft → Promote 路径

- desc: AI 自建 Asset 的实操路径——先建 Draft（`oxn draft create --prefix design|issue|report`）作为描述性工作稿，工程师审核后通过 `oxn work create --type asset --asset-kind X` 走 IAP 闭环升格为正式 Asset。Draft 是描述性情态（Descriptive Modality）的前置状态，无 Template / 无 frontmatter / 无 Probe。详见 `oxn-draft-skill`。来源：ADR-0084（2026-07-31）。

### DraftDir

- desc: Draft 工作目录；默认 `&lt;boundaryDir&gt;/drafts/`（boundaryDir 默认 `.openxenon`）。

### DraftLifecycle

- desc: Draft 状态机——3 态：active（.openxenon/drafts/ 下的活跃文件）/ archived（.openxenon/drafts/.archived/ 下的历史文件）/ discarded（物理删除，无文件）。

### DraftType

- desc: Draft 用途分类——3 类：report（调研报告） / issue（问题记录） / design（设计稿）。映射到文件名前缀（Q-S1/Q-S5）：

### DraftType.SceneBinding

- desc: （v0.7+ 方向）DraftType 与 Scene 绑定——report 绑 scene=explore / issue 绑 scene=debug / design 绑 scene=plan。

### ExitCode

- desc: OXN CLI 进程退出码，3 档（成功 / 业务阻断 / 引擎崩溃）。

### External

- desc: 边界内 `## Externals` H2 category，从 Asset 类型降级；url/path 二选一 + kind enum + 状态索引；ADR-0056。

## F-L

### Fix Record

- desc: 开发者面向的 bug 修复记录；住 `dev/fix/`；比 Version Fragment 更详细（含根因分析、调试过程）。

### Floor

- desc: 下限参照——OXN 为 AI Agent 的局部最优全局非优情况提供的确定性保底参照。Asset + Work 专注某个目标，构成 AI 选择动作时的 floor。OXN 提高 floor 不提高 ceiling（ADR-0073 判据 3）。

### FourLayerDeterminism

- desc: D1 确定性边界 + D2 确定性验证 + D3 确定性证据 + D4 确定性记录；ADR-0058。

### Frozen

- desc: Work finalize 后的不可变证据文件（frozen.json），生成后只读（chmod 0o444 + content_hash + signature）；包含 outcome 聚合结构（ADR-0067）+ boundary deviations 标记；三件套之一（详见 Proof）。

### FrozenPlusErrata

- desc: RFC frozen + errata 演进策略——RFC accepted 后核心冻结，仅可追加 errata 段；不 bump 版本号（见 RFC-0013 D6）。

### FunnelEffect

- desc: Blueprint props ≠ Part props 合集的漏斗原理；通过硬编码/拼接/默认值吸收子层复杂度；ADR-0001。

### Hall

- desc: 研讨厅，人机协作范围内的中央枢纽。

### I18nKey

- desc: 翻译 key 字符串（点号分隔命名空间）；zh-CN locale 字典是 SSOT。

### IAP

- desc: 工程师定义意图（Intent），AI Agent 对齐执行（Align），OXN 验证记录（Proof）。

### IAPError

- desc: 业务流转中预期内错误的契约类。轨道 1，AI 消费受众。

### IAPPhase

- desc: Work 三阶段实体（Intent 工程师主权 / Align AI 主权 / Proof Engine 主权），v0.6.1 Phase D 收敛。主导权不可越权（inv-1）。

### InformationHiding

- desc: 对抗性设计："AI 只看该做什么，不看该满足什么"；Part 内 Probe 验证标准不可见，frozen.json/state.json 不可写。

### Infra

- desc: L1 副作用/IO 执行模块；负责OpenXenon 跟 外部宿主环境的出入口，包括文件、网络等具有副作用的交互。
- 视角:
  - oxn-proof-domain: L1 副作用 / IO 执行模块：只回答事实不做判定（不能给自己盖章）；3 个 IO Primitive（io.stat/io.read/io.exec）通过 ProviderRegistry 暴露。
- ⚠️ 冲突：desc 首句在 2 个 Domain 间不一致

### Insight

- desc: Insight 是 E4 涌现层；整体论 vs 前三层还原论；只输出协作态势信号（边界使用/触碰/Loop 收敛/退出模式），不输出代码质量评分；永不自动回写 Asset。
- 视角:
  - oxn-domain: 洞察 IAP 并提供涌现的可能性。具体领域见 [`oxn-insight-domain`](./oxn-insight-domain.md)。
- ⚠️ 冲突：desc 首句在 2 个 Domain 间不一致

### Intent

- desc: 人机协作的软件目标，AI Agent 对齐的工作对象。

### InterferenceFlag

- desc: 12 项干扰标记枚举（8 RED: waf_detected/just_modified/detached_head/shallow_clone/sandbox_violation/network_timeout/response_truncated/permission_denied + 4 YELLOW: cdn_cache/cache_path/symlink/unknown）；原 Taint 体系的子项保留，合并后统一术语。

### Judged

- desc: Insight 已判定池（生命周期阶段 3+4），状态 approved/applied/archived；applied 后 Asset 更新 + planLock 重算。

### Kernel

- desc: L0 纯逻辑验证模块；通过 Infra 调用带副作用的 Probe 来观测客观事实并验证。
- 视角:
  - oxn-proof-domain: L0 纯逻辑验证模块（记录事实不评判 ADR-0031）：零 IO 约束，只接受 Infra 观测产出 ProbeOutcome，不调 fs/net/child_process。

### kind-isolation

- desc: references 仅同 AssetKind 原则；跨 kind 组合由 Blueprint 承担，跨 kind 导航由 Roadmap scene.links 承担；ADR-0054。

### LambdaVacuum

- desc: L0 Kernel 零 IO 约束的正式术语；禁 fs/net/child_process/process.env/process.std*/EventEmitter。

### Locale

- desc: 语言区域标识（仅支持 'zh-CN'）；DEFAULT_LOCALE = 'zh-CN' 兜底；ResolveLocale 优先级 `--locale > config.locale > LANG env > DEFAULT`。

### LocaleBundle

- desc: locale 字典 `{ [key: string]: string }` 平面结构；按 dot key 索引。

### Loop

- desc: Work 核心动态过程（三相模型 Phase 2）；物质运动态；所有变化被 trace 记录；ADR-0006。

## M-R

### Meta Modality

- desc: 项目工程元情态——回答"OXN 自己怎么组织"的文档；住仓库根 + `dev/` + `.changes/`。包含 5 类项目工程文档（README.md / AGENTS.md / CONTEXT-MAP.md / .changes/ / dev/）。**特例**：可与 Descriptive Modality 组合（README.md = marketing + 入口）；可与 Definitional Modality 组合（CONTEXT-MAP.md = 8 Domain 索引）。RFC-0018 锁定。

### MinimumClosure

- desc: v0.6.1 scope = 四层确定性就位（D1 边界 + D2 验证 + D3 证据 + D4 记录）；原 MinimumTrustClosure 改名（ADR-0066），术语精简；ADR-0058 决策内容保留。

### ModeRecommendation

- desc: 基于跨 Work 模式的 Work 模式推荐（domain + occurrences≥3 → suggestedInvariant + confidence）；强约束：永不自动 apply，工程师 review/approve 后手动应用。

### OpenXenon

- desc: 工程师定义 AI Agent 协作边界的工具（slogan）。正定义：工程师通过 OXN 定义 Asset，作为 AI Agent 在 Work 约束的协作边界，由 Proof 验证其成果。以 Skills 形式注入 AI Agent 工作台（Cursor / OpenCode / Codex / Claude Code）。OXN 本身不是 AI Agent，而是 AI Agent 之上的工具层。

### outcome

- desc: frozen.json 里的 Proof 级聚合结构 `{completed: N, deviated: N, inconclusive: N}`；OXN 不做整体合格/失败聚合判定，只提供各状态 Probe 数量；判定权归工程师；ADR-0067。

### OutputFormat

- desc: 输出格式（human/json/yaml/html/md）。

### OXL

- desc: Engine 通过 unified 库实现 MD 语法的特性，包括编译、校验。
- 视角:
  - oxn-domain: OpenXenon Language，OpenXenon 的特定领域语言（DSL），用于声明与校验 OXN 实体。具体领域见 [`oxn-engine-domain.OXL`](./oxn-engine-domain.md#oxl)。
- ⚠️ 冲突：desc 首句在 2 个 Domain 间不一致

### OXN

- desc: OpenXenon 缩写。

### OXN CLI

- desc: OpenXenon 交互入口之一。

### OXN Engine

- desc: OpenXenon 核心引擎；记录事实不评判合格（ADR-0031）；L0-L3 分层 + E1-E4 四结构实体实现。
- 视角:
  - oxn-domain: OpenXenon 核心引擎。具体领域见 [`oxn-engine-domain`](./oxn-engine-domain.md)。
- ⚠️ 冲突：desc 首句在 2 个 Domain 间不一致

### OXnConfig

- desc: OXN 项目级配置（.oxnrc，git tracked）；存 leaderMode（CLI 路由模式）。

### OXNCrash

- desc: OXN 引擎自身 Bug 或底线被击穿的错误契约类。轨道 2，人类消费受众。

### Part

- desc: OXN 内置零件（封装可复用工程动作如 git-commit），引用 @oxn/parts/* scope。
- 视角:
  - oxn-work-domain: Task 内 skill 执行单元（skill_context + acceptance），内联在 task.md 内不可独立成文件。
- ⚠️ 冲突：desc 首句在 2 个 Domain 间不一致

### PathPort

- desc: L1 注入式路径操作接口；L0 不硬编码路径；NodePathPort 为 Node 实现；ADR-0010。

### Pattern

- desc: 跨 Work 模式识别与持久化（v0.7 新增），存 .openxenon/drafts/insight-patterns/；CLI `oxn insight patterns list/show/promote/archive`。

### Phase

- desc: 单个 IAP 阶段（Intent/Align/Proof 之一），按顺序不可跳。子步骤按阶段分别定义。

### PlanLock

- desc: Asset 创建后强校验卡（与 Work planLock 等效），锁 fileHash + citations + DAG；漂移触发 IAP_ALIGN_LOCK_HASH_MISMATCH。
- 视角:
  - oxn-work-domain: BirthCert 内不可变快照（3 组件 hash + allHash），锁后任何 .md 资产漂移 → IAP_ALIGN_LOCK_HASH_MISMATCH。
- ⚠️ 冲突：desc 首句在 2 个 Domain 间不一致

### PlanningPool

- desc: 规划池——前瞻性规划备选集合；住 `dev/pool/`；`status: planned`；**frontmatter 不含 version 字段**。

### Pool

- desc: 5 类 Intent Pool union（research / design / issue / audit / journal），物理位置 .openxenon/drafts/{kind}/&lt;slug&gt;.md；heading 模板互为独立 spec。

### Port

- desc: L1 Infra 注入端口抽象家族；让 L0 Kernel 跨 runtime 可移植；子类 PathPort/ResourcePort/CachePort。

### Prescriptive Modality

- desc: 规定性情态——回答"为什么决定 X"的文档；住 `docs/rfc/zh-cn/RFC-XXXX-&lt;theme&gt;.md`（RFC 规范）；frozen + errata 演进；只引用 `docs/glossary/`（D5）；中文 only（D10）。

### Probe

- desc: OXN 内置探针（物理观测 + 客观结果），由 L1-Infra Provider 执行 + L0-Kernel 产出 ProbeOutcome。
- 视角:
  - oxn-work-domain: 物理观测单元（prop 输入 + output 判定），内联在 part 内；标准必须来自 Blueprint observe 数组。
- ⚠️ 冲突：desc 首句在 2 个 Domain 间不一致

### ProbeOutcome

- desc: L0 Kernel 产出的单个 Probe 客观结果（COMPLETED/DEVIATED/INCONCLUSIVE）；探测目标是否符合预期；"完成"指探测完成，不是目标完成；原 ProbeVerdict 改名（ADR-0066/0067）。

### Project Engineering Meta Layer

- desc: 四层 SSOT 全景的第 4 层——项目工程元层。承载 5 类仓库根文档：README.md（GitHub 入口）/ AGENTS.md（AI Agent 入口）/ CONTEXT-MAP.md（Domain 索引）/ .changes/（Version Fragment）/ dev/{versions,fix,pool}/（Roadmap + Fix Record + PlanningPool）。与 Asset / RFC / Doc 三情态并列。RFC-0018 D1 锁定。

### ProjectBoundary

- desc: 项目物理边界目录 `.openxenon/`；存放所有运行时与意图资产。

### ProjectConfig

- desc: 项目运行时配置（.openxenon/.config，git ignored）；含 mode/locale/debug/tools。

### ProjectEngineeringDocument

- desc: 项目工程元层文档统称——指代 README.md / AGENTS.md / CONTEXT-MAP.md / .changes/ / dev/ 5 类文档中任一。与 Asset / RFC / Doc 三情态的文档互斥，但允许特例豁免（CONTEXT-MAP.md 引 Asset 作索引；README.md 引 docs/product/introduction.md 双向同步）。RFC-0018 D2 锁定。

### Proof

- desc: OXN 验证 AI Agent 执行结果（ProbeOutcome 三态）并记录的协作**过程**证明（不是结果证明）；执行主体 OXN Engine（记录事实不评判 ADR-0031）；物理观测 L1-Infra + 客观结果 L0-Kernel；包含三件套（frozen.json + trace.jsonl + state.json）；ADR-0066 + ADR-0067。
- 视角:
  - oxn-domain: OXN Engine 记录的协作**过程**证明（不是协作结果证明）；包含 frozen.json + trace.jsonl + state.json 三件套；OXN 只记录事实不评判合格；具体领域见 [`oxn-proof-domain`](./oxn-proof-domain.md)。
- ⚠️ 冲突：desc 首句在 2 个 Domain 间不一致

### Proof 协作语义

- desc: Proof 是 AI Agent 通过 OXN 验证自己执行成果的**反馈机制**（OXN 三机制协作语义之一，ADR-0084）；核心方向 = **工程师审计**（次要方向 = AI 自我导航，Skill 触发但不保证执行）。Proof 不可替代价值 = 给工程师**独立于 AI 自我汇报的验证能力**；确定性度量（Probe 范围）由工程师主观定义。来源：ADR-0084。

### Proof-First 下限

- desc: OXN 的最小可用形态——`oxn proof create / probe add / run` 独立于 Work/Asset 可用，工程师有不依赖 AI 自我汇报的独立验证能力。OXN Engine 不强制 AI 走完整 IAP；Proof 是 OXN 给工程师的**核心确定性工具**（5 分钟上手，AI 假完成 OXN 不骗自己）。来源：ADR-0084。

### Raw

- desc: Insight 原始池（生命周期阶段 1），数据源 trace.jsonl 结构化事件（asset.violation / intent.drift）；状态 raw，未审核。

### Referent

- desc: 参照系——为非确定性智能体（LLM Agent）的本有但非确定器官（世界模型/传感器/执行器），提供确定性参照锚点。OXN 的统一设计模式：Asset 参照世界模型、Probe 参照传感器、OXN writer 参照执行器、CLI 调用参照动作、Work 参照解、Task DAG 参照状态探索图。参照版本与 agent 自有版本性质相反（参照必须稳定，不被被参照者改）。ADR-0072。

### RefPool

- desc: Work 级声明的 ref 池（domain/blueprint/part/probe），Task 只能从 RefPool inject，不允许直接 import 资产。

### Registry

- desc: 内存中的 @oxn 资产查询表（OxnBuiltinRegistry 维护），CLI 加载期 fail-fast 校验；4 个内置 Provider（file/http/shell/git）。

### Release Version

- desc: 通过 `npm install -g @istuen/openxenon@&lt;version&gt;` 从 registry 或本地 tarball 安装的 oxn；指向预编译 `dist/cli.js`；immutable；终端用户 + CI/CD 使用。配合 `scripts/oxn-switch.sh` 的 `pnpm oxn:prod` 操作。

### Report

- desc: CLI 基于 Proof 输出的可读报告（oxn work submit 后的输出）；包含 outcome 聚合 + ProbeOutcome 列表 + InterferenceFlag；不新判定，只呈现已有事实；ADR-0066。

### ResourcePort

- desc: 外部服务虚拟 FS 接口（S3/Slack/Gmail/GitHub）；只读；ADR-0028 / RFC v0.7.0。

### RFC

- desc: OpenXenon 规范（规定性文档）；住 `docs/rfc/zh-cn/RFC-XXXX-&lt;theme&gt;.md`；frozen + errata 演进策略；

### Roadmap

- desc: AssetKind=roadmap 的历史术语别名。**已废弃**——主术语改为 **AssetMap**（RFC-0013 D4），避免与版本计划文档（`dev/versions/`，同名 Roadmap）混淆。AssetKind 枚举值在代码中仍为 `roadmap`（不变），glossary 主术语为 AssetMap。
- 视角:
  - oxn-project-domain: 前瞻性版本计划文档——描述未来版本将包含什么；住 `dev/versions/`；`status: planned`；frontmatter 必填 `version`。
- ⚠️ 冲突：desc 首句在 2 个 Domain 间不一致

### Round

- desc: Work 多轮 IAP 循环（v0.6 新增），手动触发（`oxn work next-round`），maxIterations 硬限制（默认 3）。

## S-Z

### `oxn draft`

- desc: Draft 体系 v1 CLI 子命令组（v0.6.2）；4 子命令 = create / list / archive / discard（Q-S6/Q-S7）。

### Scope

- desc: OXN 引用作用域（@oxn builtin / @prj 项目级；@gbl 已废弃）。

### Skill

- desc: OXN 内置给 AI 助手的技能，用于AI 助手里通过 Skill 对 OpenXenon CLI 交互。

### SkillAdapter

- desc: 多 AI 助手适配器。

### SkillContext

- desc: AI 可见的三层上下文（work.context / task.context / part.skill_context）。

### Slot

- desc: Blueprint 内拓扑节点（slot DAG），Engine 校验无环；Task 内 Part 名必须对齐 slot 名。

### Stack

- desc: AssetKind 之一，实现边界（runtimes/linters/testers）；Proof 阶段直接断言。v0.6 硬要求。ADR-0054。

### Starter Asset

- desc: `oxn init --starter` 拷贝到 `.openxenon/assets/` 的 Built-in Asset 副本；

### SubCommand

- desc: Command 下子命令（如 `work add-task`、`domain validate`）。

### Task

- desc: Align 执行单元，对齐 1 个 Blueprint 并可引用 N 个 Domain；内联 Part + Probe；DAG 无环（Kahn 校验）。

### TFunction

- desc: `t(key, args?)` 主翻译函数；从 zh-CN locale 字典解析；缺 key 抛 I18N_KEY_MISSING。

### ThreeBoundaryFramework

- desc: Domain/Workflow/Stack 三正交维度框架，覆盖 IAP Intent 语义/结构/环境三约束；ADR-0054。

### Trace

- desc: Work 执行轨迹（trace.jsonl），JSONL 追加式事件流；append-only + Trace-before-State（ADR-0009）。

### Trace-before-State

- desc: 写 state.json 前必须先 append trace.jsonl 的写入顺序约束；原子性是 Trace-before-State 的物理基础；ADR-0009。

### Version Fragment

- desc: 回顾性变更日志片段；住 `.changes/0-X-Y-*.md`；版本转正时落盘；`status: released`。

### Version Hygiene

- desc: 版本号卫生规则——Dev Version 版本号恒严格大于已发布 Release Version 版本号；OXN CLI 不注入 build metadata（git SHA / build timestamp / "dev" 标记），版本号字符串本身是 Dev/Release 在运行时的唯一区分器。流程保障：`release-cut` workflow 的 `post-publish-bump` slot 在 publish 后**立即** bump dev 到下一个 `-alpha.0`，关闭共享版本号过渡窗口。权威定义：[ADR-0083](../../docs/adrs/0083-version-hygiene-over-build-metadata.md)。
- 视角:
  - oxn-cli-domain: Dev Version 与 Release Version 在运行时的唯一区分器——dev 版本号恒严格大于已发布 release 版本号。OXN CLI **不**注入 build metadata（git SHA / build timestamp / "dev" 标记）；版本号字符串本身是唯一信号。判据：`oxn --version` 在 dev shell 与 release shell 输出不同字符串。关闭歧义窗口的流程保障：`release-cut` workflow 的 `post-publish-bump` slot 在 publish 后**立即** bump 3 个 package.json 到下一个 `-alpha.0`。

### Work

- desc: 人机协作的工作空间，衔接 Asset 与 Proof；AI Agent 在 Asset 边界内自主工作（create → read Blueprint → write Context → orchestrate Tasks → execute → 汇报 → react → finalize）；具体领域见 [`oxn-work-domain`](./oxn-work-domain.md)。
- 视角:
  - oxn-work-domain: Work 是 E2 人机协作的工作空间；编排流程 3 IAP 阶段顺序不可跳；必经路径 create→lock→run→submit×N→finalize。
- ⚠️ 冲突：desc 首句在 2 个 Domain 间不一致

### Work 协作语义

- desc: Work 是 AI Agent 工作过程的**追踪机制**（OXN 三机制协作语义之一，ADR-0084）；Work 串联 Asset + Proof 走 IAP 闭环（Intent → Align → Proof）。**不可省核心价值** = 为 Insight 提供**客观数据支撑**（贯通 ADR-0074 原料提供者角色）——缺 Work 则 Insight 涌现退化为基于工程师经验 + AI 推理（可偏差），有 Work 则 Insight 有 trace.jsonl + frozen.json 客观数据可统计。来源：ADR-0084。

### Workflow

- desc: AssetKind 之一，执行边界（slot DAG + observe Probe），原 Blueprint 改名；AssetKind=workflow。ADR-0054。

### WorkSnapshot

- desc: Work 全状态可序列化对象（state.json + frozen.json + trace + references）；跨进程/跨设备传输；ADR-0028。

### WorkV1

- desc: Work v1.1 沙盒布局（works/&lt;w&gt;/{work.md, tasks/, .work/, .run/}），自 v0.6.1-alpha.3 起强制；V0 须先 `oxn work migrate`。

### 拓扑闭包校验

- desc: v0.7.3 P5 (ADR-0061 §D4) Task DAG ⊆ Workflow slot DAG 拓扑闭包 hard-check——task.deps 必须 ∈ task.boundary 的祖先集合 ∪ {boundary 自身}，违反 → throw IAPError(INTENT, TASK_DAG_VIOLATES_SLOT)。**性质 = 结构格式校验**（声明合法性，非搜索空间约束）；超出 lock 时刻阻断，与 AI 通道外执行逃逸是不同概念。escape hatch: skipDagCheck=true 时跳过（仅供历史 Work 渐进迁移）。来源：ADR-0084 补注（2026-07-31）。

### 确定性度量

- desc: 工程师通过选择 Probe 范围定义的确定性边界——"确定性"度量因工程师而异，不存在"统一确定性"。简单 Probe（fs-exists）证明"做了"；字符串匹配证明"做了且内容对"；测试运行证明"做了且行为对"。OXN 提供 Probe catalog 与执行代码（确定性 = 执行代码不可变，构建产物），**不**提供"标准 Probe 集"作为统一确定性保障。确定性度量是工程师主观决策。来源：ADR-0084 + ADR-0072 erratum。

### 确定性根基

- desc: Probe 确定性的根基是**执行代码不可变**（OXN 构建产物，AI 无法修改；其他项目消费构建后的 OXN，无法改代码），**非信息隐藏**。Asset 暴露 Probe 调用契约（有哪些、怎么调用）不破坏确定性；Probe 执行可由 Asset 派生参数（stackTools）参数化——参数化改变观测行为不改变代码。ADR-0076「验证标准 AI 不可见」是软对抗（提高针对性绕过成本）非确定性根基。来源：ADR-0072 erratum v1.0.1（2026-07-31）。

### 通道内追踪

- desc: Work 追踪的是 OXN 通道内的执行轨迹（state.json + trace.jsonl），不记录 AI Agent 在通道外的行为（读代码、试方案、放弃、推理过程）。**通道外 = OXN 边界外**——OXN 只对请求其的反应，通道内追踪是协作边界的**特征**（非缺陷）。两个信息源不交叉：chat 有推理无证据，Work 有证据无推理。来源：ADR-0084。

<!-- SYNC:END -->
