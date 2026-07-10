---
title: 工作
---

# 工作（E2 · 动态协作空间）

> **Work 是 OXN 的第二结构实体（E2）——工程师与 AI 的动态协作空间**。Work 内部走 IAP 三阶段（Intent → Align → Proof），多轮 Round 循环直到 work 真正结束。
> v0.6 把 Insight 从 Work 中独立为 E4 涌现层——Work 不再负责"总结"，只负责"交付"。

## 1. IAP 三阶段

```
Work (一次完整 IAP 周期)
├── Intent 阶段 (工程师主权)
│   1. 创建 work.oxn
│   2. 分析 work 需要哪些 Asset 作为边界
│   3. 选择引用 Asset (ref @prj/assets/...)
│   4. 可以是探索、讨论然后落盘成文档（不一定要开发）
│
├── Align 阶段 (AI 模型主权)
│   1. 按 tasks 执行
│   2. 每轮 Align 拆 N 个 Tasks（Round 概念）
│   3. 落盘产物到项目文件系统
│
├── Proof 阶段 (Engine 主权)
│   1. 跑探针 (Probe)
│   2. 产出 verdict
│   3. verdict = FAIL → 逃逸机制触发 (block done)
│
├── (可选) Round 循环
│   verdict = FAIL 或 intent 调整 → 回到 Intent 阶段 → 新一轮 Align
│
└── finalize → 写 frozen.json
```

**关键**：一次 Intent 不一定要开发——可以是探索、讨论然后落盘成文档。IAP 范式不做强制开发路径假设。

## 2. 单一 Work 流程（Blueprint 驱动）

**v0.7+ 收敛**：Work 不再有 mode（task/explore/edit/workType 已删除），所有编排差异由 Blueprint 承载。一套 8 阶段流程（init→migrate→create→add-task→validate→lock→run→submit→finalize）覆盖所有场景：

| 场景 | 入口 | 选什么 |
|---|---|---|
| **想摸清/报告** | `oxn work create <w>` + fork `assets/work-explore.md` 模板 | Blueprint = `explore-analyze-report` |
| **单域开发** | `oxn work create <w> --blueprint dev-workflow` | Blueprint = `dev-workflow` |
| **bug 修复** | `oxn work create <w> --blueprint fix-issue` | Blueprint = `fix-issue` |
| **跨域编排** | `oxn work create <w> --blueprint dev-workflow` + 多 domain ref | Blueprint = `dev-workflow` (多 domain) |
| **编辑 Asset** | `oxn work create <asset> --asset-kind X` | 不创建 Work，走 Asset Short Circuit |

**奥姆剃刀**：删 `mode`/`workType`/`workTypeToMode`/`EditTarget` 一切行为零影响的残留字段。Blueprint slots/deps/observe/props 已经表达了"开发/修复/探索/重构/单域/跨域"所有差异。

**Asset Short Circuit**：`--asset-kind X` 单独触发，跳过 work.oxn 骨架，直接写 `.openxenon/assets/{kinds}/{name}.oxn`。这是 CLI 子命令级别的特化路由，**不是 Work mode**。

**v0.6 调整**（仍生效）：Insight 从 "Work Mode D" 升为 E4 涌现层。Work 只负责交付，Insight 负责涌现。

**模板选择器**（`work-{explore,develop,fix,onboarding}.md`，Skill 包内）：是 AI 选 Blueprint 的辅助表，**不是引擎 mode**。模板直接 fork 改名即可。

## 3. Round 多轮 IAP 循环（v0.6 新增）

**OXN 相对 OpenSpec 的最大护城河**。OpenSpec 的工作流是单次线性 `propose → apply → archive`；OXN 的 Work 支持多轮 IAP 循环。

```
Work (my-feature)
├── Round 1: intent + align + proof → verdict FAIL (type-check)
│   └── oxn work next-round → 回到 Intent 调整
├── Round 2: intent(adjust) + align + proof → verdict FAIL (lint)
│   └── oxn work next-round
├── Round 3: intent(refine) + align + proof → verdict PASS
└── oxn work finalize
```

**v0.6 最小实现**：
- Work 状态加 `currentRound` 字段
- CLI 命令 `oxn work next-round <work>`——显式开启新一轮
- **不做全自动循环**（手动触发，避免无限循环）
- 每轮保留 `round-n/` 子目录（intent/align/proof 快照）
- `finalize` 时汇总所有 round 供 E4 Insight 消费

```bash
# Round 1 跑完
oxn work run my-feature --json
oxn work submit my-feature --task t1 --json

# verdict fail → 开启 Round 2
oxn work next-round my-feature

# 调整 Intent（编辑 work.oxn 加 invariant）
# ...

# Round 2 跑
oxn work lock my-feature --json
oxn work run my-feature --json

# Round 2 pass → finalize
oxn work finalize my-feature --json
```

## 4. 8 阶段流程

