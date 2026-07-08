---
entity: domain
version: 0.3.0
name: ProofDomain
oxn-source-sha: d784a8f320fb9b08b69655b2cbe7b7894813a21514523a6c5ca4831ac6a25b05
synced-at: 2026-07-08T13:52:19.212Z
---

# Domain: ProofDomain

> Proof 轴统一词汇：Builtin 资产 (@oxn 探针/零件) + Core Engine Runtime 模块 (Kernel/Infra/Daemon) + 判决书 (frozen.json) 的合并域；IAPError 11 错误码字典在 iap-error-context.oxn 独立维护

## Terms

### Probe
- desc: OXN 内置探针，物理观测 + 纯函数判定（fs-exists / shell-exec / fs-match / fs-not-exists / file-exports / http-responds）

### Part
- desc: OXN 内置零件，封装可复用的工程动作（git-commit / create-branch 等）

### Builtin
- desc: OXN 自带资产，存放在 src/builtin/ 目录的 .oxn 文件中

### Scope
- desc: OXN 引用作用域，@oxn 指向内置，@prj 指向项目

### Registry
- desc: 内存中的 @oxn 资产查询表，由 OxnBuiltinRegistry 维护

### Kernel
- desc: 纯逻辑验证模块：零 IO 约束（fs.existsSync 等永不出现）；只接受 Infra 的观测结果，输出 Verdict

### Infra
- desc: 副作用 / IO 执行模块：只回答事实，不做 PASS/FAIL 判定（Infra 不能给自己盖章）

### Daemon
- desc: 生命周期管理 + 逃逸机制：Probe FAIL 时阻止 Work 进入 done；不修改 Kernel 规则

### EscapeAction
- desc: Daemon 在 Probe FAIL 时的响应：BLOCK_DONE（默认） / WARN_ONLY

### FrozenJson
- desc: 判决书：Core Engine 产出，生成后只读（frozen.json），AI 与工程师都只能读不能改

### Signature
- desc: frozen.json 的签名机制：签名被外部篡改 → OXN_CRASH_SIGNATURE_MISMATCH（防线击穿）

### Verdict
- desc: Proof 轴的三态判定（v0.2 T5 升级）: PASSED / FAILED / INCONCLUSIVE + reason + probeName + ref + errorMessage + interferenceFlags[] + durationMs

### Catalog
- desc: Probe 注册表（@oxn/probes/*），CLI 加载期 fail-fast 校验

## Bans

### forbidden-constructs
- items:
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
- desc: Resource, Template, Config, Definition, GlobalAsset, Evidence, Plan, Spec, Recipe, Job, Runbook, HARD_FAIL, SOFT_FAIL, VerdictAsException, FailureAsCrash, OXN_INTERNAL_ERROR_AS_IAP, StackTraceToAI, HARD_HALT_AS_IAP

## Invariants

### inv-1
- value: Builtin 探针类型必须是 fs_exists / fs_not_exists / fs_match / shell_exec 之一（v0.1 范围）

### inv-2
- value: Builtin 资产版本 (_version) 单调递增，不可降级

### inv-3
- value: Builtin 资产不依赖任何 @prj 资产（避免循环引用）

### inv-4
- value: Kernel 永远不触碰物理世界：不调用 fs.existsSync / 任何 IO（fs.* / net.* / child_process 一律不出现）

### inv-5
- value: Infra 只回答事实，不做判定：Infra 不能宣布 PASS / FAIL（不能给自己盖章）

### inv-6
- value: Infra 不能绕过 Daemon 自己宣布 Work 完成（行政不能给自己盖章）

### inv-7
- value: Daemon 不能修改 Kernel 规则（司法不能立法）

### inv-8
- value: Kernel 不能直接执行 Task（立法不能行政）

### inv-9
- value: Probe FAIL 时 Daemon 触发逃逸机制：① 预警 ② 阻止 Work 进入 done ③ 输出意图→对齐→证明链路快照

### inv-10
- value: Proof 是有立场的判定（不是中性的证据记录）：Core Engine 必须站在 Intent 一侧，不允许 Evidence 中立记录模式

### inv-11
- value: FrozenJson（frozen.json）生成后只读：AI 与工程师都只能读，禁手改

### inv-12
- value: frozen.json 签名被外部篡改 → 抛 OXN_CRASH_SIGNATURE_MISMATCH（防线击穿），进程退出 2

### inv-13
- value: Trace（work-trace.jsonl）只能追加写、不能重写；append-only 约束

### inv-14
- value: 本域是 Proof 轴专属词；Intent 轴词汇（CLI/DSL/Program）见 intent-domain.oxn

### inv-15
- value: 本域是 Proof 轴专属词；Align 轴词汇（Work/Task/Part/RefPool）见 align-domain.oxn

### inv-16
- value: IAPError 11 错误码字典本身（PROOF:2 + ALIGN:4 + INTENT:2 + OXNCrash:3）见 iap-error-context.oxn；本域只约定 Runtime 模块纯洁性

### inv-17
- value: 本域与 L0L3Context.oxn 互证：L0L3 规定代码分层（L0=本域的 Kernel/L1=Infra/L2=Builtin/L3=Daemon/CLI），本域规定 Runtime 模块的语义纯洁性
