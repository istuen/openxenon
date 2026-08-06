---
id: probe-system-evolution
theme: Probe 体系演进（追溯 + 内外拆 + 目标成果分类）
priority: medium
status: planned
created-at: 2026-07-28
scheduled-version: ~
synced-at: 2026-08-06
note: |
  从 dev/versions/probe-system-evolution（按 0-X-Y-<slug> 命名）回滚（去版本化）。
  scheduling 时由工程师判定版本号 + git mv 到 dev/versions/<slug>.md。
rfc:
  - dev/versions/0-8-0-term-upstream-dag.md
promoted-from: .openxenon/drafts/.archived/rfc/v0.8.1-probe-system-evolution-rfc.md
---

# Probe 体系演进（追溯 + 内外拆 + 目标成果分类）

> **状态**：📝 Draft（待 review）
> **目标版本**：~（scheduling 决定）
> **前置依赖**：v0.8.0（`@term/X` + `@upstream` DAG）
> **核心交付**：Probe 体系的三大演进——追溯机制 + 内外接口严格分离 + 目标成果类型分类
> **来源**：OpenXenon 协作生命周期 v0.8 设计讨论（2026-07-21）
> **合并历史**：本 RFC 由原 `v0.8.1-proof-traceability-rfc.md` + `v0.8.3-probe-internal-external`（待写）+ `v0.8.4-probe-outcome-type-rfc.md` 三份合并而来（2026-07-21）
> **原路径**：`.openxenon/drafts/rfc/v0.8.1-probe-system-evolution-rfc.md`（已归档）

---

## 0. 背景与动机

OpenXenon 把工程师 ↔ AI Agent 的协作抽象为 9 阶段生命周期（见 `docs/product/zh-cn/concepts/lifecycle.md`）。阶段 5「独立验证」由 OXN Engine 通过 Probe 记录执行事实并对照 Blueprint 的 observe 列表验证。

用户提出 3 个 Probe 体系的演进需求：

### 0.1 需求一：Proof 追溯机制（记录不阻断）

**当前问题**：AI Agent 在 Work lock 之后变更 Probe（ref 或 params），运行期**完全无感知**。具体断层：

| 维度 | 现状 | 问题 |
|---|---|---|
| Probe 申请历史 | **不存在** | 中间 submit 的 probe 结果丢失，只有 task 终态覆盖写 frozen.json |
| Probe 变更检测 | **不存在** | 无 prev/curr 对比逻辑 |
| submit 时 lock 校验 | **不校验** | `submitTaskWithProbes` 完全跳过 `verifyPlanLock` |
| Work 内 frozen.json 不可篡改 | **弱** | 仅原子写，无 `chmod 0o444` / 无 SHA-256 签名 |
| trace.jsonl 记录 probe | **不记录** | submit 事件只含 `iteration/completedParts/nextPart/status` |

**核心痛点**：工程师无法区分两种失败：
- **AI 推理方向问题**：AI 在合法范围内频繁变更 Probe（任务没想清楚就乱试）
- **边界问题**：Blueprint 的 observe 数组设计不当，AI 必须变更 Probe 才能完成任务

**需求**：记录不阻断——AI 变更 Probe 时不抛 IAPError，工程师事后通过追溯判断是 AI 问题还是边界问题。

### 0.2 需求二：Probe 内外接口严格分离

**当前问题**：catalog 层已基本分离（`catalog.ts:1-15` 注释明确标注 AI 可见/不可见字段），但有 4 处泄露：

| Gap | 位置 | 问题 |
|---|---|---|
| 1 | `work-context-builder.ts:138` | `taskParts[].probes.ref` 泄露 internalRef（`@oxn/probes/...`） |
| 2 | `runner.ts:118` + `proof.ts:962` | `oxn proof show --json` 把 raw observation + raw verdict 全塞进 output |
| 3 | `proof.ts:1012` | human 输出也直接渲染 `p.ref` |
| 4 | `src/builtin/probes/*.md` | 孤儿文档，无 runtime 加载，与 catalog 字段不一致（.md 用 `pattern`，catalog 用 `path`） |

**额外缺口**：catalog 只描述输入（`inputs[]`），**不描述输出**（无 `outputs[]` 字段）。AI 无法预知 Probe 返回什么。

### 0.3 需求三：Probe 按目标成果类型分类

**当前问题**：
- `domainTerm` 字段已存在（`catalog.ts:48-51`），是"目标成果类型"的雏形
- 但 5 个 5a builtin probes 留空（fs-exists / shell-exec 等最基础的）
- `domainTerm` 不暴露给 AI（`listProbesSummary` / `describeProbe` 都不返回）
- 没有"按目标成果类型反查 Probe"的 API
- Workflow 引用了 catalog 中不存在的"幽灵 probe"（fs-match / type-check / test-runner / heading-skeleton-check / docs-build）

