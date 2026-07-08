---
entity: domain
version: 0.3.0
name: IAPErrorContext
oxn-source-sha: ca786ba86600aaf2e37cb1718cedeeb3079fadaf2138effcad2aaf8d440f5afd
synced-at: 2026-07-08T13:52:19.210Z
---

# Domain: IAPErrorContext

> IAP 错误码体系限界上下文 v1.1：定义 8 IAPError + 3 OXNCrash；锁定 ALIGN 轴 lock 边界守卫的 3 个新增错误码；禁止 v0.0 残留错误码回归；规定 exit code 契约（1=业务流阻断、2=引擎崩溃）与 stdout/stderr 通道分离

## Terms

### IAPError
- desc: IAP 业务流转中的预期内阻断（轨道 1），AI 消费；字段：axis/code/action/context；name 格式 IAP_

### OXNCrash
- desc: OXN 引擎自身 Bug / 底线被击穿（轨道 2），人类消费，AI 永远不看；字段：code/cause；name 格式 OXN_CRASH_

### IAPErrorCode
- desc: IAPError 的 code 字段（v1.1 共 8 个）：PROOF:2（INFRA_FAIL, CRASH）/ ALIGN:4（CHECKLIST_MISSING, LOCK_NOT_FOUND, LOCK_HASH_MISMATCH, WORK_REMOVED）/ INTENT:2（UNDEFINED_TERM, NAME_FILE_MISMATCH）

### OXNCrashCode
- desc: OXNCrash 的 code 字段（3 个）：SIGNATURE_MISMATCH / STATE_CORRUPT / INTERNAL_ERROR

### IAPAxis
- desc: IAP 三主权轴：INTENT / ALIGN / PROOF（无 X，X 是 OXNCrash 的领域）

### IAPAction
- desc: AI 行动策略（v1.0.2 后仅 YIELD_TO_HUMAN 一种）：叫工程师来，不让 AI 自己改

### Context
- desc: IAPError 的机器可读字段：path / systemError / slot / cycle / declared / file / normalized 等

### Probe
- desc: 物理观测 + 纯函数判定：fs_exists / shell_exec / fs_match / fs_not_exists

