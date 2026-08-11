---
entity: adr
version: 1.1.0
status: Archived
date: 2026-07-25
supersedes: null
superseded-by: null
related:
  - .openxenon/drafts/rfc/0081-oxn-unified-error-framework.md
  - .openxenon/drafts/rfc/0080-error-terminology-unification-and-governance.md
  - .openxenon/drafts/error-code-registry.md
  - .openxenon/drafts/rfc/0072-oxn-as-referent-for-nondeterministic-agent.md
archived-at: 2026-08-11
archived-by: RFC-0030-D1
---

# ADR-0082: OXN Diagnostic 统一（LoggerPort + consola 隔离层 + 纯日志单通道）

> **状态**：💡 Proposed
> **日期**：2026-07-25（v1.1.0 — grilling #1-#5 决策更新）
> **来源**：grilling session Diagnostic 盘问（ADR-0081 Error 体系定稿后）
> **影响层**：全栈非阻断诊断 + L0-L3 日志架构 + CLI JSON envelope + state.json schema
> **与 ADR-0081 的关系**：ADR-0081 确立了 "Error = throw only（两档 FATAL/ERR）" 原则，将所有非阻断问题（warning/diagnostic）推出 Error 体系，预告 ADR-0082 统一。本 ADR 兑现该预告：用 LoggerPort 接口 + consola 隔离层 + 纯日志单通道 `logger.warn()` 调用，取代当前 7 种碎片化 warning pattern + 4 种不兼容 severity enum + 10+ 个返回 `warnings: string[]` 的函数签名。

## Context

### 触发问题

ADR-0081 的 grilling 揭示了 Error 体系的问题，但将 Diagnostic 统一推迟到本 ADR。代码库的非阻断诊断现状是**碎片化重灾区**：

#### 7 种 warning pattern + 4 种 severity enum

| Pattern | 来源文件 | severity 词汇 | 消费渠道 |
|---|---|---|---|
| A | `Work/work-validator.ts` | flat `string[]`（无结构化 severity） | 返回给调用者 |
| B | `Work/dual-state.ts:71-82` | `'warn' \| 'error'`（inline Zod） | 持久化到 `.run/state.json`（只写不读） |
| C | `oxl/md-pipeline/plugins/remark-canonical.ts` | `'error' \| 'warning'`（注意：`warning` 而非 `warn`） | `tree.data` + 返回值 |
| D | `oxl/md-bridge/reference-checker.ts` | `'fatal' \| 'warn'` | 返回给调用者 |
| E | `cli/src/commands/proof.ts:727,742` | 无（裸 `process.stderr.write`） | stderr（`--json` 模式下不可见） |
| F | `cli/src/commands/blueprint.ts:183,294` | 无（裸 `process.stderr.write`） | stderr（`--json` 模式下不可见） |
| G.1 | `oxl/compiler/ref-diagnostic.ts` | `'warn' \| 'error'`（Zod schema） | 返回给调用者 |
| G.4 | `Work/work-migrator.ts:188` | `'warn'` only（inline literal） | 返回给调用者 |
| G.6 | 6+ 文件（`scanner.ts`、`compile-cache.ts`、`entity-registry.ts`、`domain.ts`、`skill-compiler.ts`、`debug.ts`） | 无（裸 `console.error` / `console.warn`） | stderr / console（`--json` 模式下不可见） |

**4 种不兼容的 severity enum**：
- `'warn' | 'error'`（Pattern B、G.1）
- `'error' | 'warning'`（Pattern C — 注意 `warning` 全称 vs `warn` 缩写）
- `'fatal' | 'warn'`（Pattern D）
- 无 severity，flat `string[]`（Pattern A + G.7 表中 8+ 个返回类型）

#### 10+ 个返回 `warnings: string[]` 的函数签名

| 文件 | 返回类型 |
|---|---|
| `oxl/md-bridge/compilers/*.ts`（9 个文件） | `CompileOutput { md, warnings: string[] }` |
| `oxl/compiler/oxn-adapter.ts:42` | `AdapterResult { frozen, warnings: string[] }` |
| `oxl/validator/mutation-validator.ts:14` | `MutationCheckResult { valid, errors, warnings: string[] }` |
| `Asset/validate.ts:145` | `AssetPaperValidationResult { ok, warnings: string[], fields }` |
| `infra/registry/daemon-startup.ts:27` | `DaemonStartupResult { ok, bootstrap, warnings: string[] }` |
| `Roadmap/types.ts:49` | `RoadmapParseResult { roadmap, warnings: string[] }` |
| `Work/work-migrator.ts:197` | `MigrateResult`（union，同时有 `warnings: string[]` + `invalidRefs?: InvalidRef[]`） |
| `Roadmap/parser.ts:61` | `const warnings: string[] = []`（引用传递 accumulator） |

#### 结构化诊断类型重复定义 4 次

`RefDiagnostic` 的 shape（`code + severity + ref + type + message + suggestion`）在 4 处重复定义：

1. `oxl/compiler/ref-diagnostic.ts` — Zod schema（canonical）
2. `Work/dual-state.ts:71-82` — inline Zod（`WorkspaceStateSchema.diagnostics`）
3. `Work/dual-state-exec.ts:87-94` — inline plain TS（`RunWorkParams.diagnostics`）
4. `Work/work-migrator.ts:188-195` — inline plain TS（`InvalidRef`，severity 锁死 `'warn'` only）

#### CLI JSON envelope 缺失 warnings 字段

`packages/cli/src/commands/output.ts` 的 JSON envelope 是严格的 `{ ok: true/false, data }` 二元结构——**没有 `warnings` 字段**。Pattern E/F/G.6 的 stderr 警告在 `--json` 模式下完全不可见。AI Agent 消费 JSON 输出时无法获知非阻断问题。

#### Daemon logger stdout 污染

`src/daemon/logger.ts:23` 用 `console.log(logLine.trimEnd())` 写 stdout——这会破坏 `--json` 输出流（JSON 解析器遇到 daemon 日志行会报错）。

### 设计约束（grilling 确认）