```
init → migrate → create → add-task → validate → lock → run → submit → finalize
                                                │         │
                                                ▼         ▼
                                            .work      .work.planLock
                                         静态门禁卡    4 组件 hash
```

所有 3 模式、所有 Round 都走这 8 阶段。每轮 Round 走完整 8 阶段流程。

## 5. Intent 不一定开发

Intent 阶段可以是探索、讨论然后落盘成文档。与 Intent Pool 5 类池对应：
- research 池：探索、信息收集
- design 池：设计、讨论
- issue 池：bug 分析
- audit 池：审计
- journal 池：时间线记录

详见 [Asset](./asset.md) 和 [Insight](./insight.md)。

## 6. 反模式

- ❌ 跳过 validate + lock 直接 run
- ❌ lock 后修改 .oxn
- ❌ 先 submit 后 run
- ❌ 把 Insight 当 Work 的一个 Mode（v0.6 Insight 已升为 E4 独立层）——Work 只负责交付，Insight 负责涌现
- ❌ 把 Round 循环当自动机制——v0.6 手动触发

---

# 7. 完整 8 阶段生命周期（v0.6.1-alpha.0 实现细节）

## 7.1 阶段-命令-落盘文件映射表

| # | CLI 命令 | 引擎入口 | 落盘文件 | Lock 守卫 |
|---|---|---|---|---|
| 0 | `oxn work migrate <w>` | `work-migrator.ts` | `.migrated-v0/<rel>` 备份 + `.run/` 升 V1 | — |
| 1 | `oxn work create <w> --blueprint <bp>` | `work-manager.ts` createSubcommand | `works/<w>/work.oxn`（0o444）+ `work.md`（镜像）+ `tasks/<slot>/task.oxn`（**v0.6.1-alpha.0 #3-3 自动生成**） | — |
| 2 | `oxn work add-task <w> --task <t> ...` | `addTaskSubcommand`（line 728） | `works/<w>/tasks/<t>/task.oxn`（0o444） | NV-1: `.run/state.json` 存在 → 拒 |
| 3 | `oxn work validate <w>` | `work-validator.ts` | `works/<w>/.work`（BirthCert，planLock=null）+ `.cache/domains.json` + `.cache/blueprints.json` | — |
| 4 | `oxn work lock <w>` | `work-lock.ts` | 写 `.work.planLock`（4 组件 hash + allHash） | — |
| 5 | `oxn work run <w>` | `runWork()`（`dual-state-exec.ts:93`） | `works/<w>/.run/state.json`（WorkspaceState）+ `.run/trace.jsonl` | ⚠ `readBirthCert` → `verifyPlanLock` 失配 → `OXN_ALIGN_LOCK_NOT_FOUND` / `IAP_ALIGN_LOCK_HASH_MISMATCH` |
| 6 | `oxn work submit <w> --task <t>` | `submitTask()`（`dual-state-exec.ts:211`） | `works/<w>/.run/tasks/<t>/state.json` + 追加 `trace.jsonl` | ⚠ |
| 7 | `oxn work next-round <w> --verdict <V>` | `nextRoundWork()`（`dual-state-exec.ts:496`） | 关闭当前 round + 开启 round+1；写 `roundHistory[]` | — |
| 8 | `oxn work finalize <w> [--verdict <V>]` | `finalizeWork()`（`dual-state-exec.ts:608`，v0.6.1-alpha.0 #2-14 新增） | 标记 work 终态（passed/failed/error）+ 写 `frozen.json` | — |

## 7.2 物理布局（V1 布局，v0.6.1-alpha.0）

```
.openxenon/works/<work-name>/
├── work.oxn                       (0o444, source of truth)
├── work.md                        (mirror, auto-synced)
├── .work                          (0o444, BirthCert JSON, planLock 4 组件 hash)
├── tasks/
│   └── <task-name>/
│       └── task.oxn               (0o444)
├── .cache/                        (per-work slim index)
│   ├── domains.json               (slim, scope/version/fileHash)
│   └── blueprints.json
└── .run/                          (V1 runtime, chmod -R writable)
    ├── state.json                 (WorkspaceState)
    ├── trace.jsonl                (event log)
    ├── frozen.json                (work 终态, 0o444)
    └── tasks/<task-name>/
        ├── state.json             (TaskState)
        ├── trace.jsonl
        └── frozen.json            (task 终态, 0o444)
```

## 7.3 三层不可变锁（Work 引用 Asset 时）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Asset 三层锁（v0.6.1-alpha.0 #1-4）                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  OS 层        chmod 0o444（写前抬 0o644 → 写 → 立即回锁 0o444）         │
│  内容层       content_hash = SHA-256（落盘时算，读取时校验）                │
│  WAL 层       planLock 4 组件 hash: workOxn / workDomains / blueprints /   │
│               tasks + allHash（v1.1 守卫）                                  │
│  → 锁后任何 .oxn 漂移 → IAP_ALIGN_LOCK_HASH_MISMATCH 硬阻断                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 8. dual-state 状态机