**需求**：AI Agent 通过 Blueprint 拆解工程师指令后，分析目标是文件、脚本还是测试，然后选择合适的 Probe。Asset Probe 提供"能适用于什么目标成果"的声明。

---

## 1. 现状分析（事实陈述）

### 1.1 Probe 追溯断层

#### 1.1.1 Probe lock 机制

**PlanLock 4 组件 hash**（`packages/engine/src/Work/birth-cert.ts:74-86`）：

```ts
PlanLock = {
  lockedAt: string,
  workMdHash: string,        // sha256(works/<w>/work.md)
  blueprintsHash: string,    // sha256(works/<w>/blueprints.json)
  tasksHash: string,         // sha256(所有 tasks/<t>/task.md 组合)
  allHash: string            // 上面 3 个的组合 hash
}
```

**Probe 是 task.md 的子元素**（声明在 `## Probes` 段或 `- probe:` 行），所以 Probe 变化 → task.md 变化 → `tasksHash` 漂移。

#### 1.1.2 Probe 边界校验

**仅 lock 期 hard-check**（`packages/engine/src/Work/work-validator.ts:138-200`）：

```ts
const allowed = slot.observe ?? []
const allowedSet = new Set(allowed)
for (const pr of allProbes) {
  const probeName = extractProbeName(pr.name, pr.ref)
  if (!allowedSet.has(probeName)) {
    violations.push({ taskName, boundary, probeName, probeRef: pr.ref, allowedObserved: allowed })
  }
}
```

错误：`IAP_INTENT_PROBE_OUT_OF_BOUNDARY`（`kernel/contracts/iap-error.ts:70`）。

**submit 流程不调用 verifyPlanLock**（`dual-state-exec.ts:373` 注释："前面已 verifyPlanLock 过"——但实际 submit CLI 命令并未先校验）。

#### 1.1.3 Probe 执行记录

**`submitTaskWithProbes`**（`dual-state-exec.ts:352-419`）流程：

```ts
1. submitTask({runProbes: false})  // 写 state.json + 合成 state-machine probe result
2. collectTaskProbeDecls(taskFile)  // 从 task.md 收集真实 probe 声明
3. Promise.all(decls.map(executeProbe))  // 并发跑 probe
4. 若 base.frozen === true → 重写 task frozen.json 写入真实 probeResults
```

**关键漏洞**：
- 中间 submit 的 probe 结果**仅返回给调用方**，不持久化
- task 终态时**覆盖写** task frozen.json，前一次 submit 的 probeResults **完全丢失**

#### 1.1.4 frozen.json 不可篡改性（断层）

| 文件 | 写权 | OS 锁 | 内容签名 |
|---|---|---|---|
| `.openxenon/proofs/<name>/frozen.json` | `writeFrozenProof` | `chmod 0o444` | SHA-256 `content_hash` |
| `works/<w>/.run/tasks/<t>/frozen.json` | `writeFrozen`（`dual-state-exec.ts:480-490`） | ❌ 0o644 | ❌ 无 |
| `works/<w>/.run/frozen.json` | `writeFrozen` | ❌ 0o644 | ❌ 无 |

**只有 Proof-First 流程的 frozen.json 是强不可篡改**，Work 级全部弱不可篡改。

#### 1.1.5 已预留但未使用的字段

**`TaskPartExecutionSchema.probes`**（`packages/engine/src/Work/dual-state.ts:151`）：

```ts
probes: z.array(z.any()).default([])
```

schema 允许 per-part 存 probe 数组，但 `submitTask` 实际**从未写入此字段**（grep `exec.probes =` 无匹配）。

### 1.2 Probe 内外接口泄露

#### 1.2.1 catalog 字段分层（已分离）

**`ProbeCatalogEntry`**（`packages/engine/src/kernel/verdicts/catalog.ts:33-52`）：

```ts
export interface ProbeCatalogEntry {
  semanticName: string          // AI 可见
  description: string           // AI 可见
  inputs: ProbeInputDef[]       // AI 可见
  examples: ProbeExample[]      // AI 可见
  internalRef: string           // AI 不可见
  inputMap: Record<string, string>  // AI 不可见
  builtin: 'oxn'                // 内部归属
  domainTerm?: string           // 设计为 AI 可见，实际不暴露
}
```

**查询 API 的字段分层**（`catalog.ts:499-538`）：

| 函数 | 返回字段 | 受众 |
|---|---|---|
| `listProbesSummary()` | `{ name, description, requiredInputs }` | AI 入口 |
| `describeProbe(name)` | `{ name, description, inputs, examples }` | AI 入口 |
| `getCatalogEntry(name)` | 完整 `ProbeCatalogEntry`（含 internalRef + inputMap） | 内部用 |