| 约束 | 来源 | 说明 |
|---|---|---|
| 方案 A：LoggerPort + Infra 隔离层 | 用户决策 | L0-Contract 定义 LoggerPort 接口；L1-Infra 实现 consola 封装层作为隔离；L2 通过 Infra 调用日志（不直接 import consola） |
| Infra 封装层为隔离层 | 用户决策 | 即便以后切换其他日志库（pino 等），也不需要改调用代码——只改 Infra 封装层 |
| 日志库选型：consola | 用户决策（Q1） | consola@3.4.2 已是 citty 的 transitive dep（零新增安装开销）；0 生产依赖；Bun 原生 + Node.js 一等支持；内置 `ConsolaReporter` 接口天然支持内存收集 |
| 全部转为 logger 调用 | 用户决策（Q2） | 10+ 个返回诊断数组的函数（work-validator、dual-state、remark-canonical、reference-checker、entity compilers 等）全部删除返回类型中的 `warnings`/`diagnostics` 字段，改为 `logger.warn()` 调用。函数签名变窄（只返回业务数据）。真正的单一通道。 |
| consola Node.js 兼容 | 用户确认（Q1 追问） | consola 不是 Bun 专属库——`engines: { node: "^14.18.0 || >=16.10.0" }`，源码用 `node:process` / `node:util` / `node:path` / `node:tty` 标准 Node.js built-in。OXN 构建 `--target=node`，consola ESM 输出原样打入 bundle |
| **LogEntry = 纯日志** | grilling #1 决策 | LogEntry 不需要顶层 `code` 字段——code 是 Error 的机器消费契约，不是 Log 的属性。Log 通过 `message` + `tag` + `data` 追溯到代码位置，AI 通过读 message 理解。 |
| **Log 不需要 code** | grilling #5 决策 | 进一步推论：log 的 `data` 字段也不需要 `code`——log 的目的是人类可读的诊断记录，不是机器消费契约。code 是 Error 体系的专属概念。 |
| **state.json 删除 diagnostics** | grilling #2 决策 | 当前 state.json 的 `diagnostics` 字段是只写不读的死数据（`oxn work context` 重新解析 ref，不读 state.json）。直接删除字段。 |
| **remark-canonical 直接 throw，无特例** | grilling #3 决策 | remark 校验错误是用户输入错误，不是程序 bug。ADR-0081 "Error = throw only" 适用。直接 `throw MDError.err()`，与 `remarkParse` 一致。删除 `CanonicalResult` / `CanonicalIssue` 类型。 |
| **Daemon 不用 collector** | grilling #4 决策 | Daemon 是 socket server 长运行，collector 会内存泄漏。Daemon 用 consola + 自定义 file reporter + stderr reporter（直接输出，无内存收集）。CLI 用 `InMemoryLogCollector`（短运行，drain 后退出）。两者共享 LoggerPort 接口，reporter 组合不同。 |
| **consola 一统 CLI + daemon** | grilling #4 决策 | 不引入 pino。一个 consola 库 + 不同 reporter 组合服务两个场景。daemon 文件日志 ~15 行自定义 reporter；未来需要轮转时换 winston 或加轮转 reporter，调用代码不变（LoggerPort 隔离层）。 |

## Decision

### D1: LoggerPort 接口（L0-Contract）

**文件**：`packages/engine/src/kernel/contracts/logger-port.ts`

遵循现有 Port 模式（纯 `export interface`，无 Zod，无 class，单文件）：

```typescript
// packages/engine/src/kernel/contracts/logger-port.ts

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  level: LogLevel
  message: string                    // 人类可读
  tag?: string                       // 模块标签（Work / Asset / MD-bridge 等）—— 追溯代码位置
  data?: Record<string, unknown>     // 结构化上下文（ref / line / suggestion 等）—— 不含 code
  date?: Date                        // 时间戳（collector 填充）
}

export interface LoggerPort {
  debug(message: string, data?: Record<string, unknown>): void
  info(message: string, data?: Record<string, unknown>): void
  warn(message: string, data?: Record<string, unknown>): void
  error(message: string, data?: Record<string, unknown>): void
  withTag(tag: string): LoggerPort  // 创建带模块标签的子 logger
}
```

**设计要点**（grilling #1/#5 决策后）：

1. **无 code 字段**：LogEntry 是纯日志，不是诊断结构。Code 是 Error 体系的机器消费契约（决定 exit code + 输出渠道），不是 Log 的属性。Log 通过 `message` + `tag` + `data` 追溯到代码位置，AI 通过读 message 理解。
2. **data 携带上下文但不携带 code**：结构化上下文字段（ref / line / suggestion / path / ...）放在 `data` 里，但不放 code。code 是 Error 专属。
3. **withTag**：对齐 consola 的 `withTag()` API + 现有 daemon logger 的 `createLogger(prefix)` 模式。返回新的 LoggerPort 实例，自动给每条日志打标签。tag 是追溯代码位置的关键字段。
4. **LogLevel 四档**：`debug | info | warn | error`。对齐 consola 的 LogType 子集（consola 有 14 种 LogType，本接口收窄到 4 种核心 level——CLI 工具不需要 `success` / `fail` / `ready` / `start` / `box` 等 UI 导向类型）。

**与 ADR-0081 的关系**：

| | Error (ADR-0081) | Log (ADR-0082) |
|---|---|---|
| **purpose** | 阻断 + 机器路由 | 记录信息 + 人类追溯 |
| **code** | ✅ 必须（AI 消费契约） | ❌ 不需要（message + tag + data 已足够） |
| **consumer** | AI Agent（程序化匹配） | 人类工程师（读 message，追溯到代码位置） |
| **output** | stdout JSON（exit 1）/ stderr（exit 2） | stderr / 文件 / JSON envelope warnings |

**Re-export**（`packages/engine/src/kernel/index.ts`，与 HashPort / OsPort 并列）：

```typescript
export type { LoggerPort, LogEntry, LogLevel } from './contracts/logger-port'
```

### D2: consola 隔离层（L1-Infra）

**目录**：`packages/engine/src/infra/logging/`（新建，对齐 `infra/probes/` / `infra/providers/` / `infra/runtime/` 的模块化目录结构）

| 文件 | 职责 |
|---|---|
| `logger.ts` | `createLogger(options?)` 工厂 → 返回 `LoggerPort`。**代码库中唯一 import consola 的文件**。将 `LoggerPort` 方法委托到 consola 的 `debug/info/warn/error`。 |
| `collector.ts` | `InMemoryLogCollector` 实现 consola 的 `ConsolaReporter` 接口（CLI 专用）。存储 `LogEntry[]`。`drain()` 方法清空并返回条目。`clear()` 方法重置。 |
| `file-reporter.ts` | 自定义 `FileConsolaReporter`（daemon 专用）。实现 `ConsolaReporter` 接口，写入文件 + stderr。 |
| `mock.ts` | `createMockLogger` 测试辅助。 |
| `index.ts` | Barrel export：`createLogger`、`InMemoryLogCollector`、`FileConsolaReporter`、`loggerPort`（默认 no-op singleton）、`createMockLogger`。 |

#### logger.ts — 隔离层实现

