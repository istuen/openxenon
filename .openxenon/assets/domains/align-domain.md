---
entity: domain
version: 0.3.0
name: AlignDomain
oxn-source-sha: df0a88ade180076d0099a563593857526a4abfbc3dc17ff706e6c62a03c8d0bf
synced-at: 2026-07-08T13:52:19.208Z
---

# Domain: AlignDomain

> Align 轴统一词汇 v1.1：Work 沙盒生命周期 + Skill 项目级编译分发 + IAP Align 段（Slot/Part/Probe/RefPool）的合并域；含 v1.1 lock 边界守卫术语（BirthCert/PlanLock/AssetHash）

## Terms

### Work
- desc: 一次任务执行的沙盒，绑定一份 Blueprint

### Task
- desc: Work 内的具体步骤，对齐 Blueprint 的某个 slot

### Artifact
- desc: Work 执行产生的物理产物，被 Probe 观测的对象

### Snapshot
- desc: 某一时刻 Work 状态的不可变快照

### Frozen
- desc: 验证通过后生成的判决书（frozen.json）

### Trace
- desc: Work 执行轨迹，JSONL 追加式事件流

### PartExecution
- desc: 单个 part 的执行记录（含 probe 结果）

### BirthCert
- desc: Work 的 .work 静态门禁卡：planLock + assets + context（goal/constraints/maxIterations）+ diagnostics；写一次后只读

### PlanLock
- desc: BirthCert 内不可变快照：4 组件 hash（workOxn / workDomains / blueprints / tasks）+ allHash；锁后任何漂移 = LOCK_HASH_MISMATCH

### AssetHash
- desc: 域/蓝图文件的 SHA-256（64-hex）：OXN 启动期算并存入 BirthCert.assets；validate 时重算，lock 时锁定

### WorkLayoutV0
- desc: V0 布局：works/

### WorkLayoutV1
- desc: V1 布局：works/

### MigratedV0Dir
- desc: 迁移备份目录：.migrated-v0/

### Diagnostics
- desc: data.diagnostics 字段（context / run / migrate / status 响应）—— 软警告命名空间，与 IAPError 物理隔离

### RefDiagnostic
- desc: Diagnostics 单元素：{code, severity, ref, type, message, suggestion}；code 用 OXN_WORK_REFS_* CLI 协议字符串（非 IAP_

### RefDiagnosticSeverity
- desc: RefDiagnostic.severity 枚举：warn（软警告，可继续执行）/ error（保留供未来 in-flight 错误，当前未使用）

### RefDiagnosticType
- desc: RefDiagnostic.type 枚举：domain / blueprint；按域/蓝图分别构建

### Skill
- desc: 一份面向 AI 的结构化指令单元（id + description + instruction + references），落地为 .opencode/skills/

### Instruction
- desc: Skill 的主指令 markdown 正文（AI 第一句要读的内容）

### ReferenceFile
- desc: Skill 的次级 markdown 引用文件，存放在 .opencode/skills/

### SkillMeta
- desc: Skill 的元信息（id + description），用于 OpenCode 的 skill 索引与自动选择

### Locale
- desc: Skill 的语言变体；当前唯一权威为 zh-CN，en 已废弃（沿用 zh-CN 内容）

### Align
- desc: 把 Intent 展开为可执行路径的过程：编排 + 选件 + 设验

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

## Bans

### forbidden-constructs
- items:
  - Job
  - TaskRun
  - Execution
  - Pipeline
  - VerdictAsException
  - Plugin
  - Extension
  - Hook
  - PromptTemplate
  - oxn-task
  - oxn-explore
  - oxn-plan
  - oxn-leader
  - oxn-arsenal
  - oxn-forge
  - oxn-global
  - oxn-add-probe
  - oxn-resume
- desc: Job, TaskRun, Execution, Pipeline, VerdictAsException, Plugin, Extension, Hook, PromptTemplate, oxn-task, oxn-explore, oxn-plan, oxn-leader, oxn-arsenal, oxn-forge, oxn-global, oxn-add-probe, oxn-resume

## Invariants

### inv-1
- value: Work 的运行时类型必须与 Blueprint.type 强一致

### inv-2
- value: frozen.json 生成后不可修改（仅可读取作为判决书）