## 8.1 Workspace 级（`.run/state.json`）

| 字段 | 类型 | 含义 |
|---|---|---|
| `workName` | string | 工作区名 |
| `status` | enum | `pending` / `running` / `passed` / `failed` / `error` |
| `createdAt` / `updatedAt` | ISO 8601 | — |
| `domains` / `blueprints` | string[] | 引用列表 |
| `tasks` | WorkspaceTaskIndex[] | 任务 DAG 索引 |
| `skillContext` | object | overallGoal + constraints + maxIterations |
| `currentRound` | number | 当前活跃 round 编号（1-based） |
| `roundHistory` | RoundRecord[] | 已结束 round 快照（含 verdict + failures） |
| `diagnostics` | array? | PR-14c 软警告（域/蓝图 lock 后被删等） |

**状态转换**：
```
pending → running → (passed | failed | error)
                  ↗ passed (所有 task 都 passed)
                  ↗ failed (任意 task failed)
                  ↗ error (run 异常中断)
```

## 8.2 Task 级（`.run/tasks/<t>/state.json`）

| 字段 | 类型 | 含义 |
|---|---|---|
| `workName` / `taskName` | string | 关联键 |
| `blueprint` | string | 注入的 blueprint |
| `injects` | string[] | 注入的 domain 列表 |
| `status` | enum | `pending` / `running` / `passed` / `failed` / `error` |
| `currentPart` | string? | 当前活跃 part 名 |
| `completedParts` | string[] | 已完成 part 列表 |
| `partExecutions` | TaskPartExecution[] | 每个 part 的状态 |
| `loopMeta` | object | currentIteration 计数 |

**part 推进**：`currentPart → completedParts[]`，`nextIdx = completedParts.length`，next part 由 `partExecutions[nextIdx]` 决定；`null` → 所有 part done → 写 `frozen.json`。

## 8.3 Round 级（WorkspaceState.roundHistory[]）

```ts
RoundRecord {
  round: 1-based
  startedAt: ISO 8601
  endedAt?: ISO 8601
  verdict: 'PASSED' | 'FAILED' | 'INCONCLUSIVE' | 'PENDING'
  failures: string[]   // 失败 task 名列表
  notes?: string
}
```

---

# 9. Asset → Work 引用解析链

## 9.1 引用声明（work.oxn）

```oxn
work "my-feature" {
  // v0.6.1-alpha.3 起：Work 只引用 Blueprint（一个 ref），不再直接引用 domain + stack
  // Blueprint 内部通过 ## Refs 组合 Domain + Workflow + Stack + Blueprint
  blueprint "integrate-payment" ref "@prj/blueprints/integrate-payment";

  // 向后兼容：仍可显式声明 domain + stack（可选，用于 Blueprint 未覆盖的边界）
  domain "MemberContext" ref "@prj/domains/MemberContext";
}

task "step-1" {
  // Task 级 inject：必须从 Work 级 RefPool 中选（Blueprint 或 Domain）
  blueprint "integrate-payment";
  domain "MemberContext";
  part "build" { skill_context = "..." }
}
```

> **v0.6.1-alpha.3 简化**：Work ## Refs 只接受 `kind: blueprint`。Domain + Workflow + Stack 通过 Blueprint 间接引用（[ADR-0055](./.openxenon/docs/adrs/0055-blueprint-as-composition-template.md)）。

## 9.2 解析调用链

```
work.oxn 文本
  ↓
createOxnParser() (Langium AST)
  ↓
isWorkDeclaration + isBlueprintRefDecl
  ↓
parseOxnReference(ref) 解析 '@prj/blueprints/X' 或 '@prj/workflows/X' 或 '@prj/domains/X'
  ↓
resolveBlueprintFile(ref, name, projectRoot)  // per-work-blueprints-merger.ts:77
  ↓
路径候选 (优先 workflow 目录, blueprint 目录 fallback):
  1. .openxenon/assets/workflows/<Name>.oxn   (v0.6.1-alpha.2 主路径, 优先)
  2. .openxenon/assets/workflows/<name>.oxn   (kebab-case)
  3. fallback: .openxenon/assets/blueprints/<Name>.oxn  (新组合模板)
  4. fallback: .openxenon/blueprints/<Name>.oxn (v0.5 老布局)
  ↓
readFileSync → parseBlueprintSlim (regex 10× 快于 full parse)
  ↓
PerWorkBlueprintEntry {
  name, scope, file, status, version, slots,
  // 🆕 v0.6.1-alpha.3: Blueprint ## Refs 提取的 3 边界 + 嵌套 Blueprint
  domainRefs:    [{ name, ref, scope, fileHash? }],
  workflowRefs:  [{ name, ref, scope, fileHash? }],
  stackRefs:     [{ name, ref, scope, fileHash? }],
  nestedBlueprintRefs: [{ name, ref, scope }],
  ref: '@prj/workflows/X'
}
  ↓
writeFileSync(works/<w>/blueprints.json)  (原子写)
```