```typescript
// packages/engine/src/infra/logging/logger.ts

import { createConsola, type ConsolaInstance } from 'consola'
import type { LoggerPort, LogEntry, LogLevel, ConsolaReporter } from '@openxenon/engine/kernel/index'
import { InMemoryLogCollector } from './collector'
import { FileConsolaReporter } from './file-reporter'

export interface CreateLoggerOptions {
  level?: LogLevel                // 最低输出 level（默认 'warn'）
  tag?: string                    // 模块标签
  reporters?: ConsolaReporter[]   // 注入 reporter 组合（CLI 传 collector，daemon 传 file-reporter）
}

const LEVEL_MAP: Record<LogLevel, number> = {
  debug: 5,
  info: 3,
  warn: 1,
  error: 0,
}

export function createLogger(options: CreateLoggerOptions = {}): LoggerPort {
  const tag = options.tag
  const reporters = options.reporters ?? []

  function emit(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    const consola = createConsola({
      level: LEVEL_MAP[options.level ?? 'warn'],
      reporters,
    })
    const tagged = tag ? consola.withTag(tag) : consola
    tagged[level](message, data ?? {})
  }

  return {
    debug: (message, data) => emit('debug', message, data),
    info: (message, data) => emit('info', message, data),
    warn: (message, data) => emit('warn', message, data),
    error: (message, data) => emit('error', message, data),
    withTag: (newTag) => createLogger({ ...options, tag: newTag }),
  }
}

// 默认 no-op singleton（L2 函数未注入 logger 时使用——静默，绝不回退到 console）
export const loggerPort: LoggerPort = createLogger()
```

**隔离层保证**：如果以后切换到 pino 或其他日志库，只需修改 `logger.ts` 这一个文件——所有调用代码（L2 函数、CLI 命令、daemon）引用的是 `LoggerPort` 接口，不感知底层实现。

#### collector.ts — 内存收集器（CLI 专用）

```typescript
// packages/engine/src/infra/logging/collector.ts

import type { ConsolaReporter, LogObject } from 'consola'
import type { LogEntry, LogLevel } from '@openxenon/engine/kernel/index'

const LEVEL_FROM_CONSOLA: Record<number, LogLevel> = {
  0: 'error',
  1: 'warn',
  3: 'info',
  5: 'debug',
}

export class InMemoryLogCollector implements ConsolaReporter {
  private entries: LogEntry[] = []

  log(logObj: LogObject): void {
    const level = LEVEL_FROM_CONSOLA[logObj.level] ?? 'info'
    this.entries.push({
      level,
      message: logObj.message ?? '',
      tag: logObj.tag,
      data: logObj.args?.[0] as Record<string, unknown> | undefined,
      date: logObj.date,
    })
  }

  drain(): LogEntry[] {
    const result = this.entries
    this.entries = []
    return result
  }

  clear(): void {
    this.entries = []
  }

  get count(): number {
    return this.entries.length
  }
}
```

#### file-reporter.ts — 文件 reporter（daemon 专用）

```typescript
// packages/engine/src/infra/logging/file-reporter.ts

import type { ConsolaReporter, LogObject } from 'consola'
import { createWriteStream, type WriteStream } from 'fs'

export class FileConsolaReporter implements ConsolaReporter {
  private stream: WriteStream

  constructor(filePath: string) {
    this.stream = createWriteStream(filePath, { flags: 'a' })  // append mode
  }

  log(logObj: LogObject): void {
    const timestamp = logObj.date?.toISOString() ?? new Date().toISOString()
    const tag = logObj.tag ? `[${logObj.tag}] ` : ''
    const data = logObj.args?.[0] ? ` ${JSON.stringify(logObj.args[0])}` : ''
    const line = `[${timestamp}] ${logObj.type.toUpperCase()} ${tag}${logObj.message}${data}\n`
    this.stream.write(line)
  }

  close(): void {
    this.stream.end()
  }
}
```

#### mock.ts — 测试辅助

```typescript
// packages/engine/src/infra/logging/mock.ts

import type { LoggerPort, LogEntry, LogLevel } from '@openxenon/engine/kernel/index'

export interface MockLogger extends LoggerPort {
  readonly entries: LogEntry[]
  callsFor(level: LogLevel): LogEntry[]
  toHaveBeenWarnedWith(messageSubstring: string): boolean
}

export function createMockLogger(tag?: string): MockLogger {
  const entries: LogEntry[] = []

  function record(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    entries.push({ level, message, tag, data, date: new Date() })
  }

  return {
    debug: (message, data) => record('debug', message, data),
    info: (message, data) => record('info', message, data),
    warn: (message, data) => record('warn', message, data),
    error: (message, data) => record('error', message, data),
    withTag: (newTag) => createMockLogger(newTag) as MockLogger,
    get entries() { return entries },
    callsFor: (level) => entries.filter((e) => e.level === level),
    toHaveBeenWarnedWith: (substring) => entries.some((e) => e.message.includes(substring)),
  }
}
```

#### index.ts — Barrel

```typescript
// packages/engine/src/infra/logging/index.ts

export { createLogger, loggerPort, type CreateLoggerOptions } from './logger'
export { InMemoryLogCollector } from './collector'
export { FileConsolaReporter } from './file-reporter'
export { createMockLogger } from './mock'
```

### D3: L2 注入模式

L2 中产生 warning 的函数接受 `logger?: LoggerPort` 参数。未注入时回退到 no-op `loggerPort` singleton（静默——绝不回退到 console）。

这与现有 Pattern B（参数注入，用于 kernel 纯函数的 `hashPort`）一致。区别在于：hashPort 在 L2 多用直接 singleton import（Pattern A），而 logger 必须用参数注入——因为 CLI 需要注入 collector-backed logger 来填充 JSON envelope。

**示例**（迁移前 → 迁移后）：

```typescript
// ─── 迁移前：work-validator.ts ───
export interface ValidateArtifactsResult {
  ok: boolean
  warnings: string[]           // ← 删除
  legacyDomainRefs?: LegacyDomainRef[]  // ← 删除
  unresolved?: UnresolvedRef[]  // ← 保留（硬阻断信息，非 warning）
  // ...
}

export function validateAndWriteArtifacts(work: WorkFileSummary, projectRoot: string): ValidateArtifactsResult {
  const warnings: string[] = []
  const legacyDomainRefs = detectLegacyDomainRefs(work)
  for (const w of legacyDomainRefsToWarnings(legacyDomainRefs)) warnings.push(w)
  // ...
  return { ok: true, warnings, /* ... */ }
}

// ─── 迁移后 ───
import type { LoggerPort } from '@openxenon/engine/kernel/index'
import { loggerPort } from '@openxenon/engine/infra/logging'

export interface ValidateArtifactsResult {
  ok: boolean
  unresolved?: UnresolvedRef[]  // ← 保留（业务数据，非 warning）
  probeViolations?: ProbeBoundaryViolation[]  // ← 保留
  // warnings / legacyDomainRefs 已删除
}

export function validateAndWriteArtifacts(
  work: WorkFileSummary,
  projectRoot: string,
  logger: LoggerPort = loggerPort,
): ValidateArtifactsResult {
  const legacyDomainRefs = detectLegacyDomainRefs(work)
  for (const ref of legacyDomainRefs) {
    logger.warn(
      `ref "${ref.name}" (@prj/domains/${ref.name}) uses deprecated "kind: domain" (ADR-0055 §D2). v0.7.3 only warns; v0.8.0 will hard-block.`,
      { ref: ref.name, suggestion: ref.suggestion },
    )
  }
  // ...
  return { ok: true, unresolved, probeViolations }  // 纯业务数据
}
```

**测试模式变更**：