#### 1.2.2 4 处泄露点

**Gap 1**：`taskParts[].probes.ref` 在 `oxn work context --json` 中泄露 internalRef

- 接口声明：`work-context-builder.ts:138` `probes: Array<{ name: string; ref: string }>` —— `ref` 字段就是 `@oxn/probes/...` 内部 ref
- AI 可见路径：`work.ts:2411-2418`（`data: context` 直接序列化为 JSON）

**Gap 2**：`oxn proof show --json` 把 raw observation + raw verdict 全部塞进 output 字段

- `runner.ts:118` `output: { observation, verdict }` —— 把 ProbeObservation + ProbeVerdict 原样塞进 frozen.json 的 `output` 字段
- `proof.ts:962` `data: { ...r.frozen, ... }` —— `--json` 直接展开 FrozenProof

**Gap 3**：`oxn proof show`（human）也泄露 internalRef

- `proof.ts:1012` `lines.push(\`  ${icon} ${p.probeName} (${p.ref}) — ${p.verdict}, ${p.durationMs}ms${err}${flags}\`)`

**Gap 4**：`src/builtin/probes/*.md` 与 catalog 信息双轨、字段不一致

- 15 个 .md 文件存在但**无 runtime 加载**
- .md 用 `pattern`，catalog 用 `path`；.md 描述是中文，catalog 描述是英文
- .md 有 `## Output` 段，catalog 无 Output schema 字段

#### 1.2.3 Output schema 未暴露

**catalog 只描述输入（`inputs[]`），不描述输出**（无 `outputs[]` 字段）。

`describeProbe` 返回 `{ name, description, inputs, examples }`（`catalog.ts:513-527`），**无 `outputs` 字段**。

### 1.3 Probe 分类缺失

#### 1.3.1 domainTerm 字段现状

**位置**：`packages/engine/src/kernel/verdicts/catalog.ts:48-51`

```ts
/** v1.1: 关联的 ProgramContext term 名（如 'SourceFile' / 'TestCase')。
 *  AI 可见——帮助 AI 理解 probe 服务的编程概念。
 *  5a builtin probes 留空（无对应 P1 term）；5b P1 probes 必填。 */
domainTerm?: string
```

**10/15 Probe 有 domainTerm**：

| Probe | domainTerm | catalog 行号 |
|---|---|---|
| test-pass | TestCase | catalog.ts:203 |
| deps-resolved | Package | catalog.ts:232 |
| ts-compiles | SourceFile | catalog.ts:267 |
| lint-check | SourceFile | catalog.ts:302 |
| http-responds | APIEndpoint | catalog.ts:365 |
| file-exports | Module | catalog.ts:389 |
| git-clean | WorkingTree | catalog.ts:417 |
| git-branch-exists | Branch | catalog.ts:438 |
| git-status-clean | WorkingTree | catalog.ts:456 |
| git-merge-feasible | MergeCommit | catalog.ts:491 |

**5 个 5a probe 留空**：fs-exists / fs-not-exists / fs-content-match / fs-parseable / shell-exec

#### 1.3.2 domainTerm 不暴露给 AI

| API | 返回 domainTerm？ | 位置 |
|---|---|---|
| `listProbesSummary()` | ❌ | catalog.ts:500-510 |
| `describeProbe(name)` | ❌ | catalog.ts:513-527 |
| `oxn proof probe list` | ❌ | proof.ts:413-439 |
| `oxn proof probe describe` | ❌ | proof.ts:445-474 |

**注释说"AI 可见"但实际不暴露**——这是 v1.1 的实现遗漏。

#### 1.3.3 scheme 字段（正交维度）

**位置**：`src/builtin/probes/*.md` 的 `## Scheme` 段（不在 catalog.ts）

| scheme | Probe 数量 | 含义 |
|---|---|---|
| `file://` | 9 | IO Provider 类型：文件系统 |
| `shell://` | 1 | IO Provider 类型：shell 命令 |
| `http://` | 1 | IO Provider 类型：HTTP 请求 |
| `git://` | 4 | IO Provider 类型：Git 操作 |

**scheme 与"目标成果类型"是正交维度**：`file://` 既覆盖"文件存在"（fs-exists）也覆盖"测试通过"（test-pass），目标成果类型完全不同。

#### 1.3.4 "幽灵 probe"问题

Workflow / Blueprint 引用了 catalog 中不存在的 probe 名：

