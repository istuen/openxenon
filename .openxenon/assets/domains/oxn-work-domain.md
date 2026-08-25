---
entity: domain
name: OxnWorkDomain
abstract: |
  OXN Work 业务领域（Asset 结构 v2：Group → Axiom → Theorem）。
references:
  - oxn-domain
  - oxn-engine-domain
  - oxn-asset-domain
  - oxn-probe-domain
citations: 0
synced-at: 2026-08-09
---

# Domain: OxnWorkDomain

## Concept

### Work
- Work 是 DAG 协作空间（D15/D13）；编排流程 create→run→submit 顺序不可跳（D10/v1.3 D1 简化）。

### WorkAsSolutionReference
- PEAS 解的目标参照——AI 把理解的上下文按 Blueprint 写成 Work 作解参照，每个 Task = 解的原子动作。
- 不是执行器（修正：OXN 是确定性参照系）——Work 是 AI 调用 OXN 确定性通道的协议/接口。真正执行器分裂：AI 工具调用（非确定）+ OXN writer（确定）。
- OXN 不做业务 goal-test（OXN 只记事实不判合格）；Work 自带结构性完成参照（所有 Task submitted = 结构完整，AI 可自检）。

### Phase
- Work 生命周期阶段（create/run/submit 之一），按顺序不可跳。子步骤按阶段分别定义。
- 🗑️ v1.3 D1/D2：lock 阶段已删；validate 阶段并入 run --validate-only。

### Task
- Align 执行单元，对齐 1 个 Blueprint 并可引用 N 个 Domain；内联 Part + Probe；DAG 无环（Kahn 校验）。

### Slot
- Blueprint 内拓扑节点（slot DAG），Engine 校验无环；Task 内 Part 名必须对齐 slot 名。

### Part
- Task 内 skill 执行单元（skill_context + acceptance），内联在 task.md 内不可独立成文件。

### Probe
- 物理观测单元（prop 输入 + output 判定），内联在 part 内；标准必须来自 Blueprint observe 数组。

### BirthCert
- Work 静态资产快照（.work 目录或运行时读 work.md ## Use），含 assets（domain/blueprint fileHash 快照）。不再含 planLock（v1.3 D2）。

### HashAsSubmitFingerprint
- Hash 语义从"防改锁"重定义为"submit 时刻的完成指纹"。submit 时算 work.md 的 sha256 hex，记入 trace.jsonl 的 SUBMIT 事件属性 workMdHash。改 work.md 不阻断 submit，仅可观测。
- 语义：完成盖章，不是防改锁。

### DriftObservableNotBlocking
- workMd hash 变化时不阻断 submit。submit 时读 trace.jsonl 找上次 SUBMIT 的 workMdHash；不一致 append 一条 ASSET_DRIFT 事件（不阻断）。指纹数 = submit 次数；多次 DRIFT = Blueprint 或 AI 遇到问题（可观测不硬编码判断）。
- 载体：trace.jsonl 的 ASSET_DRIFT 事件（不存 state.json）。

### Artifact
- Align 阶段产出的物理事实（被 Probe 观测的对象），路径必须落在 Work 沙盒内或宿主项目目录。

### Loop
- Work 核心动态过程；物质运动态；所有变化被 trace 记录（D13）。

## ContextEngineering

### ContextMD
- Work 内上下文文件（works/<id>/context.md）；AI Agent 按 Blueprint ## Context Template 从 ## Use 引用的 Assets 组装。
- 🗑️ v1.3 D2：不再纳入 PlanLock hash（旧 workContextHash 已删）；context.md 仍存在但锁状态不再由 hash 保护。

### WorkContext
- Work 级上下文内容（语义层）；AI Agent 按 Blueprint Context Template 从 Use refs 引用的 Domain/Workflow/Stack 提取相关 Terms/Invariants/Slots 编写；同一 Blueprint 的 N 个 Work 的 WorkContext 结构一致（除 Goal 外）。

### TaskContext
- Task 级上下文内容（语义层）；AI Agent 从 WorkContext 按 Blueprint ## Boundaries 的每个 Slot 拆分；每个 TaskContext 携带 WorkContext 中与该 Slot 相关的子集 + 该 Slot 的 acceptance。
- 🗑️ v1.3 D2：不再纳入 PlanLock hash（旧 taskContextsHash 已删）。

### MemoryMD
- Work 级动态记忆文件（works/<id>/memory.md，Phase 2 实现）；Loop History + Key Observations + Round Notes；不纳入 PlanLock；append-only 追加；原 context.md 实体名改为 memory.md。