```typescript
// ─── 迁移前 ───
const result = validateAndWriteArtifacts(work, root)
expect(result.warnings).toContain('OXN_WORK_LEGACY_DOMAIN_REF')

// ─── 迁移后 ───
import { createMockLogger } from '@openxenon/engine/infra/logging'

const mockLogger = createMockLogger()
validateAndWriteArtifacts(work, root, mockLogger)
expect(mockLogger.callsFor('warn')).toContainEqual(
  expect.objectContaining({
    message: expect.stringContaining('uses deprecated "kind: domain"'),
    data: expect.objectContaining({ ref: 'X' }),
  })
)
```

### D4: CLI 集成 — JSON envelope 扩展

#### output.ts envelope 扩展

```typescript
// packages/cli/src/commands/output.ts

import type { LogEntry } from '@openxenon/engine/kernel/index'

export interface OutputEnvelope<T = unknown> {
  ok: boolean
  data?: T
  error?: { code: string; message: string; /* ... */ }
  warnings?: LogEntry[]   // ← 新增
}

export function output<T>(result: OutputEnvelope<T>, human?: string): void {
  if (process.env.OXN_JSON || /* --json flag */) {
    // JSON 模式：输出完整 envelope（含 warnings）
    console.log(JSON.stringify(result, null, 2))
  } else {
    // 人类模式：warnings 渲染到 stderr，data 渲染到 stdout
    if (result.warnings?.length) {
      for (const w of result.warnings) {
        const tag = w.tag ? `[${w.tag}] ` : ''
        process.stderr.write(`  ⚠ ${tag}${w.message}\n`)
      }
    }
    if (human) console.log(human)
  }
}
```

#### index.ts 入口注入

```typescript
// packages/cli/src/index.ts

import { createLogger, InMemoryLogCollector } from '@openxenon/engine/infra/logging'

// 1. 构造 collector + logger（CLI 专用：内存收集）
const collector = new InMemoryLogCollector()
const logger = createLogger({
  level: verboseLevel,  // --verbose 0=warn+, 1=info+, 2=debug+
  reporters: [collector],
})

// 2. 注入到子命令
const subCommands = {
  work: () => import('./commands/work').then(m => m.default({ logger })),
  proof: () => import('./commands/proof').then(m => m.default({ logger })),
  // ...
}

// 3. 命令执行后 drain → warnings
try {
  await subCommands[cmd]().then(fn => fn(args))
} finally {
  const warnings = collector.drain()
  // output() 时自动附加到 envelope
}
```

**`--verbose` flag 激活**：当前 `--verbose` 是死代码（`index.ts:217` 只打印一行 debug）。迁移后控制 collector 的 level threshold：

| `--verbose` 值 | level | 收集范围 |
|---|---|---|
| 0（默认） | `warn` | warn + error |
| 1 | `info` | info + warn + error |
| 2 | `debug` | 全部 |

### D5: state.json 删除 diagnostics 字段

**决策**：直接删除 `WorkspaceStateSchema.diagnostics` Zod 字段（grilling #2 决策）。

**理由**：
- 当前 `diagnostics` 字段是**只写不读的死数据**——`oxn work run` 写入，但 `oxn work context` 重新解析 ref（`work-context-builder.ts:510`、`work.ts:2244`），不读 state.json
- 没有命令从 state.json 读取 diagnostics。每个需要 diagnostics 的命令都是通过 logger.warn() 实时产生警告，collector 收集后放入 JSON envelope
- 保留字段会增加 schema 复杂度 + 死代码 + 误解风险

**删除范围**：
- `Work/dual-state.ts` — `WorkspaceStateSchema.diagnostics` Zod 字段
- `Work/dual-state-exec.ts` — `RunWorkParams.diagnostics` inline type
- `Work/work-migrator.ts` — `InvalidRef` type + `MigrateResult.invalidRefs` 字段（不是 state.json 字段，但同源）
- `oxl/compiler/ref-diagnostic.ts` — `RefDiagnostic` builder 函数（不再产生 diagnostics）

**新数据流**：
```
oxn work run
  → Engine: validateAndWriteArtifacts() 检测到 ref 未解析
  → logger.warn("Domain 'X' declared but file not found", { ref: 'X' })
  → 返回 { ok: true, unresolved?: UnresolvedRef[] } 给 CLI（纯业务数据）
  → CLI: collector.drain() → JSON envelope warnings 字段

oxn work context
  → Engine: collectUnresolvedRefDiagnostics(work, root) 重新解析 ref
  → logger.warn(...) 同上
  → 返回纯业务数据给 CLI
  → CLI: collector.drain() → JSON envelope warnings 字段
```

### D6: 迁移策略（7 个 PR）

**决策**：全部转为 logger 调用（用户决策 Q2）。10+ 个返回诊断数组的函数删除 `warnings`/`diagnostics` 字段，改为 `logger.warn(message, data)` 调用（无 code 参数）。函数签名变窄（只返回业务数据）。

| PR | 范围 | 内容 | 文件数 | 测试影响 |
|---|---|---|---|---|
| **PR-1** Foundation | LoggerPort + consola 封装层 + collector + file-reporter + mock + ESLint + package.json | 新建 6 文件 + 编辑 3 文件 | 9 | 0（新文件 + 新测试） |
| **PR-2** CLI 集成 | output.ts envelope 扩展 + index.ts 注入 + `--verbose` 激活 | 编辑 2 文件 | 2 | ~10 断言 |
| **PR-3** 副作用迁移 | `process.stderr.write` / `console.error` / `console.warn` → `logger.warn()` | Pattern E/F/G.6 | ~8 文件 | ~20 断言 |
| **PR-4** Engine 返回值迁移 | work-validator / dual-state / ref-diagnostic / work-migrator / reference-checker / remark-canonical | Pattern A/B/C/D/G.1/G.4 | ~6 文件 | ~80 断言 |
| **PR-5** Compiler 返回值迁移 | 9 个 entity compilers + mutation-validator + asset validate + daemon-startup + roadmap parser | Pattern G.7 | ~12 文件 | ~50 断言 |
| **PR-6** Daemon logger 替换 | `src/daemon/logger.ts` 用 consola + FileConsolaReporter 替换 | 1 文件 | ~5 断言 |
| **PR-7** Cleanup | 删除重复诊断类型 + 删除 state.json diagnostics 字段 + 统一 severity 词汇 | ~5 文件 | ~10 断言 |

**总影响**：~35 个生产文件 + ~25 个测试文件 + ~175 个测试断言。

#### PR-1: Foundation（新建 6 文件 + 编辑 3 文件）