| 幽灵名 | 实际应为 | 出现位置 |
|---|---|---|
| `fs-match` | `fs-content-match` | refactor-safe.md:33 / ts-retrieve-design-develop-test.md:18 |
| `type-check` | `ts-compiles` | ts-retrieve-design-develop-test.md:31 |
| `test-runner` | `test-pass` | ts-retrieve-design-develop-test.md:36 |
| `heading-skeleton-check` | 不存在（需新增或移除） | doc-author.md:51 / doc-promote.md:54 |
| `docs-build` | 不存在（需新增或移除） | doc-publish.md:30 / doc-author.md:75 |

---

## 2. 三大改造方向

| 方向 | 核心目标 | 处理策略 |
|---|---|---|
| **2.1 追溯机制** | Probe 变更可追溯 | 记录不阻断（AI 变更 Probe 时记录追溯日志，不抛 IAPError） |
| **2.2 内外接口严格分离** | 修复 4 处泄露 + 暴露 Output schema | 隐藏 internalRef + frozen.json 精简视图 + catalog 加 outputs 字段 |
| **2.3 目标成果类型分类** | AI 能按类型选 Probe | 补齐 5a TargetType + 新增 OutcomeCategory + 按类型反查 API |

---

## 3. 15 个 Probe 的完整映射表

### 3.1 两个正交维度

| 维度 | 含义 | 现有字段 | 示例 |
|---|---|---|---|
| **TargetType**（对象类型） | Probe 检测什么类型的对象 | `domainTerm`（部分留空） | File / SourceFile / TestCase / Module |
| **OutcomeCategory**（操作类型） | Probe 验证什么操作成果 | 无 | Existence / Content / Execution / Pass |

**TargetType 回答"检测什么"**，**OutcomeCategory 回答"验证什么"**。

### 3.2 TargetType 枚举（11 个）

| TargetType | 含义 | 当前 domainTerm | 5a 补齐 |
|---|---|---|---|
| File | 通用文件 | ❌ 留空 | fs-exists / fs-not-exists / fs-content-match |
| ConfigFile | 配置文件（JSON 等） | ❌ 留空 | fs-parseable |
| Script | 脚本 / 命令 | ❌ 留空 | shell-exec |
| TestCase | 测试用例 | ✅ | — |
| Package | 依赖包 | ✅ | — |
| SourceFile | 源码文件 | ✅ | — |
| APIEndpoint | HTTP 端点 | ✅ | — |
| Module | 模块 | ✅ | — |
| WorkingTree | Git 工作树 | ✅ | — |
| Branch | Git 分支 | ✅ | — |
| MergeCommit | Git 合并提交 | ✅ | — |

### 3.3 OutcomeCategory 枚举（12 个）

| OutcomeCategory | 含义 | 对应 Probe |
|---|---|---|
| Existence | 存在性验证 | fs-exists / git-branch-exists |
| NonExistence | 不存在性验证 | fs-not-exists |
| Content | 内容匹配 | fs-content-match |
| Structure | 结构可解析 | fs-parseable |
| Execution | 执行成功 | shell-exec |
| Pass | 测试通过 | test-pass |
| Resolution | 依赖解析 | deps-resolved |
| Compilation | 类型编译 | ts-compiles |
| Style | 代码风格 | lint-check |
| Response | HTTP 响应 | http-responds |
| Export | 模块导出 | file-exports |
| State | 状态干净 | git-clean / git-status-clean |
| Merge | 合并可行 | git-merge-feasible |

### 3.4 15 个 Probe 完整映射

| # | semanticName | TargetType | OutcomeCategory | scheme | 5a? |
|---|---|---|---|---|---|
| 1 | fs-exists | File | Existence | file:// | ✅ 5a |
| 2 | fs-not-exists | File | NonExistence | file:// | ✅ 5a |
| 3 | fs-content-match | File | Content | file:// | ✅ 5a |
| 4 | fs-parseable | ConfigFile | Structure | file:// | ✅ 5a |
| 5 | shell-exec | Script | Execution | shell:// | ✅ 5a |
| 6 | test-pass | TestCase | Pass | file:// | — |
| 7 | deps-resolved | Package | Resolution | file:// | — |
| 8 | ts-compiles | SourceFile | Compilation | file:// | — |
| 9 | lint-check | SourceFile | Style | file:// | — |
| 10 | http-responds | APIEndpoint | Response | http:// | — |
| 11 | file-exports | Module | Export | file:// | — |
| 12 | git-clean | WorkingTree | State | git:// | — |
| 13 | git-branch-exists | Branch | Existence | git:// | — |
| 14 | git-status-clean | WorkingTree | State | git:// | — |
| 15 | git-merge-feasible | MergeCommit | Merge | git:// | — |

