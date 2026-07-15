# Proof 信任链闭环方案（无 Round 版·简化架构）

> **状态**：Draft（探索稿 · Pool）
> **日期**：2026-07-15
> **触发**：Proof 信任链闭环设计讨论——先把"无 Round 的信任链闭环"做出来，让 Main AI Agent 能自己跑完整 Work + 交付 Verdict
> **简化原则**：去掉 IAP 子模块理念——Engine 本身就是 IAP 的体现（Asset = Intent, Work = Align, Proof/Engine = Proof）；Work 保持扁平 5 步生命周期
> **定位**：产品层设计 + 实施方案（面向产品 / 架构 / 实现三个层面）
> **落点**：本稿为 Pool 探索稿；定稿后走 `oxn work create proof-trust-chain --blueprint dev-workflow` 实施
> **前置**：PR-1 ~ PR-3.3 已落地（Blueprint 结构重组完成）

---

## 一、简化的 Engine IAP 体现

去掉 IAP 子模块的认知负担。Engine 本身就是 IAP 的体现：

```
Engine（packages/engine/）= IAP 的体现
├── Asset/        ← Intent 的载体（Domain / Workflow / Stack 业务定义）
├── Work/         ← Align 的载体（create-lock-run-submit-finalize，扁平 5 步）
├── Proof/        ← Proof 的载体（Engine 通用信任服务）
│                 ↑ 供 Work finalize 和独立 Proof 轴的 oxn proof run 共用
├── Insight/      ← 涌现分析
├── Pool/         ← Intent Pool
└── Roadmap/      ← 导航

CLI（packages/cli/）= L3 入口
├── 独立 Proof 轴的 CLI 入口（oxn proof run）专属于 CLI 模块
└── 复用 Engine 的 Proof/ 通用服务
```

**Work 保持扁平 5 步生命周期**（不分 IAP 子模块）：

```
Work 生命周期：
  create → lock → run → submit → finalize
```

| 步骤 | 谁做 | Engine 提供什么 |
|---|---|---|
| create | Work | Blueprint → Task 编排（调 Asset 解析） |
| lock | Work | planLock（算 hash + 锁定） |
| run | Work | 状态机初始化（无 Engine 调用） |
| submit | Work | Probe 执行（调 `trust/probe-runner`）+ 写 Task 证据 |
| finalize | Work | Evidence 收集 + Verdict 生成（调 Proof/ 服务） |

**Proof/ 模块定位**：不是"独立 Proof 轴的模块"，而是 **Engine 通用信任服务**。被 Work finalize 和独立 Proof 轴 `oxn proof run` 共用。

---

## 二、Proof 的两个职责

Proof 不是单一的"跑 Probe 验证成果"——它包含两个职责：

### 职责 A：验证成果（在 Align 阶段每个 Task 的 submit 时执行）

```
AI Agent 产出文件（Task 的成果）
  ├─ 在 task.md 声明 Probe（## Probes 段：选 Probe + 设参数）
  ├─ oxn work submit --task <t> --run-probes
  │     ↓
  Engine 跑 Probe（executeProbe）
  │   ├─ Infra.execute(params) → observation（客观事实）
  │   └─ Kernel.judge(observation, params) → verdict（PASS/FAIL/INCONCLUSIVE）
  ├─ 结果写入 .run/tasks/<t>/frozen.json（Task 级证据）
  └─ 结果写入 .run/tasks/<t>/trace.jsonl（Task 级事件流）
```

### 职责 B：收集信任链并给出证明（在 finalize 时执行）

```
Evidence Collector 从各处收集信任链节点
  ├─ 节点 1（Intent）：work.md 的 goal + blueprint + constraints
  ├─ 节点 2（Intent→Align）：.work 的 planLock（hash 锁定）
  ├─ 节点 3（Align）：每个 Task 的 frozen.json（Probe 结果）+ trace.jsonl（事件流）
  ├─ 节点 4（Align→Proof）：state.json 的 tasks[] 状态 + Domain invariant 评估
  └─ 节点 5（Proof）：汇总成 frozen.json + verdict.md
写 .run/frozen.json（机器 SSOT，不可篡改）
写 .run/verdict.md（人类可读，不可篡改）
```

---

## 三、5 个信任节点