| 文件 | 操作 |
|---|---|
| `kernel/contracts/logger-port.ts` | **新建** — `LoggerPort` + `LogEntry` + `LogLevel` |
| `kernel/index.ts` | **编辑** — 添加 `export type { LoggerPort, LogEntry, LogLevel }` |
| `infra/logging/logger.ts` | **新建** — `createLogger()` 工厂，唯一 import consola 的文件 |
| `infra/logging/collector.ts` | **新建** — `InMemoryLogCollector`（CLI 专用） |
| `infra/logging/file-reporter.ts` | **新建** — `FileConsolaReporter`（daemon 专用） |
| `infra/logging/mock.ts` | **新建** — `createMockLogger()` 测试辅助 |
| `infra/logging/index.ts` | **新建** — Barrel export |
| `eslint.config.js` | **编辑** — 新增 2 条 `no-restricted-imports` 规则（见 D7） |
| `package.json` | **编辑** — 添加 `consola: "^3.4.2"` 为 direct dependency |

#### PR-2: CLI 集成（编辑 2 文件）

| 文件 | 操作 |
|---|---|
| `cli/src/commands/output.ts` | **编辑** — envelope 扩展 `{ ok, data, warnings?: LogEntry[] }`；人类模式 warnings 渲染到 stderr |
| `cli/src/index.ts` | **编辑** — 构造 collector + logger，注入子命令，命令后 drain → warnings；`--verbose` flag 激活 level threshold |

#### PR-3: 副作用迁移 — Pattern E/F/G.6（~8 文件）

| 文件 | 行 | 当前 | 之后 |
|---|---|---|---|
| `cli/src/commands/proof.ts` | 727 | `process.stderr.write('warning: outcome.md write failed: ...')` | `logger.warn('outcome.md write failed: ...', { path, error })` |
| `cli/src/commands/proof.ts` | 742 | `process.stderr.write('warning: probe-stats.json update failed: ...')` | `logger.warn('probe-stats.json update failed: ...', { path, error })` |
| `cli/src/commands/blueprint.ts` | 183 | `process.stderr.write('warning: blueprint index rebuild failed: ...')` | `logger.warn('blueprint index rebuild failed: ...', { error })` |
| `cli/src/commands/blueprint.ts` | 294 | 同上 | 同上 |
| `cli/src/commands/domain.ts` | 190 | `console.error('Warning: domain index rebuild failed: ...')` | `logger.warn('domain index rebuild failed: ...', { error })` |
| `cli/src/commands/domain.ts` | 319 | 同上 | 同上 |
| `cli/src/commands/skill-compiler.ts` | 154 | `console.error('Failed to compile skill ...')` | `logger.warn('Failed to compile skill ...', { skill, error })` |
| `cli/src/commands/debug.ts` | 31 | `console.error('Failed to write debug log: ...')` | `logger.warn('Failed to write debug log: ...', { error })` |
| `engine/src/infra/scanner.ts` | 37, 102 | `console.error('Error scanning directory ...')` | `logger.warn('Error scanning directory: ...', { dir, error })` |
| `engine/src/infra/compile-cache.ts` | 116 | `console.warn('Failed to write cache file: ...')` | `logger.warn('Failed to write cache file: ...', { path, error })` |
| `engine/src/oxl/md-bridge/entity-registry.ts` | 44-47 | `console.warn('[EntityRegistry] overwriting compiler for ...')` | `logger.warn('EntityRegistry overwriting compiler: ...', { entity })` |

> **例外**：`cli/src/index.ts:88-128` 的 `console.error` 保持不变——这些是 crash handler（exit 2，stderr for humans），不是 warning。

#### PR-4: Engine 返回值迁移 — Pattern A/B/C/D/G.1/G.4（~6 文件）

| 文件 | 变更 |
|---|---|
| `Work/work-validator.ts` | `ValidateArtifactsResult` 删除 `warnings: string[]` + `legacyDomainRefs: LegacyDomainRef[]`。函数接受 `logger?: LoggerPort`，调用 `logger.warn(message, { ref, suggestion })`。`unresolved?: UnresolvedRef[]` + `probeViolations?` 保留（业务数据，非 warning）。 |
| `Work/dual-state.ts` | `WorkspaceStateSchema` **删除** `diagnostics` Zod 字段（grilling #2）。无替代——每个命令通过 logger.warn() 实时产生警告。 |
| `oxl/compiler/ref-diagnostic.ts` | `RefDiagnostic` builder 函数改为调用 `logger.warn(message, data)`。`RefDiagnostic` 类型本身删除（无消费者）。 |
| `Work/work-migrator.ts` | `MigrateResult` 删除 `warnings: string[]` + `invalidRefs?: InvalidRef[]`。函数接受 `logger?: LoggerPort`。删除 `InvalidRef` 类型。 |
| `oxl/md-bridge/reference-checker.ts` | `ReferenceSeverity = 'fatal' \| 'warn'` → `'fatal'` 变为 `throw EngineError`（ADR-0081 MDError），`'warn'` 变为 `logger.warn()`。返回类型简化为 `{ target, reachable, error?, checkTime }`。删除 `ReferenceSeverity` 类型。 |
| `oxl/md-pipeline/plugins/remark-canonical.ts` | **grilling #3 决策**：所有 `severity: 'error'` 的 `CanonicalIssue` 改为 `throw MDError.err(code, message, { loc })`（与 `remarkParse` 一致）。所有 `severity: 'warning'` 改为 `logger.warn(message, { line, field, rule })`。**删除** `CanonicalResult` / `CanonicalIssue` 类型。`validateCanonical()` → 成功返回 void / 失败 throw MDError。 |

#### PR-5: Compiler 返回值迁移 — Pattern G.7（~12 文件）

| 文件 | 变更 |
|---|---|
| `oxl/md-bridge/compilers/*.ts`（9 个文件） | 每个文件的 `const warnings: string[] = []` → `logger.warn()` 调用。`CompileOutput` 删除 `warnings: string[]`。 |
| `oxl/compiler/oxn-adapter.ts` | `AdapterResult` 删除 `warnings: string[]`。 |
| `oxl/validator/mutation-validator.ts` | `MutationCheckResult` 删除 `warnings: string[]`。 |
| `Asset/validate.ts` | `AssetPaperValidationResult` 删除 `warnings: string[]`。 |
| `infra/registry/daemon-startup.ts` | `DaemonStartupResult` 删除 `warnings: string[]`。 |
| `Roadmap/types.ts` + `Roadmap/parser.ts` | `RoadmapParseResult` 删除 `warnings: string[]`。parser 的 `const warnings: string[] = []` accumulator → `logger.warn()` 调用。 |

#### PR-6: Daemon logger 替换（1 文件，grilling #4 决策）

| 文件 | 变更 |
|---|---|
| `src/daemon/logger.ts` | 用 consola + `FileConsolaReporter` 替换自定义 logger。`stdout: process.stderr`（修复 stdout 污染 bug）。**不注入 InMemoryLogCollector**——daemon 是长运行，collector 会内存泄漏。daemon 用 file + stderr reporter 组合（直接写文件，不收集）。保留 `createLogger(prefix)` API 签名以最小化调用方变更。 |

**Daemon logger 配置**：

