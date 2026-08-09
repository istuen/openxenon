---
entity: domain
name: OxnEngineDomain
abstract: OXN Engine 领域（Asset 结构 v2：Group → Axiom → Theorem）。
references:
  - oxn-domain
citations: 0
synced-at: 2026-08-08
---

# Domain: OxnEngineDomain

> v1.0.0 (2026-08-08): 收编为 Asset 结构 v2 三层模型。## Terms: <子主题> → ## Concept，## Bans → ## Forbidden，## Invariants → ## Boundary；语义锁定。

## Concept

### OXNEngine
- OpenXenon 核心引擎；记录事实不评判合格（ADR-0031）；L0-L3 分层 + E1-E4 四结构实体实现。

### Kernel
- 🆕 v0.7.0 RFC-0027 PR-F（D4）：canonical（吸收 proof-domain 内容）。
- L0 纯逻辑验证模块（记录事实不评判 ADR-0031）：零 IO 约束，只接受 Infra 观测产出 ProbeOutcome，不调 fs/net/child_process。
- 通过 Infra 调用带副作用的 Probe 来观测客观事实并验证。

### Infra
- 🆕 v0.7.0 RFC-0027 PR-F（D4）：canonical（吸收 proof-domain 内容）。
- L1 副作用 / IO 执行模块：只回答事实不做判定（不能给自己盖章）；3 个 IO Primitive（io.stat/io.read/io.exec）通过 ProviderRegistry 暴露。
- 负责 OpenXenon 跟外部宿主环境的出入口，包括文件、网络等具有副作用的交互。

### Daemon
- 🆕 v0.7.0 RFC-0027 PR-F（D4）：canonical（吸收 oxn-domain + engine-domain 旧内容）。
- OXN Engine 后台守护进程；负责运行时状态监听（Work 长时间未变化 → 通知工程师）+ 事件监听（Probe DEVIATED/INCONCLUSIVE 通知 + CLI socket 事件）；不监听文件系统，不阻断 Work，不修改 Kernel 规则；ADR-0068。
- 监听人机协作范围内的变化与边界预警。

### OXL
- Engine 通过 unified 库实现 MD 语法的特性，包括编译、校验。

### IAPError
- 业务流转中预期内错误的契约类。轨道 1，AI 消费受众。

### OXNCrash
- OXN 引擎自身 Bug 或底线被击穿的错误契约类。轨道 2，人类消费受众。

### CliInputError
- 用户 CLI 输入错的契约类。轨道 3。

### Port
- 抽象接口契约（Kernel/Infra 边界 port）。

### Philosophy
- 🆕 v0.7.0 RFC-0027 PR-F（D8）：删占位 Axiom。OXN Engine 哲学沉淀到 ADR-0031（记录事实不评判） + ADR-0066/0067（OXN 不判质量只记事实）；本 Axiom 已无信息量。

## Forbidden

### ForbiddenErrorContractFamily
- 🆕 v0.7.0 RFC-0027 PR-F（D5）：canonical 错误处理 ForbiddenConstructs（吸收自 cli/proof/work 三个 Domain）。
- HARD_FAIL
- SOFT_FAIL
- VerdictAsException
- FailureAsCrash
- OXN_INTERNAL_ERROR_AS_IAP
- StackTraceToAI
- HARD_HALT_AS_IAP
- desc: 禁用"硬/软失败"二分（OXN 只记事实不判合格——ADR-0066/0067）；禁用"verdict 即异常"语义（ProbeOutcome 是事实不是异常）；禁用 OXN 内部错误伪装成 IAPError（IAPError 仅用于人类工程师决策交互，引擎内部错误用 OXNCrash 独立通道）；禁用 StackTrace 直接喂给 AI（Stack 仅供人类审计）；禁用 hard halt 当 IAPError 用（CLI 退出码 ≠ IAPError）。

### ForbiddenConstructs
- L2Domain
- Tier
- TierLevel
- Stratum
- Strata
- ArsenalPromote
- DraftAsset
- CanonicalAsset
- monolithic-cli
- monolithic-engine
- package-coupled
- engine-internal-import
- daemon-direct-import-from-cli
- cli-direct-import-from-daemon
- cross-package-circular
- import-from-src
- @engine-internal
- CrashLoop
- ForkDaemon
- SystemdUnit
- LaunchD
- ANTLR
- Yacc
- PEG
- TypeScriptGrammar
- HandWrittenParser

- desc: 禁用旧术语（L2Domain/Tier/Stratum/ArsenalPromote 等历史版本残留）。Monorepo 禁用 monolithic-{cli,engine} / 跨包循环 / 穿透 import-from-src。Daemon 禁用 CrashLoop/ForkDaemon/SystemdUnit/LaunchD（必须走 oxn daemon * 命令）。OXL 禁用 ANTLR/Yacc/PEG/TypeScriptGrammar/HandWrittenParser（统一通过 unified 库实现 MD-native DSL，禁止再引 DSL 框架）。

## Boundary

### Inv1LayerVsPhase
- L0-L3 与 P0-P3 是两个正交概念：L0-L3 描述代码分层，P0-P3 描述产品路线图。

### Inv2DomainContextMap
- Domain 实体（用户业务域）与 L0-L3 宪法（OXN 元域）通过 ContextMap 显式连接，不可互相包含。

### Inv3KernelInfraSeparation
- Kernel 与 Infra 司法/行政分离：Kernel 验证 ProbeOutcome（COMPLETED/DEVIATED/INCONCLUSIVE）；Infra 只回答事实不做判定；Kernel 不能直接执行 Task；Infra 不能绕过 Daemon 自己宣布 Work 完成。Kernel 全面禁用 fs/net/child_process/process.env/process.std*/EventEmitter。Kernel 不做"整体合格/失败"聚合判定（详见 ADR-0067）。

### Inv4MonorepoBoundary
- Monorepo 包边界：packages/cli 不能 import packages/engine 内部模块，仅走 packages/engine 公共 API；packages/engine 不能 import packages/cli（engine 是被依赖方）。

### Inv5DaemonIndependence
- Daemon 不能 import CLI（必须走 socket 通信）；不能直接 import fs（必须通过 L1-Infra 收口）。

### Inv6EngineDomainUnidirectionalRef
- 本域与 oxn-domain 单向引用：Engine 子域补父域未说的部分，重名 term（OXN Engine）不重定义；不向下引用 oxn-cli-domain/oxn-asset-domain。

### Inv7EngineRootDomain
- 本 Domain 定义 OpenXenon 引擎层词汇边界。