### 节点定义

| 节点 | 阶段 | 信任什么 | 证据来源 | 证据格式 | 当前状态 |
|---|---|---|---|---|---|
| **1** | Intent | 工程师定义了边界和意图 | `work.md`（goal + constraints + ## Use + ## Tasks） | markdown | ✅ 已实现 |
| **2** | Intent→Align 衔接 | lock 后边界不可变 | `.work`（planLock: workMdHash + blueprintsHash + tasksHash + allHash） | JSON | ✅ 已实现 |
| **3** | Align | Engine 记录每次 submit 的事实 | `.run/tasks/<t>/frozen.json`（Probe 结果）+ `.run/trace.jsonl`（事件流） | JSON + NDJSON | ⚠️ frozen.json 无防篡改 |
| **4** | Align→Proof 衔接 | Work 执行状态 + 边界违反 | `.run/state.json`（tasks[] 状态）+ Domain invariant 评估 | JSON | ✅ state.json 已实现；⚠️ Domain 评估从 Work `## Use` 提 domain 落空 |
| **5** | Proof | 证据不可篡改 + 人类可读 | `.run/frozen.json`（机器 SSOT）+ `.run/verdict.md`（人类视图） | JSON + markdown | ❌ frozen.json 无防篡改；❌ verdict.md 不存在 |

### 信任链流转图

```
节点 1              节点 2              节点 3              节点 4              节点 5
Intent              衔接                Align               衔接                Proof
─────               ─────               ─────               ─────               ─────
create              lock                run + submit        finalize            Verdict
定义边界            锁定不可变          执行 + 验证         收集信任链          出证明
+ 编排 Task

信任：              信任：              信任：              信任：              信任：
工程师定义          planLock            Engine 每次         收集所有            Verdict
边界和意图          保证不可变          submit 记录         信任链节点          汇总证明
                    (hash 锁定)         的事实             拼成完整证据

证据：              证据：              证据：              证据：              证据：
work.md             .work               .run/tasks/*/      state.json +        frozen.json
                                        frozen.json +       Domain 评估         verdict.md
                                        trace.jsonl                             (不可篡改)
```

---

## 四、目录结构（无 Round）

```
works/<work-id>/
├── work.md                         ← 节点 1：Intent 图纸
├── tasks/                          ← 节点 1：Task 编排
│   └── <task>/task.md
├── .work                           ← 节点 2：planLock
├── blueprints.json                 ← 节点 2：per-work Blueprint slim 索引
└── .run/                           ← Work 运行时（跨阶段）
    ├── state.json                  ← 节点 4：Work 状态
    ├── trace.jsonl                 ← 节点 3：全量事件流（append-only）
    ├── frozen.json                 ← 节点 5：Work 终态证据（不可篡改）🆕 改为 writeFrozenImmutable
    ├── verdict.md                  ← 节点 5：人类可读 Verdict（不可篡改）🆕 新增
    └── tasks/
        └── <task>/
            ├── state.json          ← 节点 3：Task 状态
            ├── trace.jsonl         ← 节点 3：Task 事件流
            └── frozen.json         ← 节点 3：Task Probe 结果（不可篡改）🆕 改为 writeFrozenImmutable
```

**设计说明**：
- `.run/` 是 Work 的活跃运行空间，跨阶段持续追踪（state.json 持续更新、trace.jsonl append-only 累积）
- `frozen.json` 和 `verdict.md` 在 finalize 时写入，不可篡改（chmod 0o444 + SHA-256 content_hash）
- Task 级 `frozen.json` 在 Task 所有 part 完成时写入，同样不可篡改

---

## 五、Evidence Collector 设计

### 数据结构