```typescript
// src/daemon/logger.ts — 新实现
import { createConsola } from 'consola'
import { createLogger, FileConsolaReporter } from '@openxenon/engine/infra/logging'
import { DAEMON_LOG_PATH } from '@openxenon/engine/infra/global'

const fileReporter = new FileConsolaReporter(DAEMON_LOG_PATH)
const baseLogger = createLogger({
  level: 'info',
  reporters: [fileReporter],
})

export function createDaemonLogger(prefix: string) {
  return baseLogger.withTag(prefix)
}
```

**未来扩展**：如果 daemon 需要日志轮转（按日期/大小），有两种选择：
1. 在 `FileConsolaReporter` 中加轮转逻辑（~50 行）
2. 替换 reporter 实现为 winston 的 `DailyRotateFile` transport（LoggerPort 隔离层保证调用代码不变）

#### PR-7: Cleanup（~5 文件）

| 操作 | 详情 |
|---|---|
| 删除 state.json diagnostics 字段 | `dual-state.ts` 的 `WorkspaceStateSchema.diagnostics` Zod 字段已由 PR-4 删除；PR-7 删除 `dual-state-exec.ts` 的 inline type |
| 删除重复诊断类型 | `dual-state-exec.ts` inline diagnostics、`work-migrator.ts` 的 `InvalidRef`——全部删除 |
| 统一 severity 词汇 | 4 种 enum → 1 种 `LogLevel = debug \| info \| warn \| error` |
| 删除死代码 | `ref-diagnostic.ts` 的 builder 函数（如果完全被 logger 调用替代）、`CanonicalResult` / `CanonicalIssue` 类型（grilling #3 已删除）、`ReferenceSeverity` 类型 |
| 更新 `work-context-builder.ts` | 从 collector drain 渲染 diagnostics 到人类输出，而非 `RefDiagnostic[]` 参数 |
| 更新 `work.ts` CLI 人类输出 | `result.warnings` / `result.invalidRefs` 引用改为从 collector 读取 |

#### 删除清单

- `Work/dual-state.ts` 的 `WorkspaceStateSchema.diagnostics` Zod 字段
- `Work/dual-state-exec.ts` 的 `RunWorkParams.diagnostics` inline type
- `Work/work-migrator.ts` 的 `InvalidRef` type
- `Work/work-migrator.ts` 的 `MigrateResult.warnings` + `MigrateResult.invalidRefs` 字段
- `oxl/md-pipeline/plugins/remark-canonical.ts` 的 `CanonicalResult` + `CanonicalIssue` 类型
- `oxl/md-bridge/reference-checker.ts` 的 `ReferenceSeverity` type
- 9 个 `oxl/md-bridge/compilers/*.ts` 的 `CompileOutput.warnings` 字段
- `oxl/compiler/oxn-adapter.ts` 的 `AdapterResult.warnings` 字段
- `oxl/validator/mutation-validator.ts` 的 `MutationCheckResult.warnings` 字段
- `Asset/validate.ts` 的 `AssetPaperValidationResult.warnings` 字段
- `infra/registry/daemon-startup.ts` 的 `DaemonStartupResult.warnings` 字段
- `Roadmap/types.ts` 的 `RoadmapParseResult.warnings` 字段
- `Work/work-validator.ts` 的 `ValidateArtifactsResult.warnings` + `legacyDomainRefs` 字段
- `Work/work-validator.ts` 的 `LegacyDomainRef` type + `legacyDomainRefsToWarnings` 函数
- `oxl/compiler/ref-diagnostic.ts` 的 `RefDiagnostic` type + builder 函数（无消费者）

#### 新增清单

- `packages/engine/src/kernel/contracts/logger-port.ts`（LoggerPort + LogEntry + LogLevel）
- `packages/engine/src/infra/logging/logger.ts`（createLogger + loggerPort singleton）
- `packages/engine/src/infra/logging/collector.ts`（InMemoryLogCollector，CLI 专用）
- `packages/engine/src/infra/logging/file-reporter.ts`（FileConsolaReporter，daemon 专用）
- `packages/engine/src/infra/logging/mock.ts`（createMockLogger 测试辅助）
- `packages/engine/src/infra/logging/index.ts`（Barrel export）

#### 验收标准

1. `bun run typecheck` 通过
2. `bun run lint` 通过（ESLint 架构守卫 + consola 限制规则）
3. `bun run check` 通过（Biome 格式 + 风格）
4. `bun test` 全量通过（~1630 tests）
5. 代码中无 `process.stderr.write('warning:` 残留（crash handler 除外）
6. 代码中无 `console.warn` / `console.error` warning 残留（crash handler 除外）
7. 代码中无 `warnings: string[]` 返回类型字段残留
8. 代码中无 `RefDiagnostic` / `InvalidRef` / `CanonicalResult` / `CanonicalIssue` / `ReferenceSeverity` / `LegacyDomainRef` 残留
9. `state.json` schema 无 `diagnostics` 字段
10. `infra/logging/logger.ts` 是代码库中唯一 import consola 的文件
11. CLI `--json` 模式输出包含 `warnings` 字段（当有 warning 时）
12. Daemon logger 不再写 stdout（写 stderr + file）
13. Daemon logger 不注入 InMemoryLogCollector（无内存泄漏）

### D7: ESLint 架构守卫

新增 2 条 `no-restricted-imports` 规则（遵循现有中文错误信息风格）：

#### 规则 1：consola 限制（repo-wide，`infra/logging/` 除外）

```javascript
// eslint.config.js 新增 block
{
  files: ['src/**/*.ts', 'packages/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        {
          group: ['consola'],
          message: '🚨 宪法违规：禁止直接使用 consola，请走 LoggerPort 抽象（infra/logging/ 是唯一允许的入口）！',
        },
      ],
    }],
  },
},
{
  // infra/logging/ 豁免
  files: ['packages/engine/src/infra/logging/**/*.ts'],
  rules: {
    'no-restricted-imports': 'off',
  },
},
```

#### 规则 2：Engine 禁止 console.warn / console.error

```javascript
// eslint.config.js 新增 block
{
  files: ['packages/engine/src/**/*.ts'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: "CallExpression[callee.object.name='console'][callee.property.name='warn']",
        message: '🚨 宪法违规：Engine 禁止 console.warn，请走 LoggerPort.warn() 抽象！',
      },
      {
        selector: "CallExpression[callee.object.name='console'][callee.property.name='error']",
        message: '🚨 宪法违规：Engine 禁止 console.error，请走 LoggerPort.error() 抽象！',
      },
    ],
  },
},
```

> **CLI 例外**：CLI 的 crash handler（`index.ts:88-128`）保留 `console.error`——那是 exit 2 的人类可读输出，不是 warning。CLI 的 `console.log` / `console.warn` 仍可限制（非 crash handler 场景）。

## Consequences

### 正面