**一对多关系**：
- `WorkingTree` → git-clean + git-status-clean（2 个 Probe 服务同一 TargetType）
- `SourceFile` → ts-compiles + lint-check（2 个 Probe 服务同一 TargetType）
- `Existence` → fs-exists + git-branch-exists（2 个 Probe 服务同一 OutcomeCategory）

---

## 4. 改造方案

### 4.1 激活 `partExecutions[].probes` 字段（追溯基础）

**目标**：每次 submit 把 probe 申请快照持久化到对应的 part execution。

**改动**（`dual-state-exec.ts` submitTask()）：

```ts
exec.probes = exec.probes.concat([{
  submittedAt: new Date().toISOString(),
  iteration: iteration,
  declared: decls.map(d => ({ name: d.name, ref: d.ref, params: d.params })),
  results: probeResults.map(r => ({ probeName: r.probeName, verdict: r.verdict, passed: r.passed })),
}])
```

**Schema 升级**（`dual-state.ts:144-161`）：

```ts
const ProbeApplicationSchema = z.object({
  submittedAt: z.string(),
  iteration: z.number().int(),
  declared: z.array(z.object({
    name: z.string(),
    ref: z.string(),
    params: z.record(z.unknown()).optional(),
  })),
  results: z.array(z.object({
    probeName: z.string(),
    verdict: z.enum(['PASSED', 'FAILED', 'INCONCLUSIVE']),
    passed: z.boolean(),
    durationMs: z.number().int(),
  })),
})

export const TaskPartExecutionSchema = z.object({
  // ... 现有字段
  probes: z.array(ProbeApplicationSchema).default([]),
})
```

### 4.2 trace.jsonl 加 probe 事件

**新增事件**：

```ts
{ event: 'probe-applied', workName, taskName, partName, iteration, submittedAt,
  declared: [...], results: [...], prevDeclared: [...] }

{ event: 'probe-changed', workName, taskName, partName, iteration, submittedAt,
  diff: { added: [...], removed: [...], modified: [...] } }
```

**事件写入点**：
- `probe-applied`：每次 `submitTaskWithProbes` 跑完 probe 后
- `probe-changed`：与上一次 probe application 对比，有 diff 才发

### 4.3 Probe 变更对比逻辑

**新增 utility**（`packages/engine/src/Work/probe-diff.ts`）：

```ts
export interface ProbeDiff {
  added: Array<{ name: string; ref: string; params?: Record<string, unknown> }>
  removed: Array<{ name: string; ref: string; params?: Record<string, unknown> }>
  modified: Array<{
    name: string
    prevRef: string
    currRef: string
    prevParams?: Record<string, unknown>
    currParams?: Record<string, unknown>
  }>
}

export function diffProbeApplications(
  prev: ProbeApplication[] | undefined,
  curr: ProbeApplication[],
): ProbeDiff { ... }
```

**判定规则**：
- AI 在 `observe` 范围内**频繁变更 Probe**（同一 task 中 probe 不同次数 ≥ 3）→ AI 推理方向问题
- AI 在 `observe` 范围内但**单一 Probe 每次都改 params** → AI 推理方向问题
- observe 范围**过窄**（AI 每次都需新 Probe）→ 边界问题（Blueprint 设计）

### 4.4 Work frozen.json 不可篡改升级

**改动**（`packages/engine/src/Work/dual-state-exec.ts:480-490`）：

```ts
// 升级为
import { writeFrozenImmutable, readFrozenImmutable } from '@openxenon/engine/infra/frozen'

function writeFrozen(path: string, snapshot: unknown): void {
  writeFrozenImmutable(path, snapshot, {
    metaBuilder: (body, hash) => ({ frozen_at: new Date().toISOString(), content_hash: hash }),
  })
}
```

**兼容性**：
- 读取时优先用 `readFrozenImmutable`，若 `_xenon_meta.content_hash` 缺失则 fallback 旧 reader
- 旧 frozen.json 文件可读（schema 向后兼容）

### 4.5 修复 4 处内外接口泄露

**Gap 1 修复**（`work-context-builder.ts:138`）：

```ts
// 当前（泄露 internalRef）
probes: Array<{ name: string; ref: string }>

// 修复（隐藏 ref，只暴露 semanticName）
probes: Array<{ name: string }>  // ref 字段从 AI 可见层移除
```

**Gap 2 修复**（`runner.ts:118` + `proof.ts:962`）：

```ts
// 当前（raw observation + raw verdict 全塞进 output）
output: { observation, verdict }

// 修复（精简视图，只暴露语义化字段）
output: {
  summary: verdict.message,
  actual: verdict.actual,  // 仅保留实际观测值摘要
}
```

**Gap 3 修复**（`proof.ts:1012`）：

