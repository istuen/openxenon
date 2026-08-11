---
entity: rfc
id: RFC-0002
theme: kernel-l0
status: Accepted
date: 2026-07-26
supersedes: []
superseded-by: ~
related:
  - ADR-0002: docs/adrs/0002-probe-default-rules-five-level-priority.md
  - ADR-0003: docs/adrs/0003-runtime-isolation-frozen-naming.md
  - ADR-0008: docs/adrs/0008-probe-observation-vs-verdict.md
  - ADR-0009: docs/adrs/0009-architectural-guard-tests-trace-before-state.md
  - ADR-0010: docs/adrs/0010-path-port-injection.md
  - ADR-0011: docs/adrs/0011-evidence-chain-triple.md
  - ADR-0013: docs/adrs/0013-no-langium-type-leak-acl.md
  - ADR-0037: docs/adrs/0037-part-resolver-moved-to-l2-work.md
  - ADR-0017: docs/adrs/0017-probe-stats-cross-proof-accumulation.md
  - ADR-013: docs/adrs/013-filesystem-port-vs-runtime-file.md
synced-at: 2026-07-27
landing-reason: declarative
---

# RFC-0002: Kernel / L0 边界——真空约束 + Port 注入 + 证据链三件套

> **类型**：RFC（OpenXenon 规范）
> **主题**：kernel-l0
> **状态**：✅ Accepted（核心冻结，仅可追加 errata 段）
<!-- allow-version -->
> **批次**：2026-07-26 v0.7 RFC 首批 promote（Phase 2）
<!-- /allow-version -->

## 摘要

OXN L0 Kernel 的物理边界——**LambdaVacuum**（零 IO 约束，禁 fs/net/child_process/process.env/process.std*/EventEmitter）+ **ProbeObservation vs ProbeVerdict 二元公理**（物理观测 vs 业务判定分离）+ **PathPort 注入原理**（L0 跨 runtime 可移植）+ **五级参数优先级链**（CLI 最高优先 → Probe schema default 最低）+ **运行期隔离**（frozen.json 是运行期唯一合法产物）+ **证据链三件套**（frozen.json + trace.jsonl + state.json）+ **架构守护测试**（CI 反向 import 测试 + Trace-before-State 写入顺序）+ **Langium 类型隔离**（ACL 守则）+ **part-resolver 迁 L2**（Kernel 真空保护）。

## 决策要点

### D1：LambdaVacuum——L0 零 IO 约束

L0 Kernel **禁 fs/net/child_process/process.env/process.std*/EventEmitter**。Kernel 只依赖 Schema + Contract ports。

**CI 守卫**：`bun scripts/validate-dependencies.ts`（8 层依赖图）+ `bun run lint`（含 `no-restricted-imports`）。

### D2：ProbeObservation vs ProbeVerdict 二元公理（ADR-0008）

Kernel 内两类数据严格区分：

| 类型 | 含义 | 所在层 | 谁生成 |
|---|---|---|---|
| `ProbeObservation` | 物理事实（exitCode、stdout、stderr） | L1 Infra | Probe 执行器 |
| `ProbeVerdict`（现 `ProbeOutcome`） | 业务判定（COMPLETED/DEVIATED/INCONCLUSIVE） | L0 Kernel | Processor |

**关键不变量**：
- L1 Infra **只产出** ProbeObservation，**不判定**业务对错
- L0 Processor **只消费** ProbeObservation，**不调用** IO（fs / net / child_process）
- 跨层数据传递只能通过 Contract（`kernel/contracts/probe-port.ts`）

### D3：PathPort 注入原理（ADR-0010）

Kernel 不直接调 `path.join` / `path.resolve`。所有路径操作通过 `PathPort` 注入：

```ts
// L0-Contract 定义接口
interface PathPort {
  join(...parts: string[]): string
  resolve(p: string): string
  relative(from: string, to: string): string
}

// L1-Infra 提供实现
class NodePathPort implements PathPort { ... }
```

L1 可注入 Path / Hash / Fs / Clock 等 Port，让 L0 跨 runtime 可移植。

### D4：Probe default 规则 + 五级参数优先级链（ADR-0002）

| 字段类型 | 是否允许 default | 原因 |
|---|---|---|
| Probe `required` 字段 | ❌ 禁 default | 强制调用者显式传入 |
| Probe `optional` 字段 | ✅ 允许 default | 提供合理回退 |