### Catalog
- desc: Probe 注册表（@oxn/probes/*），CLI 加载期 fail-fast 校验

### Verdict
- desc: Proof 轴的结构化判定：PASSED / FAILED + reason + probe + expected + actual

### FrozenJson
- desc: 判决书：Core Engine 产出，生成后只读（frozen.json），AI 与工程师都只能读不能改

### Signature
- desc: frozen.json 的签名机制：签名被外部篡改 → OXN_CRASH_SIGNATURE_MISMATCH（防线击穿）

### Kernel
- desc: 纯逻辑验证模块：零 IO 约束（fs.existsSync 等永不出现）；只接受 Infra 的观测结果，输出 Verdict

### Infra
- desc: 副作用 / IO 执行模块：只回答事实，不做 PASS/FAIL 判定（Infra 不能给自己盖章）

### Daemon
- desc: 生命周期管理 + 逃逸机制：Probe FAIL 时阻止 Work 进入 done；不修改 Kernel 规则

### EscapeAction
- desc: Daemon 在 Probe FAIL 时的响应：BLOCK_DONE（默认） / WARN_ONLY

### Channel
- desc: IAPError 走 stdout JSON 通道；OXNCrash 走 stderr stack 通道；二轨不混

### ExitCode
- desc: 进程退出码：0=成功 / 1=业务流阻断（IAPError 或 CliInput）/ 2=引擎崩溃（OXNCrash 或未知异常）

### TopCatch
- desc: CLI 顶层 catch 块（src/cli/index.ts）：classifyError 4 档分流 + handleIAPError / handleOXNCrash / handleCliInput / handleCrash

### CliInputError
- desc: 用户 CLI 输入错（commander.* / citty.* / OXN_PROOF_* / OXN_INVALID_* 等白名单前缀）：档 3，stdout + exit 1

### ProofAxis
- desc: PROOF 轴错误：INFRA_FAIL（YIELD_TO_HUMAN，Probe 跑不到） / CRASH（YIELD_TO_HUMAN，verdict 逻辑崩了）

### AlignAxis
- desc: ALIGN 轴错误（v1.1 共 4 个）：CHECKLIST_MISSING（part.intent_checklist 必填缺失）/ LOCK_NOT_FOUND（.work.planLock 缺失或未锁）/ LOCK_HASH_MISMATCH（4 组件 hash 漂移：workOxn / workDomains / blueprints / tasks）/ WORK_REMOVED（work.oxn 失踪但 .work 还在，锁后被破坏）

### IntentAxis
- desc: INTENT 轴错误：UNDEFINED_TERM（YIELD_TO_HUMAN，引用了不存在的 Domain 词汇） / NAME_FILE_MISMATCH（YIELD_TO_HUMAN，DSL 声明名 vs 文件名规范化不一致）

### BirthCert
- desc: Work 的 .work 静态门禁卡：planLock（哈希快照）+ assets（域/蓝图清单 with fileHash）+ context（goal/constraints/maxIterations）

### PlanLock
- desc: BirthCert 内的不可变快照：workOxnHash + workDomainsHash + blueprintsHash + tasksHash + allHash；锁后任何 hash 漂移 = LOCK_HASH_MISMATCH

### AssetHash
- desc: 域/蓝图文件的 SHA-256（64-hex）：OXN 启动期算并存入 BirthCert.assets；lock 时算并比；漂移 = LOCK_HASH_MISMATCH

### WorkRemoved
- desc: v1.1 引入的删除语义错误：work.oxn 失踪但 .work 还在；区别于 WORK_NOT_FOUND（两个都没有）

### V0ToV1Migrate
- desc: v1.1 引入的布局迁移动作：oxn work migrate 复制 V0 文件到 .migrated-v0/ 备份，再写到 .run/ + 重生 .work + slim 索引

## Bans

### forbidden-constructs
- items:
  - IAP_ALIGN_TIMEOUT
  - IAP_ALIGN_MISMATCH
  - IAP_INTENT_SLOT_CONFLICT
  - AUTONOMOUS_RETRY
  - OXN_PROBE_NOT_FOUND
  - OXN_PROBE_INVALID_INPUT
  - OXN_PROBE_EXEC_FAILED
  - OXN_PROBE_TIMEOUT
  - OXN_DOMAIN_INVALID
  - OXN_BLUEPRINT_INVALID
  - OXN_SOCKET_*
  - VerdictAsException
  - FailureAsCrash
  - OXN_INTERNAL_ERROR_AS_IAP
  - StackTraceToAI
  - HARD_HALT_AS_IAP
  - Evidence
  - Plan
  - Spec
  - Recipe
  - Job
  - Runbook
  - HARD_FAIL
  - SOFT_FAIL
- desc: IAP_ALIGN_TIMEOUT, IAP_ALIGN_MISMATCH, IAP_INTENT_SLOT_CONFLICT, AUTONOMOUS_RETRY, OXN_PROBE_NOT_FOUND, OXN_PROBE_INVALID_INPUT, OXN_PROBE_EXEC_FAILED, OXN_PROBE_TIMEOUT, OXN_DOMAIN_INVALID, OXN_BLUEPRINT_INVALID, OXN_SOCKET_*, VerdictAsException, FailureAsCrash, OXN_INTERNAL_ERROR_AS_IAP, StackTraceToAI, HARD_HALT_AS_IAP, Evidence, Plan, Spec, Recipe, Job, Runbook, HARD_FAIL, SOFT_FAIL

## Invariants

### inv-1
- value: IAPError 字典 v1.1 收敛为 8 个：PROOF:2（INFRA_FAIL, CRASH）+ ALIGN:4（CHECKLIST_MISSING, LOCK_NOT_FOUND, LOCK_HASH_MISMATCH, WORK_REMOVED）+ INTENT:2（UNDEFINED_TERM, NAME_FILE_MISMATCH）

### inv-2
- value: OXNCrash 字典 v1.1 收敛为 3 个：SIGNATURE_MISMATCH + STATE_CORRUPT + INTERNAL_ERROR

### inv-3
- value: IAPError + OXNCrash 总数 = 11（8 + 3），任何字典变更必须遵循本 Domain 的 ban 列表

### inv-4
- value: 字典收敛原则：抛异常 = 结构性违规 / 必须被看到；业务结果 = Verdict 通道，不抛异常

### inv-5
- value: IAPError 与 OXNCrash 互不耦合：互不引用、互不继承、各自独立的 Error 子类

### inv-6
- value: IAPError 仅在 INTENT / ALIGN / PROOF 三个 IAP 主权轴抛；OXNCrash 不属任何 IAP 轴

### inv-7
- value: IAPError 由 src/{intent,align,proof}/ 模块抛；OXNCrash 由 src/{core,proof,daemon}/ 引擎内部抛，业务模块严禁抛 OXNCrash

### inv-8
- value: IAPError 走 stdout JSON 通道（AI 消费）；OXNCrash 走 stderr stack 通道（AI 永远不看）

### inv-9
- value: 进程退出码：0=成功 / 1=IAPError 或 CliInputError / 2=OXNCrash 或未知异常

### inv-10
- value: IAPError 必含 4 字段：name（IAP_

### inv-11
- value: OXNCrash 必含 3 字段：name（OXN_CRASH_

### inv-12
- value: CLI 顶层 catch 块（src/cli/index.ts）4 档分流：IAPError / OXNCrash / CliInput / Crash（兜底）

### inv-13
- value: 档 4 兜底：任何不属于 IAPError / OXNCrash / CliInputError 的异常 = OXN 自身 Bug，绝不暴露给 AI

### inv-14
- value: IAPError 消费者是 AI Agent（按 action 字段决策）；OXNCrash 消费者是人类工程师

### inv-15
- value: IAPError 的 action 字段 v1.0.2 后仅 YIELD_TO_HUMAN 一种（AI 不能自己改，必须叫人）

### inv-16
- value: OXNCrash 出现时 AI 绝不能尝试修复（AI 看不到、也不应看到 stderr 内容）；让进程挂，叫工程师修

### inv-17
- value: Align 轴业务结果（Task 超时、代码与 Blueprint 不齐）走 frozen.json.verdict: FAILED 通道，AI 自己改；不再抛 IAPError

### inv-18
- value: IAPError 不放业务结果：Verdict: PASS / FAIL 走 frozen.json.verdict 通道，绝不抛异常

### inv-19
- value: AUTONOMOUS_RETRY action 已在 v1.0.2 移除：所有 IAPError 都需要工程师介入

### inv-20
- value: NAME_FILE_MISMATCH 必须在 validate 阶段（CLI 加载期）做字符串级规范化比对，不依赖 OS 文件系统

### inv-21
- value: 规范化规则：toKebab() 把声明名与文件 stem 归一为 lowercase + 驼峰转 dash + underscore 转 dash

### inv-22
- value: 规范化后不一致 → 抛 IAP_INTENT_NAME_FILE_MISMATCH（YIELD_TO_HUMAN），让工程师决定重命名文件还是改声明名

### inv-23
- value: OXN 不强制风格（PascalCase / kebab-case 都接受），只强制声明 vs 文件在规范化后一致

### inv-24
- value: 此防御是 macOS APFS / Windows NTFS case-insensitive 文件系统的跨平台一致性保障

### inv-25
- value: task.part.intent_checklist 必填：AI 开工前必须做 IAP 三轴对齐宣誓（spec_ref / exec_plan_ref / layer / verify_commands）

### inv-26
- value: 缺 intent_checklist → 抛 IAP_ALIGN_CHECKLIST_MISSING（YIELD_TO_HUMAN），不允许 AI 自己补（会破坏对齐宣誓的可信度）

### inv-27
- value: intent_checklist 的 spec_ref 引用 Intent 轴资产（Domain）；exec_plan_ref 引用 Align 轴自描述；verify_commands 预演 Proof 轴

### inv-28
- value: Lock 边界三剑客：planLock 必填 + 4 组件 hash 必一致 + work.oxn 不能失踪（与 .work 同时存在或同时缺失）

### inv-29
- value: PlanLock 缺位 → 抛 IAP_ALIGN_LOCK_NOT_FOUND（YIELD_TO_HUMAN）：缺少 .work / planLock=null / 未调 oxn work lock / init 缺失

### inv-30
- value: PlanLock hash 漂移（4 组件：workOxn / workDomains / blueprints / tasks 之一不一致）→ 抛 IAP_ALIGN_LOCK_HASH_MISMATCH，context.component 字段定位漂移源

### inv-31
- value: PlanLock 全过但 work.oxn 失踪（锁后被破坏）→ 抛 IAP_ALIGN_WORK_REMOVED（YIELD_TO_HUMAN），区别于 WORK_NOT_FOUND（两个都没）

### inv-32
- value: Lock 守卫次序：先校验 planLock 存在 → 再校验 4 组件 hash → 最后校验 work.oxn 存在；该次序保证错误码语义不重叠

### inv-33
- value: oxn work run / context 触发 lock 守卫；--unlock-check 用于诊断模式（context 可读 stale 数据但显式标注）

### inv-34
- value: oxn work lock 子命令（PR-7）计算 4 组件 hash 写入 .work.planLock；unlock 清除 planLock（work 进入 unlocked 状态但保留 assets 快照）

### inv-35
- value: oxn work validate 成功后自动写 .work + .domains.json + .blueprints.json（PR-6）：planLock=null，assets 重新算 fileHash

### inv-36
- value: validate 后未锁的 work 可被 lock；锁后拒绝 validate 覆盖（保留 createdAt 时间戳，PR-6 守卫）

### inv-37
- value: oxn work migrate（PR-10）将 V0 布局（works/

### inv-38
- value: FrozenJson（frozen.json）生成后只读：AI 与工程师都只能读，禁手改

### inv-39
- value: frozen.json 签名被外部篡改 → 抛 OXN_CRASH_SIGNATURE_MISMATCH（防线击穿），进程退出 2

### inv-40
- value: Trace（work-trace.jsonl）只能追加写、不能重写；append-only 约束

### inv-41
- value: Kernel 永远不触碰物理世界：不调用 fs.existsSync / 任何 IO（fs.* / net.* / child_process 一律不出现）

### inv-42
- value: Infra 只回答事实，不做判定：Infra 不能宣布 PASS / FAIL（不能给自己盖章）

### inv-43
- value: Infra 不能绕过 Daemon 自己宣布 Work 完成（行政不能给自己盖章）

### inv-44
- value: Daemon 不能修改 Kernel 规则（司法不能立法）

### inv-45
- value: Kernel 不能直接执行 Task（立法不能行政）

### inv-46
- value: v0.0.x 错误码（OXN_PROBE_* / OXN_SOCKET_* / OXN_DOMAIN_INVALID 等）一律不能出现在 v1.0+ 错误字典

### inv-47
- value: v0.0 Arsenal 时代残留（arsenals/builtin.ts、part-port、arsenal-promote）禁止回归；OXN Engine 僭越所有主导权的旧模式已被 IAP 修正