```ts
// 当前（human 输出渲染 p.ref）
lines.push(`  ${icon} ${p.probeName} (${p.ref}) — ${p.verdict}, ${p.durationMs}ms${err}${flags}`)

// 修复（移除 ref 渲染）
lines.push(`  ${icon} ${p.probeName} — ${p.verdict}, ${p.durationMs}ms${err}${flags}`)
```

**Gap 4 修复**（`src/builtin/probes/*.md`）：

- 把 .md 文件的字段与 catalog.ts 对齐（统一用 `path`，统一英文描述）
- 或：删除 .md 文件，catalog.ts 成为唯一 SSOT

### 4.6 catalog 新增 Output schema 字段

**改动**（`catalog.ts:33-52`）：

```ts
export interface ProbeOutputField {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description: string
}

export interface ProbeCatalogEntry {
  // ... 现有字段
  outputs?: ProbeOutputField[]  // ← 新字段（暴露给 AI）
}
```

**`describeProbe()` 返回值新增 `outputs`**：

```ts
export function describeProbe(name: string): {
  name: string
  description: string
  inputs: ProbeInputDef[]
  examples: ProbeExample[]
  outputs?: ProbeOutputField[]  // ← 新增
} | null { ... }
```

### 4.7 补齐 5a TargetType + 新增 OutcomeCategory

**改动**（`catalog.ts:33-52`）：

```ts
export interface ProbeCatalogEntry {
  semanticName: string
  description: string
  inputs: ProbeInputDef[]
  examples: ProbeExample[]
  internalRef: string
  inputMap: Record<string, string>
  builtin: 'oxn'
  domainTerm?: string           // 保留（向后兼容）
  targetType?: TargetType       // ← 新字段（domainTerm 的超集）
  outcomeCategory: OutcomeCategory  // ← 新字段（必填）
  outputs?: ProbeOutputField[]  // ← 新字段（4.6）
}

export type TargetType =
  | 'File' | 'ConfigFile' | 'Script' | 'TestCase' | 'Package'
  | 'SourceFile' | 'APIEndpoint' | 'Module'
  | 'WorkingTree' | 'Branch' | 'MergeCommit'

export type OutcomeCategory =
  | 'Existence' | 'NonExistence' | 'Content' | 'Structure'
  | 'Execution' | 'Pass' | 'Resolution' | 'Compilation'
  | 'Style' | 'Response' | 'Export' | 'State' | 'Merge'
```

**5a probe 补齐映射**：
- fs-exists → TargetType: File, OutcomeCategory: Existence
- fs-not-exists → TargetType: File, OutcomeCategory: NonExistence
- fs-content-match → TargetType: File, OutcomeCategory: Content
- fs-parseable → TargetType: ConfigFile, OutcomeCategory: Structure
- shell-exec → TargetType: Script, OutcomeCategory: Execution

**domainTerm vs targetType**：
- `domainTerm` 保留（向后兼容，v1.1 引入）
- `targetType` 是新字段，与 domainTerm 同值（5a 补齐后全覆盖）
- 未来 v0.9 可废弃 domainTerm，统一用 targetType

### 4.8 AI 可见层扩展 + 按类型反查 API

**改动**（`catalog.ts:500-527`）：

```ts
export function listProbesSummary(): Array<{
  name: string
  description: string
  requiredInputs: string[]
  targetType?: TargetType       // ← 新增
  outcomeCategory: OutcomeCategory  // ← 新增
}> {
  return PROBE_CATALOG.map((p) => ({
    name: p.semanticName,
    description: p.description,
    requiredInputs: p.inputs.filter((i) => i.required).map((i) => i.name),
    targetType: p.targetType ?? p.domainTerm,
    outcomeCategory: p.outcomeCategory,
  }))
}

export function describeProbe(name: string): {
  name: string
  description: string
  inputs: ProbeInputDef[]
  examples: ProbeExample[]
  outputs?: ProbeOutputField[]  // ← 新增
  targetType?: TargetType       // ← 新增
  outcomeCategory: OutcomeCategory  // ← 新增
} | null { ... }

// 新增反查 API
export function listProbesByTargetType(targetType: TargetType): ProbeCatalogEntry[] {
  return PROBE_CATALOG.filter((p) => (p.targetType ?? p.domainTerm) === targetType)
}

export function listProbesByOutcomeCategory(category: OutcomeCategory): ProbeCatalogEntry[] {
  return PROBE_CATALOG.filter((p) => p.outcomeCategory === category)
}
```

**新增 CLI 命令**：

```bash
# 按 TargetType 反查
oxn proof probe list --target-type File
oxn proof probe list --target-type SourceFile

# 按 OutcomeCategory 反查
oxn proof probe list --outcome-category Existence
oxn proof probe list --outcome-category Pass

# 组合查询
oxn proof probe list --target-type WorkingTree --outcome-category State
```