**五级参数优先级链**（从高到低）：

1. `Task --param key=value`（命令行最高优先）
2. `parts[].params`（Part 实例化覆盖）
3. 顶级 `params`（Blueprint 显式）
4. `Part` schema default
5. `Probe` schema default（最低）

### D5：运行期隔离 + frozen 命名规则（ADR-0003）

`frozen.json` 是**运行期唯一合法产物**。Engine 不得感知源格式（YAML / OXN / MD），源文件信息记录在 `_xenon_meta.source_format` 字段，运行期代码不做条件分支。

- ✅ `frozen.json`（不带 `.yaml`/`.oxn`/`.md` 后缀）
- ❌ `frozen.oxn.json` / `frozen.yaml.json`（暴露源格式）
- ✅ 源格式信息记录于 `_xenon_meta.source_format: "oxn" | "yaml" | "md"`

跨格式（YAML→OXN→MD）迁移期间，所有源格式差异在编译期被吸收，运行期只见 frozen.json。

### D6：证据链三件套（ADR-0011，已术语精简至 Proof desc）

每个 Work 的运行时目录固定包含**三个不可变证据文件**：

```
works/<work-name>/
<!-- allow-version -->
├── .work                         # v1.1 出生证明 + planLock
<!-- /allow-version -->
├── .run/
│   ├── frozen.json               # 编译期产物（不可变）
│   ├── trace.jsonl               # NDJSON 事件流（append-only）
│   └── state.json                # 当前状态快照
```

**语义分工**（三件套 = Proof 的物理载体）：

| 文件 | 角色 | 写入时机 | 可变 |
|---|---|---|---|
| `frozen.json` | 公证（Work 起始状态的不可变快照） | `work lock` 后 | 否 |
| `trace.jsonl` | 历史（所有事件追加流） | 每次状态变更 | append-only |
| `state.json` | 现状（最近一次的派生态） | 每次 trace 之后 | 是（来自 trace 重放） |

术语"EvidenceChainTriple"已废弃（ADR-0066），三件套仍是 Proof 的技术规范，但不再作为独立术语使用。

### D7：架构守护测试 + Trace-before-State 写入顺序（ADR-0009）

**反向 import 测试**：Kernel 不能 import L1+，Kernel 不能用 `fs/net/child_process`。由 `bun scripts/validate-dependencies.ts` + `bun run lint` 强制。

**Trace-before-State**：写 `state.json` 前必须先 append `trace.jsonl` 事件：

```ts
// ❌ 禁止
fs.writeFileSync(statePath, ...)

// ✅ 必须
fs.appendFileSync(tracePath, eventJsonl)
fs.writeFileSync(statePath, ...)
```

**原因**：state 是快照，trace 是历史。若 state 写成功但 trace 未写，崩溃后无法解释 state 来源。Trace 在前意味着：state 永远有迹可循。

<!-- allow-version -->
### D8：Langium 类型隔离 ACL（ADR-0013，v0.6.1 退役后仍有意义）
<!-- /allow-version -->

`src/oxl/index.ts` **不导出 Langium 类型**。OXL 对外只暴露：

```ts
export { createOxnCompiler, type OxnCompiler } from './compiler.js'
export type { OxnIR, OxnValidationResult } from './ir-types.js'
// ❌ 禁止 export { AstNode, ... } from 'langium'
```

**接口**放 `src/oxl/contracts/`（L1 内部），**类实现**通过 `createOxnCompiler()` 工厂函数返回，**不 export 类本身**。

L0 / L1 调用方不能 import Langium（避免依赖外部包）；未来替换 Langium 时，只改工厂内部实现。

### D9：part-resolver 从 Kernel 迁 L2 Work（ADR-0037）

`part-resolver` 模块**从 Kernel（L0）迁到 Work（L2）**。

**原因**：
- Kernel 真空（禁 IO / 解析 / 业务）
- Part 解析依赖 Arsenal（Project > Global > Builtin 优先级链），是**业务逻辑**
- L2-Work 才是 Part 实例化的语义层

**模块依赖图**（修正后）：