```typescript
// Proof/evidence-collector.ts（新增）

/**
 * 信任链证据——从 5 个节点收集
 */
interface WorkEvidence {
  // ─── 节点 1：Intent ───
  work: {
    name: string
    goal: string
    constraints: string[]
    blueprint: string          // ## Use 段的 blueprint ref
    tasks: Array<{
      taskName: string
      boundary: string         // 对应的 Blueprint Boundary
    }>
  }

  // ─── 节点 2：Intent→Align 衔接 ───
  planLock: {
    lockedAt: string
    workMdHash: string
    blueprintsHash: string
    tasksHash: string
    allHash: string
  }

  // ─── 节点 3：Align ───
  taskEvidence: Array<{
    taskName: string
    status: 'passed' | 'failed' | 'error'
    completedAt: string | null
    probes: Array<{
      probeName: string
      ref: string              // 如 @oxn/probes/fs-exists
      verdict: 'PASSED' | 'FAILED' | 'INCONCLUSIVE'
      passed: boolean
      errorMessage?: string
      durationMs: number
      // 产物信息从 Probe params 提取
      artifact?: string        // 如 docs/zh-cn/api-reference.md
      verification?: string    // 如 "文件存在" / "包含 ## API 参考"
    }>
  }>

  // ─── 节点 4：Align→Proof 衔接 ───
  workState: {
    status: 'passed' | 'failed' | 'error'
    finalVerdict: 'PASSED' | 'FAILED' | 'INCONCLUSIVE'
    completedAt: string
  }
  boundaryViolations: Array<{
    domain: string
    invariant: string
    verdict: string
    failureMessage?: string
  }>

  // ─── 节点 5：Proof（本函数产出）───
  // → 由 verdict-builder.ts 构建为 frozen.json + verdict.md
}

/**
 * 从各处收集信任链证据
 */
function collectEvidence(projectRoot: string, workName: string): WorkEvidence {
  // 节点 1：读 work.md 提取 goal + constraints + blueprint + tasks
  //   ├─ 解析 ## Use 段提取 blueprint ref
  //   └─ 解析 ## Tasks 段提取 task 列表 + boundary

  // 节点 2：读 .work 提取 planLock
  //   └─ BirthCert.planLock 的 4 个 hash

  // 节点 3：读 .run/tasks/*/frozen.json 提取每个 Task 的 Probe 结果
  //   ├─ 每个 Task 的 probeResults
  //   └─ 从 Probe params 提取 artifact（如 fs-exists 的 path 参数 = 产物路径）

  // 节点 4：读 .run/state.json 提取 tasks[] 状态
  //   └─ 评估 Domain invariant → boundaryViolations
  //   ⚠️ 修正：从 Blueprint ## Use 提 domain（不从 Work ## Use）

  // → 汇总成 WorkEvidence
}
```

### 产物提取规则

从 Probe params 提取"产物"信息：

| Probe | params 字段 | 产物含义 | verification 描述 |
|---|---|---|---|
| fs-exists | `path` | 产物路径 | "文件存在" |
| fs-not-exists | `path` | 产物路径 | "文件不存在" |
| fs-content-match | `path` + `contains` | 产物路径 + 验证条件 | `包含 "${contains}"` |
| shell-exec | `command` | 执行的命令 | `命令成功: ${command}` |
| ts-compiles | `path` | 编译目标 | "TypeScript 编译通过" |
| lint-check | `path` | lint 目标 | "lint 通过" |
| test-pass | `path` / `pattern` | 测试范围 | "测试通过" |

---

## 六、Verdict Builder 设计

### verdict.md 完整模板

```markdown
---
work: create-api-guide
verdict: PASSED
completed_at: 2026-07-14T10:30:00Z
blueprint: create-doc-md
goal: 创建 API 参考文档，放在 docs/zh-cn/api-reference.md
plan_lock_hash: a3f5e8...
frozen_hash: b4f7a9...
content_hash: c8b1a2...
---

# Verdict: create-api-guide

> ✅ PASSED

## Work
- Name: create-api-guide
- Goal: 创建 API 参考文档，放在 docs/zh-cn/api-reference.md
- Blueprint: create-doc-md
- Plan Lock: `a3f5e8...`（locked at 2026-07-14T10:00:00Z）

## Tasks & Probes

### Task: outline
- Status: ✅ PASSED
- Boundary: outline

| Probe | 验证 | 产物 | 事实 | 结果 |
|---|---|---|---|---|
| fs-exists | 文件存在 | docs/zh-cn/api-reference.md | 存在 | ✅ |

### Task: write
- Status: ✅ PASSED
- Boundary: write

| Probe | 验证 | 产物 | 事实 | 结果 |
|---|---|---|---|---|
| fs-content-match | 包含 "## API 参考" | docs/zh-cn/api-reference.md | 找到匹配 | ✅ |
| fs-content-match | 不包含 "TODO" | docs/zh-cn/api-reference.md | 未找到匹配 | ✅ |

### Task: validate
- Status: ✅ PASSED
- Boundary: validate

| Probe | 验证 | 产物 | 事实 | 结果 |
|---|---|---|---|---|
| fs-exists | 文件存在 | docs/zh-cn/api-reference.md | 存在 | ✅ |
| fs-content-match | 包含 "## API 参考" | docs/zh-cn/api-reference.md | 找到匹配 | ✅ |

### Task: publish
- Status: ✅ PASSED
- Boundary: publish

| Probe | 验证 | 产物 | 事实 | 结果 |
|---|---|---|---|---|
| fs-exists | 文件存在 | docs/zh-cn/api-reference.md | 存在 | ✅ |

## Boundary Violations
（无）

## Summary
| 指标 | 值 |
|---|---|
| Tasks | 4 passed / 0 failed |
| Probes | 6 passed / 0 failed |
| Boundary Violations | 0 |
| **Verdict** | **PASSED** |
```