### 4.9 修复"幽灵 probe"引用

| 幽灵名 | 修复方式 | 涉及文件 |
|---|---|---|
| `fs-match` | 改为 `fs-content-match` | refactor-safe.md:33 / ts-retrieve-design-develop-test.md:18 / migrate-version.md:32 |
| `type-check` | 改为 `ts-compiles` | ts-retrieve-design-develop-test.md:31 |
| `test-runner` | 改为 `test-pass` | ts-retrieve-design-develop-test.md:36 |
| `heading-skeleton-check` | 新增 builtin probe 或从 workflow 移除 | doc-author.md:51 / doc-promote.md:54 / doc-dev-workflow.md:62 |
| `docs-build` | 新增 builtin probe 或从 workflow 移除 | doc-publish.md:30 / doc-author.md:75 / doc-dev-workflow.md:82 |

**决策点**：`heading-skeleton-check` 和 `docs-build` 是文档类 Probe，当前 catalog 没有。选项：
- A：新增为第 16/17 个 builtin probe（TargetType: DocFile, OutcomeCategory: Structure/Build）
- B：从 workflow observe 中移除，用 `fs-exists` + `shell-exec` 替代

### 4.10 builtin/probes/*.md 补段

每个 .md 文件新增两个段：

```md
## TargetType
- type: File

## OutcomeCategory
- category: Existence
```

---

## 5. traceability-report.md 产出

**目标**：finalize 时产出 `works/<w>/traceability-report.md`，工程师可读。

**结构**：

```md
# Traceability Report — workName

## 总览

- 总 submit 次数：N
- Probe 变更次数：M
- 归因：AI 推理方向问题 N1 次 / 边界问题 N2 次

## Probe 应用历史（按 part）

### part-1 (3 次 submit, 2 次 probe 变更)
| submit # | probe 列表 | 变更类型 |
|---|---|---|
| 1 | [shell-exec(@cmd1)] | baseline |
| 2 | [shell-exec(@cmd2)] | 改 params |
| 3 | [shell-exec(@cmd3)] | 改 params |

**AI 推理方向问题**：2 次连续改 params

### part-2 (1 次 submit, 0 次 probe 变更)
| submit # | probe 列表 | 变更类型 |
|---|---|---|
| 1 | [test-pass, lint-check] | baseline |

## 建议

- part-1 建议调整 Blueprint 的 skill_context（AI 不知道 cmd 应是什么）
- ...
```

**产出点**：
- `finalizeWork`（`dual-state-exec.ts:746`）末尾

---

## 6. 兼容性

| 兼容性项 | 影响 | 缓解 |
|---|---|---|
| 旧 Work 的 frozen.json | `readFrozenImmutable` 处理无 `_xenon_meta` 情况 | fallback 逻辑 |
| 旧 TaskPartExecutionSchema.state.json | probes 字段从 [] 升级为 ProbeApplication[] | schema 迁移，旧值不变 |
| planLock 机制 | 不变 | 无影响 |
| Proof-First 流程的 frozen.json | 不变（已强不可篡改） | 无影响 |
| inv-22 / inv-25 | 不变（仍 lock 期 hard-check） | 无影响 |
| ADR-0031 (Notary-not-Judge) | 强化 — 现在记录 AI 行为 | 与 ADR-0031 一致（记录不评判） |
| `domainTerm` 字段 | 保留（向后兼容） | targetType 优先，fallback domainTerm |
| `listProbesSummary()` 返回值 | 新增 2 字段 | 旧 consumer 忽略新字段 |
| `describeProbe()` 返回值 | 新增 3-4 字段 | 旧 consumer 忽略新字段 |
| catalog.ts schema | 新增 targetType + outcomeCategory + outputs | 5a probe 补齐后全覆盖 |
| builtin .md 文件 | 新增 2 段 | 不影响 runtime（catalog.ts 是 SSOT） |
| Workflow observe | 修复幽灵 probe | 需同步改 5 个 workflow 文件 |

**破坏性变更**：无
- 新增字段有默认值（旧 state.json 读出来 probes = []）
- trace.jsonl 新事件不影响旧 reader
- frozen.json 写入路径升级不影响读取
- catalog 新增字段不影响旧 consumer

---

## 7. 里程碑

