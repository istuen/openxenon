---
entity: adr
version: 1.0.0
status: Accepted
date: 2026-07-24
accepted: 2026-07-24
supersedes: ADR-0080
superseded-by: null
related:
  - docs/adrs/0080-error-terminology-unification-and-governance.md
  - docs/dev/zh-cn/error-code-registry.md
  - docs/adrs/0072-oxn-as-referent-for-nondeterministic-agent.md
  - docs/adrs/0082-diagnostic-unification.md
---

# ADR-0081: OXN 统一错误体系框架（EngineError + CLIError 双基类 + Domain 子类 + severity 两档）

> **状态**：💡 Proposed
> **日期**：2026-07-24
> **来源**：grilling session 错误体系盘问（ADR-0080 实践后）
> **影响层**：全栈错误分类 + 错误类层次 + CLI 路由 + 命名规范
> **与 ADR-0080 的关系**：ADR-0080 确立了"三层分类框架（类型→类别→码）+ SSOT 登记 + 决策树"，本 ADR 将其错误类型层（IAPError / OXNCrash / CliInputError 三类型）重构为 EngineError + CLIError 双基类层次（Engine 和 CLI 各自独立基类，不共享继承关系）。ADR-0080 的错误类别层（6 种类别）和码层（SSOT 注册表）保留，作为本框架的子集。

## Context

### 触发问题

ADR-0080 落地后，实践盘问暴露前缀噪音问题：

1. **6 个前缀分散**：`IAP_` / `OXN_CRASH_` / `OXN_` / `E_MD_` / `E_OXL_` / `INFRA_FAIL_`——类型信息（谁消费）+ 域信息（哪里的错）+ 码信息（具体什么错）三个维度混在前缀里，信息过载。
2. **OXNCrash 是噪音**：3 个 code（`SIGNATURE_MISMATCH` / `STATE_CORRUPT` / `INTERNAL_ERROR`）全部是预留码，0 处生产 throw site。tier-4 fallback 兜底未知异常，从未显式构造 OXNCrash。
3. **CliInputError 不是类**：靠前缀白名单检测（`isCliInputError()`），无独立错误类，无类型安全。
4. **E_MD_xxx / E_OXL_xxx 归属悬空**：15 个 MD pipeline 错误作为原生 `Error` 抛出，不在三层分类内，AI 无法用 `isIAPError()` 识别。
5. **INFRA_FAIL 裸码跨 4 种类别**：ADR-0080 §D4d 拆分为 4 个子码，但子码前缀 `INFRA_FAIL_` 与 `IAP_` 前缀并存，增加噪音。

### 设计约束（grilling 确认）

| 约束 | 来源 | 说明 |
|---|---|---|
| EngineError + CLIError 双基类 | 用户决策 | Engine 和 CLI 各自独立基类，EngineError 有 5 个 Domain 子类，CLIError 独立 |
| severity 放 name 最后 | 用户决策（Q1） | `OXN_<DOMAIN>_<CODE>_<SEVERITY>`，构造时业务决定 |
| CLI 专属 domain | 用户决策（Q3） | 输入校验是 CLI 特有的 |
| domain 由抛出位置决定 | 用户决策（Q3） | 代码在哪里 throw，domain 就归哪里 |
| CrashError 删除 | 用户决策（G1） | 无使用 = 噪音，FATAL 成为任意 domain 可用的 severity |
| severity 构造时确定 | 用户决策（G2） | 业务决定，构造后 readonly，不是运行时可变 |
| Error = throw only（两档） | 用户决策（Q14） | WARN 从 Error 类移除。Error 只保留 ERR/FATAL（阻断）。非阻断问题走 Diagnostic return 模式，不在 Error 类上表达 |
| context 字段改名为 data | 用户决策（Q14） | context 在 OXN 里是承接上下文的表达，不与 Error 的结构化信息混淆。Error 的结构化数据字段命名为 `data` |
| E_MD 覆盖全部 | 用户决策（Q14） | MDError 覆盖 throw 错误 + 验证结果数组条目（CanonicalIssue / ReferenceSeverity），不只 throw |
| 迁移分阶段 | 用户决策（Q14） | D9 从"一个 PR"改为分阶段迁移（Foundation → Engine → CLI → MD → Cleanup）|
| CLI→ALIGN 重分类 | 用户决策（Q14） | WORK_NOT_FOUND 等归属 AlignError（engine），CLI 只是调用层 |

## Decision

### D1: 双基类设计（EngineError + CLIError）

**核心决策**：不使用统一的 OXNError 父类。Engine 和 CLI 各自有独立的错误基类——EngineError（engine package）和 CLIError（cli package）。两者不共享继承关系。

**理由**：
1. CLI 和 Engine 是独立的 package，CLI 依赖 Engine 但反过来不成立。各自的错误体系应独立。
2. CLI 顶层 catch 中，Engine 抛出的错误和 CLI 内部抛出的错误本来就是不同处理路径——Engine 错误要么直接冒泡给外部，要么被 CLI 捕获后重新包装。不需要 instanceof 统一识别。
3. 基类名直接表达 package 归属：EngineError = engine 的错误，CLIError = CLI 的错误。

#### 物理布局

