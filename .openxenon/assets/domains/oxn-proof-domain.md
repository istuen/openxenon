---
entity: domain
name: OxnProofDomain
abstract: |
  OXN Proof 业务领域（Asset 结构 v2：Group → Axiom → Theorem）。
references:
  - oxn-engine-domain
  - oxn-work-domain
  - oxn-asset-domain
  - oxn-domain
  - oxn-draft-domain
citations: 0
synced-at: 2026-08-09
---

# Domain: OxnProofDomain

> Insight Domain 收编到本域（Insight 7 个 invariant 与 4 个 Axiom 已合并）；与 Probe 同为 Proof 的子概念（Proof = 协作过程证明，Probe = 客观传感器，Insight = 跨 Work 涌现信号）。

## Concept

### Proof
- OXN 验证 AI Agent 执行结果并记录的协作**过程**证明（不是结果证明）。执行主体 OXN Engine（记录事实不评判）；物理观测 L1-Infra + 客观结果 L0-Kernel。物理产物（`frozen.json` + `outcome.md` + `trace.jsonl` + `state.json`）是副作用，**不是** Proof 术语本身。
- 聚合结果字段详见 `### outcome`（下方）；IAP 阶段名 = Proof Domain 实例化之一（与 Intent/Align 并列，但当前已少用 Intent/Align）。
- **Proof = 协作过程证明，非结果证明**——OXN 记录"如何验证"的过程，不持有"任务是否合格"的判定；合格判定归工程师。
- **Proof 物理四件套**——`frozen.json`（不可变快照）+ `outcome.md`（人类可读）+ `trace.jsonl`（事件流）+ `state.json`（运行时状态）；4 文件必须同步产出。
- **Proof 与 Insight 正交**——Proof 是单次协作过程产物；Insight 是跨 Work 涌现信号；两者职责分明，不可混用。

### ProofAsObjectiveOutcome
- PEAS 客观产物——不是传感器。真正传感器分裂：AI 工具 I/O（非确定）+ Probe（确定，OXN 自有，AI 主动调用自证）。
- OXN 验证 AI Agent 的执行结果（ProbeOutcome 三态），不评判执行内容的好坏。
- 原则：OXN 验证事实不评判质量——"彻底不判"。
- **彻底不判原则**——OXN 不持有 Performance Measure（P 外包给工程师，详见 oxn-domain §PerformanceMeasureNotEnforced）；ProbeOutcome 三态是事实陈述，非合格判定。

### ProbeOutcomeThreeStates
- 三态：`COMPLETED` / `DEVIATED` / `INCONCLUSIVE`（frozen.json uppercase + -ED 是 JSON Schema enum 惯例；proof.md human canonical 用 `pass/fail/inconclusive`；Kernel TS union 用 `PASS/FAIL/INCONCLUSIVE`）。
- 中性：探测目标是否符合预期；"完成"指探测完成，不是目标完成。
- OXN 验证动作：AI Agent 提交执行结果后，OXN 跑 Probe → 产出 ProbeOutcome。
- **三态不可新增**——禁止引入第 4 态（如 TIMEOUT / CANCELLED / SKIPPED）；异常情况走 INCONCLUSIVE + InterferenceFlag 标注。
- **三态语义边界**——COMPLETED = 探测目标符合预期；DEVIATED = 不符合；INCONCLUSIVE = 无法判定（受 InterferenceFlag 影响）。

### Outcome
- Proof 聚合结果。在 schema 中以 `summary` 容器出现：
- **禁止**：在 aggregate 层直接使用 `outcome` 字段名（撞名 ProbeOutcome 专用字段，详见 inv-27），必须用 `summary.<...>` 形式。
- `passed: boolean` 是 v0.1 legacy 兼容字段，将随 v0.8 移除。
- **Outcome 聚合 ≠ ProbeOutcome 单点**——aggregate 层 outcome 是 Work 级别（3 态数量），per-probe outcome 是 Probe 级别；命名空间严格隔离。

### OutcomeAggregateStructure
- 结构：`{completed: N, deviated: N, inconclusive: N}`。
- 不聚合判定：OXN 不做"整体合格/失败"聚合判定；只提供各状态 Probe 数量。
- 判定权归工程师。
- **Aggregate 容器包裹**——v0.7+ 计划 frozen.json 顶层加 `summary` 容器包裹 outcome/totalCount/passedCount/failedCount/inconclusiveCount；per-probe `outcome` 字段保留。