### inv-3
- value: work-trace.jsonl 只能追加写，不能重写

### inv-4
- value: 同一 part 只能被提交一次，重复 submit 必须基于 freeze 重建

### inv-5
- value: Artifact 路径必须落在 Work 沙盒内或宿主项目目录

### inv-6
- value: Work 必须经过 validate → lock 才能 run/context；锁状态在 .work.planLock 静态卡中

### inv-7
- value: lock 后任何 .oxn 资产漂移（域/蓝图文件改了、work.oxn 改了、task.oxn 改了）→ LOCK_HASH_MISMATCH

### inv-8
- value: PR-14 修复错位 fail-fast：域/蓝图 ref 缺失走 diagnostics 软警告（不硬失败），lock 守卫仍是硬失败

### inv-9
- value: PR-14 diagnostics 持久化到 .run/state.json.diagnostics（severity 必为 warn）—— 可审计、可被未来 Daemon 消费

### inv-10
- value: Work 必须存在 .run/state.json（V1 布局）；V0 布局必须先 oxn work migrate 才能走 lock 守卫

### inv-11
- value: MigratedV0Dir 保留 V0 备份供审计；OXN 不自动清，工程师手动清理

### inv-12
- value: Skill 唯一权威源在 src/skills/locales/

### inv-13
- value: .opencode/skills/

### inv-14
- value: Skill ID 必须以 'oxn-' 前缀开头（如 oxn-cli、oxn-work），避免与第三方 skill 冲突

### inv-15
- value: zh-CN 是唯一权威 Locale；en Locale 已废弃，必须与 zh-CN 内容保持一致（不允许独立维护）

### inv-16
- value: Skill 名 ↔ 目录 1:1 映射：.opencode/skills/

### inv-17
- value: Skill 加载保持项目级：oxn 不写用户 home（~/.config/、~/.opencode/），全局 Skill 安装由各 AI 客户端（OpenCode/Claude/Agents）自身管理

### inv-18
- value: Skill 内的命令引用必须与 CLI 实际子命令一致；v0.0.x 已删除命令（oxn task *、oxn leader *、oxn arsenal *、oxn add-probe、oxn get-context、oxn work new）一律不能在 Skill 中出现

### inv-19
- value: Skill 内禁止使用 'new' 子命令；统一改为 'create'（oxn work create / oxn domain create / oxn blueprint create）

### inv-20
- value: Part / Probe 没有 CLI 入口；Skill 内禁止 'oxn part new' / 'oxn probe new' 等不存在的命令，必须教 AI 内联写

### inv-21
- value: Align 资产（Work/Task）只能通过 oxn work add-task / task-edit / task-delete 受控微调；其他改动走 $EDITOR 改 work.oxn / task.oxn

### inv-22
- value: Part / Probe 不允许作为独立 .oxn 文件存在，必须内联在 task.oxn 的 part { probe { } } 块内

### inv-23
- value: Task 必须 align 至少 1 个 Blueprint（fail-fast，缺少时 DSL 拒绝）

### inv-24
- value: Task 内 Part 名必须对齐 Blueprint Slot 名，否则 work run 时找不到对齐目标

### inv-25
- value: Work 内 task DAG 必须无环（Kahn's algorithm 校验，含 cycleHint 提示）

### inv-26
- value: Task 引用了未声明的 dep 或 task 名重复 → DSL 拒绝（intent-align-validator 拦截）

### inv-27
- value: work.oxn 引用的 domain/blueprint ref 必须实际存在于 .openxenon/ 下（CLI 加载期 fail-fast 拦截）

### inv-28
- value: Slot DAG 不允许自环（slot a 的 deps 里不能含 a 自身）

### inv-29
- value: Probe 标准必须来自 Blueprint 的 observe 数组（Intent 轴），不能由 Align 轴运行时追加

### inv-30
- value: 本域是 Align 轴专属词；Intent 轴词汇（CLI/DSL/Program）见 intent-domain.oxn

### inv-31
- value: Proof 轴专属词（Probe/Frozen/Verdict/Runtime 模块）见 proof-domain.oxn

### inv-32
- value: 本域与 L0L3Context.oxn 正交：本域约束业务 Align 词汇，L0L3 约束代码分层