```
Engine package (packages/engine/src/errors/)
├── engine-error.ts          ← EngineError 基类 + 2 工厂方法（.err() / .fatal()）
└── index.ts

Engine 各模块就近定义 DomainError（与代码领域内聚）：
packages/engine/src/Work/align-error.ts           ← AlignError extends EngineError
packages/engine/src/infra/frozen/proof-error.ts   ← ProofError extends EngineError
packages/engine/src/infra/infra-error.ts          ← InfraError extends EngineError
packages/engine/src/oxl/md-bridge/md-error.ts     ← MDError extends EngineError
packages/engine/src/Asset/intent-error.ts         ← IntentError extends EngineError

CLI package (packages/cli/src/errors/)
├── cli-error.ts             ← CLIError 基类（自身基类，不继承 EngineError）+ 工厂方法
└── index.ts
```

**就近内聚原则**：Domain 子类定义在它服务的模块目录内，而非集中在 errors/ 目录。AlignError 在 Work/ 模块内，MDError 在 md-bridge/ 内。errors/ 目录只放基类。

#### 类层次

```
EngineError (abstract base, packages/engine/src/errors/engine-error.ts)
│  domain: EngineDomain     ← 子类决定（类型级，instanceof 区分）
│  severity: Severity       ← 构造时业务决定（readonly）
│  code: string
│  cause?: Error            ← 基类字段
│  data?: Readonly<Record<string, unknown>>  ← 基类字段（结构化错误数据）
│  name = `OXN_${domain}_${code}_${severity}`  ← 自动拼接
│
├── IntentError             ← domain = INTENT（packages/engine/src/Asset/intent-error.ts）
├── AlignError              ← domain = ALIGN（packages/engine/src/Work/align-error.ts）
├── ProofError              ← domain = PROOF（packages/engine/src/infra/frozen/proof-error.ts）
├── InfraError              ← domain = INFRA（packages/engine/src/infra/infra-error.ts）
└── MDError                 ← domain = MD（packages/engine/src/oxl/md-bridge/md-error.ts）
     └── loc?: { line: number; col: number }  ← 子类扩展（源码位置，MD 特有）

CLIError (base, packages/cli/src/errors/cli-error.ts)
│  domain = 'CLI'           ← 固定值
│  severity: Severity
│  code: CLIErrorCode
│  cause?: Error
│  data?: Readonly<Record<string, unknown>>  ← 基类字段（结构化错误数据）
│  name = `OXN_CLI_${code}_${severity}`  ← 自动拼接
│  （不继承 EngineError，独立基类）
```

> **子类扩展字段原则**：只有"该 Domain 所有错误都有、其他 Domain 没有的"字段才值得扩展为子类专属字段。MD 错误的 `loc`（源码位置）符合此原则。ProofError 的验证结果（outcome）不属于错误——它是 Probe 体系的数据，在 frozen.json 中流转，不放错误类上。

#### OXN_ 前缀保留决策

基类名为 EngineError / CLIError（表达 package 归属），但错误码 name 保留 `OXN_` 前缀（表达产品品牌）。理由：

1. **name 是对外契约**：AI / 用户看到 name（错误码），看到 `OXN_` 就知道是 OXN 生态的错误。基类名是代码内部组织，不直接暴露给消费者。
2. **AI 消费一致性**：AI 只需识别 `OXN_` 一个前缀，不需要区分 `ENGINE_` / `CLI_`。Domain 段（ALIGN / PROOF / CLI / ...）已表达具体来源。
3. **不与基类名冲突**：基类叫 EngineError / CLIError（代码内），name 用 `OXN_` 前缀（对外），两者职责不同。

#### 类型安全双层设计

**Code = 联合类型**（编译时拼写校验）：每个 Domain 子类有自己的 code 联合类型，编译器在每个 throw site 校验 code 合法性。

**Severity = 工厂方法**（基类统一提供）：EngineError 和 CLIError 各自定义 2 个 severity 工厂方法（`.err()` / `.fatal()`）。所有子类统一继承这 2 个工厂方法——认知负担一致。

构造器为 protected（仅子类可调用），工厂方法在基类实现并自动拼接 domain + code + severity。

三层保证：
1. Code 拼写 → 联合类型编译时校验
2. Severity 非法值 → 工厂方法名限定 2 个入口，不可能传错
3. catch 侧 → EngineError / CLIError 实例字段齐全，`err.severity` 一定是 FATAL/ERR 之一

#### EngineError 基类定义（含工厂方法）

```typescript
// packages/engine/src/errors/engine-error.ts

type EngineDomain = 'INTENT' | 'ALIGN' | 'PROOF' | 'INFRA' | 'MD'
type Severity = 'FATAL' | 'ERR'

abstract class EngineError extends Error {
  readonly domain: EngineDomain
  readonly severity: Severity
  readonly code: string
  readonly cause?: Error
  readonly data?: Readonly<Record<string, unknown>>

  protected constructor(opts: {
    domain: EngineDomain
    severity: Severity
    code: string
    message: string
    cause?: Error
    data?: Record<string, unknown>
  }) {
    super(opts.message)
    this.domain = opts.domain
    this.severity = opts.severity
    this.code = opts.code
    this.cause = opts.cause
    this.data = opts.data
    this.name = `OXN_${this.domain}_${this.code}_${this.severity}`
    Object.setPrototypeOf(this, new.target.prototype)
  }

  // ── 2 个 severity 工厂方法（基类统一提供，所有子类继承）──
  //
  // ⚠️ 实现注意事项：
  // 下方代码用 `this` 参数类型演示设计意图，但 `this` 在 static 方法中推导不稳定，
  // 不可在生产代码中使用。落地时需采用正确的 TypeScript 模式实现"基类提供工厂方法 +
  // 子类 code 联合类型自动推导"。候选方案（落地时验证）：
  //   - 方案 A：子类用 thin override（`static err(code: AlignErrorCode, ...) { return super.err(code, ...) }`）
  //   - 方案 B：泛型工厂函数（`function err<T extends EngineError>(Ctor: ...)`）
  //   - 方案 C：mixin 模式
  // 核心设计约束不变：2 个工厂方法在基类定义，所有子类统一继承，认知负担一致。

  static err<C extends string>(this: new (code: C, severity: Severity, message: string, opts?: any) => EngineError,
    code: C, message: string, opts?: {
      cause?: Error
      data?: Record<string, unknown>
    }): EngineError {
    return new (this as any)(code, 'ERR', message, opts)
  }

  static fatal<C extends string>(this: new (code: C, severity: Severity, message: string, opts?: any) => EngineError,
    code: C, message: string, opts?: {
      cause?: Error
      data?: Record<string, unknown>
    }): EngineError {
    return new (this as any)(code, 'FATAL', message, opts)
  }
}
```

