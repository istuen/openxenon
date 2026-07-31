---
redirectFrom:
  - /zh-cn/architecture.html
title: 架构
---

# 架构

> OXN 架构 = **E1-E4 结构实体 + L0-L3 工程分层**。E1-E4 是理念，L0-L3 是代码依赖方向。物理目录用各自名称（`kernel/`、`oxl/`、`infra/`、`cli/`、`daemon/`、`src/service/<Domain>/`），不直接对应 E 或 L。

## 1. E1-E4 结构实体（理念层）

| 实体 | 性质 | 主导权 | 对应代码模块 |
|---|---|---|---|
| E1 Asset | 静态硬约束边界 | 工程师 | `service/Asset/` |
| E2 Work | 动态协作（IAP 三阶段 + Round） | 工程师 ↔ AI | `service/Intent/` + `service/Align/` |
| E3 Engine | 独立验证主权基座 | OXN | L0-L2 全部 |
| E4 Insight | 涌现层（1+1>2） | AI 推理 | `service/Insight/`（v0.6 哲学占位） |

详见 [Core Concepts](../../product/zh-cn/concepts/iap-paradigm.html)。

## 2. L0-L3 工程分层

```
┌────────────────────────────────────────────────────────┐
│  L3: Tools & Applications (工具与应用层)                │
│      CLI (oxn) + Skills (oxn-work) + Daemon            │
│      物理目录: packages/cli/src/ / .opencode/skills/    │
├────────────────────────────────────────────────────────┤
│  L2: Engine Core Logic (引擎核心业务层)                  │
│      E1-E4 全部实现在此                                  │
│      Asset / Intent / Align / Proof / Insight / Pool    │
│      物理目录: packages/engine/src/<Domain>/ │
├────────────────────────────────────────────────────────┤
│  L1: OXL + Infra (操作基座与语言层)                     │
│      OXL: OpenXenon Language DSL 编译器                 │
│      Infra: 文件系统/探针/Socket/OS 操作                 │
│      物理目录: packages/engine/src/infra/        │
├────────────────────────────────────────────────────────┤
│  L0: Kernel (逻辑内核层)                                 │
│      纯逻辑零 IO: Schema / Contract / ProbeOutcome / Processor│
│      物理目录: packages/engine/src/kernel/            │
└────────────────────────────────────────────────────────┘
```

**依赖规则**：L3 → L2 → L1 → L0（单向，不可反向）

## 3. E1-E4 在 L2 Engine 的实现

L2 Engine 是 OXN 的核心。物理位置在 `packages/engine/src/`，按 DDD 模块化组织：

```
packages/engine/src/           ← L2 Engine 物理位置
├── Asset/                                ← E1 Asset 硬约束边界
│   ├── index.ts
│   ├── create.ts / list.ts / validate.ts / compile.ts
│   ├── sync.ts / get.ts / delete.ts / migrate.ts
│   ├── types.ts / internal/
│
├── Intent/                               ← E2 Work · Intent 阶段
│   ├── index.ts
│   ├── create-work.ts / analyze-boundaries.ts / refine-boundaries.ts
│   ├── attach.ts / detach.ts / add-task.ts
│   ├── validate.ts / lock.ts / unlock.ts / get-context.ts
│
├── Align/                                ← E2 Work · Align 阶段
│   ├── index.ts
│   ├── run.ts / submit.ts / status.ts
│   ├── list-tasks.ts / task-status.ts
│   ├── edit-task.ts / delete-task.ts / finalize.ts
│   ├── read-artifact.ts / next-round.ts       ← v0.6 Round 新增
│
├── Proof/                                ← E2 Work · Proof 阶段
│   ├── index.ts
│   ├── create.ts / list.ts / describe.ts / list-probes.ts
│   ├── add-probe.ts / run.ts / dry-run.ts
│   ├── show.ts / verify.ts / outcome-writer.ts
│
├── Insight/                              ← E4 Insight 涌现层
│   ├── index.ts
│   ├── proof-insight.ts / work-insight.ts（v0.6 最弱形态）
│   ├── cross-proof.ts / pipeline.ts（v0.5 规划）
│   ├── audit-write.ts / audit-list.ts / audit-read.ts
│
└── Pool/                                 ← 辅助
    ├── index.ts
    ├── create.ts / list.ts / read.ts
    ├── review.ts / approve.ts / reject.ts / journal.ts
```