### WorkMemory
- Work 级动态记忆内容；Round 间追加；不纳入 PlanLock；与 PlanLock 保护的 WorkContext 形成"声明 vs 动态"二分。

### TaskMemory
- Task 级动态记忆内容；Round 间追加；不纳入 PlanLock。

### ContextTemplate
- Blueprint 内上下文组装指令段（## Context Template）；可选，缺省 Engine 用内置默认模板（基于 Use refs + Boundaries + Goal 推导）；Blueprint 可覆写默认（如 bug-fix-blueprint 在 diagnose 段加"证据落盘"指令）。

### Scope
- Blueprint 内文件范围声明段（## Scope）；allow/forbid glob 列表；静态锁定，PlanLock 保护；与 Blueprint ## Use 引用机制正交（Scope 是文件边界，Use 是 Asset 引用）。

### ArtifactDeclaration
- Task 内声明的预期产物路径列表（## Artifacts）；lock 时 Engine 校验 ⊆ Blueprint Scope.allow AND ∩ Scope.forbid = ∅；与运行时 Artifact（含 hash）区分。

### Operate
- Blueprint slot 内执行参照数组（`## Boundaries ### <slot> - operate: [name...]`）；声明 AI Agent 在该 slot 应运行的 Operation 名列表。work-context-builder 在 lock 期解析 BlueprintIR.boundaries[].operate → 匹配 Blueprint 引用的 Stack tool.operations → 注入 WorkContextResult.slotOperations（只到 name，不注入完整 command）。AI Agent 从 Task context 看到 operation 名 → 从已注入的 stackTools 解析 command → 执行。
- 语义：**参照**（声明 AI 该跑什么），**不是门禁**（AI 可自主决定跑或不跑，如有信心跳过 test；submit 后 observe Probe 独立验证）。与 observe 正交：operate = 执行参照（AI 跑），observe = 验证参照（OXN 跑）。operate 纳入 PlanLock（随 Blueprint blueprintsHash 锁），drift 检测与现有机制一致。

### SlotFoldingRule
- 4 通用 slot：`retrieve` / `design` / `develop` / `test`（v2 基础）。5 专用 slot：`cli-add` / `ts-implement` / `refactor` / `git-branch`（v0.6.4 PR-C 折入自原独立 Workflow）。
- slot 选择优先级：(1) Blueprint `## Use` 内 `slot: <name>` 显式字段（最高）；(2) sub-target 映射（`promote-asset-workflow` → `test` slot；`promote-rfc` → `design` slot）；(3) goal 关键词匹配（"CLI" → cli-add；"重构" → refactor；"TS" → ts-implement；"git" → git-branch）；(4) 默认 `test`（保证所有 dev 流程都包含验证）。
- 折叠后 Blueprint `## Use workflow: @md/workflows/dev-workflow` 不需 slot 字段；OXN 自动路由（work-context-builder 在 lock 期解析）；旧 4 个独立 workflow（add-cli-subcommand / ts-retrieve-design-develop-test / refactor-safe / git-workflow）已删除（v0.6.4 PR-C）。

## Forbidden

### ForbiddenConstructs
- WorkV0Layout
- V0Bypass
- BypassLock
- BypassValidate
- BypassMigrate
- oxn-work-new
- oxn-work-task-create
- PhaseSkip
- DirectSubmit
- UnlockedRun
- InlineAsset
- oxn work new
- oxn work task create
- auto-promote-work
- DirectCopyToDocs
- SkipPromoteWork
- Job
- TaskRun
- Execution
- Pipeline
- Plugin
- Extension
- Hook
- PromptTemplate

## Boundary

### Inv1IAPPhasesNoSkip
- 生命周期顺序不可跳：create → run → submit；违反 → IAPError 拒绝。
- 🆕 v1.3 D1：lock 步已删，3 步顺序强制。

### Inv5RunBeforeSubmit
- run 成功后才能 submit：缺 .run/state.json → IAP_ALIGN_WORK_NOT_RUNNING (YIELD_TO_HUMAN)。

### Inv9AssetKindViaWork
- --asset-kind X 走标准 Work 流程（Phase C）：选 asset-create workflow + 4 task 骨架；不再是短路。

### Inv10V0MigrateRequired
- V0 布局必须先 oxn work migrate 才能走 V1 路径；V0 直接 run → IAP_ALIGN_V0_LEGACY_BLOCKED。
- 🆕 v1.3 D2：migrate 后不再要求 lock。

### Inv11MigratedV0Preserve
- MigratedV0Dir 保留 V0 备份供审计；OXN 不自动清，工程师手动清理（避免误删导致不可恢复）。