> **注**：工厂方法设计意图是"基类统一提供 2 个 severity 入口，所有子类继承"。上方代码用 `this` 参数类型演示意图，但该模式在 TypeScript static 方法中推导不稳定——落地时需改用正确模式（见代码注释中的候选方案 A/B/C）。核心设计约束不变：2 个工厂方法在基类定义，所有子类统一继承，认知负担一致。

#### CLIError 基类定义

```typescript
// packages/cli/src/errors/cli-error.ts

type CLIErrorCode =
  | 'NO_PROJECT'
  | 'FILE_NOT_FOUND'
  | 'NO_BLUEPRINT'
  | 'INVALID_BLUEPRINT'
  | 'INVALID_ASSET_KIND'
  | 'INVALID_WORK_NAME'
  | 'WORK_EXISTS'
  | 'PROOF_NOT_FOUND'
  | 'ROADMAP_NOT_FOUND'
  | ...

class CLIError extends Error {
  readonly domain = 'CLI' as const
  readonly severity: Severity
  readonly code: CLIErrorCode
  readonly cause?: Error
  readonly data?: Readonly<Record<string, unknown>>

  private constructor(code: CLIErrorCode, severity: Severity, message: string, opts?: {
    cause?: Error
    data?: Record<string, unknown>
  }) {
    super(message)
    this.severity = severity
    this.code = code
    this.cause = opts?.cause
    this.data = opts?.data
    this.name = `OXN_CLI_${this.code}_${this.severity}`
    Object.setPrototypeOf(this, CLIError.prototype)
  }

  static err(code: CLIErrorCode, message: string, opts?: {
    cause?: Error
    data?: Record<string, unknown>
  }): CLIError {
    return new CLIError(code, 'ERR', message, opts)
  }

  static fatal(code: CLIErrorCode, message: string, opts?: {
    cause?: Error
    data?: Record<string, unknown>
  }): CLIError {
    return new CLIError(code, 'FATAL', message, opts)
  }
}
```

> CLIError 不继承 EngineError。它有自己的 2 个工厂方法（签名一致），但 code 类型是 `CLIErrorCode` 联合类型，domain 固定为 `'CLI'`。构造器为 `private`（非 protected），因为 CLIError 是最终类——不再有子类。

#### 子类定义（联合类型 + 继承工厂方法）

Engine domain 子类只需定义 code 联合类型 + protected 构造器 + 扩展字段。2 个 severity 工厂方法从 EngineError 基类继承，无需重复定义。CLIError 已在上文定义为独立基类，此处不重复。