### 签名协议

verdict.md 使用与独立 Proof 轴 verdict.md 相同的签名协议：
- frontmatter 含 `content_hash`（SHA-256，self-excluding 协议）
- frontmatter 含 `frozen_hash`（交叉引用 frozen.json 的 content_hash）
- 写盘后 chmod 0o444（不可篡改）

---

## 七、frozen.json 结构（改进）

```json
{
  "workName": "create-api-guide",
  "goal": "创建 API 参考文档，放在 docs/zh-cn/api-reference.md",
  "blueprint": "create-doc-md",
  "planLockHash": "a3f5e8...",
  "completedAt": "2026-07-14T10:30:00Z",
  "finalVerdict": "PASSED",
  "tasks": [
    {
      "taskName": "outline",
      "status": "passed",
      "completedAt": "2026-07-14T10:10:00Z",
      "probes": [
        {
          "probeName": "doc-exists",
          "ref": "@oxn/probes/fs-exists",
          "verdict": "PASSED",
          "passed": true,
          "durationMs": 1,
          "artifact": "docs/zh-cn/api-reference.md"
        }
      ]
    }
  ],
  "boundaryViolations": [],
  "_xenon_meta": {
    "frozen_at": "2026-07-14T10:30:00Z",
    "content_hash": "b4f7a9..."
  }
}
```

**关键改进（vs 当前 WorkFrozenSnapshot）**：
- 🆕 加 `goal` + `blueprint`（节点 1 信任链）
- 🆕 加 `planLockHash`（节点 2 信任链）
- 🆕 每个 Task 的 probes 加 `artifact`（产物路径，从 Probe params 提取）
- 🆕 走 `writeFrozenImmutable`（chmod 0o444 + content_hash）
- 保留 `finalVerdict` / `tasks[]` / `boundaryViolations`

---

## 八、架构总图（简化后）

```
L3 CLI（packages/cli/src/）
  ├─ commands/work.ts          ← 入口调 Engine Work 服务
  ├─ commands/proof.ts         ← 入口调 Engine Proof 服务（独立 Proof 轴）
  └─ commands/asset.ts         ← 入口调 Engine Asset 服务
  │
  ↓ import
L2 Engine 业务模块（packages/engine/）
  │
  ├── Asset/                   ← Intent 载体（Domain/Workflow/Stack CRUD + 索引 + 验证 + 演化）
  │
  ├── Work/                    ← Align 载体（5 步扁平生命周期）
  │   ├─ create（编排 Task，Intake Blueprint 边界）
  │   ├─ lock（Intent→Align 衔接：planLock）
  │   ├─ run（启动状态机）
  │   ├─ submit × N（Align 阶段执行 + Probe 验证）
  │   └─ finalize（Proof 阶段：收口 + 出证）
  │       ↓ finalize 调 ↓
  │   ↓                     ↓
  ├── Proof/                   ← Engine 通用信任服务（被 Work + 独立 Proof 轴共用）
  │   ├─ runner.ts            ← executeProbe（Probe 执行 + Kernel.judge）
  │   ├─ proof-frozen-writer.ts ← writeFrozenImmutable（chmod 0o444 + SHA-256）
  │   ├─ verdict-writer.ts   ← 独立 Proof 轴 verdict.md
  │   ├─ evidence-collector.ts ← 🆕 WorkEvidence 收集 5 节点
  │   ├─ verdict-builder.ts   ← 🆕 Work 级 verdict.md
  │   └─ proof-manager.ts     ← CLI 辅助
  │
  ├── Insight/, Pool/, Roadmap/
  │
  ↓ import
L1 OXL + Infra（packages/engine/src/oxl/ + infra/）
  OXL：markdown → IR 解析
  Infra：文件 IO、hash、Probe 执行器、不可篡改写入
  │
  ↓ import
L0 Kernel（packages/engine/src/kernel/）
  纯逻辑：Schema、Verdict 判定、DAG 算法、IAPError 契约
```