| Milestone | 交付 | 工时（估） |
|---|---|---|
| **M1** | 激活 `partExecutions[].probes` 字段 + schema 迁移 | 2 天 |
| **M2** | trace.jsonl 加 probe-applied + probe-changed 事件 | 1 天 |
| **M3** | probe-diff utility + traceability-report.md 产出 | 2 天 |
| **M4** | Work frozen.json 不可篡改升级 + 读取兼容 | 1 天 |
| **M5** | 修复 4 处内外接口泄露 + catalog 加 outputs 字段 | 2 天 |
| **M6** | catalog 补齐 5a TargetType + 新增 OutcomeCategory 字段 | 1 天 |
| **M7** | AI 可见层扩展 + 按类型反查 API + CLI 命令 | 1 天 |
| **M8** | 修复"幽灵 probe"引用（5 个 workflow 文件） | 1 天 |
| **M9** | builtin .md 补 TargetType + OutcomeCategory 段 | 0.5 天 |
| **M10** | heading-skeleton-check / docs-build 决策与实现 | 1-2 天 |
| **M11** | 测试 + 文档 + ADR | 2 天 |

**总计**：约 15-16 工日

---

## 8. 待 review 关键决策

| # | 决策点 | 当前默认 |
|---|---|---|
| D1 | schema 字段名 `probes` 还是 `probeApplications`？ | `probes`（向后兼容简短） |
| D2 | probe-changed 是单事件还是合并进 probe-applied？ | 单事件（让 reader 易过滤） |
| D3 | traceability-report.md 格式是 markdown 还是 JSON？ | markdown（工程师可读） |
| D4 | 归因阈值：连续几次变更算"AI 推理方向问题"？ | ≥ 2 次 |
| D5 | frozen.json 升级是否破坏旧 schema？ | 不破坏（fallback 旧 reader） |
| D6 | `domainTerm` 保留还是废弃？ | 保留（向后兼容），targetType 优先 |
| D7 | OutcomeCategory 枚举数量（12 个）是否合理？ | 12 个（可合并 NonExistence 到 Existence） |
| D8 | `heading-skeleton-check` / `docs-build` 新增 probe 还是移除？ | 新增（TargetType: DocFile） |
| D9 | Blueprint observe 是否加"目标成果类型组合"标注？ | 可选（M9 后评估） |
| D10 | CLI 命令是 `oxn proof probe list --target-type X` 还是新命令？ | 复用 list + flag |
| D11 | `src/builtin/probes/*.md` 与 catalog.ts 字段对齐还是删除 .md？ | 对齐（保留 .md 作为人类可读副本） |

---

## 9. 参考

### 9.1 Probe 追溯相关

- `docs/product/zh-cn/concepts/lifecycle.md` — 9 阶段协作生命周期（v0.8 定位）
- `packages/engine/src/Work/dual-state-exec.ts:352-419` — `submitTaskWithProbes` 当前实现
- `packages/engine/src/Work/dual-state.ts:144-161` — `TaskPartExecutionSchema` 当前定义
- `packages/engine/src/Work/birth-cert.ts:74-86` — `PlanLockSchema` 当前定义
- `packages/engine/src/Work/work-validator.ts:138-200` — inv-22 / inv-25 hard-check
- `packages/engine/src/infra/frozen/immutable.ts:40-74` — 强不可篡改实现（Proof-First 用）
- ADR-0031 — Proof Notary-not-Judge 原则

### 9.2 Probe 内外接口相关

- `packages/engine/src/kernel/contracts/probe-port.ts` — ProbeObservation / ProbeVerdict / ProbeHandler 契约
- `packages/engine/src/kernel/verdicts/catalog.ts:33-52` — ProbeCatalogEntry 当前定义
- `packages/engine/src/kernel/verdicts/catalog.ts:500-527` — listProbesSummary / describeProbe
- `packages/engine/src/Work/work-context-builder.ts:138` — taskParts[].probes 接口
- `packages/engine/src/Proof/runner.ts:113-121` — executeProbe 主链路
- `packages/cli/src/commands/proof.ts:962, 1012` — `oxn proof show` CLI

### 9.3 Probe 目标成果类型相关

- `packages/engine/src/kernel/verdicts/catalog.ts:48-51` — domainTerm 字段注释
- `packages/engine/src/kernel/verdicts/catalog.ts:58-493` — PROBE_CATALOG 15 条
- `src/builtin/probes/*.md` — 15 个 builtin probe .md 文件
- `.openxenon/assets/workflows/*.md` — Workflow observe 数组实例

### 9.4 合并历史

- 原 `v0.8.1-proof-traceability-rfc.md`（已归档，2026-07-21）
- 原 `v0.8.4-probe-outcome-type-rfc.md`（已归档，2026-07-21）
- 原 `v0.8.3-probe-internal-external`（未写过，2026-07-21 合并到本 RFC）

---

## 10. 变更日志

- 2026-07-21：初稿。由原 v0.8.1（追溯）+ v0.8.3（内外拆）+ v0.8.4（目标成果分类）三份 RFC 合并而来。