```typescript
// ─── AlignError ───
type AlignErrorCode =
  | 'WORK_NOT_FOUND'
  | 'WORK_ALREADY_RUNNING'
  | 'WORK_ALREADY_FINALIZED'
  | 'WORK_NOT_STARTED'
  | 'TASK_NOT_FOUND'
  | 'STATE_LOAD_FAILED'
  | 'ROUND_MAX_EXCEEDED'
  | 'ROUND_ALREADY_PASSED'
  | ...

class AlignError extends EngineError {
  protected constructor(code: AlignErrorCode, severity: Severity, message: string, opts?: {
    cause?: Error
    data?: Record<string, unknown>
  }) {
    super({ domain: 'ALIGN', severity, code, message, ...opts })
  }
  // err() / fatal() 从基类继承
}

// ─── ProofError ───
type ProofErrorCode =
  | 'PROBE_CORRUPTED'
  | 'PROBE_MISSING'
  | 'FINALIZE_BLOCKED'
  | 'INFRA_FAIL_FROZEN_WRITE'
  | 'INFRA_FAIL_PROBE_CATALOG'
  | 'INGEST_SCHEMA_INVALID'
  | ...

class ProofError extends EngineError {
  protected constructor(code: ProofErrorCode, severity: Severity, message: string, opts?: {
    cause?: Error
    data?: Record<string, unknown>
  }) {
    super({ domain: 'PROOF', severity, code, message, ...opts })
  }
  // err() / fatal() 从基类继承
  // 无专属扩展字段——验证结果（outcome）是 Probe 体系的数据，放 data
}

// ─── MDError（扩展 loc 字段）───
type MDErrorCode =
  | 'INVALID_SYNTAX'
  | 'MISSING_REQUIRED'
  | 'TYPE_MISMATCH'
  | 'REFERENCE_BROKEN'
  | 'HASH_MISMATCH'
  | 'DEPRECATED_SYNTAX'
  | 'DUPLICATE_H3'
  | 'EXTERNAL_KIND_INVALID'
  | 'EXTERNAL_URL_PATH_CONFLICT'
  | 'EXTERNAL_URL_PATH_REQUIRED'
  | 'ENTITY_NOT_REGISTERED'
  | ...

class MDError extends EngineError {
  readonly loc?: { line: number; col: number }

  protected constructor(code: MDErrorCode, severity: Severity, message: string, opts?: {
    loc?: { line: number; col: number }
    cause?: Error
    data?: Record<string, unknown>
  }) {
    super({ domain: 'MD', severity, code, message, ...opts })
    if (opts?.loc) this.loc = opts.loc
  }
  // err() / fatal() 从基类继承
}

// ─── InfraError ───
type InfraErrorCode =
  | 'PATH_CONFLICT'
  | 'KIND_UNSUPPORTED'
  | 'PROVIDER_DUPLICATE'
  | 'PROVIDER_UNSUPPORTED'
  | 'SANDBOX_REJECTED'
  | 'FORCE_REQUIRED'
  | 'INTERNAL_ERROR'        // 原 OXN_CRASH_INTERNAL_ERROR
  | 'SIGNATURE_MISMATCH'    // 原 OXN_CRASH_SIGNATURE_MISMATCH
  | 'STATE_CORRUPT'         // 原 OXN_CRASH_STATE_CORRUPT
  | 'INFRA_FAIL_INSIGHT_TARGET'
  | ...

class InfraError extends EngineError {
  protected constructor(code: InfraErrorCode, severity: Severity, message: string, opts?: {
    cause?: Error
    data?: Record<string, unknown>
  }) {
    super({ domain: 'INFRA', severity, code, message, ...opts })
  }
  // err() / fatal() 从基类继承
}

// ─── IntentError ───
type IntentErrorCode =
  | 'NAME_FILE_MISMATCH'
  | 'REFERENCE_PREFIX_INVALID'
  | 'ASSET_HAS_REFS'
  | 'INCOMPLETE_ASSET_PAPER'
  | 'PROBE_OUT_OF_BOUNDARY'
  | 'TASK_DAG_VIOLATES_SLOT'
  | ...

class IntentError extends EngineError {
  protected constructor(code: IntentErrorCode, severity: Severity, message: string, opts?: {
    cause?: Error
    data?: Record<string, unknown>
  }) {
    super({ domain: 'INTENT', severity, code, message, ...opts })
  }
  // err() / fatal() 从基类继承
}
```

#### 使用示例

```typescript
// Code 拼写错误 → 编译时捕获
ProofError.err('PROBE_CORUPTED', 'msg')         // ❌ 编译错误：不在 ProofErrorCode 中
AlignError.err('WORK_NOT_FOND', 'msg')           // ❌ 编译错误：拼写错误

// Severity 非法值 → 不可能（工厂方法名限定）
ProofError.error('PROBE_CORRUPTED', 'msg')       // ❌ 编译错误：没有 error 方法，只有 err
ProofError.warn('PROBE_CORRUPTED', 'msg')        // ❌ 编译错误：没有 warn 方法

// 构造器 protected/private → 无法绕过工厂方法
new ProofError('PROBE_CORRUPTED', 'ERR', 'msg')  // ❌ 编译错误：constructor 是 protected
new CLIError('ROADMAP_NOT_FOUND', 'ERR', 'msg')  // ❌ 编译错误：constructor 是 private

// 正确用法——所有子类统一继承 2 个工厂方法
throw ProofError.err('PROBE_CORRUPTED', 'msg')
throw InfraError.fatal('INTERNAL_ERROR', 'msg', { cause: err })
throw AlignError.err('WORK_NOT_FOUND', 'msg')
throw CLIError.err('ROADMAP_NOT_FOUND', 'msg')

// 非阻断问题 → 不 throw，走 Diagnostic return 模式（ADR-0082 统一）
// return { ok: true, diagnostics: [{ code: 'DEPRECATED_SYNTAX', severity: 'warn', message: '...' }] }
```

### D2: Domain 划分（6 个）

| Domain | 语义 | 涵盖 | 判定规则 | 基类 |
|---|---|---|---|---|
| `INTENT` | Asset/Blueprint/Domain 声明层 | 声明结构违规 + 输入校验 | 抛出代码在 Asset/Blueprint/Domain 模块 | EngineError 子类 |
| `ALIGN` | Work/Task 执行层 | 状态机 + Work CLI | 抛出代码在 Work/Task 模块 | EngineError 子类 |
| `PROOF` | 验证层 | Probe/Domain invariant/frozen + Proof CLI | 抛出代码在 Proof/Probe 模块 | EngineError 子类 |
| `INFRA` | 基础设施层 | 路径/Provider/Sandbox/Daemon/Config | 抛出代码在 Infra 模块 | EngineError 子类 |
| `MD` | MD pipeline | 语法/结构/引用校验 | 抛出代码在 OXL/MD-bridge 模块 | EngineError 子类 |
| `CLI` | CLI 输入层 | 参数校验/文件名校验/路径校验 | 抛出代码在 CLI 命令模块 | CLIError（独立基类） |

**Domain 判定原则**：以 throw 代码所在位置决定。CLI 调用 Daemon 时，参数缺失是 CLI 的问题（→ CLIError），但传入 Daemon 后启动失败是 Daemon 的问题（→ InfraError）。如果 CLI 对参数做了前置校验后抛出，那就是 CLIError。

**双基类归属**：前 5 个 Domain（INTENT/ALIGN/PROOF/INFRA/MD）是 EngineError 的子类，定义在 engine package 内。CLI Domain 是独立的 CLIError 基类，定义在 cli package 内，不继承 EngineError。

