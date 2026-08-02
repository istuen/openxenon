---
title: 术语表
entity: glossary
generated-by: scripts/sync-domain-glossary.ts
synced-at: 2026-08-02
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

### Asset


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#asset) — Asset 是工程师为 AI 协作定义的**环境约束**；5 类 AssetKind（domain/workflow/stack/blueprint/roadmap）；Work 引用 Asset（单向）；创建后强校验（planLock + content_hash），不被 Work 改写。
- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#asset) — 见 [`oxn-asset-domain`](./oxn-asset-domain.md#asset)。本文域内特指"Project 资产"——住 `.openxenon/assets/`。
- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#asset) — 工程师为 AI 协作定义的**环境约束**；5 类 AssetKind（domain/workflow/stack/blueprint/roadmap）。具体领域见 [`oxn-asset-domain`](./oxn-asset-domain.md)。

### AssetKind


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#assetkind) — Asset 5 类收敛枚举（domain / workflow / stack / blueprint / roadmap），v0.6.1-alpha.4 三边界框架收敛结果。

### AssetMap


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#assetmap) — AssetKind=roadmap 的语义别名（首选术语）——meta 索引层，AI 路由入口（6 scene 路由表 + Domain/Blueprint 索引）；不参与 references DAG。
- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#assetmap) — AssetKind=roadmap 的语义别名——OXN 系统导航索引（6 scene 路由表 + Domain/Blueprint 索引）；

### AssetPaper


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#assetpaper) — Asset 论文结构 3 字段不变量（ADR-0051）：abstract + references + citations 缺一不可。学术论文↔Asset 映射。

### BirthCert


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#birthcert) — Work 静态门禁卡（.work 目录），写一次后只读（OS chmod 0o444），含 assets + context + diagnostics。

### Blueprint


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#blueprint) — AssetKind 之一，唯一跨 AssetKind 组合实体；通过 `## Refs` 引用 Domain + Workflow + Stack + 其他 Blueprint；Work 通过单一 blueprint ref 引用。ADR-0055。

### Boundary


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#boundary) — Asset 的别名。

### Boundary Deviation


- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#boundary-deviation) — 边界偏离信号（frozen.json 标记），替代原"Boundary Violation"；OXN 只记录偏离不阻断，判定权归工程师；ADR-0066。

### Built-in Asset


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#built-in-asset) — 随 OXN 版本发布的内置 Asset；住 `src/builtin/`；通过 `@oxn/` scope 解析；

### Ceiling


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#ceiling) — 上限机制——AI Agent 自身能力的天花板，OXN 不介入。AI 可涌现比工程师更优的选择（反向帮助工程师积累经验、沉淀 Asset），ceiling 由 LLM 能力决定，不受 OXN 限制。与 Floor 对偶。ADR-0073 判据 3。

### Citation