## 9.3 解析失败处理

| 场景 | 行为 |
|---|---|
| `@oxn/...` builtin（v1） | `return null` → diagnostics 收集 → 标 invalid |
| `@prj/...` 找不到文件 | `status='invalid' + errors[]`（**不阻断**，让 run 时报） |
| ref 格式错 | 退到用 name 兜底（兼容老 work.oxn） |
| 解析 fail 但 work 已锁 | run 时 diagnostics 写入 `.run/state.json`（PR-14c） |

## 9.4 per-work slim 索引（`works/<w>/blueprints.json`）

> **v0.6.1-alpha.3 起**：从 `domains.json`（仅 domain）扩展为 `blueprints.json`（blueprint 含 3 边界 transitive refs）。

```json
{
  "schemaVersion": 2,
  "workName": "my-feature",
  "generatedAt": "2026-07-10T...",
  "projectRoot": "/proj",
  "sourceHash": "<sha256(work.oxn)>",
  "declaredRefs": ["@prj/blueprints/integrate-payment"],
  "blueprintCount": 1,
  "invalidCount": 0,
  "blueprints": [
    {
      "name": "integrate-payment",
      "scope": "@prj",
      "file": ".openxenon/assets/blueprints/integrate-payment.md",
      "status": "ok",
      "version": 1,
      "slots": [...],
      "errors": [],
      "ref": "@prj/blueprints/integrate-payment",
      // 🆕 Phase 1: Blueprint ## Refs 提取的 3 边界 + 嵌套 Blueprint
      "domainRefs":    [{ "name": "PaymentContext", "ref": "@md/domains/PaymentContext", "scope": "@prj" }],
      "workflowRefs":  [{ "name": "fix-issue",      "ref": "@md/workflows/fix-issue",      "scope": "@prj" }],
      "stackRefs":     [{ "name": "node-ts",        "ref": "@md/stacks/node-ts",            "scope": "@prj" }],
      "nestedBlueprintRefs": []
    }
  ]
}
```

**与全局 `.cache/blueprints.json` 区别**：
- **全局**：扫 `.openxenon/assets/blueprints/` 全部 blueprint（AI 离线检索全局）
- **per-work**：只扫 work.oxn 声明的 N 个 blueprint ref（work 隔离的 boundary 视图）

**Backward compat**：v0.6.1-alpha.1 及之前生成的 `.cache/domains.json` 仍存在（用于 diagnostic），但 Blueprint 解析合并到 `blueprints.json`。

---

# 10. IAP 三阶段 ↔ Work 命令映射

```
┌─────────────┬───────────────────────────────────────────────────────────────┐
│ IAP 轴      │ Work 实体映射                                                   │
├─────────────┼───────────────────────────────────────────────────────────────┤
│ Intent      │ 1. oxn work create <w> --blueprint <bp>                       │
│ (工程师)    │ 2. 选 asset 边界 (domain X ref @prj/...; blueprint Y)          │
│             │ 3. 编辑 work.oxn + task.oxn                                    │
├─────────────┼───────────────────────────────────────────────────────────────┤
│ Align       │ 1. oxn work lock <w>          (planLock 4 组件 hash)          │
│ (AI 编排)   │ 2. oxn work run <w>           (启动状态机)                    │
│             │ 3. oxn work submit <w> --task <t>  (推进 part)                │
│             │ 4. oxn work context <w> --task <t>  (AI 读上下文)             │
├─────────────┼───────────────────────────────────────────────────────────────┤
│ Proof       │ 1. oxn work status <w>         (查 .run/state.json)            │
│ (Engine)    │ 2. oxn work finalize <w>       (写 .run/frozen.json)          │
│             │ 3. 旁路: oxn proof run <p> (独立 proof 轴, 不走 work)         │
└─────────────┴───────────────────────────────────────────────────────────────┘
```

## 10.1 AI 上下文渲染（`oxn work context`）

```bash
oxn work context <w>                  # Work 级视角
oxn work context <w> --task <t>       # Task 级视角（推荐 AI 使用）
oxn work context <w> --unlock-check   # 跳过 lock 守卫（调试用）
oxn work context <w> --emit-md <path> # 渲染结果写盘
```

### 调用链

```
packages/cli/src/commands/work.ts (contextSubcommand)
  ↓
buildWorkContext({ projectRoot, workName, taskName?, assetFormat, lockCheck })
  ↓
[Lock Guard] readBirthCert + verifyPlanLock
  ↓
work.oxn 读 + Langium parse → WorkFileSummary
  ↓
[若 taskName 指定] tasks/<t>/task.oxn 读 → taskFileData { domain, blueprint, parts, deps }
  ↓
[inject domain 解析] 读 injected domain 的 .oxn → DomainFileSummary { language: { terms, ban, invariant } }
  ↓
[聚合 allowedLanguage] 合并所有 inject 域的 terms/ban/invariants
  ↓
[读 task state] .run/tasks/<t>/state.json → currentPart + status
  ↓
返回 WorkContextResult
  ↓
renderContextHuman(result) → 人类可读文本
  或 --json → 机器可读 JSON
```