**无 CRASH domain**：CrashError 已删除。原 `OXN_CRASH_*` 的 3 个码迁移到 InfraError + severity=FATAL。tier-4 fallback 显式调用 `InfraError.fatal('INTERNAL_ERROR', message, { cause: err })`。

**CLI→ALIGN 重分类**：当前 `WORK_NOT_FOUND` / `WORK_ALREADY_RUNNING` / `WORK_ALREADY_FINALIZED` / `WORK_NOT_STARTED` 等 code 在 CLI 层以 ad-hoc `throw new Error('OXN_WORK_*')` 形式抛出。本 ADR 将这些 code 归类为 `AlignErrorCode`（engine），因为它们描述的是 Work/Task 执行层的状态机语义，而非 CLI 输入校验。迁移时 throw site 从 CLI 迁移到 Engine——CLI 只作为调用层，调用 Engine 函数由其 throw AlignError。CLI 不直接 throw Engine 的错误类。

### D3: Severity 两档

| Severity | 语义 | exit | 输出渠道 | 消费者 |
|---|---|---|---|---|
| `FATAL` | 不可恢复，引擎级崩溃 | 2 | stderr stack | 人类工程师 |
| `ERR` | 可恢复的阻断 | 1 | stdout JSON | AI Agent |

**Error = throw only（阻断）**：无论问题类型（输入/数据/逻辑），只要需阻断就是 ERR。code + message 已表达问题类型（`DEPRECATED_SYNTAX` / `WORK_NOT_FOUND` / `PROBE_CORRUPTED`），用户据此调整。

**非阻断问题不在 Error 类上表达**。代码库已有 Error（throw，阻断）vs Diagnostic（return，不阻断）的分离决策（见 `packages/engine/src/oxl/compiler/ref-diagnostic.ts:6-15`）：

- **Error（throw，阻断）**：`throw AlignError.err('WORK_NOT_FOUND', ...)` → 控制流中断 → exit 1
- **Diagnostic（return，不阻断）**：`return { ok: true, diagnostics: [{ code: 'DEPRECATED_SYNTAX', severity: 'warn', message: '...' }] }` → 程序继续运行/完成 → exit 0

strict/lenient 模式差异：strict 模式 → `throw DomainError.err()`（阻断）；lenient 模式 → `return { ok, diagnostics: [...] }`（不阻断）。是否阻断由业务逻辑决定，不由 severity 档位决定。

**当前 warning 碎片化**：代码库存在 7 种不兼容的 warning pattern（`warnings: string[]` / `diagnostics[]` + Zod / `CanonicalIssue` / `ReferenceSeverity` / `process.stderr.write` / `console.warn` / `console.error`），3 种不兼容的 severity enum（`'warn'|'error'` / `'error'|'warning'` / `'fatal'|'warn'`）。这些 pattern 的统一留到 **ADR-0082**（Diagnostic 统一类型）。本 ADR 只负责 Error 类层次，不涉及 Diagnostic。

### D3b: 不提供 action / selfCorrectable 字段

**决策**：EngineError / CLIError 不包含"建议 AI 下一步做什么"的字段（原 ADR-0080 的 `action: AUTONOMOUS_RETRY | YIELD_TO_HUMAN`，曾考虑改为 `selfCorrectable: boolean`，最终删除）。

**理由**：OXN = Referent（ADR-0072/0073），提供确定性参考，不做决策。"该 retry 还是该叫人"是 AI 的决策，不是 OXN 的职责。OXN 描述"发生了什么"（code + message + data），AI 根据错误信息自行判断下一步。如果 OXN 预设了建议，就跨越了 Referent 的边界——从"参考"变成了"指令"。

### D4: 命名格式

```
OXN_<DOMAIN>_<CODE>_<SEVERITY>
```

**示例**：

| 当前 | 统一后 | 类 |
|---|---|---|
| `IAP_PROOF_PROBE_CORRUPTED` | `OXN_PROOF_PROBE_CORRUPTED_ERR` | ProofError |
| `INFRA_FAIL_STATE_LOAD` | `OXN_ALIGN_STATE_LOAD_FAILED_ERR` | AlignError |
| `IAP_PROOF_FINALIZE_BLOCKED` | `OXN_PROOF_FINALIZE_BLOCKED_ERR` | ProofError |
| `OXN_CRASH_SIGNATURE_MISMATCH` | `OXN_INFRA_SIGNATURE_MISMATCH_FATAL` | InfraError |
| `OXN_WORK_NOT_FOUND` | `OXN_ALIGN_WORK_NOT_FOUND_ERR` | AlignError |
| `OXN_ROADMAP_NOT_FOUND` | `OXN_CLI_ROADMAP_NOT_FOUND_ERR` | CLIError |
| `E_MD_INVALID_SYNTAX` | `OXN_MD_INVALID_SYNTAX_ERR` | MDError |

> `E_MD_REFERENCE_BROKEN_WARN` 不迁移为 Error——非阻断问题走 Diagnostic return 模式（ADR-0082）。

**name 自动拼接**：构造器内 `this.name = `OXN_${this.domain}_${this.code}_${this.severity}``。调用者不需要手动拼接 name。

### D5: CLI 路由（从 4-tier 简化为 2-tier）

