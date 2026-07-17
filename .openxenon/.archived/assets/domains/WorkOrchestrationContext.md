---
entity: domain
version: 0.3.0
name: WorkOrchestrationContext
oxn-source-sha: 8fb70f028b2a81b43a37500bd288ec26cd598fac382b69685e7c8379a58093d4
synced-at: 2026-07-08T13:52:19.207Z
---

# Domain: WorkOrchestrationContext

> **🔁 迁移公告（v0.7 RFC W5）**：本 Domain 已被
> [`oxn-work-domain`](./oxn-work-domain.md) 聚合合并。
> Layer 2 E2 SSOT 见新 Domain；本文件保留供追溯，W8 收尾删除。

> Work v1.1 3 IAP 阶段实体编排限界上下文: Intent(create/add-task/lock) → Align(run/submit) → Proof(finalize);PlanLock 3 组件 hash 守卫 + BirthCert 静态门禁卡;lock 内含 validate(语法+DAG+引用)

## Terms

### WorkV1
- desc: v1.1 引入的 Work 沙盒布局: works/<w>/work.oxn + .work (静态卡) + .run/ (运行时);V0 布局需先 migrate

### IAPPhase
- desc: Work 三阶段实体: Intent(工程师主权) / Align(AI主权) / Proof(Engine主权);阶段边界稳定,子步骤可变

### Intent
- desc: 工程师主权阶段: 声明意图+选Asset边界+锁定不可变;子步骤: create → [add-task?] → lock(内含validate)

### Align
- desc: AI主权阶段: 多Round对齐执行task;子步骤: run → submit × N;Round循环由next-round手动触发

### Proof
- desc: Engine主权阶段: 跑探针+写verdict+标记终态;子步骤: finalize → 写frozen.json

### Phase
- desc: 3 IAP 阶段实体的一个阶段: Intent/Align/Proof;按顺序不可跳;子步骤可变(create/add-task/lock/run/submit/finalize)

### Init
- desc: oxn work init: 创建 .openxenon/ 边界 + ProjectConfig;不创建 work