### Inv12RefFailFast
- Work 引用 Asset 用 domain X ref @prj/{dir}/{name}；@prj 寻址必须实际存在（CLI 加载期 fail-fast）。

### Inv13TaskPartSlotAlign
- Task 内 Part 名必须对齐 Blueprint Slot 名；不对齐 → work run 时找不到对齐目标（DEP_NOT_FOUND）。

### Inv14TaskDagNoCycles
- Work 内 task DAG 必须无环（Kahn's algorithm 校验）；有环 → IAP_INTENT_DAG_CYCLE（YIELD_TO_HUMAN，含 cycleHint）。

### Inv15AssetKindNotShortcut
- --asset-kind 走标准 Work 流程（不是短路）；oxn asset create 是 alias（内部调 oxn work create --asset-kind）。

### Inv16CliRequiredArgs
- oxn work run --work-file 必填；oxn work submit --work-name + --task 必填；少参数 → OXN_CLI_INPUT_ERROR。

### Inv17NoCreateNewAlias
- oxn work new 已在 v1.0 移除；CLI 拒绝 unknown command 'new'（不能是别名）；统一用 oxn work create。

### Inv21RunAllowRerunPending
- oxn work run 行为变更：state.status=pending/running 时允许重新调用（re-run 自动重置 deviated/running task → pending，completed 保留）；state.status ∈ {completed, deviated, error}（已 submit）时拒绝，报 OXN_WORK_ALREADY_FINALIZED。

### Inv22ArtifactInSandbox
- Artifact 路径必须落在 Work 沙盒内或宿主项目目录。

### Inv23TraceAppendOnly
- work-trace.jsonl 只能追加写，不能重写。SUBMIT / ASSET_DRIFT（v1.3 D3/D4）也是 append-only。

### Inv24ProbeFromBlueprint
- Probe 标准必须来自 Blueprint 的 observe 数组（Intent 阶段），不能由 Align 阶段运行时追加。
- 🆕 v1.3 D8：acceptance 即 Probe 标准，submit 时 Probe COMPLETED 才算完成；Work 不判断"改得对不对"，只记录"改了"（DRIFT）+ "Probe 结果"。

### Inv25DomainBlueprintIsolated
- Domain 与 Blueprint 必须在不同文件、互不引用：业务 Intent 不知道技术 Intent，技术 Intent 不知道业务 Intent。

### Inv26NoUpstreamNoDownstream
- 没有上游对象就不允许产生下游对象：没有 Domain 时 Blueprint 不许使用未定义的 term。

### Inv27UpstreamFrozenThenDownstream
- 上游冻结后下游才能展开：Blueprint 未通过 oxn blueprint validate → Work 不许实例化。

### Inv28TaskNoReverseBlueprint
- Task 执行结果不能反改 Blueprint 声明（真相解释权单向，不允许对齐结果回灌意图）。

### Inv30ChannelOnlyTracking
- Work 追踪只覆盖 OXN 通道内行为（state.json + trace.jsonl 记录状态机事件），不记录 AI Agent 在通道外的行为（读代码、试方案、放弃、推理过程）。通道外 = OXN 边界外，OXN 不强制 AI 留在通道内。通道内追踪是协作边界的**特征**（非缺陷）——chat 提供推理可见性（临时），Work 提供证据持久性（持久），两者信息源不交叉是设计选择。

### Inv34ArtifactsWithinScope
- Task ArtifactDeclaration ⊆ Blueprint Scope.allow AND ∩ Scope.forbid = ∅：run 时 Engine 对每个 Task ## Artifacts 段中每个 path 跑 glob 校验；违反 → IAP_INTENT_SCOPE_VIOLATION (YIELD_TO_HUMAN)，列出违规 path + Scope 段。Scope 段不存在时，allow 默认为工程根全树（`**`），forbid 为空（向后兼容）。
- 🗑️ v1.3 D2：lock 时校验改为 run 时校验（lock 已删）。

### Inv35OperateIsReferenceNotGate
- operate 声明 AI Agent 的执行参照，**不是**强制门禁。OXN 不验证 AI 是否实际运行了 operate 中的命令（通道外行为不可追踪，inv-30 channel-only-tracking）—— 验证由 observe Probe 独立承担（AI 经 CLI 跑 Probe，ProbeOutcome 记 Work trace，D27）。operate 与 observe 正交：同一命令 AI 跑一遍 + Probe 跑一遍的冗余是设计特征（AI 跑是工作流先自检，Probe 跑是工具能力检查），非缺陷。与「OXN 不判质量只记事实」一致：OXN 不评判 AI 是否遵循 operate，只记录 Probe 验证结果。