```
DSL (L1-OXL) ──→ Schema (L0)

Infra (L1)   ──→ Schema (L0)

Work (L2)    ──→ DSL (L1) + Kernel (L0) + Arsenal (L2-Builtin)
              ↑
              │ 含 part-resolver（从 Kernel 迁出）
```

### D10：FileSystemPort vs runtime/file.ts 职责分工（ADR-013，历史）

L0 Kernel 通过 Port 注入文件系统能力，但文件系统操作的**物理实现**有两种风格：

| 维度 | FileSystemPort（Type A） | runtime/file.ts（Type B） |
|---|---|---|
| 接口形态 | Port 抽象（kernel/contracts/） | Bun/Node fs 直接封装 |
| 调用方 | L0 / L1-OXL | L1-Infra / L2-Work |
| 注入方式 | PathPort 注入原理（同 D3） | 直接 import |
| 运行时 | 跨 runtime（Bun/Node 18+） | 单一 runtime |
| 典型用例 | Probe 路径解析 / frozen.json 写 | CLI 文件操作 |

**职责分工**：

- **L0 Kernel 用 FileSystemPort**：通过 D3 PathPort 注入原理，所有 IO 操作经 `PathPort`/`FsPort`，跨 runtime 可移植
- **L1-Infra 实现 FileSystemPort**：`packages/engine/src/infra/fs/` 提供 `NodeFsPort` / `BunFsPort` 双实现
- **L2-Work 可用 `runtime/file.ts`**：CLI 内部使用（`packages/cli/src/runtime/file.ts`）直接调 Bun/Node fs，不强制走 Port——Work 已在 L2，可依赖 runtime

**理由**：L0 真空约束 + Kernel 可移植性要求双层 IO 抽象——Kernel 不知道自己是 Bun 还是 Node；Work 层反之，可享受 Bun 优化。

### D11：probe-stats.json 跨 proof 累积机制（ADR-0017）

**Probe 行为统计缓存**（位于 `.openxenon/.cache/probe-stats.json`）累积跨 proof 跨 work 的 Probe 行为数据：

```json
{
  "fs-exists": {
    "totalRuns": 128,
    "passRate": 0.96,
    "avgDurationMs": 12,
    "lastFailure": "2026-06-30T12:34:56Z",
    "unstableContexts": ["path-contains-spaces"]
  }
}
```

#### 累积规则

| 触发 | 操作 |
|---|---|
| 每次 `work run` 完成 | append 一条 stats 记录 |
| Probe 改名 / 删除 | stats 保留 90 天后归档（不立即删） |
| 不稳定 Probe（passRate < 0.8 且 totalRuns > 20） | Insight 自动警告 |

#### 跨 proof 累积意义

- **Insight 涌现层原料**：Probe 历史统计是 Insight 推理的输入（RFC-0005 D1）
- **不稳定 Probe 预警**：低 passRate 的 Probe 在 Insight 报告中标记，让工程师人工排查
- **趋势分析**：跨 work 累积的 passRate 反映 Probe 稳定性，避免单次 work run 抖动误导

#### 落地状态

- ✅ 文件位置 `.openxenon/.cache/probe-stats.json` 已确立
- ✅ 累积 append 已在 CLI 实现（`oxn work run` 完成时调用）
<!-- allow-version -->
- ⚠️ Probe 改名 / 删除的 90 天保留策略代码层未完整实现（v0.7+ 落地）
- ⚠️ 不稳定 Probe 告警在 Insight 输出格式中未明确标注（v0.7+ 落地）
<!-- /allow-version -->

#### 与 D6 证据链三件套关系

probe-stats.json **不是** D6 三件套的一部分——三件套是单次 work 的不可变证据，probe-stats 是跨 work 的累积缓存。两层数据互不污染：

- 三件套记录"这一次发生了什么"（不可变）
- probe-stats 记录"历史 Probe 表现如何"（累积）

## 影响范围

- ✅ 8 ADR 全 Adopted（含 ADR-0011 EvidenceChainTriple 术语已废）
- ✅ L0 真空由 CI 守护（validate-dependencies.ts + eslint no-restricted-imports）
- ✅ frozen.json schema 已切换为 outcome 聚合结构（ADR-0067 落地）
<!-- allow-version -->
- ✅ v1.1 planLock 在 `.work` 文件维护 4 组件 hash
- ✅ FileSystemPort vs runtime/file.ts 职责分工已通过 L0 Port 注入 + L1 实现 + L2 直调三层落实（ADR-013 历史决策）
- ✅ probe-stats.json 跨 proof 累积机制部分落地（append 已实现，retention + 不稳定告警 v0.7+ 待补）
<!-- /allow-version -->
- 📝 异步 IO 顺序需在 `work run` 关键路径严格保持