### 渲染示例

```markdown
# Context for my-feature / step-1

Blueprint: dev-workflow
Current part: build
Status: running

## Work-level
Goal: 实现 Member 注册功能
Constraints:
  - 禁止使用 User/Customer 词汇（统一 Member）

## Task-level
Deps: 

## Injected Domains (isolated)
  - MemberContext: 会员限界上下文
    Terms: Member, Account, Register
    Banned: User, Customer
    Invariants: 密码不能明文; 邮箱不可重复

## Task Parts
  - build: 实现会员注册 API
  - test: 跑 lint + unit test
```

## 10.2 submit 推进 part

```
oxn work submit <w> --task <t>
  ↓
submitTask({ projectRoot, workName, taskName })
  ↓
loadTaskState(.run/tasks/<t>/state.json)
  ↓
taskState.completedParts.push(currentPart)
partExecutions[].status = 'passed'
  ↓
nextIdx = completedParts.length
currentPart = partExecutions[nextIdx] || null   (null → all done)
  ↓
若所有 part done:
  - taskState.status = 'passed'
  - writeTaskFrozen(.run/tasks/<t>/frozen.json)  (TaskFrozenSnapshot)
若未完:
  - taskState.status = 'running'
  ↓
同步 workState.tasks[t].status
  ↓
若所有 workTasks 都 passed:
  - workState.status = 'passed'
  - writeWorkFrozen(.run/frozen.json)  (WorkFrozenSnapshot)
  ↓
saveWorkState + saveTaskState (atomic write)
appendWorkTrace / appendTaskTrace (append JSONL)
```

---

# 11. Round Loop 完整调用链

## 11.1 数据结构

```ts
// packages/engine/src/Work/dual-state.ts
RoundRecord {
  round: 1-based
  startedAt: ISO 8601
  endedAt?: ISO 8601
  verdict: 'PASSED' | 'FAILED' | 'INCONCLUSIVE' | 'PENDING'
  failures: string[]  // 失败 task 名
  notes?: string
}

// WorkspaceState 字段:
currentRound: number (default 1)
roundHistory: RoundRecord[]  // 第一条默认 PENDING
```

## 11.2 Round Loop 时序

```
oxn work run <w> (首次)
  ↓
runWork()  → createInitialWorkspaceState(...)
  ↓
roundHistory = [{ round: 1, verdict: 'PENDING' }]
currentRound = 1
  ↓
[Round 1 跑] oxn work submit × N → work 状态 passed/failed
  ↓
verdict fail → 工程师开 Round 2:
oxn work next-round <w> --verdict FAILED --failures t1,t2
  ↓
nextRoundWork({ projectRoot, workName, verdict: 'FAILED', failures: [...] })
  ↓
loadWorkState (.run/state.json)
  ↓
关闭当前 round:
  roundHistory.last.endedAt = now
  roundHistory.last.verdict = 'FAILED'
  roundHistory.last.failures = ['t1', 't2']
  ↓
开新 round:
  currentRound += 1
  roundHistory.push({ round: 2, verdict: 'PENDING', startedAt: now })
  ↓
saveWorkState
appendWorkTrace(event='next-round', newRound, previousVerdict)
  ↓
[Round 2 跑] 编辑 work.oxn → work lock → run → submit
  ↓
verdict pass → finalize:
oxn work finalize <w> --verdict PASSED --notes "..."
  ↓
finalizeWork() 关闭最后 round + 设 work.status = 'passed'
  ↓
写 .run/frozen.json (WorkFrozenSnapshot)
appendWorkTrace(event='finalize', finalVerdict, totalRounds)
```

## 11.3 Round 错误码

| 错误码 | 触发 |
|---|---|
| `OXN_ROUND_VERDICT_INVALID` | `--verdict` 不是 PASSED/FAILED/INCONCLUSIVE |
| `OXN_ROUND_ALREADY_PASSED` | `next-round --verdict PASSED` 时已有 round PASSED（提示用 `finalize`） |

## 11.4 Round 关键约束

1. **手动触发** — 没有 auto-loop，避免无限循环
2. **per-round 快照** — Round 1 / Round 2 不破坏 `.run/state.json`
3. **roundHistory 不可丢** — finalize 保留所有历史供 E4 Insight 消费
4. **verdict 终态映射** — `finalize` 时 `verdict === 'PASSED' ? 'passed' : 'failed' / 'error'`

---

## 11.5 证据链三件套（ADR-0011）

每个 Work 运行时目录固定包含**三个不可变证据文件**：

```
works/<work-name>/
├── .work                         # v1.1 出生证明 + planLock
├── .run/
│   ├── frozen.json               # 编译期产物（不可变，0o444）
│   ├── trace.jsonl               # NDJSON 事件流（append-only）
│   └── state.json                # 当前状态快照（atomic write）
```

