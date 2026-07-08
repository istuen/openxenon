---
entity: domain
version: 0.3.0
name: IntentAlignContext
oxn-source-sha: 992ebcab79c65a1bc8224215d0c4203222b1966b1ebc7794b1a1e8df63d3da28
synced-at: 2026-07-08T13:52:19.211Z
---

# Domain: IntentAlignContext

> IAP 范式限界上下文：定义 Intent / Align / Proof 三轴的主导权分离、跨轴生产权链、Proof 不可绕过的硬约束

## Terms

### Intent
- desc: 声明式意图，不可执行；Domain 是业务 Intent，Blueprint 是技术 Intent + Probe 标准

### Domain
- desc: 业务 Intent 资产：term/ban/invariant 三件套，约束 AI 命名与硬规则

### Blueprint
- desc: 技术 Intent 资产：slot 拓扑 + prop + observe（含 Probe 标准，证明权的源头）

### Term
- desc: 领域术语，AI 在该上下文内强制使用

### Ban
- desc: 领域禁词，AI 在该上下文内强制回避

### Invariant
- desc: 业务硬规则，跨生命周期生效

### Align
- desc: 把 Intent 展开为可执行路径的过程：编排 + 选件 + 设验

### Work
- desc: Align 编排器：RefPool（domain/blueprint/part/probe ref）+ task DAG

### Task
- desc: Align 执行单元：align 1 Blueprint + N Domain，内联 Part/Probe

### Slot
- desc: Blueprint 内拓扑节点；Task 内 Part 的对齐目标（part 名对齐 slot 名）

### Part
- desc: Task 内 skill 执行单元（skill_context + acceptance），不独立成文件

### Probe
- desc: 物理观测单元（prop 输入 + output 判定），不独立成文件，内联在 part 内

### RefPool
- desc: Work 级声明的 domain/blueprint/part/probe ref 池，Task 只能从中 inject

### SkillContext
- desc: AI 可见的目标/约束/当前焦点（work.context + task.context + part.skill_context 三层）

### Artifact
- desc: Align 轴产出的物理事实，是 Proof 轴的判定对象（不是判定结果）

### Proof
- desc: Core Engine 站在 Intent 一侧对 Artifact 作出的 Verdict（有立场，非中立记录）

### Verdict
- desc: Proof 的结构化判定：PASS / FAIL + reason + probe + expected + actual + escape_action

### Frozen
- desc: Verdict 通过后由 Core 生成的判决书（frozen.json），生成后只读

### Trace
- desc: work-trace.jsonl，JSONL 追加事件流，只追加不重写

### Kernel
- desc: Core Engine 裁判：纯逻辑验证，不碰 IO（fs.existsSync 等永不出现）

### Infra
- desc: Core Engine 法医：执行副作用/IO，只回答事实，不做判定

### Daemon
- desc: Core Engine 法警：运行时管理 + 逃逸机制（Probe FAIL 时阻止 Work 进入 done）

### EscapeAction
- desc: Daemon 在 Probe FAIL 时的响应：BLOCK_DONE / WARN_ONLY / ...；第四条防线不可 --force 绕过

## Bans

### forbidden-constructs
- items:
  - noun
  - verb
  - domain_rules
  - use_domain
  - use_blueprint
  - inject
  - injects
  - expectation
  - rule
  - stages
  - stage
  - edges
  - topology
  - oxn task
  - oxn leader
  - oxn arsenal
  - oxn forge
  - oxn add-probe
  - oxn get-context
  - oxn work new
  - oxn part new
  - oxn probe new
  - arsenals
  - builtin.ts
  - part-port
  - arsenal-promote
  - arsenal-resolver
  - arsenal-forge
  - @glo
  - @glox
  - @global
  - Evidence
  - Plan
  - Spec
  - Recipe
  - Job
  - Runbook
  - Pipeline
  - Executor
  - Orchestrator
- desc: noun, verb, domain_rules, use_domain, use_blueprint, inject, injects, expectation, rule, stages, stage, edges, topology, oxn task, oxn leader, oxn arsenal, oxn forge, oxn add-probe, oxn get-context, oxn work new, oxn part new, oxn probe new, arsenals, builtin.ts, part-port, arsenal-promote, arsenal-resolver, arsenal-forge, @glo, @glox, @global, Evidence, Plan, Spec, Recipe, Job, Runbook, Pipeline, Executor, Orchestrator

## Invariants

### inv-1
- value: IAP 三轴主导权不交叉：Intent 由工程师主导、Align 由 AI 主导、Proof 由 Core Engine 主导，三方不可越权