```typescript
// isOXNError 类型守卫定义在 D6：instanceof EngineError || instanceof CLIError
catch (err) {
  if (isOXNError(err)) {
    switch (err.severity) {
      case 'FATAL':
        // stderr + exit 2
        console.error(`\n=== OXN FATAL: ${err.name} ===`)
        console.error(err.message)
        if (err.cause) {
          console.error('Caused by:')
          console.error(err.cause instanceof Error ? err.cause.stack ?? err.cause : String(err.cause))
        }
        process.exit(2)

      case 'ERR':
        // stdout JSON + exit 1
        console.log(JSON.stringify({
          ok: false,
          error: {
            code: err.name,
            domain: err.domain,
            severity: err.severity,
            message: err.message,
            data: err.data,
          },
        }, null, 2))
        process.exit(1)
    }
  } else {
    // tier-2 fallback：未知异常 = 引擎 Bug
    const fatal = InfraError.fatal('INTERNAL_ERROR',
      err instanceof Error ? err.message : String(err),
      { cause: err instanceof Error ? err : undefined })
    console.error(`\n=== OXN FATAL: ${fatal.name} ===`)
    console.error(fatal.message)
    if (fatal.cause) console.error(fatal.cause.stack ?? fatal.cause)
    process.exit(2)
  }
}
```

### D6: 类型守卫

```typescript
// 统一识别：EngineError 或 CLIError（双基类无共同父类，用 || 合并）
function isOXNError(err: unknown): err is EngineError | CLIError {
  return err instanceof EngineError || err instanceof CLIError
}

// Engine Domain 级类型守卫（编译期收窄，仅对 EngineError 子类有意义）
function isEngineError(err: unknown): err is EngineError {
  return err instanceof EngineError
}

function isAlignError(err: EngineError): err is AlignError {
  return err instanceof AlignError
}

function isProofError(err: EngineError): err is ProofError {
  return err instanceof ProofError
}

// ... 其他 Engine Domain 子类同理（IntentError / InfraError / MDError）

// CLIError 无子类，不需要 Domain 级守卫——instanceof CLIError 即可
```

**Domain 走类型级**（instanceof）：因为 domain 在构造时确定且不变。`MDError` 永远是 `MDError`，编译器知道它有 `loc` 扩展字段。CLIError 无子类，`instanceof CLIError` 直接收窄到最终类型。

**Severity 走工厂方法**：severity 在构造时通过工厂方法（`.err()` / `.fatal()`）指定，不是构造器参数。2 个工厂方法在 EngineError 和 CLIError 基类各自定义（签名一致），所有子类继承——认知负担一致。构造后 severity 为 readonly，不可变。

**Code 走联合类型**：每个 Domain 子类有自己的 code 联合类型（`AlignErrorCode` / `ProofErrorCode` / `CLIErrorCode` / ...）。编译器在每个工厂方法调用处校验 code 拼写合法性。

### D7: 错误类别层（ADR-0080 保留子集）

ADR-0080 的 6 种错误类别（传感器异常/验证结果/强制机制/输入校验/基础设施保护/状态机）不体现在 name 中，而是作为 SSOT 注册表的 `category` 字段保留。类别用于文档和审计，不用于运行时路由（运行时路由由 severity 决定）。

### D8: `--force` 绕过审计（ADR-0080 §D7 保留）

frozen.json 的 `forceUsed` + `forceDetails` 审计字段设计不变。`FINALIZE_BLOCKED` 迁移为 `ProofError.err('FINALIZE_BLOCKED', ...)`，`data.outcome` 携带具体验证结果类型（DEVIATED/MANUAL_PENDING/INCONCLUSIVE）。验证结果（outcome）是 Probe 体系的数据，不是 ProofError 的扩展字段。

### D9: 迁移策略（分阶段迁移）

**决策**：分 5 个 PR 完成迁移。探索发现实际测试影响为 ~126-209 个断言（24 个测试文件，233 个符号引用），远超原估的 ~50 个断言。一个 PR 不可行。

**迁移范围（修正后）**：

| 范围 | 数量 | 变更类型 |
|---|---|---|
| `new IAPError(...)` → `DomainError.err(...)` | ~30 处 | 构造器调用改工厂方法 |
| `new OXNCrash(...)` → `InfraError.fatal(...)` | 0 处（无生产 throw） | 类型删除 |
| ad-hoc `throw new Error('OXN_*')` → `CLIError.err(...)` | ~70 处 | 字符串改类实例 |
| `E_MD_xxx` 原生 Error + 验证结果数组 → `MDError` | ~83 处 | 原生 Error + CanonicalIssue / ReferenceSeverity 改 MDError（覆盖 throw + 验证结果） |
| CLI→ALIGN 重分类 throw site 迁移 | ~10 处 | `WORK_NOT_FOUND` 等 ad-hoc CLI throw 迁移到 Engine |
| CLI 4-tier catch → 2-tier | 1 处 | 路由简化 |
| 测试断言（保守估计） | ~126 处 | name/code/axis/action 断言更新 |
| 测试断言（含 E_MD） | ~209 处 | E_MD 验证结果 code 断言更新 |
| `isCliInputError()` 检测器 | 1 处 | 删除，替换为 `instanceof CLIError` |
| `OXNCrash` 类 + `oxn-crash.ts` | 1 文件 | 删除 |
| `IAPError` 类 + `iap-error.ts` | 1 文件 | 删除（被 EngineError + CLIError 双基类取代） |

**分阶段计划**：