**DDD 模块化原则**（非 class-based）：
- 每个模块目录有 `index.ts` 统一入口
- 内部按用例文件拆分（`create.ts` / `list.ts` / ...）
- 纯函数式导出：`export async function create(input): Promise<output>`
- 无类、无状态、无 DI 容器

详见 [v0.6 Service 层设计稿](../../../.openxenon/.archived/docs/rfcs/v0.6-iap-refactor-rfc.md) §3 L2 Engine 物理位置。

## 4. Runtime 三模块（L0-L1 约束）

OXN Runtime = L0 Kernel + L1 OXL + L1 Infra：

| 模块 | 层级 | 职责 | 约束 |
|---|---|---|---|
| Kernel | L0 | 纯逻辑：IAP 状态机、探针调度、hash 校验、ProbeOutcome 判定 | 零 IO |
| OXL | L1 | OpenXenon Language DSL：.md 解析与序列化 | 不依赖 L2/L3 |
| Infra | L1 | 文件系统、进程、网络、探针执行 | 只回答事实，不判定 COMPLETED/DEVIATED |

> **纯洁性核法则**：Infra 不能绕过 L2 Engine 自我宣布完成 → L2 Engine 不能修改 L0 Kernel 规则 → L0 Kernel 不能直接执行 Task。

## 5. Config 软迁移

默认布局（v0.6 新项目）：

```
.openxenon/
├── config.json                   ← assetRoot + assetDirs
├── assets/domains/                ← E1 Asset 默认路径
├── assets/blueprints/
├── assets/stack/
├── works/<w>/
│   ├── work.md
│   ├── round-1/                  ← v0.6 Round 快照
│   ├── round-2/
│   └── .run/{state,trace,frozen}.json
├── proofs/<p>/
└── pools/
```

兼容旧项目（v0.5）：通过 config fallback 自动探测。

## 6. L3 Tools（工具入口层）

| 组件 | 物理位置 | 职责 |
|---|---|---|
| CLI | `packages/cli/src/commands/` + `packages/cli/src/index.ts` | 薄组合调用层：parse args → 调 L2 Engine → format output |
| Skills | `packages/cli/src/skills/` (含 8 个 locale .md) | AI 助手指令：/oxn-work 统一入口 |
| Daemon | `packages/engine/src/daemon.ts` | 守护进程：Engine 常驻模式，文件监听 + Work 追踪 |

## 7. 与 OpenSpec 架构对比

| 维度 | OpenSpec | OXN v0.6 |
|---|---|---|
| 哲学色底 | 还原论（spec → change → archive 线性拆解） | 还原论 + 整体论辩证统一（E4 Insight 涌现） |
| Asset/规范 角色 | 被 change 改写的目标 | 被 Work 引用的硬约束边界 |
| 验证主体 | AI 自查 + 人工 review | Engine 独立第三方公证 |
| 工作流形态 | 单次线性 propose → apply → archive | **多轮 IAP 循环**（Round × N） |
| 整体涌现 | 无 | E4 Insight 专门承接 |
| Inner Loop | 单次 verify | 多轮 Round：fail → 回到 Intent → 新一轮 Align |
| 明确设计目标 | 让 spec 与实现一致 | 让系统整体功能大于部分之和（1+1>2） |

## 8. Skill 入口架构

```
packages/cli/src/skills/            ← Skills 资源 (v0.6 阶段 6 迁入)
├── loader.ts                       locale 加载器 (.md with type:'text')
├── types.ts                        OpenXenonSkill / ReferenceFile
├── index.ts                        barrel
└── locales/                        4 个 i18n 文件（v0.6 Skill 极简：仅 oxn-work）
    ├── en/oxn-work/instruction.md
    ├── en/oxn-work/references/blueprint-format.md
    ├── zh-CN/oxn-work/instruction.md
    └── zh-CN/oxn-work/references/blueprint-format.md

L3 CLI → L2 Engine（DDD 模块化调用）
  // packages/cli/src/commands/*.ts 调 packages/engine/src/<Domain>/
  import { create } from '@openxenon/engine/Asset'
  import { run } from '@openxenon/engine/Align'
```

## 9. L0-L1 Runtime 不变量

OXN 在 L0 Kernel / L1 OXL / L1 Infra 之间划定**七项核心不变量**，确保 Engine 始终记录事实（不评判）+ Kernel 始终真空（无 IO）。

### 9.1 运行期隔离 + frozen 命名（ADR-0003）