### 11.5.1 语义分工

| 文件 | 角色 | 写入时机 | 可变 |
|---|---|---|---|
| `frozen.json` | 公证（Work 起始 / 终态不可变快照） | `work lock` / `work finalize` | 否 |
| `trace.jsonl` | 历史（所有事件追加流） | 每次状态变更 | append-only |
| `state.json` | 现状（最近一次的派生态） | 每次 trace 之后 | 是（来自 trace 重放） |

### 11.5.2 post-snapshot 模型

`frozen.json` 不是"pre-execution contract"，而是 **post-validation 快照**：

- ✅ 删 `state.json` 仅凭 trace.jsonl 可重放
- ✅ AI 可在 Work 期间 `oxn update probe` 调整（不是 freeze 死）
- ✅ E4 Insight 通过 trace 看到完整 IAP 历史

### 11.5.3 反模式

- ❌ 直接覆盖 `state.json` 不写 trace——失去溯源能力
- ❌ 改写 `frozen.json`——hash 失配立即报 `IAP_ALIGN_LOCK_HASH_MISMATCH`
- ❌ 跳过 `trace.jsonl` 直接写 `state.json`——违反 ADR-0009 Trace-before-State

### 11.5.4 Memory 节点（v0.7.x 增补 · ADR-0042）

Evidence Chain **四件套**（v0.7.x 增 Memory 节点）：

```
works/<work-name>/
├── .work                                # v1.1 出生证明 + planLock
├── .run/
│   ├── frozen.json                      # 编译期产物（不可变，0o444）
│   ├── trace.jsonl                      # NDJSON 事件流（append-only）
│   └── state.json                       # 当前状态快照（atomic write）

.openxenon/memory/                      # ← v0.7.x 新增
├── index.json
├── entries/
│   ├── mem-2026-11-15-001.md            # ← 第四件套：Memory entry
│   └── ...
└── archive/
```

**Memory 与 Work 的关系**：

| 维度 | 关系 |
|---|---|
| 写入时机 | Work run 期间触发 Insight → `--write-memory` 写 audit memory |
| 关联字段 | `MemoryEntry.relatedAssetIds` 包含 Work 引用的 Asset |
| 反向引用 | Work.frozen.json `_xenon_meta.relatedMemoryIds`（v0.7.x 计划） |
| 生命周期 | Memory 比 Work 寿命更长（Work finalize 后 Memory 仍保留 pattern） |

**关键不变量**：Memory entry 不属于 Work 物理目录，但通过 `relatedAssetIds` 建立逻辑链接。这是 v0.7.x Insight 双源改造的物理表现。