1. **单一通道**：所有非阻断诊断统一为 `logger.warn(message, data)` 调用（无 code 参数）。从 7 种 pattern + 4 种 severity enum + 10+ 个返回类型收敛到 1 个 `LoggerPort` 接口 + 1 个 `LogEntry` 类型 + 1 个 `LogLevel` enum。
2. **函数签名变窄**：10+ 个函数删除 `warnings: string[]` / `diagnostics?: RefDiagnostic[]` 返回字段，只返回业务数据。调用方不再需要处理混合了业务数据和诊断的返回类型。
3. **Log = Error 清晰分离**：LogEntry 是纯日志（`{ level, message, tag?, data?, date? }`，无 code），通过 message + tag 追溯到代码位置。Error 是 throw（带 code，AI 消费契约）。两者职责分明。
4. **`--json` 模式可见性**：Pattern E/F/G.6 的 stderr/console 警告此前在 `--json` 模式下完全不可见。迁移后通过 collector drain → JSON envelope `warnings` 字段，AI Agent 可消费。
5. **`--verbose` flag 激活**：从死代码变为有用的 level threshold 控制（0=warn+, 1=info+, 2=debug+）。
6. **Daemon stdout 污染修复**：`src/daemon/logger.ts:23` 的 `console.log` 写 stdout 问题被 consola 的 `stdout: process.stderr` 选项修复。
7. **Daemon 无内存泄漏**：daemon 用 file + stderr reporter（直接输出，无 InMemoryLogCollector 累积）。CLI 用 collector（短运行，drain 后退出）。两者共享 LoggerPort 接口，reporter 组合不同。
8. **state.json 简化**：删除 `diagnostics` 字段（只写不读的死数据），schema 变简单。无 CLI → state.json 的转换层。
9. **remark-canonical 无特例**：直接 `throw MDError.err()`（与 `remarkParse` 一致），删除 `CanonicalResult` / `CanonicalIssue` 类型。与 ADR-0081 "Error = throw only" 完全对齐，无 pipeline 特例。
10. **隔离层保证可替换**：`infra/logging/logger.ts` 是唯一 import consola 的文件。切换到 pino 或其他库只需改这一个文件，所有调用代码不变。
11. **测试模式统一**：从 `expect(result.warnings).toContain(...)` 统一为 `expect(mockLogger.callsFor('warn')).toContainEqual(...)`。`createMockLogger()` 提供共享测试工具。匹配从 code（不可见字符串）改为 message substring（人类可读），更易调试。
12. **Ports 模式一致**：LoggerPort 遵循现有 HashPort / OsPort / FileSystemPort 的完全相同的模式（L0-Contract interface + L1-Infra object literal + L2 参数注入）。

### 负面 / 限制

1. **迁移成本高**：~35 个生产文件 + ~25 个测试文件 + ~175 个测试断言需更新。分 7 个 PR 完成。
2. **L2 函数签名侵入**：所有产生 warning 的 L2 函数需增加 `logger?: LoggerPort` 参数。虽然默认值=no-op singleton 保证不破坏现有调用，但新调用方需显式传 logger 才能收集到 warning。
3. **reference-checker 'fatal' 重分类**：`ReferenceSeverity = 'fatal'` 原来只是"blocks Proof"的软标记，迁移后变为 `throw EngineError`（硬阻断）。这改变了行为——此前 fatal 引用不抛错，只是标记；迁移后直接抛错。需验证所有调用方能接受这个行为变更。
4. **consola 依赖引入**：虽然 consola@3.4.2 已是 transitive dep（零新增安装），但提升为 direct dep 后，consola 的版本升级成为 OXN 的直接关注点。consola 的 14 种 LogType 中 OXN 只用 4 种（debug/info/warn/error），其余类型（success/fail/ready/start/box/trace/verbose/log/silent）不会被使用。
5. **测试断言匹配精度**：测试从 `expect(result.warnings).toContain(code_string)` 改为 `expect(mockLogger.callsFor('warn')).toContainEqual(message_substring)`。message substring 匹配比精确 code 匹配更宽松——可能产生误匹配（不同 warning 的 message 有相同子串）。需要测试 message 的独特子串，或匹配整个 message。

### 中性

1. **state.json 无 diagnostics 字段**：从 schema 中删除 `diagnostics` 字段。旧 state.json 文件含 diagnostics 字段，但被新 schema 拒绝——需迁移脚本（一次性）。
2. **daemon logger API 不变**：`createLogger(prefix)` 签名保留，调用方无需变更。
3. **ConsolaReporter 复用**：consola 的 `ConsolaReporter` 接口是天然的可扩展点。CLI 用 `InMemoryLogCollector`，daemon 用 `FileConsolaReporter`，未来可加 `RemoteLogReporter` / `RingBufferReporter` 等。

## Alternatives Considered

### Alt-1: 保留返回值 + CLI 层转换

**方案**：Patterns A/B/C/D/G.1/G.4 的函数继续返回诊断数组（不变签名）。CLI 层在 `output()` 时把返回的 diagnostics 转换为 `LogEntry[]` 喂入 JSON envelope 的 `warnings` 字段。副作用 patterns（E/F/G.6）迁移到 `logger.warn()` 调用。

**否决**（用户决策 Q2）。保留两套警告通道（返回值 + logger）违背"单一通道"目标。函数签名混合业务数据和诊断数据是当前碎片化的根因——不彻底消除则碎片化会重新滋生。

### Alt-2: 分批迁移（先副作用，后返回值）

**方案**：Patterns A/B/C/D 保留返回值（CLI 转换）。但 G.7 表中的 8+ 个 `warnings: string[]` 小返回类型（entity compilers、mutation validator、asset validator 等）转为 logger 调用——这些是内联 `string[]` 碎片，不值得保留。混合策略：结构化诊断保留，flat `string[]` 消灭。

**否决**（用户决策 Q2）。混合策略导致两套 warning 通道并存（结构化返回值 + logger 调用），认知负担反而增加——开发者需要判断"这个函数的 warning 走返回值还是走 logger？"。全量统一到 logger 消除这个判断。

### Alt-3: 直接用 consola（不引入 LoggerPort）

**方案**：engine 全层直接 `import { consola } from 'consola'` 调 `consola.warn(...)`。不引入 Port 接口、不引入隔离层。consola 自带 `withTag()` 做模块前缀。

**否决**（用户决策）。三个问题：
1. **违反 kernel 兰姆达真空**：consola 内部有 I/O（`process.std*`），kernel 不能直接调用。
2. **无隔离层**：切换日志库需要改所有调用点。
3. **不可 mock**：kernel 纯函数测试无法 mock consola 单例。
4. **违背 Ports 模式**：OXN 已有 5 个 Port（HashPort / OsPort / FileSystemPort / PartPort / RuntimePort），LoggerPort 应遵循同一模式。

### Alt-4: pino 替代 consola

**方案**：用 pino@10.3.1 作为日志库。