- [oxn-insight-domain](/openxenon/assets/domains/oxn-insight-domain.md#citation) — 资产反向引用计数 + 影响半径（impactRadius: low/medium/high/critical），自动维护、归档保留。

### CliInputError


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#cliinputerror) — 用户 CLI 输入错的契约类。轨道 3。

### context.md


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#context-md) — Work 内短期记忆文件（works/&lt;id&gt;/context.md）；取代 v0.7.x Memory L1；Intent + Roadmap + LoopHistory + KeyObservations 结构；ADR-0049。

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

### DraftPromoteLifecycle


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#draftpromotelifecycle) — Draft Promote 阶段（v0.6.2-alpha.3 新增）——4 阶段：

### DraftSkeleton


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#draftskeleton) — per-target 模板——含 frontmatter（必填字段占位）+ H2 段（按目标类型，例如 RFC 的 `## 决策` / Domain 的 `## Terms`）+ TODO 占位。

### DraftTarget


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#drafttarget) — Draft Promote 路由去向——3 值枚举（Q-T1）：

### DraftType


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#drafttype) — Draft 用途分类——3 类：report（调研报告） / issue（问题记录） / design（设计稿）。映射到文件名前缀（Q-S1/Q-S5）：

### External


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#external) — 边界内 `## Externals` H2 category，从 Asset 类型降级；url/path 二选一 + kind enum + 状态索引；ADR-0056。

## F-L

### Fix Record


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#fix-record) — 开发者面向的 bug 修复记录；住 `dev/fix/`；比 Version Fragment 更详细（含根因分析、调试过程）。

### Floor


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#floor) — 下限参照——OXN 为 AI Agent 的局部最优全局非优情况提供的确定性保底参照。Asset + Work 专注某个目标，构成 AI 选择动作时的 floor。OXN 提高 floor 不提高 ceiling（ADR-0073 判据 3）。

### forbidden-draft-promote-as-asset


- [oxn-draft-promote-domain](/openxenon/assets/domains/oxn-draft-promote-domain.md#forbidden-draft-promote-as-asset) — |

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


- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#interferenceflag) — 12 项干扰标记枚举（8 RED: waf_detected/just_modified/detached_head/shallow_clone/sandbox_violation/network_timeout/response_truncated/permission_denied + 4 YELLOW: cdn_cache/cache_path/symlink/unknown）；原 Taint 体系的子项保留，合并后统一术语。

### Kernel


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#kernel) — L0 纯逻辑验证模块；通过 Infra 调用带副作用的 Probe 来观测客观事实并验证。
- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#kernel) — L0 纯逻辑验证模块（记录事实不评判 ADR-0031）：零 IO 约束，只接受 Infra 观测产出 ProbeOutcome，不调 fs/net/child_process。

### kind-isolation


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#kind-isolation) — references 仅同 AssetKind 原则；跨 kind 组合由 Blueprint 承担，跨 kind 导航由 Roadmap scene.links 承担；ADR-0054。

### Loop


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#loop) — Work 核心动态过程（三相模型 Phase 2）；物质运动态；所有变化被 trace 记录；ADR-0006。

## M-R

### Meta Modality


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#meta-modality) — 项目工程元情态——回答"OXN 自己怎么组织"的文档；住仓库根 + `dev/` + `.changes/`。包含 5 类项目工程文档（README.md / AGENTS.md / CONTEXT-MAP.md / .changes/ / dev/）。**特例**：可与 Descriptive Modality 组合（README.md = marketing + 入口）；可与 Definitional Modality 组合（CONTEXT-MAP.md = 8 Domain 索引）。RFC-0018 锁定。

### OpenXenon


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#openxenon) — 工程师定义 AI Agent 协作边界的工具（slogan）。正定义：工程师通过 OXN 定义 Asset，作为 AI Agent 在 Work 约束的协作边界，由 Proof 验证其成果。以 Skills 形式注入 AI Agent 工作台（Cursor / OpenCode / Codex / Claude Code）。OXN 本身不是 AI Agent，而是 AI Agent 之上的工具层。

### outcome


- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#outcome) — frozen.json 里的 Proof 级聚合结构 `{completed: N, deviated: N, inconclusive: N}`；OXN 不做整体合格/失败聚合判定，只提供各状态 Probe 数量；判定权归工程师；ADR-0067。

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

### Prescriptive Modality


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#prescriptive-modality) — 规定性情态——回答"为什么决定 X"的文档；住 `docs/rfc/zh-cn/RFC-XXXX-&lt;theme&gt;.md`（RFC 规范）；frozen + errata 演进；只引用 `docs/glossary/`（D5）；中文 only（D10）。

### Probe


- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#probe) — OXN 内置探针（物理观测 + 客观结果），由 L1-Infra Provider 执行 + L0-Kernel 产出 ProbeOutcome。
- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#probe) — 物理观测单元（prop 输入 + output 判定），内联在 part 内；标准必须来自 Blueprint observe 数组。

### ProbeOutcome


- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#probeoutcome) — L0 Kernel 产出的单个 Probe 客观结果（COMPLETED/DEVIATED/INCONCLUSIVE）；探测目标是否符合预期；"完成"指探测完成，不是目标完成；原 ProbeVerdict 改名（ADR-0066/0067）。

### promote-boundary-isolation


- [oxn-draft-promote-domain](/openxenon/assets/domains/oxn-draft-promote-domain.md#promote-boundary-isolation) — |

### PromoteLifecycle


- [oxn-draft-promote-domain](/openxenon/assets/domains/oxn-draft-promote-domain.md#promotelifecycle) — Draft Promote 4 阶段（v0.6.2-alpha.3 锁）：

### PromoteRoute


- [oxn-draft-promote-domain](/openxenon/assets/domains/oxn-draft-promote-domain.md#promoteroute) — Draft → Target 路由映射表——3 条规则（Q-T1）：

### Proof


- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#proof) — OXN 验证 AI Agent 执行结果（ProbeOutcome 三态）并记录的协作**过程**证明（不是结果证明）；执行主体 OXN Engine（记录事实不评判 ADR-0031）；物理观测 L1-Infra + 客观结果 L0-Kernel；包含三件套（frozen.json + trace.jsonl + state.json）；ADR-0066 + ADR-0067。
- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#proof) — OXN Engine 记录的协作**过程**证明（不是协作结果证明）；包含 frozen.json + trace.jsonl + state.json 三件套；OXN 只记录事实不评判合格；具体领域见 [`oxn-proof-domain`](./oxn-proof-domain.md)。

### Referent


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#referent) — 参照系——为非确定性智能体（LLM Agent）的本有但非确定器官（世界模型/传感器/执行器），提供确定性参照锚点。OXN 的统一设计模式：Asset 参照世界模型、Probe 参照传感器、OXN writer 参照执行器、CLI 调用参照动作、Work 参照解、Task DAG 参照状态探索图。参照版本与 agent 自有版本性质相反（参照必须稳定，不被被参照者改）。ADR-0072。

### Release Version


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#release-version) — 通过 `npm install -g @istuen/openxenon@&lt;version&gt;` 从 registry 或本地 tarball 安装的 oxn；指向预编译 `dist/cli.js`；immutable；终端用户 + CI/CD 使用。配合 `scripts/oxn-switch.sh` 的 `pnpm oxn:prod` 操作。

### RFC


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#rfc) — OpenXenon 规范（规定性文档）；住 `docs/rfc/zh-cn/RFC-XXXX-&lt;theme&gt;.md`；frozen + errata 演进策略；

### Roadmap


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#roadmap) — AssetKind=roadmap 的历史术语别名。**已废弃**——主术语改为 **AssetMap**（RFC-0013 D4），避免与版本计划文档（`dev/versions/`，同名 Roadmap）混淆。AssetKind 枚举值在代码中仍为 `roadmap`（不变），glossary 主术语为 AssetMap。
- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#roadmap) — 前瞻性版本计划文档——描述未来版本将包含什么；住 `dev/versions/`；`status: planned`；frontmatter 必填 `version`。

### Round


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#round) — Work 多轮 IAP 循环（v0.6 新增），手动触发（`oxn work next-round`），maxIterations 硬限制（默认 3）。

## S-Z

### Scope


- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#scope) — OXN 引用作用域（@oxn builtin / @prj 项目级；@gbl 已废弃）。

### SkeletonForking


- [oxn-draft-promote-domain](/openxenon/assets/domains/oxn-draft-promote-domain.md#skeletonforking) — skeleton 派生规则——v0.6.2-alpha.3 起 Draft 创建时（`--target` 模式）从 `.openxenon/assets/blueprints/draft-skeletons/&lt;target&gt;[-&lt;kind&gt;].md` 派生。

### Skill


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#skill) — OXN 内置给 AI 助手的技能，用于AI 助手里通过 Skill 对 OpenXenon CLI 交互。

### Slot


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#slot) — Blueprint 内拓扑节点（slot DAG），Engine 校验无环；Task 内 Part 名必须对齐 slot 名。

### Stack


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#stack) — AssetKind 之一，实现边界（runtimes/linters/testers）；Proof 阶段直接断言。v0.6 硬要求。ADR-0054。

### Starter Asset


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#starter-asset) — `oxn init --starter` 拷贝到 `.openxenon/assets/` 的 Built-in Asset 副本；

### TargetDispatchTable


- [oxn-draft-promote-domain](/openxenon/assets/domains/oxn-draft-promote-domain.md#targetdispatchtable) — 路由 translate 表——把 Draft target 语法转成 promote-target-aware-workflow Blueprint 内部 task name：

### Task


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#task) — Align 执行单元，对齐 1 个 Blueprint 并可引用 N 个 Domain；内联 Part + Probe；DAG 无环（Kahn 校验）。

### Trace


- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#trace) — Work 执行轨迹（trace.jsonl），JSONL 追加式事件流；append-only + Trace-before-State（ADR-0009）。

### Version Fragment


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#version-fragment) — 回顾性变更日志片段；住 `.changes/0-X-Y-*.md`；版本转正时落盘；`status: released`。

### Version Hygiene


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#version-hygiene) — 版本号卫生规则——Dev Version 版本号恒严格大于已发布 Release Version 版本号；OXN CLI 不注入 build metadata（git SHA / build timestamp / "dev" 标记），版本号字符串本身是 Dev/Release 在运行时的唯一区分器。流程保障：`release-cut` workflow 的 `post-publish-bump` slot 在 publish 后**立即** bump dev 到下一个 `-alpha.0`，关闭共享版本号过渡窗口。权威定义：[ADR-0083](../../docs/adrs/0083-version-hygiene-over-build-metadata.md)。
- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#version-hygiene) — Dev Version 与 Release Version 在运行时的唯一区分器——dev 版本号恒严格大于已发布 release 版本号。OXN CLI **不**注入 build metadata（git SHA / build timestamp / "dev" 标记）；版本号字符串本身是唯一信号。判据：`oxn --version` 在 dev shell 与 release shell 输出不同字符串。关闭歧义窗口的流程保障：`release-cut` workflow 的 `post-publish-bump` slot 在 publish 后**立即** bump 3 个 package.json 到下一个 `-alpha.0`。

### Work


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#work) — 人机协作的工作空间，衔接 Asset 与 Proof；AI Agent 在 Asset 边界内自主工作（create → read Blueprint → write Context → orchestrate Tasks → execute → 汇报 → react → finalize）；具体领域见 [`oxn-work-domain`](./oxn-work-domain.md)。
- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#work) — Work 是 E2 人机协作的工作空间；编排流程 3 IAP 阶段顺序不可跳；必经路径 create→lock→run→submit×N→finalize。

### Workflow


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#workflow) — AssetKind 之一，执行边界（slot DAG + observe Probe），原 Blueprint 改名；AssetKind=workflow。ADR-0054。

<!-- SYNC:END -->
