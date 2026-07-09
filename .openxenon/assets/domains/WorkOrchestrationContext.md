---
entity: domain
version: 0.3.0
name: WorkOrchestrationContext
oxn-source-sha: 8fb70f028b2a81b43a37500bd288ec26cd598fac382b69685e7c8379a58093d4
synced-at: 2026-07-08T13:52:19.207Z
---

# Domain: WorkOrchestrationContext

> Work v1.1 8 阶段编排限界上下文: init->migrate->create->add-task->validate->lock->run->submit 闭环;4 子模式 (explore/develop/fix/onboarding) 决定 work 编排风格;PlanLock 4 组件 hash 守卫 + BirthCert 静态门禁卡

## Terms

### WorkV1
- desc: v1.1 引入的 Work 沙盒布局: works/<w>/work.oxn + .work (静态卡) + .run/ (运行时);V0 布局需先 migrate

### Phase
- desc: 8 阶段流程的一个阶段: init/migrate/create/add-task/validate/lock/run/submit;按顺序不可跳

### Init
- desc: oxn work init: 创建 .openxenon/ 边界 + ProjectConfig;不创建 work

### Migrate
- desc: oxn work migrate: V0 布局 (works/<w>/*.oxn 散文件) -> V1 布局 (works/<w>/{work.oxn, .work, .run/});复制 + 备份到 .migrated-v0/

### Create
- desc: oxn work create <w> --type <X>: 写 work.oxn 骨架;X ∈ {develop, fix, explore, onboarding, asset};v0.6.1-alpha.1 Batch 2 加 asset 子模式

### AddTask
- desc: oxn work add-task --work <w> --task-name <t> --blueprint <bp> [--domain <d>]: 写 tasks/<t>/task.oxn 内联到 work.oxn

### Validate
- desc: oxn work validate <w>: 校验 work.oxn 语法 + task DAG 无环 + asset 引用存在;通过后写 .work (BirthCert)

### Lock
- desc: oxn work lock <w>: 算 4 组件 hash 写入 .work.planLock;锁后任何漂移 = IAP_ALIGN_LOCK_HASH_MISMATCH

### Run
- desc: oxn work run --work-file <work.oxn>: 启动状态机;落 .run/state.json + trace.jsonl;Probe FAIL 触发 Daemon 逃逸

### Submit
- desc: oxn work submit --work-name <w> --task <t>: 推进 task 内 part 状态;通过 Probe -> 写 frozen.json (PROOF verdict)

### WorkType
- desc: 6 子模式: develop (功能开发, 默认) / fix (Bug 修复) / explore (探索调研, 不写 code) / onboarding (新人入门) / asset (Asset 生命周期, v0.6.1 Batch 2) / doc (文档工作, v0.6.1 — 站点构建用 doc-publish Blueprint, 临时文档提升用 doc-promote Blueprint)

### AssetMode
- desc: v0.6.1-alpha.1 Batch 2 新增: --type asset --asset-kind <kind>;走 Asset 生命周期 (不是 task DAG)

### DocMode
- desc: v0.6.1 新增: --type doc;走 DocEngineeringContext;由引用的 blueprint 决定流水线（doc-publish = 站点构建 / doc-promote = 临时文档提升 / 其他 = 自定义文档工作）

### BirthCert
- desc: Work .work 静态门禁卡: planLock (4 hash) + assets (域/蓝图 fileHash) + context (goal/constraints/maxIterations) + diagnostics;写一次后只读

### PlanLock
- desc: BirthCert 内不可变快照: workOxnHash + workDomainsHash + blueprintsHash + tasksHash + allHash;锁后任何漂移 = LOCK_HASH_MISMATCH

### DAG
- desc: Work 内 task 依赖图;无环 (Kahn's algorithm 校验, 含 cycleHint 提示);V0 layout 隐式依赖 name 引用,V1 显式 deps=['a','b']

### RefPool
- desc: Work 级声明的 domain/blueprint/part/probe ref 池;Task 只能从 RefPool inject;不可直接 import 资产

### MigratedV0Dir
- desc: V0 备份目录: .migrated-v0/<w>/;OXN 不自动清,工程师手动清理;供审计可恢复

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
- value: 8 阶段顺序不可跳: init -> migrate -> create -> add-task -> validate -> lock -> run -> submit;违反 -> IAPError 拒绝

### inv-2
- value: --type 必填 6 个子模式之一: develop / fix / explore / onboarding / asset / doc;v0.6.1 加 --type doc（文档工作）

### inv-3
- value: validate 成功前不能 lock: 缺 .work.planLock -> IAP_ALIGN_LOCK_NOT_FOUND (YIELD_TO_HUMAN)

### inv-4
- value: lock 成功前不能 run: 缺 planLock -> 拒绝启动;unlock 状态可 run 但不写 .run/state.json

### inv-5
- value: run 成功后才能 submit: 缺 .run/state.json -> IAP_ALIGN_WORK_NOT_RUNNING (YIELD_TO_HUMAN)

### inv-6
- value: PlanLock 4 组件 hash 必一致: workOxn / workDomains / blueprints / tasks 之一漂移 -> IAP_ALIGN_LOCK_HASH_MISMATCH

### inv-7
- value: lock 后任何 .oxn 资产漂移 (域/蓝图/work.oxn/task.oxn 之一) -> 立即 LOCK_HASH_MISMATCH 阻断

### inv-8
- value: work.oxn 失踪但 .work 还在 -> IAP_ALIGN_WORK_REMOVED (v1.1 引入, 区别于 WORK_NOT_FOUND)

### inv-9
- value: Asset 模式 (--type asset --asset-kind X) 不走 task DAG;只写 .openxenon/assets/{kinds}/{name}.oxn;无 .work/.run

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
- value: Asset 模式不接受 --blueprint/--domain/--slots;Asset 是单一资产,不是 task 编排

### inv-16
- value: oxn work run --work-file 必填;oxn work submit --work-name + --task 必填;少参数 -> OXN_CLI_INPUT_ERROR

### inv-17
- value: oxn work new 已在 v1.0 移除;CLI 拒绝 unknown command 'new' (不能是别名);统一用 oxn work create