### Migrate
- desc: oxn work migrate: V0 布局 (works/<w>/*.oxn 散文件) -> V1 布局 (works/<w>/{work.oxn, .work, .run/});复制 + 备份到 .migrated-v0/

### Create
- desc: oxn work create <w> --blueprint <bp>: 写 work.oxn 骨架 + 自动生成 task 骨架;Intent 阶段子步骤

### AddTask
- desc: oxn work add-task --work <w> --task-name <t> --blueprint <bp> [--domain <d>]: 追加 task.oxn;Intent 阶段可选子步骤

### Validate
- desc: oxn work validate <w> = lock --dry-run: 校验 work.oxn 语法 + task DAG 无环 + Asset 引用存在;通过后写 .work (BirthCert);Phase D 起 lock 内含此步骤

### Lock
- desc: oxn work lock <w>: validate 内含(语法+DAG+引用) + 算 3 组件 hash 写入 .work.planLock;锁后任何漂移 = IAP_ALIGN_LOCK_HASH_MISMATCH

### Run
- desc: oxn work run <w>: 启动状态机;落 .run/state.json + trace.jsonl;Align 阶段子步骤

### Submit
- desc: oxn work submit <w> --task <t>: 推进 task 内 part 状态;Align 阶段子步骤

### Finalize
- desc: oxn work finalize <w> [--verdict V]: 收口+写frozen.json+标记终态;Proof 阶段唯一子步骤

### BirthCert
- desc: Work .work 静态门禁卡: planLock (3 hash) + assets (blueprint fileHash + domainRefs/workflowRefs/stackRefs) + context (goal/constraints/maxIterations);写一次后只读

### PlanLock
- desc: BirthCert 内不可变快照: workOxnHash + blueprintsHash + tasksHash + allHash;锁后任何漂移 = LOCK_HASH_MISMATCH

### DAG
- desc: Work 内 task 依赖图;无环 (Kahn's algorithm 校验, 含 cycleHint 提示);V0 layout 隐式依赖 name 引用,V1 显式 deps=['a','b']

### RefPool
- desc: Work 级声明的 domain/blueprint/part/probe ref 池;Task 只能从 RefPool inject;不可直接 import 资产

## Bans

### forbidden-constructs
- items:
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
- desc: WorkV0Layout, V0Bypass, BypassLock, BypassValidate, BypassMigrate, oxn-work-new, oxn-work-task-create, PhaseSkip, DirectSubmit, UnlockedRun, InlineAsset, oxn work new, oxn work task create, auto-promote-work, DirectCopyToDocs, SkipPromoteWork

## Invariants

### inv-1
- value: 3 IAP 阶段顺序不可跳: Intent → Align → Proof;违反 -> IAPError 拒绝

### inv-2
- value: Intent 子步骤: create → [add-task?] → lock(内含validate);lock 内先validate(语法+DAG+引用)再hash

### inv-3
- value: lock 内含 validate: 无需先跑 validate;lock --dry-run 保留只校验不锁

### inv-4
- value: lock 成功前不能 run: 缺 planLock -> 拒绝启动;unlock 状态可 run 但不写 .run/state.json

### inv-5
- value: run 成功后才能 submit: 缺 .run/state.json -> IAP_ALIGN_WORK_NOT_RUNNING (YIELD_TO_HUMAN)

### inv-6
- value: PlanLock 3 组件 hash 必一致: workOxn / blueprints / tasks 之一漂移 -> IAP_ALIGN_LOCK_HASH_MISMATCH

### inv-7
- value: lock 后任何 .oxn 资产漂移 (域/蓝图/work.oxn/task.oxn 之一) -> 立即 LOCK_HASH_MISMATCH 阻断

### inv-8
- value: work.oxn 失踪但 .work 还在 -> IAP_ALIGN_WORK_REMOVED (v1.1 引入, 区别于 WORK_NOT_FOUND)

### inv-9
- value: --asset-kind X 走标准 Work 流程 (Phase C): 选 asset-create workflow + 4 task 骨架;不再是短路

### inv-10
- value: V0 布局必须先 oxn work migrate 才能走 lock 守卫;V0 直接 run -> IAP_ALIGN_V0_LEGACY_BLOCKED

### inv-11
- value: MigratedV0Dir 保留 V0 备份供审计;OXN 不自动清,工程师手动清理 (避免误删导致不可恢复)

### inv-12
- value: Work 引用 Asset 用 domain X ref @prj/{dir}/{name};@prj 寻址必须实际存在 (CLI 加载期 fail-fast)

### inv-13
- value: Task 内 Part 名必须对齐 Blueprint Slot 名;不对齐 -> work run 时找不到对齐目标 (DEP_NOT_FOUND)

### inv-14
- value: Work 内 task DAG 必须无环 (Kahn's algorithm 校验);有环 -> IAP_INTENT_DAG_CYCLE (YIELD_TO_HUMAN, 含 cycleHint)

### inv-15
- value: --asset-kind 走标准 Work 流程(不是短路);oxn asset create 是 alias (内部调 oxn work create --asset-kind)

### inv-16
- value: oxn work run --work-file 必填;oxn work submit --work-name + --task 必填;少参数 -> OXN_CLI_INPUT_ERROR

### inv-17
- value: oxn work new 已在 v1.0 移除;CLI 拒绝 unknown command 'new' (不能是别名);统一用 oxn work create

### inv-18 (v0.6.1-alpha.5 Phase A 新增)
- value: Round 切换不重置 task 状态: passed 的 task 保留, failed/running 的回 pending 供工程师重跑或调整;roundHistory 不可丢 (finalize 保留所有 round 记录供 E4 Insight)

### inv-19 (v0.6.1-alpha.5 Phase A 新增)
- value: maxIterations 硬限制: oxn work next-round 在 currentRound >= maxIterations 时拒绝, 错误码 IAP_ALIGN_ROUND_MAX_EXCEEDED; 提示用户用 oxn work finalize 收口; 默认 maxIterations=3 (从 work.loopPolicy.maxIterations 读取)

### inv-20 (v0.6.1-alpha.5 Phase A 新增)
- value: Round 切换手动触发 (oxn work next-round --verdict FAILED), 不自动循环 (避免无限循环 + 便于人工调整 Intent); verdict FAIL 不自动触发新 Round

### inv-21 (v0.6.1-alpha.5 Phase A 新增)
- value: oxn work run 行为变更: state.status=pending/running 时允许重新调用 (re-run 自动重置 failed/running task → pending, passed 保留); state.status ∈ {passed, failed, error} (已收口) 时拒绝, 报 OXN_WORK_ALREADY_FINALIZED