> **v0.6.3 反弹说明（2026-07-05）**：v0.7.x Memory RFC 已被反弹，Evidence Chain 回归 3 件套（`.work` + `.run/{frozen,trace,state}.json`）。详见 [§12 Work context.md 设计](#12-work-contextmd-设计adr-0049--取代-memory-l1)。

## 11.6 partId 主键 + Atomic-Write（ADR-0024）

### 11.6.1 partId vs partName

| 字段 | 类型 | 唯一性 | 改名时 |
|---|---|---|---|
| `partId` | UUID（生成） | 全局唯一 | 不变（脱钩语义） |
| `partName` | 字符串（人类可读） | Scope 内唯一 | 可改（语义升级） |

`state.json` 始终以 `partId` 作 key，改 `partName` 不破坏索引。

### 11.6.2 Atomic-Write 协议

```ts
// ❌ 禁止
fs.writeFileSync(statePath, JSON.stringify(state))

// ✅ 必须：先写 .tmp 再 rename
fs.writeFileSync(`${statePath}.tmp`, JSON.stringify(state))
fs.renameSync(`${statePath}.tmp`, statePath)
```

原因：进程崩溃 / 断电时 tmp → rename 保证要么旧文件完整，要么新文件完整，**无半成品**。原子性是 Trace-before-State 的物理基础。

### 11.6.3 三层锁（Work 引用 Asset 时）

参见 §7.3：Asset 三层锁确保 Work 期间 Asset 不可变。`partId` 是 Work 内部的 part 唯一标识，与 Asset 的 content_hash 共同形成完整不可变证据链。

---

# 12. 完整 CLI 子命令清单（24 个）

| 子命令 | 功能 | Lock 守卫 |
|---|---|---|
| `list` | 列出所有 work | — |
| `create <w> --blueprint <bp>` | 建 work + 自动 task 骨架（**v0.6.1-alpha.0 #3-3**） | — |
| `migrate <w>` | V0 → V1 布局迁移 | — |
| `validate <w>` | 解析 + 写 `.work` | — |
| `compile <w>` | `.oxn` → `.md` 编译 | — |
| `sync <w>` / `sync-md <w>` | 双轨同步 | — |
| `migrate-md <w>` | `.md` → `.oxn` 迁移 | — |
| `add-task <w> --task <t> ...` | 增 task | NV-1 |
| `list-task <w>` | 列 task | — |
| `task-status <w> --task <t>` | 查 task 元信息 | — |
| `verify-task-path --work <w> <path>` | 验 task 路径 | — |
| `edit-task <w> --task <t> ...` | 改 task | NV-1 |
| `delete-task <w> --task <t>` | 删 task | NV-1 |
| `lock <w>` | 写 planLock | — |
| `unlock <w>` | 清 planLock | — |
| `run <w>` | 启动状态机 | ⚠ verifyPlanLock |
| `submit <w> --task <t>` | 推进 task part | ⚠ |
| `status <w>` | 读 `.run/state.json` | ⚠ |
| `context <w> [--task <t>]` | 渲染 AI 上下文 | ⚠ (默认 lockCheck=true) |
| `next-round <w> --verdict <V>` | 关闭/开启 round | — |
| `finalize <w> [--verdict <V>]` | 收口 + 写终态 | — |

---

# 13. 反模式（扩展 §6）

- ❌ 跳过 validate + lock 直接 run
- ❌ lock 后修改 .oxn（→ `IAP_ALIGN_LOCK_HASH_MISMATCH`）
- ❌ 先 submit 后 run
- ❌ 把 Insight 当 Work 的一个 Mode（v0.6 Insight 已升为 E4 独立层）——Work 只负责交付，Insight 负责涌现
- ❌ 把 Round 循环当自动机制——v0.6 手动触发
- ❌ 不跳过 validate+lock 直接 run（v1.1 守卫抛 `IAP_ALIGN_LOCK_NOT_FOUND`）
- ❌ 不要绕过 lock 守卫跑生产（v1.1 planLock 是 OWNPASS 唯一凭证）
- ❌ 不要在锁后修改 .oxn（v1.1 LOCK_HASH_MISMATCH 必触发）
- ❌ `next-round --verdict PASSED`（已有 PASSED round 应改用 `finalize`）
- ❌ 不修 planLock 后修改 .oxn（先 unlock → 改 → re-validate → re-lock）

---

# 14. 关键代码路径索引（v0.6.1-alpha.0）

| 文件 | 角色 |
|---|---|
| `packages/engine/src/Work/index.ts` | 引擎层 API barrel |
| `packages/engine/src/Work/birth-cert.ts` | `.work` BirthCert Zod schema + I/O + `verifyPlanLock` |
| `packages/engine/src/Work/plan-hash.ts` | 4 组件 hash 计算（`hashWorkPlan`） |
| `packages/engine/src/Work/dual-state.ts` | WorkspaceState + TaskState + RoundRecord Zod schemas |
| `packages/engine/src/Work/dual-state-io.ts` | 路径 + I/O（atomic write） |
| `packages/engine/src/Work/dual-state-exec.ts` | `runWork` / `runTask` / `submitTask` / `nextRoundWork` / `finalizeWork` |
| `packages/engine/src/Work/work-lock.ts` | lock / unlock 子命令 |
| `packages/engine/src/Work/work-validator.ts` | validate 子命令 |
| `packages/engine/src/Work/work-manager.ts` | create + 模板生成 |
| `packages/engine/src/Work/work-context-builder.ts` | IAP 渲染（`buildWorkContext` + `renderContextHuman`） |
| `packages/engine/src/Work/per-work-domains-merger.ts` | per-work slim 索引（v0.6.1-alpha.0 #3-4 修复） |
| `packages/engine/src/Work/per-work-blueprints-merger.ts` | 同上，blueprint 版本 |
| `packages/engine/src/Work/work-reporter.ts` | status 渲染 |
| `packages/engine/src/Work/work-migrator.ts` | V0 → V1 迁移 |
| `packages/cli/src/commands/work.ts` | 24 子命令 thin shell（3284 行） |

---

## 12. Work context.md 设计（ADR-0049 · 取代 Memory L1）

> **v0.6.3+ 替代方案**：v0.7.x Memory RFC 反弹后，Work 内动态上下文不再走 `.openxenon/memory/`，而是使用 `context.md`（Work 内的"短期记忆"）。本节是 §11.5.4 的替代。

### 12.1 背景与决策

**v0.7.x Memory RFC 反思**（2026-07-05）：

| 原方案（被反弹）| 新方案（本 ADR-0049）|
|---|---|
| `.openxenon/memory/entries/<id>.md`（Memory L1）| `works/<work-id>/context.md`（Work 内）|
| 全局 hash + TTL 衰减 | Work 生命周期（finalize 后冻结）|
| 独立模块（`oxn memory ingest`）| 复用 Work 流程（自动生成）|

**核心原则**：奥姆剃刀 + 工作流驱动 — 删除 Memory 中间层，回归 Asset + Work 二元结构。

### 12.2 context.md 模板

```markdown
<!-- works/<work-id>/context.md -->
---
workId: w-fix-payment-idempotency
intent: 修复支付网关回调的幂等性
createdAt: 1731628800000
status: aligning
currentRound: 3
references:                        # 引用 Asset（不复制内容，只存指针）
  - assets/domain/payment-core.oxn
  - assets/stack/nodejs.oxn
  - assets/library/axios-docs.oxn
---

## Intent
[工程师声明的意图]

## Roadmap
- [x] 1. 读取 payment/service.ts
- [x] 2. 分析幂等性漏洞
- [~] 3. 编写单元测试  ← current
- [ ] 4. 修复代码
- [ ] 5. 运行 Proof

## Loop History（仅摘要，不全量历史）
### Round 1
- User: 启动 Work
- AI: 读取代码 → 发现漏洞位置

### Round 3 (current)
- User: 写测试
- AI: 写测试用例
- Tool: write_file(tests/payment/idempotency.test.ts)
- Key Observation: 现有代码未去重

## Key Observations
- 支付回调未使用 idempotency_key
- 现有 fix 方案：参考 library/axios-docs.oxn §3.2
```

### 12.3 KV Cache 提示词结构

```text
[1. System Instruction]              ← Stable
[2. assets/* (Stable Prefix)]       ← Stable per-project
[3. works/<id>/context.md (Stable per-Work)]   ← Stable per-Work
[4. Loop Tail (Dynamic)]             ← 每轮追加
```

**关键工程约束**：
- ① ② 字节级稳定（按字母序排序，避免 Map 遍历）
- ③ 在 Work 周期内稳定（仅关键节点变化）
- ④ 只追加不回写（保证前 3 段前缀稳定）

### 12.4 与 Asset 的引用关系

`context.md` frontmatter 包含 `references[]` 字段（Asset ID 列表），但不复制内容：

```markdown
---
references:
  - assets/domain/payment-core.oxn
  - assets/stack/nodejs.oxn
  - assets/library/axios-docs.oxn
---

# 不复制 Asset 内容，只引用
# Skill 模板：
# {{include context.md references}}  # 列出引用
# 然后 AI 主动 read_file 实际内容
```

### 12.5 Work 生命周期中 context.md 的演变

```
Work 启动 → 自动生成空 context.md（仅 Intent + Roadmap）
   ↓
Loop N（每轮）→ 追加到 Loop History + Key Observations
   ↓
Work finalize → context.md 冻结（不再修改）
   ↓
[可选] 写一份 summary 到 .openxenon/works/<id>/memory-summary.md（v0.8.0 计划）
```

### 12.6 反模式

- ❌ context.md 回写项目级 Asset 内容（破坏 KV Cache 前缀稳定）
- ❌ context.md 包含完整 Loop 全文（Token 爆炸）
- ❌ context.md 包含时间戳等易变元数据到前缀部分
- ❌ 跳过 Work 直接修改 Asset（失去 IAP 闭环）

### 12.7 关键不变量

- context.md 不属于项目级 Memory（不参与 v0.6.x citations 计算）
- context.md 仅在 Work 目录内（`works/<id>/`），不跨 Work 共享
- context.md 文件名固定（`context.md`），便于 Skill 模板 `{{include}}` 引用

### 12.8 与 v0.6.x 兼容性

- v0.6.x 项目无 `context.md` → Work 启动时自动生成空模板
- v0.6.x `intent.md` / `align.md` / `proof.md` 已废弃（前 v0.5 文件名）→ v0.6.x 起统一 `context.md`

### 12.9 关键代码路径

| 文件 | 角色 |
|---|---|
| `packages/engine/src/Work/context-md-template.ts` | context.md 模板（Work 启动时生成）|
| `packages/engine/src/Work/context-md-renderer.ts` | KV Cache 提示词组装（按 §12.3 顺序）|
| `packages/engine/src/Work/context-md-lifecycle.ts` | Work 生命周期 hook（启动/Loop/finalize）|

---

## → 参考

- [Core Concepts](./core-concepts.md) — E1-E4 完整概念
- [Asset](./asset.md) — E1 硬约束边界（Asset 创建与锁）
- [Asset Paper Schema · 资产论文结构](./asset-paper.md) — Asset-as-Paper 论文结构 + 引用计数 + DAG
- [Proof](./proof.md) — E3 Engine 独立公证（frozen.json / verdict.md）
- [Insight](./insight.md) — E4 涌现层
- [Architecture](./architecture.md) — Engine L0-L3 分层
- [CLI 参考](./cli.md) — 完整 oxn 命令清单
- [v0.6 RFC](../../.openxenon/pools/sprints/v0.6-iap-refactor/design/v0.6-iap-refactor-rfc.md)
- [v0.6.3 Asset Paper Schema RFC](../../.openxenon/pools/sprints/v0.6.x-observability-roadmap/design/v0.6.3-asset-paper-schema-rfc.md) 📝 Draft
- [ADR-0049 Work/context.md 取代 Memory L1](../../.openxenon/docs/adrs/0049-work-context-md-replaces-memory.md)