### Proof/ 模块内部结构（Engine 通用信任服务）

```
packages/engine/src/Proof/
├── runner.ts              ← Probe 执行（Engine 通用）—— Work 和独立 Proof 轴共用
├── proof-frozen-writer.ts ← writeFrozenImmutable（Engine 通用）—— Work finalize 和独立 Proof 轴共用
├── verdict-writer.ts     ← 独立 Proof 轴 verdict.md（CLI oxn proof run 用）
├── evidence-collector.ts ← 🆕 WorkEvidence 收集 5 节点（Work finalize 用）
├── verdict-builder.ts   ← 🆕 Work 级 verdict.md（Work finalize 用）
└── proof-manager.ts     ← CLI 辅助（独立 Proof 轴 CLI 用）

不在 Engine 内部再拆 trust/ 子层——Proof/ 模块本身已足够。
```

---

## 九、Work 5 步生命周期

```
Step 1: create
  Work 编排 Task（从 Blueprint Boundaries）
  产物：work.md + tasks/<t>/task.md
  调 Asset 解析 Blueprint
  │
  ↓
Step 2: lock
  Work 算 planLock（4 个 hash）+ 写 .work（不可变）
  产物：.work
  │
  ↓
Step 3: run
  Work 创建 state.json + trace.jsonl
  状态机初始化
  │
  ↓
Step 4: submit × N
  Work 调 Proof/runner.executeProbe（跑 Probe）
  Work 调 Proof/proof-frozen-writer 写 Task frozen.json
  Work append trace.jsonl
  │
  ↓
Step 5: finalize
  Work 调 Proof/evidence-collector 收集 5 节点
  Work 调 Proof/verdict-builder 构建 verdict.md
  Work 调 Proof/proof-frozen-writer 写 Work frozen.json
  产物：.run/frozen.json + .run/verdict.md
```

---

## 十、实施改动清单

| # | 改动 | 文件 | 来源/类型 | 优先级 |
|---|---|---|---|---|
| **1** | Work 的 `writeTaskFrozen` 改调 `Proof/proof-frozen-writer` 的 `writeFrozenImmutable` | `Work/dual-state-exec.ts:449-452` writeTaskFrozen | 改动 | P0 |
| **2** | Work 的 `writeWorkFrozen` 改调 `Proof/proof-frozen-writer` 的 `writeFrozenImmutable` | `Work/dual-state-exec.ts:454-457` writeWorkFrozen | 改动 | P0 |
| **3** | 新增 `Proof/evidence-collector.ts` | `Proof/evidence-collector.ts`（新文件） | 新增 | P0 |
| **4** | 新增 `Proof/verdict-builder.ts`（Work 级 verdict.md 构建） | `Proof/verdict-builder.ts`（新文件） | 新增 | P0 |
| **5** | `Work/dual-state-exec.ts:finalizeWork` 调 evidence-collector + verdict-builder | `Work/dual-state-exec.ts:725-806` 末尾 | 改动 | P0 |
| **6** | `WorkFrozenSnapshot` 加 `goal` + `blueprint` + `planLockHash` 字段；Task probes 加 `artifact` 字段 | `Work/dual-state-exec.ts:428-447` | 改动 | P0 |
| **7** | `collectWorkDomainProofs` 搬回 Work 模块（从 CLI）+ 改从 Blueprint `## Use` 提 domain | 新增 `Work/collect-work-domain-proofs.ts` | 改动 | P1 |
| **8** | 测试 | 新增 + 更新 | 中 | P0 |

