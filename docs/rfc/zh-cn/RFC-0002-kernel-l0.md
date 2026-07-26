---
entity: rfc
id: RFC-0002
theme: kernel-l0
version: 1.0.0
status: Accepted
date: 2026-07-26
supersedes: []
superseded-by: ~
related:
  - ADR-0002: .openxenon/drafts/rfc/0002-probe-default-rules-five-level-priority.md
  - ADR-0003: .openxenon/drafts/rfc/0003-runtime-isolation-frozen-naming.md
  - ADR-0008: .openxenon/drafts/rfc/0008-probe-observation-vs-verdict.md
  - ADR-0009: .openxenon/drafts/rfc/0009-architectural-guard-tests-trace-before-state.md
  - ADR-0010: .openxenon/drafts/rfc/0010-path-port-injection.md
  - ADR-0011: .openxenon/drafts/rfc/0011-evidence-chain-triple.md
  - ADR-0013: .openxenon/drafts/rfc/0013-no-langium-type-leak-acl.md
  - ADR-0037: .openxenon/drafts/rfc/0037-part-resolver-moved-to-l2-work.md
synced-at: 2026-07-26
---

# RFC-0002: Kernel / L0 边界——真空约束 + Port 注入 + 证据链三件套

> **类型**：RFC（OpenXenon 规范）
> **主题**：kernel-l0
> **状态**：✅ Accepted（核心冻结，仅可追加 errata 段）
> **批次**：2026-07-26 v0.7 RFC 首批 promote（Phase 2）

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
├── .work                         # v1.1 出生证明 + planLock
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

### D8：Langium 类型隔离 ACL（ADR-0013，v0.6.1 退役后仍有意义）

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

## 影响范围

- ✅ 8 ADR 全 Adopted（含 ADR-0011 EvidenceChainTriple 术语已废）
- ✅ L0 真空由 CI 守护（validate-dependencies.ts + eslint no-restricted-imports）
- ✅ frozen.json schema 已切换为 outcome 聚合结构（ADR-0067 落地）
- ✅ v1.1 planLock 在 `.work` 文件维护 4 组件 hash
- 📝 异步 IO 顺序需在 `work run` 关键路径严格保持

## 相关术语

- [Kernel](/glossary/zh-cn/engine-terms.html#kernel) — L0 纯逻辑验证模块
- [Infra](/glossary/zh-cn/engine-terms.html#infra) — L1 副作用/IO 执行模块
- [ProbeObservation](/glossary/zh-cn/proof-terms.html#probeobservation) — 物理事实层
- [ProbeOutcome](/glossary/zh-cn/proof-terms.html#probeoutcome) — 业务判定层
- [PathPort](/glossary/zh-cn/engine-terms.html#pathport) — L1 注入式路径操作接口
- [Frozen](/glossary/zh-cn/proof-terms.html#frozen) — 不可变证据文件
- [LambdaVacuum](/glossary/zh-cn/engine-terms.html#lambdavacuum) — L0 零 IO 约束的正式术语

## 相关决策

- [ADR-0002](../../.openxenon/drafts/rfc/0002-probe-default-rules-five-level-priority.md) — Probe default + 五级优先级链（2026-05-19）
- [ADR-0003](../../.openxenon/drafts/rfc/0003-runtime-isolation-frozen-naming.md) — 运行期隔离（2026-05-20）
- [ADR-0008](../../.openxenon/drafts/rfc/0008-probe-observation-vs-verdict.md) — 二元公理（2026-05-26）
- [ADR-0009](../../.openxenon/drafts/rfc/0009-architectural-guard-tests-trace-before-state.md) — 架构守护测试（2026-05-28）
- [ADR-0010](../../.openxenon/drafts/rfc/0010-path-port-injection.md) — PathPort 注入（2026-05-26）
- [ADR-0011](../../.openxenon/drafts/rfc/0011-evidence-chain-triple.md) — 证据链三件套（2026-05-27）
- [ADR-0013](../../.openxenon/drafts/rfc/0013-no-langium-type-leak-acl.md) — Langium 类型隔离 ACL（2026-05-28）
- [ADR-0037](../../.openxenon/drafts/rfc/0037-part-resolver-moved-to-l2-work.md) — part-resolver 迁 L2（2026-05-26）

## Errata

> 本段用于后续追加修正说明。核心决策自 RFC-0002 Accepted 起冻结。