**否决**（用户决策 Q1 + grilling #4）。pino 有 11 个生产依赖（atomic-sleep、sonic-boom、thread-stream、process-warning 等），Bun 运行时需 `pino-bare` 兼容模块，CLI 人类输出需 `pino-pretty`——总新增 ~13 个包。consola 有 0 生产依赖，已是 transitive dep（零新增安装），Node.js 原生一等支持，内置 `ConsolaReporter` 接口天然支持内存收集（`--json` envelope 的杀手特性）。pino 的核心优势（异步高性能 JSON 流式输出）是给高吞吐 HTTP 服务器设计的，对 CLI 工具每次调用产几条日志的场景无关。对 daemon 而言，pino 的文件日志优势（内置 destination + roll）可通过自定义 `FileConsolaReporter`（~15 行）替代，调用代码不变（LoggerPort 隔离层）。一个库 + 隔离层 > 两个库。

### Alt-5: 自定义 Logger（不用第三方库）

**方案**：在 `infra/logging/` 中自己写一个轻量 logger（console wrapper + 内存收集器），不依赖 consola。

**否决**。consola 已在磁盘上（citty 的 transitive dep），0 新增安装，提供了成熟的 reporter 模式、`withTag()`、`wrapConsole()`、`mockTypes()` 等功能。自己写等于重新实现 consola 的子集——增加维护成本，且功能不如成熟库。隔离层（LoggerPort）已经保证了可替换性。

### Alt-6: LoggerPort 放 L1-Infra（不放 L0-Contract）

**方案**：参照 `RuntimePort` 的 Type B 模式（定义在 `infra/runtime/types.ts`，不通过 kernel barrel re-export）。

**否决**。LoggerPort 与 HashPort / OsPort / FileSystemPort 性质相同——是 kernel 纯函数需要注入的基础设施契约。放在 L0-Contract 才能让 kernel 代码通过 `import type { LoggerPort } from '../../contracts/logger-port'` 使用，同时保持兰姆达真空。Type B 模式适用于不需要 kernel 使用的端口（RuntimePort 只在 L1-L2 使用）。

### Alt-7: LogEntry 保留 code 字段

**方案**：LogEntry 顶层有 `code` 字段（code = `'OXN_WORK_REFS_UNRESOLVED'` 等）。每个 log 调用都必须带 code。

**否决**（grilling #1 + #5）。Log 不需要 code——code 是 Error 体系的机器消费契约（决定 exit code + 输出渠道）。Log 通过 message + tag + data 追溯到代码位置，AI 通过读 message 理解，不需要 code 来匹配。保留 code 会引入 code 命名空间问题（与 Error name 对齐？保持独立？），增加复杂度但不带来实际收益。

### Alt-8: state.json 保留 diagnostics 字段（CLI 转换填充）

**方案**：保留 state.json 的 diagnostics 字段。L2 函数 logger.warn() 后，CLI 从 collector drain → 转换为 RefDiagnostic 格式 → 写入 state.json。

**否决**（grilling #2）。当前 diagnostics 字段是只写不读的死数据——`oxn work context` 重新解析 ref（`work-context-builder.ts:510`），不读 state.json。没有消费者保留字段等于增加 schema 复杂度 + 死代码 + 误解风险。直接删除字段更干净。

### Alt-9: remark-canonical 保留 CanonicalResult.errors 返回值

**方案**：remark 插件保留 errors 数组作为返回值（pipeline 约束），调用方在 pipeline 外检查 errors → throw MDError。

**否决**（grilling #3）。remark-canonical errors 是用户输入错误（MD 文件不合规），不是程序 bug。ADR-0081 "Error = throw only" 适用——直接 `throw MDError.err()` 中断 pipeline，与 `remarkParse` 行为一致。"show all errors at once" 的 DX 便利是锦上添花，不是正确性要求——可通过 `--show-all-errors` flag 单独实现。

### Alt-10: Daemon 用 per-request collector

**方案**：Daemon 也用 InMemoryLogCollector，但每处理完一个 socket 请求后 drain。drain 的 warnings 放入 socket 响应返回给 CLI。

**否决**（grilling #4）。两个问题：
1. **超出 ADR-0082 范围**：这是 daemon IPC 协议变更，需要单独 ADR。
2. **当前无消费者**：当前 daemon 的 socket 响应不含 warnings。无消费者先加 collector 是过度设计。
3. **内存风险**：per-request collector 实现复杂（需要在 daemon 内部管理 collector 生命周期），目前无收益。

Daemon logger 直接写文件 + stderr，collector 是 CLI 专有概念。

## References

- [ADR-0081 OXN 统一错误体系框架](./0081-oxn-unified-error-framework.md) — Error = throw only（两档 FATAL/ERR），非阻断问题推出 Error 体系，本 ADR 兑现 Diagnostic 统一预告。LogEntry 是纯日志（无 code），Error 有 code，两者职责分明。
- [ADR-0080 错误与冲突处理术语统一](./0080-error-terminology-unification-and-governance.md) — 三层分类框架的前序
- [ADR-0072 OXN = 非确定性 Agent 的确定性参照系](./0072-oxn-as-referent-for-nondeterministic-agent.md) — Referent 完整性：OXN 描述"发生了什么"（code + message + data），不做决策
- `packages/engine/src/oxl/compiler/ref-diagnostic.ts:6-15` — Error vs Diagnostic 分离的既有决策（IAPError = 硬阻断，diagnostics = 软警告 + AI 可继续）
- `packages/engine/src/kernel/contracts/hash-port.ts` — 现有 Port 接口模板（LoggerPort 遵循同一模式）
- `packages/engine/src/infra/hash.ts` — 现有 Port 实现模板（object literal + import type from kernel barrel）
- `packages/engine/src/kernel/index.ts:28-42` — Port re-export barrel（LoggerPort 将在此添加）
- `packages/cli/src/commands/output.ts` — CLI output writer（envelope 扩展为 `{ ok, data, warnings? }`）
- `packages/cli/src/index.ts` — CLI 入口（collector + logger 注入 + `--verbose` 激活）
- `src/daemon/logger.ts:23` — Daemon logger stdout 污染 bug（`console.log` 写 stdout，本 ADR 修复）
- `packages/engine/src/Work/work-validator.ts` — Pattern A `warnings: string[]` 主要来源
- `packages/engine/src/Work/dual-state.ts:71-82` — Pattern B `diagnostics` Zod 字段（grilling #2 决策删除）
- `packages/engine/src/Work/work-context-builder.ts:510` — `oxn work context` 重新解析 ref（不读 state.json），证明 diagnostics 是死数据
- `packages/engine/src/oxl/md-pipeline/plugins/remark-canonical.ts` — Pattern C `CanonicalIssue`（grilling #3 决策删除）
- `packages/engine/src/oxl/md-bridge/reference-checker.ts` — Pattern D `ReferenceSeverity`
- `packages/cli/src/commands/proof.ts:727,742` — Pattern E `stderr.write`
- `packages/cli/src/commands/blueprint.ts:183,294` — Pattern F `stderr.write`
- `eslint.config.js` — ESLint flat config（新增 consola 限制 + console.warn/error 禁止规则）
- `package.json:47-61` — dependencies（新增 `consola: "^3.4.2"`）
- consola 官方文档：https://github.com/unjs/consola — `ConsolaReporter` 接口、`createConsola()` 工厂、`withTag()` API