### 改动详情

#### 改动 1：writeTaskFrozen 走 writeFrozenImmutable

```typescript
// 当前（dual-state-exec.ts:449-452）
function writeTaskFrozen(projectRoot, workName, taskName, snapshot: TaskFrozenSnapshot): void {
  const path = getTaskFrozenPath(projectRoot, workName, taskName)
  writeFrozen(path, snapshot)  // ← 普通写入，无保护
}

// 改为
import { writeFrozenImmutable } from '@openxenon/engine/Proof/proof-frozen-writer'

function writeTaskFrozen(projectRoot, workName, taskName, snapshot: TaskFrozenSnapshot): void {
  const path = getTaskFrozenPath(projectRoot, workName, taskName)
  writeFrozenImmutable(path, snapshot as unknown as Record<string, unknown>, (_body, hash) => ({
    frozen_at: snapshot.completedAt,
    content_hash: hash,
  }))
}
```

#### 改动 2：writeWorkFrozen 走 writeFrozenImmutable

```typescript
// 当前（dual-state-exec.ts:454-457）
function writeWorkFrozen(projectRoot, workName, snapshot: WorkFrozenSnapshot): void {
  const path = getWorkFrozenPath(projectRoot, workName)
  writeFrozen(path, snapshot)  // ← 普通写入，无保护
}

// 改为（用同一个 writeFrozenImmutable，meta 不同）
function writeWorkFrozen(projectRoot, workName, snapshot: WorkFrozenSnapshot): void {
  const path = getWorkFrozenPath(projectRoot, workName)
  writeFrozenImmutable(path, snapshot as unknown as Record<string, unknown>, (_body, hash) => ({
    frozen_at: snapshot.completedAt,
    content_hash: hash,
  }))
}
```

#### 改动 3：新增 Proof/evidence-collector.ts

```typescript
// Proof/evidence-collector.ts
interface WorkEvidence { /* 5 节点 */ }
function collectEvidence(projectRoot: string, workName: string): WorkEvidence
```

#### 改动 4：新增 Proof/verdict-builder.ts

```typescript
// Proof/verdict-builder.ts
function buildWorkVerdictMd(evidence: WorkEvidence): string
function writeWorkVerdictMd(projectRoot: string, workName: string, md: string): void
// 走 writeFrozenImmutable + frontmatter 含 frozen_hash + content_hash
```

#### 改动 5：finalizeWork 调 Evidence + Verdict

```typescript
// finalizeWork 末尾（dual-state-exec.ts:725-806）
// 在 writeWorkFrozen 之后新增：

// 🆕 收集信任链证据
const evidence = collectEvidence(params.projectRoot, params.workName)

// 🆕 写 verdict.md（不可篡改）
const verdictMd = buildWorkVerdictMd(evidence)
writeWorkVerdictMd(params.projectRoot, params.workName, verdictMd)
```

#### 改动 6：WorkFrozenSnapshot 加字段

```typescript
// 当前（dual-state-exec.ts:428-447）
interface WorkFrozenSnapshot {
  workName: string
  completedAt: string
  tasks: Array<{ taskName: string; status: WorkspaceTaskStatus; completedAt: string | null }>
  finalVerdict: 'PASSED' | 'FAILED' | 'INCONCLUSIVE' | 'PENDING'
  totalRounds: number
  roundHistory: RoundRecord[]
  taskFrozenPaths: string[]
  boundaryViolations?: Array<{...}>
}

// 改为
interface WorkFrozenSnapshot {
  workName: string
  goal: string                    // 🆕 节点 1
  blueprint: string               // 🆕 节点 1
  planLockHash: string            // 🆕 节点 2
  completedAt: string
  tasks: Array<{
    taskName: string
    status: WorkspaceTaskStatus
    completedAt: string | null
    probes: Array<{               // 🆕 节点 3：内联 Probe 结果
      probeName: string
      ref: string
      verdict: 'PASSED' | 'FAILED' | 'INCONCLUSIVE'
      passed: boolean
      errorMessage?: string
      durationMs: number
      artifact?: string           // 🆕 产物路径
    }>
  }>
  finalVerdict: 'PASSED' | 'FAILED' | 'INCONCLUSIVE' | 'PENDING'
  totalRounds: number
  roundHistory: RoundRecord[]
  taskFrozenPaths: string[]
  boundaryViolations?: Array<{ domain: string; invariant: string; verdict: string; failureMessage?: string }>
}
```