| PR | 范围 | 内容 | 测试影响 |
|---|---|---|---|
| PR-1 Foundation | 新建错误类 | 创建 EngineError / CLIError / 5 Domain 子类，与旧类共存。不迁移 throw site | 0（新文件 + 新测试） |
| PR-2 Engine 迁移 | IAPError throw site | `new IAPError(...)` → `DomainError.err(...)`；更新 engine 单元测试（`iap-error.test.ts` 重写、`name-canonical.test.ts` 等） | ~80 断言 |
| PR-3 CLI 迁移 | ad-hoc CLI throw + CLI→ALIGN 重分类 | `throw new Error('OXN_*')` → `CLIError.err()`；`WORK_NOT_FOUND` 等 throw site 从 CLI 迁移到 Engine；重写 `cli-4-tier.test.ts` → `cli-2-tier.test.ts` | ~32 断言 |
| PR-4 MD 迁移 | E_MD throw + 验证结果数组 | `E_MD_xxx` → `MDError`；CanonicalIssue / ReferenceSeverity 条目统一为 MDError；更新 ~83 个 MD 测试断言 | ~83 断言 |
| PR-5 Cleanup | 删除旧类 + 集成测试 | 删除 IAPError / OXNCrash / isCliInputError / ExecErrorCode；更新 `probe-catalog.test.ts` 集成测试；新增架构守卫测试 | ~14 断言 |

**删除清单**：

- `packages/engine/src/kernel/contracts/iap-error.ts`（IAPError / IAPAction / IAPAxis / IAPErrorCode）
- `packages/engine/src/errors/oxn-crash.ts`（OXNCrash / OXNCrashCode）
- `packages/engine/src/errors/cli-input-error.ts`（isCliInputError / CLI_INPUT_CODE_PREFIXES）
- `packages/engine/src/Work/dual-state-exec.ts` 中的 `ExecErrorCode` 联合类型 + `throwExecError` 函数

**新增清单**：

- `packages/engine/src/errors/engine-error.ts`（EngineError 抽象基类 + 2 工厂方法）
- `packages/engine/src/Asset/intent-error.ts`（IntentError + IntentErrorCode 联合类型）
- `packages/engine/src/Work/align-error.ts`（AlignError + AlignErrorCode 联合类型）
- `packages/engine/src/infra/frozen/proof-error.ts`（ProofError + ProofErrorCode 联合类型）
- `packages/engine/src/infra/infra-error.ts`（InfraError + InfraErrorCode 联合类型）
- `packages/engine/src/oxl/md-bridge/md-error.ts`（MDError + MDErrorCode 联合类型 + loc 扩展字段）
- `packages/cli/src/errors/cli-error.ts`（CLIError 独立基类 + CLIErrorCode 联合类型 + 2 工厂方法）
- `packages/cli/src/errors/is-oxn-error.ts`（isOXNError 类型守卫：`instanceof EngineError || instanceof CLIError`）

**验收标准**：

1. `bun run typecheck` 通过
2. `bun run lint` 通过（ESLint 架构守卫）
3. `bun run check` 通过（Biome 格式 + 风格）
4. `bun test` 全量通过（~1630 tests）
5. 代码中无 `IAPError` / `OXNCrash` / `isCliInputError` / `ExecErrorCode` 残留引用
6. CLI 顶层 catch 为 2-tier（isOXNError / Fallback）

## Consequences

### 正面

1. **前缀统一**：从 6 个前缀（`IAP_` / `OXN_CRASH_` / `OXN_` / `E_MD_` / `E_OXL_` / `INFRA_FAIL_`）收敛到 1 个根前缀 `OXN_`。AI 用 `isOXNError(err)` 统一识别所有 OXN 错误（`instanceof EngineError || instanceof CLIError`）。
2. **Code 类型安全**：每 Domain 一个 code 联合类型，编译器在每个 throw site 校验 code 拼写。AI 消费端不会收到未注册的 code。
3. **Severity 类型安全**：2 个工厂方法（`.err()` / `.fatal()`）在 EngineError 和 CLIError 基类各自提供（签名一致），所有子类继承。protected/private 构造器防止绕过工厂方法。认知负担一致——任何子类都有相同的 severity 入口。
4. **Domain 类型安全**：Domain 子类通过 instanceof 提供编译期类型收窄。`MDError` 的 `loc` 扩展字段是类型安全的。
5. **CrashError 噪音消除**：3 个预留码迁移到 InfraError+`.fatal()`，不再维护空类型。
6. **CLI 路由简化**：从 4-tier（IAPError/OXNCrash/CliInput/Crash）简化为 2-tier（isOXNError/Fallback）。
7. **Package 独立性**：EngineError 和 CLIError 分属独立 package，各自错误体系可独立演化。CLI 不依赖 Engine 的错误类继承，只通过 `isOXNError()` 类型守卫在 catch 侧统一识别。
8. **Error / Diagnostic 分离**：Error = throw（阻断），Diagnostic = return（不阻断）。与代码库既有决策一致（`ref-diagnostic.ts:6-15`）。非阻断问题不在 Error 类上表达，避免 throw 语义与非阻断语义的矛盾。Diagnostic 统一留到 ADR-0082。
9. **data 字段命名清晰**：Error 的结构化数据字段命名为 `data`，不与 OXN 的 `context`（业务上下文）概念混淆。

### 负面 / 限制

