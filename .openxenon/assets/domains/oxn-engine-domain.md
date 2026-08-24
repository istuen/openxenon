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

> Asset 结构 v2 三层模型（## Group → ### Axiom → - Theorem）。

## Concept

### OXNEngine
- OpenXenon 核心引擎；记录事实不评判合格；L0-L3 分层 + E1-E4 四结构实体实现。
- **L0-L3 与 E1-E4 二分**——L0-L3 是代码物理分层（Kernel/Infra/Daemon/CLI），E1-E4 是逻辑实体分层（Asset/Work/Proof/Report）；两者正交，OXN 不混用。
- **不评判原则的执行**——Engine 所有 verdict 输出均为 ProbeOutcome（COMPLETED/DEVIATED/INCONCLUSIVE），无 4th 状态；不做"整体合格/失败"聚合判定。
- **Engine 副作用出入口唯一性**——所有副作用（fs/net/child_process）必须经 L1-Infra 收口；Engine 自身模块不直接调用。

### Kernel
- L0 纯逻辑验证模块（记录事实不评判）：零 IO 约束，只接受 Infra 观测产出 ProbeOutcome，不调 fs/net/child_process。
- 通过 Infra 调用带副作用的 Probe 来观测客观事实并验证。
- **Kernel 零 IO 约束**——Kernel 模块完全禁用 fs/net/child_process/process.env/process.std*/EventEmitter；任何副作用需求必须经 Infra Port 调用。
- **Kernel 不直接执行 Task**——Kernel 验证 ProbeOutcome 三态（COMPLETED/DEVIATED/INCONCLUSIVE），不主动触发执行；Task 执行由 Daemon 编排。
- **Kernel 不聚合判定**——Kernel 验证单个 Probe 的 outcome，不做"整体合格/失败"聚合；聚合是 Work/Blueprint 层的语义。

### Infra
- L1 副作用 / IO 执行模块：只回答事实不做判定（不能给自己盖章）；3 个 IO Primitive（io.stat/io.read/io.exec）通过 ProviderRegistry 暴露。
- 负责 OpenXenon 跟外部宿主环境的出入口，包括文件、网络等具有副作用的交互。
- **Infra 不做判定**——Infra 模块回答"事实"（stat 结果 / read 内容 / exec exit code），不做"合格/失败"判定；判定权归 Kernel。
- **3 Primitive 封闭**——io.stat / io.read / io.exec 是 Infra 暴露的全部 IO 接口；新增 IO 能力必须新增 Primitive 而非直接 fs/net 调用。
- **Infra 不能绕过 Daemon**——Infra 不监听文件系统变化、不主动汇报 Work 完成；监听和汇报由 Daemon 承担。

### OXL
- Engine 通过 unified 库实现 MD 语法的特性，包括编译、校验。
- **MD-native DSL**——OXL 基于 Markdown + frontmatter；通过 unified 库（remark + mdast）实现编译和校验。
- **DSL 框架禁用**——禁用 ANTLR / Yacc / PEG / TypeScriptGrammar / HandWrittenParser；新增语法特性必须扩展 unified pipeline 而非引入新解析器。
- **OXL 与 Asset 边界**——OXL 编译产物（catalog / .md parse tree）供 Engine runtime 消费；OXL 自身不持有业务语义。

### IAPError
- 业务流转中预期内错误的契约类。轨道 1，AI 消费受众。
- **IAPError 不携带 StackTrace**——Stack 路径仅供人类审计；AI 消费契约通过 code + message + data 三字段。
- **IAPError ≠ exit code**——CLI 退出码是 Engine → Shell 的物理返回，IAPError 是 Engine → AI 的语义返回；两者职责分明。
- **三层分离**——IAPError（轨道 1 AI）/ OXNCrash（轨道 2 人类）/ CliInputError（轨道 3）三类互不混用；详见 ForbiddenErrorContractFamily。

### OXNCrash
- OXN 引擎自身 Bug 或底线被击穿的错误契约类。轨道 2，人类消费受众。
- **OXNCrash 不伪装 IAP**——Engine 内部 bug 必须用 OXNCrash 通道上报；禁止用 IAPError 包装 Engine 内部错误。

### CliInputError
- 用户 CLI 输入错的契约类。轨道 3。
- **CliInputError 早返回**——CLI 输入错误在解析层（citty arg parser）立即抛出，不进入 Engine 业务逻辑。
- **OXN_CLI_INPUT_ERROR 守门**——所有 CliInputError 必须含 OXNCrash.code 风格统一错误码（如 `OXN_CLI_INPUT_ERROR`）便于 AI 消费。

### Port
- 抽象接口契约（Kernel/Infra 边界 port）。
- **Port 模式统一**——Kernel/Infra 边界通过 Port 抽象（HashPort / OsPort / FileSystemPort / LoggerPort）；新增跨边界能力必须新增 Port 而非直接 import。
- **Port 实现可替换**——Port 是接口契约，具体实现（Node fs / Bun fs / mock）由 ProviderRegistry 注入；测试可换 mock。