**核心命题**：`frozen.json` 是运行期唯一合法产物。Engine 不得感知源格式（YAML / OXN / MD）。

```ts
// ✅ Engine / Kernel 调 frozen.json 时不关心源格式
const frozen = readFrozenImmutable(path)  // 完全不知道是不是从 .md 编出来的

// ❌ 禁止：Engine 内根据源格式走不同代码路径
if (sourceFormat === 'oxn') { ... } else if (sourceFormat === 'md') { ... }
```

源格式信息记录在 `_xenon_meta.source_format` 字段，运行期代码不做条件分支。

### 9.2 frozen 命名约束

- ✅ `frozen.json`（不带 `.yaml`/`.md` 后缀）
- ❌ `frozen.md.json` / `frozen.yaml.json`（暴露源格式）

### 9.3 ProbeObservation vs ProbeOutcome 二元公理（ADR-0008）

Kernel 内两类数据严格区分：

| 类型 | 含义 | 所在层 | 谁生成 |
|---|---|---|---|
| `ProbeObservation` | 物理事实（exitCode、stdout、stderr） | L1 Infra | Probe 执行器 |
| `ProbeOutcome` | 业务判定（COMPLETED / DEVIATED / INCONCLUSIVE） | L0 Kernel | Processor |

关键不变量：

- L1 Infra **只产出** ProbeObservation，**不判定**业务对错
- L0 Processor **只消费** ProbeObservation，**不调用** IO（fs / net / child_process）
- 跨层数据传递只能通过 Contract（`kernel/contracts/probe-port.ts`）

### 9.4 Trace-before-State 写入顺序（ADR-0009）

写 `state.json` 前必须先 append `trace.jsonl` 事件：

```ts
// ❌ 禁止
fs.writeFileSync(statePath, ...)

// ✅ 必须
fs.appendFileSync(tracePath, eventJsonl)
fs.writeFileSync(statePath, ...)
```

原因：state 是快照，trace 是历史。若 state 写成功但 trace 未写，崩溃后无法解释 state 来源。Trace 在前意味着：state 永远有迹可循。

### 9.5 Intent / Align / Observe 四关键字（ADR-0021）

OXL 关键字按 4 个语义轴分离（避免 `type` 重载歧义）：

| 关键字 | 含义 | 载体 | 谁写 |
|---|---|---|---|
| `kind` | Blueprint 类别（task/plan/explore） | Blueprint 顶层 | 工程师 |
| `intent` | Part 能力声明（"我提供什么"） | Part 块 | 工程师 |
| `align` | 能力实现（"我具体怎么做"） | Part 块 | AI / 工程师 |
| `observe` | Probe 维度（"我测什么"） | Probe 块 | 工程师 |

**反模式**：

- ❌ `type` 重载（既表 Blueprint 类别，又表 Part 能力）
- ❌ `role` / `port` 命名（语义不清）
- ❌ `Blueprint type task` 隐式（应显式 `kind "task"`）

### 9.6 PathPort 注入（ADR-0010）

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

原因：

- L0 不能假定运行环境是 Node 还是 Bun
- L0 不能硬编码绝对路径（如 `/tmp/`）
- L1 可注入 Path / Hash / Fs / Clock 等 Port，让 L0 跨 runtime 可移植

### 9.7 L1 contracts 不允许 Langium 类型泄露（ADR-0013）

`packages/engine/src/oxl/index.ts` **不导出 Langium 类型**：

```ts
export { createOxnCompiler, type OxnCompiler } from './compiler.js'
export type { OxnIR, OxnValidationResult } from './ir-types.js'
// ❌ 禁止 export { AstNode, ... } from 'langium'
```

实现要点：

- **接口**放 `packages/engine/src/oxl/contracts/`（L1 内部）
- **类实现**通过 `createOxnCompiler()` 工厂函数返回，**不 export 类本身**
- **Langium types** 仅在 `src/oxl/generated/` 内（被 build 排除）

---

## → 参考

- [Core Concepts](../../product/zh-cn/concepts/iap-paradigm.html) — E1-E4 + L0-L3 完整概念
- [Asset](../../product/zh-cn/concepts/asset.html) — E1 硬约束边界
- [Work](../../product/zh-cn/concepts/work.html) — E2 动态协作 + IAP + Round
- [Insight](../../product/zh-cn/concepts/insight.html) — E4 涌现层
- [v0.6 RFC](../../../.openxenon/.archived/docs/rfcs/v0.6-iap-refactor-rfc.md)