### BuiltinPart
- OXN 内置零件（封装可复用工程动作如 git-commit），引用 @oxn/parts/* scope。
- 向后兼容：`Part` 作为 `BuiltinPart` 的 deprecated alias 保留至 v0.8 移除（PR-G 已加 @deprecated JSDoc）。
- **BuiltinPart 在 Engine 编译产物内**——消费项目无法修改 Part 实现；确定性根基（与 TrustBaselineLadder §Baseline 同源）。

### ReferenceScope
- OXN 引用作用域（@oxn builtin / @prj 项目级；@gbl 已废弃）。
- 向后兼容：`Scope` 作为 `ReferenceScope` 的 deprecated alias 保留至 v0.8 移除。
- **三层优先级**——`@prj/` > `@gbl/`（已废弃） > `@oxn/`；项目覆盖 builtin；同 kind 解析冲突时 `@prj/` 优先。

### Trace
- Work 执行轨迹（trace.jsonl），JSONL 追加式事件流；append-only + Trace-before-State。
- **Trace before State**——state.json 写盘前必先 append trace.jsonl；事件顺序保障（arch-guard 测试 trace-before-state 守门）。
- **Trace 不可篡改**——append-only；Engine 不提供 trace 编辑接口；如需修正走 Draft → 新 trace.jsonl 关联。

### Probe
- (1) **builtin 探针**：`packages/engine/src/builtin/probes/*.ts`（19 个 Engine 内置实现，v0.6.4 builtin catalog 不变）
- (2) **项目探针文档**：`/Users/issac/pro/openxenon/.openxenon/probes/*.md`（v0.6.4 PR-E 从原 `.openxenon/assets/probes/` 迁移；与 Asset 平级不混 Asset）。物理文件后缀 `.md`（含 Probe 契约规格），不是 `.ts` 实现；运行时由 `packages/engine/src/Proof/probe-lint.ts` 解析后挂到 registry。Engine 在 builtin + 项目路径下查找（@oxn + @prj scope 二元），找不到 → 报 `OXN_PROBE_NOT_FOUND`（YIELD_TO_HUMAN）。
- **Probe ≠ Asset**——Probe 是契约规格（.md），Asset 是环境约束（5 类）；两者职责分明，Probe 不入 catalog.json。

### ProbeOutcome
- 映射边界在 `buildFrozenProof` / `proof-compiler.ts`（proof-frozen-writer.ts:11-25 记录）
- "完成"指探测完成，不是目标完成；`outcome` 字段仅 Probe 内部专用（aggregate 层不可用，详见 inv-27）
- **ProbeOutcome 命名空间**——per-probe `outcome` 字段位置 `probes[<useName>].outcome`；aggregate 层禁止同名使用，详见 inv-27。

### UseName
- 业务场景名 = 一次 Probe 使用的**业务场景名**（"这次要验证什么"）。在 proof.md 是 H3 key，在 frozen.json 是 `probes` 对象的 key。字符集约束 `^[a-zA-Z0-9-]+$`（保证可作 JSON object key）。

### ProbeName
- Probe 本体名 = Probe 实体自己的名字（catalog 注册名）。从 `ref` 去除 `@oxn/probes/` 前缀派生（如 `ref: "@oxn/probes/fs-exists"` → `probeName: "fs-exists"`）。

### InterferenceFlag
- 真实枚举 = 9 RED + 3 YELLOW = 12 项（trust-baseline.ts:23-36；domain 旧注释 "8 RED + 4 YELLOW" 是历史勘误）
- RED（短路 → INCONCLUSIVE）：`waf_detected` / `just_modified` / `detached_head` / `shallow_clone` / `sandbox_violation` / `network_timeout` / `response_truncated` / `permission_denied` / `unknown`
- YELLOW（透传 + 记录）：`cdn_cache` / `cache_path` / `symlink`
- RED/YELLOW 不可配置（信任是系统决策不是用户决策）
- **12 项枚举封闭**——新增 InterferenceFlag 必须修改 trust-baseline.ts 源码 + Domain 同步；禁止运行时配置新增。
- **信任不可绕过**——Step 内 Probe 不允许声明"忽略" InterferenceFlag；信任基线由系统强制执行（详见 TrustBaselineLadder）。

### SchemaFieldMapping
- Probe 本体名 `probeName`（string）：从 `ref` 去除 `@oxn/probes/` 前缀派生；位置 `probes[<useName>].probeName`
- 业务场景名 `useName`（string）：proof.md H3 key / frozen.json `probes` object key；位置 `probes.<key>`；字符集约束 `^[a-zA-Z0-9-]+$`
- Probe 引用 `ref`（string）：`@oxn/probes/<probeName>` 形式；位置 `probes[<useName>].ref`
- 运行时类型 `probeType`（string）：runtime 派发键（snake_case）；位置 `probes[<useName>].output.observation.probeType`
- 实现文件 `file`（string）：`packages/engine/src/infra/probes/<probeName>.ts`
- 验证结果 `outcome`（enum）：仅 Probe 内部专用；位置 `probes[<useName>].outcome`（aggregate 层不可用，详见 inv-27）

### TargetFrozenJsonStructure
- 目标 frozen.json 结构（计划中，非当前实现）—— 关键改动：`probes` 从 array 改 object（key = `useName`）；新增 `summary` 容器包裹 aggregate 字段；`outcome` 字段只剩 per-probe
- 顶层字段：`name`（proof 名）+ `runAt`（ISO 时间戳）+ `summary`（聚合容器：outcome/totalCount/passedCount/failedCount/inconclusiveCount）+ `probes`（object，key = useName）+ `_xenon_meta`（frozen_at + content_hash）
- per-probe 字段：`probeName` / `ref` / `description` / `target` / `outcome` / `passed`（v0.1 legacy）/ `output.observation.{probeType, interference.flags, executedAt}` / `durationMs` / `errorMessage`（失败时）
- 迁移映射：v0.7 起 planLock freeze 时双写 v0.1 + 目标结构，逐步替换；`passed: boolean` 字段随 v0.8 移除

### Insight
- v0.3.0（D1）：Insight **经 Draft 通路**写入（origin=insight），不再经 Intent Pool v3 5 池机制。review/discard 由工程师对 Draft 生命周期决定。
- **Insight 是原料提供者，非推理者**——OXN 不自动用 Insight 做决策；review/discard 由工程师对 Draft 生命周期决定。
- **Insight 跨 Work 涌现**——单次 Work 不产出 Insight；Insight 是跨 Work 模式识别（详见 oxn-work-domain §Round maxIterations 软反馈）。
- **Insight 不入 Proof 物理四件套**——Insight 走 Draft origin=insight 通路；不污染 frozen.json / outcome.md / trace.jsonl。

### Citation
- 资产反向引用计数 + 影响半径（impactRadius: low/medium/high/critical），自动维护、归档保留。
- **Citation 自动维护**——Asset 被引用（Work/Task/Asset）时自动 +1；归档保留但不再变化。

### InsightDraftMapping
- research / audit / journal → Draft `report`
- design → Draft `design`
- issue → Draft `issue`
- 零信息损失；frontmatter `origin: insight` 标识 producer；`promote-target` 由工程师在 review 时选定。

### TrustBaselineLadder
- 信任基线分层——Probe 信任设计为 3 档分层，每层定义信任级别 + 升级路径 + 不可绕过性。
- **Baseline（基线）**——Engine 内置的 Probe 默认信任（Provider 来自 packages/engine/src/infra/providers/ 编译产物）；外部项目消费构建后的 OXN，**无法修改** Probe 执行代码；这是确定性根基。
- **Step（步进）**——同次 Proof 内的 Probe 互信（同 frozen.json 的所有 Probe 共享同一 `runAt` 时间窗 + 同一 Engine 实例 + 同一文件系统快照）；Step 内 Probe 可互参，但 Step 之间不互参（避免跨 Proof 误信）。
- **Cumulative（累计）**——跨 Proof 的统计性置信度（如 Pattern 的 occurrences ≥ 3 阈值，Inv35）；不作为单次 Proof 通过/失败的依据，只在 Insight 层做趋势判断。
- **InterferenceFlag 不分级**——锁定：所有 RED flag 短路至 INCONCLUSIVE；所有 YELLOW flag 透传并记录；信任是系统决策不是用户决策。
- **不可降级**——Step 内 Probe 不允许声明"忽略"某些 InterferenceFlag；信任基线由系统强制执行，不接受配置项绕过。

## Forbidden

### ForbiddenConstructs
- Resource
- Template
- Config
- Definition
- GlobalAsset
- Evidence
- Plan
- Spec
- Recipe
- Job
- Runbook
- HARD_FAIL
- SOFT_FAIL
- VerdictAsException
- FailureAsCrash
- OXN_INTERNAL_ERROR_AS_IAP
- StackTraceToAI
- HARD_HALT_AS_IAP
- Signal
- TaintMark
- Corruption
- Pollution
- Taint
- Boundary Deviation
- 干涉
- outcome
- Forge
- DesignNote
- WorkLog
- ResearchPaper
- autoInsightApply
- autoPatternPromote

### ForbiddenTrustMarkAndBoundaryDeviation
- Taint / TaintMark / Boundary Deviation / 干涉 四个旧术语的唯一收敛目标 = InterferenceFlag。中文"干涉"统一为"干扰"（http-provider.ts:13 / file-provider.ts:13 当前混用）。Boundary Deviation 已标记过渡 term，0.6.3 起彻底 ban。

## Boundary

### Inv1BuiltinProbeTypes
- Builtin 探针类型必须是 fs_exists / fs_not_exists / fs_match / shell_exec 之一（v0.1 范围）。

### Inv2BuiltinVersionMonotonic
- Builtin 资产版本（_version）单调递增，不可降级。

### Inv3BuiltinNoPrjDep
- Builtin 资产不依赖任何 @prj 资产（避免循环引用）。

### Inv4KernelZeroIo
- Kernel 永远不触碰物理世界：不调用 fs.existsSync / 任何 IO（fs.* / net.* / child_process 一律不出现）。

### Inv5InfraNoVerdict
- Infra 只回答事实，不做判定：Infra 不能宣布 COMPLETED / DEVIATED（不能给自己盖章）。

### Inv6InfraNoSelfDone
- Infra 不能绕过 Daemon 自己宣布 Work 完成（行政不能给自己盖章）。

### Inv7DaemonNoRuleMutate
- Daemon 不能修改 Kernel 规则（司法不能立法）。

### Inv8KernelNoDirectTask
- Kernel 不能直接执行 Task（立法不能行政）。

### Inv9ProbeDeviationNotifiesNotBlocks
- ProbeOutcome DEVIATED 时 Daemon 通知工程师（不阻断 Work 进入 done）；原 inv-9 "escape-on-probe-fail" 已被废弃——OXN 不阻断，只记录。

### Inv10ProofNeutralRecord
- Proof 是中性的客观事实记录（不带立场判定）；原 inv-10 "proof-has-position" 已被废弃——OXN 不判定合格/不合格；判定权归工程师基于 outcome 聚合结构自行判定。

### Inv11FrozenImmutable
- FrozenJson（frozen.json）生成后只读：AI 与工程师都只能读，禁手改。

### Inv12SignatureTamperDetection
- frozen.json 签名被外部篡改 → 抛 OXN_CRASH_SIGNATURE_MISMATCH（防线击穿），进程退出 2。

### Inv13TraceAppendOnly
- Trace（work-trace.jsonl）只能追加写、不能重写；append-only 约束；Trace-before-State。

### Inv14RedFlagInconclusive
- 8 项 RED flag 触发 INCONCLUSIVE：waf_detected / just_modified / detached_head / shallow_clone / sandbox_violation / network_timeout / response_truncated / permission_denied。

### Inv15YellowFlagPassThrough
- 4 项 YELLOW flag 透传记录，不改变 outcome：cdn_cache / cache_path / symlink。

### Inv16FileProviderNoExec
- FileProvider.ioExec 必须抛 IAPError（file provider does not implement io.exec; use shell:// URI）。

### Inv17HttpWafBlacklist
- HttpProvider WAF 头黑名单 6 项硬编码（cf-ray/x-sucuri-id/x-akamai-transformed/x-imperva-id/x-azure-ref/x-aws-waf-token）。

### Inv18SandboxNoCodeGen
- 沙箱 context 禁动态代码生成（codeGeneration: { strings: false, wasm: false }）。

### Inv19BootstrapNotThrow
- ProviderRegistry.bootstrapFromDisk 遇 CORRUPTED/MISSING 不抛错，仅标 status 计数。

### Inv20WorkPrecheckOnlyThisWork
- workPrecheck 仅阻断该 Work（v2 核心倒置：其他 Work 不受影响）。

### Inv21DaemonStartupNoNetwork
- daemonStartup 启动期只读 + 不触网（v2 核心倒置：CORRUPTED 标状态不阻断 Daemon）。

### Inv22ProbeFromBlueprint
- Probe 标准必须来自 Blueprint 的 observe 数组（Intent 阶段），不能由 Align 阶段运行时追加。

### Inv23ProbePassImpliesFixed
- 单向 Blueprint 修复语义（One-Shot Blueprint Fix Semantics）—— Blueprint 是 slot DAG 单向流（`oxn-work-domain.md:inv-29 task-no-reverse-blueprint` 已锁 Task 不反改 Blueprint）；ProbeOutcome=COMPLETED 即意味着该 Boundary 的目标已满足 = fixed，无需显式"fixed" 状态。DEVIATED → 工程师读 Report → 开**新 Work**（同一 Blueprint 或调整后）—— 非 Blueprint retry，非自动 loop。自动的是"Probe 验证自动跑"，非"修复自动循环"。

### Inv24ProofCodeImmutability
- Probe 执行代码不可变是确定性根基——OXN 构建产物（其他项目消费构建后的 OXN，无法修改代码）。Asset 暴露 Probe 调用契约（有哪些、怎么调用）不破坏确定性；Probe 执行可由 Asset 派生参数（stackTools）参数化——参数化改变观测行为不改变代码。「验证标准 AI 不可见」是软对抗（提高针对性绕过成本）非确定性根基。

### Inv25ProofFirstFloor
- Proof 是 OXN 下限——`oxn proof` 命令独立于 Work/Asset 可用。OXN Engine 不强制 AI 走完整 IAP 流程；Proof-First 是 OXN 给工程师的**核心确定性工具**（5 分钟上手，AI 假完成 OXN 不骗自己）。

### Inv26Probe5LayerNaming
- Probe 的 5 层名都在 Probe Domain 内：`probeName` = 本体名（catalog 注册名）；`useName` = 业务场景名（key 字符集 `^[a-zA-Z0-9-]+$`）；`ref` = scope + 本体名（`@oxn/probes/<probeName>`）；`probeType` = runtime 派发键（snake_case）；file = 实现文件（`packages/engine/src/infra/probes/<probeName>.ts`）。5 层不可省略、不可互换。

### Inv27OutcomeProbeOnly
- `outcome` 字段是 Probe 内验证结果专用；aggregate 层（Proof 聚合）**禁止**直接使用 `outcome` 字段名，必须使用 `summary` 容器包裹 outcome + 计数。`passed: boolean` 是 v0.1 legacy 兼容字段，将随 v0.8 移除；新代码必须使用 outcome。

### Inv28InterferenceFlagCanonical
- InterferenceFlag 是信任/污染/干扰三个语义领域的唯一术语；`Taint` / `Boundary Deviation` / `TrustMark` 永久 ban。基础 RED/YELLOW 映射不可配置（信任是系统决策不是用户决策）。

### Inv293StateSpellingLayered
- Probe 验证的 3 态拼写分层（human canonical `.md` lowercase / machine SSOT JSON uppercase -ED / Kernel ProbeOutcome TS union uppercase 无 -ED）是设计；禁止在边界外互换。映射边界固定在 `buildFrozenProof` (proof-frozen-writer.ts:45-79) 和 `proof-compiler.ts:parse()`。

### Inv30InsightWritesDraft
- Draft 物理位置：`.openxenon/drafts/<drafttype>-<slug>.md`（.openxenon/drafts/ 路径不变）。
- Draft frontmatter 必含 origin=insight，由 Insight 内部 SK 注入；工程师可改 origin=human 标记为手写反思。
- 资产路径 `.openxenon/pools/` 不创建；引擎层 `writePoolEntry` 不被 `oxn insight` 调用。

### Inv31InsightManualGateViaDraft
- 闸门步骤：`oxn draft list --origin=insight` 列出产出 → 工程师 `oxn draft show` 检视 → 决定 `archive`（搁置 / 不需要升）或 `promote --target <rfc|asset|work>`（升华为决定）→ 或 `discard --force`（废弃）。
- 替代旧机制：`oxn pool {review,approve,reject}` 5 命令全部抛 `OXN_POOL_DEPRECATED`。

### Inv32InsightDraftTypeMapping
- Insight→Draft type 映射锁定（§InsightDraftMapping term）：research / audit / journal → Draft `report`（合并到 report-*.md）；design → Draft `design`；issue → Draft `issue`。0 信息损失；3 DraftType 与 domain 锁定的 3 类一致。

### Inv33PatternPersistence
- v0.3.0 起 Pattern 来源仅 Draft（origin=insight 的 report 类）；不再从 pool 派生。
- 原 inv-7 重新编号。

### Inv34InsightOutputScope
- v0.3.0 起 Draft body 字段约束：报告含 `# 边界使用` 或 `# 触碰模式` 或 `# Loop 收敛轨迹` heading 之一；heading-skeleton-check 仅检查 drafts/。

### Inv35CrossWorkPatternThreshold
- v0.3.0 起 Pattern 计数 source = `origin=insight` 的 report 类 Draft。

### Inv36InsightApplyValidates
- v0.3.0 起 apply target 仅 Draft lifecycle（archive / promote / discard），不再作用于 pool entry。