#### 改动 7：collectWorkDomainProofs 搬回 Work 模块

```typescript
// 新增 Work/collect-work-domain-proofs.ts
// 从 cli/commands/work.ts:2883 搬过来
// 改从 Blueprint ## Use 提 domain（不是 Work ## Use）

function collectWorkDomainProofs(
  projectRoot: string,
  workName: string,
  assetFormat: string,
): Array<{ domain: string; invariant: string }> {
  // 1. 读 work.md 的 ## Use 段 → 提取 blueprint ref
  // 2. 读 blueprint.md 的 ## Use 段 → 提取 domain refs
  // 3. 读每个 Domain.md 的 ## Invariants
  // → 构造 {domain, invariant} inputs
}
```

---

## 十一、不在本轮范围

- ❌ Round 多轮循环（后续增量）
- ❌ `oxn work resume`（后续增量）
- ❌ persistentFailures 跨 Round 分析（后续增量）
- ❌ Evidence Collector 的 `objects/` 内容寻址存储（后续优化）
- ❌ Proof/ 内部按"独立 Proof 轴 vs Work finalize"拆分子模块（当前 Proof/ 是 Engine 通用信任服务，按需被不同 caller 调用）

---

## 十二、验证标准

实施完成后验证：

1. **typecheck + lint + test 全通过**

2. **本地 e2e**：
   ```bash
   oxn init --ai opencode
   oxn work create test-work --blueprint <bp> --goal "..."
   oxn work lock test-work
   oxn work run test-work
   oxn work submit --task <t> --run-probes
   oxn work finalize test-work --verdict PASSED
   ```

3. **验证 frozen.json 不可篡改**：
   ```bash
   ls -la .run/frozen.json        # 权限应为 -r--r--r--（0o444）
   cat .run/frozen.json | jq ._xenon_meta.content_hash  # 应有 SHA-256
   ```

4. **验证 verdict.md 存在且可读**：
   ```bash
   cat .run/verdict.md            # 应含 Work / Tasks & Probes / Summary
   ls -la .run/verdict.md         # 权限应为 -r--r--r--
   ```

5. **验证 Task frozen.json 不可篡改**：
   ```bash
   ls -la .run/tasks/*/frozen.json  # 权限应为 -r--r--r--
   ```

6. **验证篡改检测**：
   ```bash
   chmod 0o644 .run/frozen.json && echo "tampered" >> .run/frozen.json && chmod 0o444 .run/frozen.json
   # readFrozenImmutable 应报 signature mismatch
   ```

7. **验证独立 Proof 轴仍然工作**：
   ```bash
   oxn proof run <name>           # 独立 Proof 轴 CLI 入口仍正常
   ls .openxenon/proofs/<n>/frozen.json  # 权限应为 -r--r--r--
   ls .openxenon/proofs/<n>/verdict.md   # 仍可读
   ```

---

## → 参考

- [两层 Proof 设计与边界映射分析](./two-layer-proof-design.md) — §三 两层 Proof 产品设计
- [Blueprint 结构重组设计](./blueprint-structure-design.md) — §六 完整 Doc 示例
- [PR-3 方案：消费侧跟进 + 文档同步](./pr-3-follow-up.md) — 副作用清单
- [OpenXenon 产品设计](./openxenon-product-design.md) — §三 How 信任怎么被功能构建
- [信任链产品模型](./trust-chain-product-model.md) — 四层确定性
- ADR-0011 证据链三件套 / ADR-0031 Proof = 公证人 ≠ 裁判 / ADR-0058 最小信任闭环
- `packages/engine/src/infra/frozen/immutable.ts` — writeFrozenImmutable 实现
- `packages/engine/src/Proof/proof-frozen-writer.ts` — 独立 Proof 轴的 frozen writer
- `packages/engine/src/Proof/verdict-writer.ts` — 独立 Proof 轴的 verdict.md writer
- `packages/engine/src/Work/dual-state-exec.ts` — finalizeWork + writeTaskFrozen + writeWorkFrozen