## 相关术语

- [Kernel](/product/zh-cn/concepts/glossary.html#kernel) — L0 纯逻辑验证模块
- [Infra](/product/zh-cn/concepts/glossary.html#infra) — L1 副作用/IO 执行模块
- [ProbeObservation](/product/zh-cn/concepts/glossary.html#probeobservation) — 物理事实层
- [ProbeOutcome](/product/zh-cn/concepts/glossary.html#probeoutcome) — 业务判定层
- [PathPort](/product/zh-cn/concepts/glossary.html#pathport) — L1 注入式路径操作接口
- [Frozen](/product/zh-cn/concepts/glossary.html#frozen) — 不可变证据文件
- [LambdaVacuum](/product/zh-cn/concepts/glossary.html#lambdavacuum) — L0 零 IO 约束的正式术语

## 相关决策

- [ADR-0002](../../adrs/0002-probe-default-rules-five-level-priority.md) — Probe default + 五级优先级链（2026-05-19）
- [ADR-0003](../../adrs/0003-runtime-isolation-frozen-naming.md) — 运行期隔离（2026-05-20）
- [ADR-0008](../../adrs/0008-probe-observation-vs-verdict.md) — 二元公理（2026-05-26）
- [ADR-0009](../../adrs/0009-architectural-guard-tests-trace-before-state.md) — 架构守护测试（2026-05-28）
- [ADR-0010](../../adrs/0010-path-port-injection.md) — PathPort 注入（2026-05-26）
- [ADR-0011](../../adrs/0011-evidence-chain-triple.md) — 证据链三件套（2026-05-27）
- [ADR-0013](../../adrs/0013-no-langium-type-leak-acl.md) — Langium 类型隔离 ACL（2026-05-28）
- [ADR-0037](../../adrs/0037-part-resolver-moved-to-l2-work.md) — part-resolver 迁 L2（2026-05-26）
- [ADR-0017](../../adrs/0017-probe-stats-cross-proof-accumulation.md) — probe-stats.json 跨 proof 累积（2026-06-10，Partially Adopted → RFC D11 承载决策内容）
- [ADR-013](../../adrs/013-filesystem-port-vs-runtime-file.md) — FileSystemPort vs runtime/file.ts 职责分工（2026-05-12，历史 ADR → RFC D10 记录分层原则）

## Errata

<!-- allow-version -->
### v1.0.1 (2026-07-26)
<!-- /allow-version -->

- **ADR 引用路径修正**：原 `## 相关决策` 段链接指向 `.openxenon/drafts/rfc/00XX-*.md`，该路径在 Phase 3 ADR 归档后已失效（72 文件已移至 `.openxenon/.archived/docs/adrs/`）。现镜像到 `docs/adrs/`，RFC 链接指向 `../../adrs/00XX-*.md`（docs/ 内部，无跨层）。frontmatter `related` 同步更新为 `docs/adrs/00XX-*.md`。
- **修复触发**：grilling #7 发现 body markdown 链接死链 + 失效 frontmatter refs；边界检查器因错误相对路径漏报。
- **符合 RFC-0009 D4**：ADR 引用现在遵循"仅 related 段可引 docs/adrs/"规则。

### 2026-07-27 errata

<!-- allow-version -->
- **新增 D10 FileSystemPort 职责分工 + D11 probe-stats 累积机制**：ADR-013（历史）+ ADR-0017（Partially Adopted）内容已并入 RFC 正文。FileSystemPort（L0 Port 注入）与 runtime/file.ts（L2 直调）的三层分工已通过 L0 / L1 / L2 三层代码结构落实。probe-stats.json 累积机制部分落地（append 已实现，retention + 不稳定告警 v0.7+ 待补）。
<!-- /allow-version -->
- **frontmatter related 增补**：ADR-0017 + ADR-013。
- **影响范围段**：增补 FileSystemPort + probe-stats 落地声明。

> 本段用于后续追加修正说明。核心决策自 RFC-0002 Accepted 起冻结。