1. **迁移成本高**：~126-209 个测试断言需更新（24 个测试文件），分 5 个 PR 完成。`cli-4-tier.test.ts` 需近全量重写（30 cases），`iap-error.test.ts` 整个删除（22 cases 覆盖率迁移到新类）。
2. **E_MD 覆盖范围大**：MDError 覆盖 throw + 验证结果数组条目（CanonicalIssue / ReferenceSeverity），~83 处需迁移，而非原估的 ~15 处。
3. **CLI→ALIGN 重分类**：`WORK_NOT_FOUND` 等 throw site 需从 CLI 迁移到 Engine，CLI 改为调用 Engine 函数由其 throw AlignError。涉及 work.ts 等多个 CLI 命令文件。
4. **code-severity 组合不编译校验**：`InfraError.fatal('PATH_CONFLICT', ...)` 编译通过但语义可能不当（路径冲突通常不 fatal）。这是有意取舍——所有子类统一继承 2 个工厂方法（认知负担一致），靠 SSOT 注册表的 category 字段做人工审计。
5. **ADR-0080 部分失效**：§D4a-d（前缀格式表 + INFRA_FAIL 子码映射）被本框架取代；§D4e（验证结果与 finalize 阻断 code 分离）保留，code 名变更。

### 中性

1. **错误类别层不变**：ADR-0080 的 6 种类别继续作为 SSOT 注册表的文档字段，不进入运行时。
2. **Daemon HTTP 错误不变**：Daemon 的 HTTP error strings 仍然不纳入本规范（IPC 协议层）。

## Alternatives Considered

### Alt-1: 单类打包全部（纯字段级区分）

**否决**。不同 Domain Error 有各自的 Error 类，每个 Error 类可以扩展自己的字段（如 MDError 的 loc）。单类无法提供 Domain 级类型安全。

### Alt-2: 判别联合（discriminated union）+ 单类

**否决**。判别联合要求 severity 在构造时固定为类型的一部分（`severity: 'FATAL'` 作为判别字段），但 severity 应由业务决定，两者冲突。

### Alt-3: 保持 ADR-0080 三类型系统

**否决**。6 个前缀的噪音问题、OXNCrash 空类型、CliInputError 无类、E_MD_xxx 悬空——这些问题在 ADR-0080 框架内无法解决，需要重构类型层次。

### Alt-4: 新建 CRASH domain（不删 CrashError）

**否决**。CrashError 0 处生产 throw site，维护一个空类型增加认知负担。FATAL severity 足以覆盖"不可恢复的引擎崩溃"语义，不需要独立的 CRASH domain。

### Alt-5: code 裸 string（无联合类型）

**否决**。`code: string` 丢失拼写校验，AI 可能收到未注册的 code。OXN 的错误码是 AI Agent 的消费契约（AI 根据 code 决定下一步），必须保证只有注册过的 code 才能被构造。每 Domain 一个 code 联合类型是编译期的契约保证。

### Alt-6: 子类自定义工厂方法（不统一继承）

**否决**。如果每个子类各自定义工厂方法（如 CLIError 只提供 `.err()`），会导致认知负担不一致——开发者需要记忆每个子类有哪些 severity 入口。基类统一提供 2 个工厂方法，所有子类继承，保证认知负担一致。

### Alt-7: 统一 OXNError 父类（Engine 和 CLI 共享基类）

**否决**。Engine 和 CLI 是独立 package，CLI 依赖 Engine 但反之不成立。统一父类要求 CLIError extends EngineError，使 CLI 的错误体系耦合到 Engine 的具体实现。双基类设计让两个 package 的错误体系独立演化——EngineError 有 5 个 Domain 子类（可继续扩展），CLIError 是最终类（无子类）。CLI 顶层 catch 通过 `isOXNError()` 类型守卫（`instanceof EngineError || instanceof CLIError`）统一识别，不依赖继承关系。

### Alt-8: WARN severity on Error class

**否决**。throw 中断控制流与非阻断语义矛盾——throw 点之后的代码不执行，"exit 0 不阻断"只是进程没死，命令逻辑实际被中断。代码库已明确 Error（throw，阻断）vs Diagnostic（return，不阻断）的分离（`ref-diagnostic.ts:6-15`）。非阻断 warning 应走 Diagnostic return 模式，不应用 Error 类的 severity 表达。strict/lenient 模式差异通过"throw vs return"区分，不通过 severity 档位区分。

## References

- [ADR-0080 错误与冲突处理术语统一](./0080-error-terminology-unification-and-governance.md) — 前序方案（三层分类 + SSOT + 决策树），本 ADR 重构其类型层
- [ADR-0072 OXN = 非确定性 Agent 的确定性参照系](./0072-oxn-as-referent-for-nondeterministic-agent.md) — Referent 完整性：`--force` 绕过不破坏确定性参考
- `packages/engine/src/oxl/compiler/ref-diagnostic.ts:6-15` — Error vs Diagnostic 分离的既有决策（IAPError = 硬阻断，diagnostics = 软警告 + AI 可继续）
- `error-code-registry.md` — 错误码 SSOT 全量索引（待迁移到新命名）
- `packages/engine/src/kernel/contracts/iap-error.ts` — 当前 IAPError 定义（待迁移）
- `packages/engine/src/errors/oxn-crash.ts` — 当前 OXNCrash 定义（待删除）
- `packages/engine/src/errors/cli-input-error.ts` — 当前 CliInputError 检测器（待替换为 CLIError 类）
- `packages/cli/src/index.ts` — 当前 4-tier catch block（待简化为 2-tier）
- [ADR-0082 Diagnostic 统一](./0082-diagnostic-unification.md) — Diagnostic 统一类型：合并当前 7 种 warning pattern（`warnings: string[]` / `diagnostics[]` / `CanonicalIssue` / `ReferenceSeverity` / `process.stderr.write` / `console.warn` / `console.error`），3 种不兼容 severity enum 收敛为 LoggerPort + consola 隔离层 + 单通道 `logger.warn()` 调用