### inv-2
- value: IAP 范式的核心防线：Proof 不可绕过，禁 --force / skip-validate 等后门参数

### inv-3
- value: Intent 资产（Domain/Blueprint）由工程师 $EDITOR 整体改写，CLI 不提供 append-term / add-prop 等累积式命令

### inv-4
- value: Domain 与 Blueprint 必须在不同文件、互不引用：业务 Intent 不知道技术 Intent，技术 Intent 不知道业务 Intent

### inv-5
- value: Blueprint 引用 term 必须先在 Domain 中定义；当前软约束，未来升级为 Kernel 拒绝编译的硬约束

### inv-6
- value: Blueprint 内的 observe 数组声明的 Probe 标准是 Proof 轴的源头：标准必须先于产物存在

### inv-7
- value: Align 资产（Work/Task）只能通过 oxn work add-task / task-edit / task-delete 受控微调；其他改动走 $EDITOR 改 work.oxn / task.oxn

### inv-8
- value: Part / Probe 不允许作为独立 .oxn 文件存在，必须内联在 task.oxn 的 part { probe { } } 块内

### inv-9
- value: Task 必须 align 至少 1 个 Blueprint（fail-fast，缺少时 DSL 拒绝）

### inv-10
- value: Task 内 Part 名必须对齐 Blueprint Slot 名，否则 work run 时找不到对齐目标

### inv-11
- value: Work 内 task DAG 必须无环（Kahn's algorithm 校验，含 cycleHint 提示）

### inv-12
- value: Task 引用了未声明的 dep 或 task 名重复 → DSL 拒绝（intent-align-validator 拦截）

### inv-13
- value: work.oxn 引用的 domain/blueprint ref 必须实际存在于 .openxenon/ 下（CLI 加载期 fail-fast 拦截）

### inv-14
- value: Slot DAG 不允许自环（slot a 的 deps 里不能含 a 自身）

### inv-15
- value: Proof 轴由 Core Engine 独占：Kernel 裁判 + Infra 法医 + Daemon 法警，三模块纯洁性约束

### inv-16
- value: Kernel 只做纯逻辑验证：永远不调用 fs.existsSync / 任何 IO（fs.* / net.* / child_process 一律不出现）

### inv-17
- value: Infra 只回答事实，不做判定：Infra 不能宣布 PASS / FAIL（Infra 不能自己给自己盖章）

### inv-18
- value: Infra 不能绕过 Daemon 自己宣布 Work 完成（行政不能自己给自己盖章）

### inv-19
- value: Daemon 不能修改 Kernel 的规则（司法不能立法）

### inv-20
- value: Kernel 不能直接执行 Task（立法不能行政）

### inv-21
- value: Probe FAIL 时 Daemon 触发逃逸机制：① 预警 ② 阻止 Work 进入 done ③ 输出意图→对齐→证明链路快照

### inv-22
- value: Proof 是有立场的判定（不是中性的证据记录）：Core Engine 必须站在 Intent 一侧，不允许 Evidence 中立记录模式

### inv-23
- value: Frozen（frozen.json）生成后只读，仅可读取作为审计依据，禁手改

### inv-24
- value: Trace（work-trace.jsonl）只能追加写、不能重写

### inv-25
- value: Probe 标准必须来自 Blueprint 的 observe 数组（Intent 轴），不能由 Align 轴运行时追加

### inv-26
- value: Y 型生产权链：Intent 与 Align 并行展开，在 Proof 汇合；真相解释权单向传递

### inv-27
- value: 没有上游对象就不允许产生下游对象：没有 Domain 时 Blueprint 不许使用未定义的 term

### inv-28
- value: 上游冻结后下游才能展开：Blueprint 未通过 oxn blueprint validate → Work 不许实例化

### inv-29
- value: Task 执行结果不能反改 Blueprint 声明（真相解释权单向，不允许对齐结果回灌意图）

### inv-30
- value: Domain 的 term/ban/invariant 必须通过 oxn domain validate 校验才能被 work 引用

### inv-31
- value: 寻址统一为 @oxn（builtin）+ @prj（项目），禁止 @glo 等历史全局作用域（Intent 轴在项目内主导）

### inv-32
- value: v0.0.x 已删除命令（oxn task *、oxn leader *、oxn arsenal *、oxn add-probe、oxn get-context、oxn work new）一律不能出现在 Skill / 文档

### inv-33
- value: v0.0 Arsenal 时代残留（arsenals/builtin.ts、part-port、arsenal-promote、arsenal-resolver、@glo）禁止回归；Core Engine 僭越所有主导权的旧模式已被 IAP 修正