### ImplementationBoundaryCriteria
- OXN 实现边界的四轴正交判据集——评估任何 OXN 新功能时过四判据，任一判据命中"不该实现"则拒绝；四判据全过则符合 OXN 定位。两两正交覆盖四个维度：补偿什么 / 升到哪级 / 提哪限 / 路径怎么判。
- **D1 补偿方向**——OXN 补偿 agent 非确定性（参照锚点），不补偿环境性质（持续感知、环境适配）。
- **D2 agent 级别**——OXN 把 LLM Agent 从"不可靠 type 2-3"升级到"可靠 type 2-3"，**不进 type 4**（utility 性能度量故意外包给工程师）。
- **D3 floor/ceiling**——OXN 提高 floor（下限参照保底），不提高 ceiling（上限机制、限制 AI 上限、替 AI 做最优选择）。
- **D4 路径判据**——OXN 路径判据是**确定性满足**（满足工程师定义的边界即合格），不是路径优化（最短/最省/自动选最优路径）。
- **drift recovery 误用禁止**——曾推演"OXN 修复 LLM 漂移"作为 Referent 功能描述，已被否决；正确描述是**标记参照**（像飞行检查清单/地图路标），OXN 不强制 AI 遵守或必须验证。drift recovery 概念禁止后续 ADR/code 引用。
- **分布式理性模型**——OXN 理性是三方协作闭环的分布式属性：AI 伪理性 + 工程师真理性 + OXN 对齐参照；OXN 不持有 P 也不做选择。
- **使用方式**——架构守卫检查清单（v0.8+ PR 评估流程）；全量锁定。

### DiagnosticUnification
- 全栈非阻断诊断统一——所有非阻断问题（warning/diagnostic）走 `LoggerPort` 接口（4 档 LogLevel：debug/info/warn/error），不再用 `warnings: string[]` 返回值或 `console.warn/error`/`process.stderr.write` 副作用。函数签名只返回业务数据，warning 走 logger 单通道。
- **LoggerPort L0-Contract**——`packages/engine/src/kernel/contracts/logger-port.ts` 定义 `LoggerPort` 接口 + `LogEntry`（level + message + tag? + data? + date?，无 code）+ `LogLevel` 4 档；遵循现有 Port 模式（HashPort / OsPort / FileSystemPort）。
- **consola L1-Infra 隔离层**——`packages/engine/src/infra/logging/logger.ts` 是代码库中唯一 `import consola` 的文件；consola 已是 citty transitive dep（零新增安装）；切换其他日志库（pino）只需改这一个文件，所有调用代码不变。
- **CLI 用 InMemoryLogCollector，daemon 用 FileConsolaReporter**——CLI 短运行用内存收集（drain 后退出）；daemon 长运行用文件 + stderr reporter（直接输出，无内存泄漏）；两者共享 LoggerPort 接口，reporter 组合不同。
- **JSON envelope 扩展**——`OutputEnvelope<T> = { ok, data?, error?, warnings?: LogEntry[] }`；CLI `--json` 模式下 warnings 字段可见，AI Agent 可消费非阻断诊断。
- **state.json 删除 diagnostics**——`WorkspaceStateSchema.diagnostics` 字段是只写不读的死数据（`oxn work context` 重新解析 ref，不读 state.json）；直接删除字段。
- **remark-canonical throw 化**——所有 `severity: 'error'` 改为 `throw MDError.err()`（与 `remarkParse` 一致，遵循 Error = throw only）；`severity: 'warning'` 改为 `logger.warn(message, data)`；删除 `CanonicalResult` / `CanonicalIssue` 类型。
- **ESLint 架构守卫**——新增 2 条规则：repo-wide 禁直接 import `consola`（仅 `infra/logging/` 豁免）；Engine 层禁 `console.warn` / `console.error`。CLI crash handler 例外（exit 2，stderr for humans）。
- **Log ≠ Error**——LogEntry 是纯日志（无 code），通过 message + tag + data 追溯到代码位置；Error 有 code（AI 消费契约，决定 exit code + 输出渠道）；两者职责分明。Code 是 Error 体系专属。
- **迁移状态**——v0.7.0 partial ship：D1 + D2 + Asset.validate 重构已落地；CLI/Daemon/Work/Proof 全面 logger 迁移待跟进。7-PR 分批计划锁定。

## Forbidden

### ForbiddenErrorContractFamily
- HARD_FAIL
- SOFT_FAIL
- VerdictAsException
- FailureAsCrash
- OXN_INTERNAL_ERROR_AS_IAP
- StackTraceToAI
- HARD_HALT_AS_IAP
- desc: 禁用"硬/软失败"二分（OXN 只记事实不判合格）；禁用"verdict 即异常"语义（ProbeOutcome 是事实不是异常）；禁用 OXN 内部错误伪装成 IAPError（IAPError 仅用于人类工程师决策交互，引擎内部错误用 OXNCrash 独立通道）；禁用 StackTrace 直接喂给 AI（Stack 仅供人类审计）；禁用 hard halt 当 IAPError 用（CLI 退出码 ≠ IAPError）。

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
- Kernel 与 Infra 司法/行政分离：Kernel 验证 ProbeOutcome（COMPLETED/DEVIATED/INCONCLUSIVE）；Infra 只回答事实不做判定；Kernel 不能直接执行 Task；Infra 不能绕过 Daemon 自己宣布 Work 完成。Kernel 全面禁用 fs/net/child_process/process.env/process.std*/EventEmitter。Kernel 不做"整体合格/失败"聚合判定。

### Inv4MonorepoBoundary
- Monorepo 包边界：packages/cli 不能 import packages/engine 内部模块，仅走 packages/engine 公共 API；packages/engine 不能 import packages/cli（engine 是被依赖方）。

### Inv6EngineDomainUnidirectionalRef
- 本域与 oxn-domain 单向引用：Engine 子域补父域未说的部分，重名 term（OXN Engine）不重定义；不向下引用 oxn-cli-domain/oxn-asset-domain。

### Inv7EngineRootDomain
- 本 Domain 定义 OpenXenon 引擎层词汇边界。