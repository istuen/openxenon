# Work 统一模型 + 引用收敛 + Round 改进 RFC

> **日期**：2026-07-10（v1.0 Draft）
> **状态**：📝 Draft（待 review）
> **基础**：[三边界框架 + Blueprint 提升组合模板 RFC](./three-boundary-blueprint-elevation-rfc.md) · [ADR-0050 Onboarding via starter-work](../.openxenon/docs/adrs/0050-onboarding-via-starter-work.md) · [ADR-0055 Blueprint 组合模板](../.openxenon/docs/adrs/0055-blueprint-as-composition-template.md) · [v0.7 Work Closed Loop Cleanup Draft](./2026-07-09-v0.7-work-closed-loop-and-cleanup.md)
> **作者**：opencode（与 user 协作，2026-07-10）
> **目标版本**：v0.6.1-alpha.5 ~ v0.6.1 收尾
> **范围**：4 个决策整合（Asset 创建统一 + Work 引用收敛 + Round 改进 + 阶段缩减为 IAP 三阶段实体）

---

## 0. 背景与动机

### 0.1 当前实现的状态

v0.6.1-alpha.4 三边界 RFC 实施后（Phase 0-2 + Phase 3 Batch 1-3），Work 与 Asset 的关系存在**三个未解决的问题**：

**问题 1：Asset 创建走 `--asset-kind X` 短路，绕过完整 Work 流程**

`oxn work create --asset-kind <X>` 在 `work.ts:518-527` 早返回，调用 `handleAssetModeCreate`：
- ❌ 不创建 `works/<w>/` 目录
- ❌ 不写 `work.oxn` / `work.md`
- ❌ 不写 `.work` BirthCert
- ❌ 不写 `.run/state.json` / `trace.jsonl`
- ❌ 不进 task DAG
- ✅ 仅写 `.openxenon/assets/<kind>/<Name>.oxn` 一个文件

这与 v0.6 RFC §4 "任何工作 = IAP 周期" 的哲学原则矛盾，且 ADR-0050 明确将"跳过 Work 直接写 Asset"列为**反模式**。v0.7 draft §7.2 已显式推迟"Asset 模式重构 → v0.9+"。

**问题 2：Work 引用模型是双轨混合状态（未完全收敛）**

Phase 1 重构引入了 Blueprint 组合能力（Track B），但**未删除**原有的 Work 直接引用模型（Track A）。两条 Track **同时运行**于每次 `oxn work validate`：

```
Track A（原有，活跃）:
  work.oxn ## Refs: domain "X" ref + blueprint "Y" ref
    → per-work-domains-merger → domains.json
    → per-work-blueprints-merger (slots part) → blueprints.json
  BirthCert: { domains: [...], blueprints: [...] }（分开）
  PlanLock: workDomainsHash + blueprintsHash（分开）

Track B（Phase 1 新增，叠加）:
  Blueprint.oxn ## Refs: domain/workflow/stack refs
    → parseBlueprintSlim → blueprints.json[].domainRefs/workflowRefs/stackRefs
  BirthCert blueprints[].domainRefs: schema 存在但总是 []
```

**关键**：Track B 的数据被存储但**未被使用**——BirthCert 中 `blueprints[].domainRefs` 总是空数组，PlanLock 不 hash Track B 数据。Track A 仍然是 drift 检测的唯一权威路径。

**问题 3：Round 模型有 3 个实现缺陷**

| 缺陷 | 现状 | 文档/实际差异 |
|---|---|---|
| `run` 不可重复 | Round 2+ `oxn work run` 报 `OXN_WORK_ALREADY_EXISTS`（因为 `.run/state.json` 持久化）| 文档说"编辑 → lock → run → submit"可执行，实际不行 |
| `maxIterations` 未强制 | 字段存在但无任何 `currentRound >= maxIterations` 检查 | 纯信息性元数据，可无限 Round |
| Round 切换纯手动 | `oxn work next-round --verdict FAILED` | 文档/实际一致，verdict FAIL 不自动触发 |

### 0.2 为什么现在必须解决

| 矛盾 | 影响 |
|---|---|
| Asset 创建旁路 vs "任何工作 = IAP 周期" | Asset 创建无 audit trail（trace.jsonl）、无 planLock 漂移保护、无 Round 修正机制 |
| 双轨制（Track A + Track B）| Blueprint 组合能力未被利用，drift 检测覆盖范围受限，代码复杂度翻倍 |
| Round `run` 不可重复 | 工程师 Round 2 必须手动绕过（编辑 work.oxn 但不 run），与文档严重不符 |
| `maxIterations` 未强制 | maxIterations=3 实际上无意义，可无限 Round |

---

## 1. 决策 1：Asset 创建统一为标准 Work（完整 9 阶段 IAP）

### 1.1 设计

`oxn work create --asset-kind <X>` **不再短路**。改为选择 `asset-create` workflow 作为 Blueprint，Domain 为 `AssetModeContext` 或 `AssetLifecycleContext`，走完整 9 阶段 IAP 闭环。

**核心思路**：

```
oxn work create my-asset --asset-kind domain --goal "..."
  ↓
1. 选择 asset-create workflow 作为 Blueprint（自动注入）
2. Domain = AssetModeContext（自动注入）
3. Stack = 自动检测（基于 .oxnrc）
4. work-skeleton 基于 asset-create 的 4 slots 生成 task：
   - choose-kind: AI 选择/确认 asset kind
   - fork-template: 复制模板
   - fill-content: AI 填写内容
   - validate-commit: 校验 + 落盘
5. 走完整 9 阶段：
   create → add-task → validate → lock → run → submit × 4 → finalize
6. Align 阶段（AI 跑 task）：fill-content 时 AI 写 .oxn 文件 + .md 镜像
7. Proof 阶段（Engine 校验）：validate-commit task 跑 Asset syntax validate + planLock
```

### 1.2 现有 `asset-create` workflow 已存在

`.openxenon/assets/workflows/asset-create.oxn` 已定义 4 slots：

```oxl
workflow "asset-create" {
  abstract: Asset creation pipeline (choose-kind/fork-template/fill-content/validate-commit)

  ## Slots
  ### choose-kind
  - deps: []
  - observe: [fs-content-match]
  ### fork-template
  - deps: [choose-kind]
  - observe: [fs-exists]
  ### fill-content
  - deps: [fork-template]
  - observe: [fs-content-match]
  ### validate-commit
  - deps: [fill-content]
  - observe: [fs-not-exists, lint-check, ts-compiles, test-pass]
}
```

不需要新建 workflow——直接复用。

### 1.3 行为变化

| 维度 | 当前（v0.6.1-alpha.4）| 新模型 |
|---|---|---|
| `oxn work create --asset-kind X` | 短路写 1 个文件 | 走完整 9 阶段 |
| 输出 | `works/<w>/` 目录**不存在** | `works/<name>-asset-<kind>/` 目录（含 work.oxn + tasks/ + .work + .run/）|
| Audit trail | 无（仅写 .oxn 文件）| ✅ 完整（trace.jsonl + state.json）|
| planLock 保护 | 无 | ✅ 4 组件 hash（保护 Asset 创建过程）|
| Round 修正 | 无 | ✅ verdict FAIL → next-round 重新选 kind/填内容 |
| 复用 | 仅 `oxn asset` 子命令 | `oxn work create --asset-kind` 仍可用（标准 Work 流程）|
| `oxn asset create` 子命令 | 独立 | **保留作为 alias**（最终也走 Work 流程，内部调用 `oxn work create --asset-kind`）|

### 1.4 `handleAssetModeCreate` 短路代码删除

`packages/cli/src/commands/work.ts:402-451` 的 `handleAssetModeCreate` 函数整体删除，`work.ts:518-527` 的 `--asset-kind` 短路分支改为标准 Work 流程。

### 1.5 保留的便利性

- `oxn asset create <name> --asset-kind <X>` 仍可用（作为 `oxn work create --asset-kind` 的 alias）
- Work 名自动从 `<name>-asset-<kind>` 推导（如 `my-domain` → work 名 `my-domain-asset-domain`）
- 用户仍只需写一行命令，但走完整 9 阶段

### 1.6 代价分析

**开销**：每次 Asset 创建多 5-15 秒（validate + lock + run × 4 tasks + finalize）

**收益**：
- ✅ Asset 创建可被 Round 修正（verdict FAIL → 工程师改 Intent → 新 Round）
- ✅ 完整 audit trail（trace.jsonl 记录每次 submit 的 part 状态变化）
- ✅ planLock 保护 Asset 创建过程（避免 .oxn/.md 漂移）
- ✅ 与"任何工作 = IAP 周期"哲学一致
- ✅ 落地 ADR-0050 的 starter-work vision

**与 OpenSpec 对比**：
- OpenSpec：propose → review → apply → archive（线性，无 Round 修正）
- OXN 新模型：create → add-task → validate → lock → run × 4 → submit × 4 → finalize → next-round 修正 → re-run（多 Round 修正）

### 1.7 关联 ADR-0050

ADR-0050 的"onboarding via starter-work"愿景落地：onboarding 阶段（`oxn init --ai`）现在天然走完整 Work 流程，每个 starter Asset 都有完整 audit trail。

---

## 2. 决策 2：Work 引用完全收敛到 Blueprint-only

### 2.1 设计目标

Work `## Refs` 只接受 `kind: blueprint`（一个 ref）。Domain/Workflow/Stack 引用完全由 Blueprint 内部 `## Refs` 承担。删除 Track A（Work 级别的 domain ref 解析）。

### 2.2 删除 Track A

**删除文件**：
- `packages/engine/src/Work/per-work-domains-merger.ts`（286 行）
- `packages/engine/src/Work/__tests__/per-work-domains-merger.test.ts`

**修改文件**：

| 文件 | 变更 |
|---|---|
| `packages/engine/src/Work/birth-cert.ts` | `BirthCertSchema.assets` 删 `domains` 字段；`PlanLockSchema` 删 `workDomainsHash` |
| `packages/engine/src/Work/plan-hash.ts` | `PlanHash` 接口删 `workDomainsHash`；`hashWorkPlan` 不再算 domains.json hash；`blueprintsHash` 升级为 composite（Blueprint + 3 边界）|
| `packages/engine/src/Work/work-validator.ts` | 不再调用 `buildPerWorkDomainsIndex`；`blueprintAssets` 数组填入 3 边界 `domainRefs/workflowRefs/stackRefs`（含真实 fileHash）|
| `packages/engine/src/Work/work-skeleton.ts` | `RenderWorkSkeletonOptions` 删 `domainNames` + `stackNames`；MD/OXN 格式只生成 blueprint ref |
| `packages/engine/src/Work/work-migrator.ts` | V0→V1 迁移：原 `domain X ref + blueprint Y ref` → 提取到 `blueprint` 的 `## Refs` |
| `packages/engine/src/Work/per-work-blueprints-merger.ts` | `parseBlueprintSlim` 增强：`blueprint.domainRefs[].fileHash` 从 `hashFile()` 真实计算（替代 `[]` 占位）|

### 2.3 Track B 完全 wire

**`per-work-blueprints-merger.ts` 的 `parseBlueprintSlim` 输出增强**：

```ts
// 当前（v0.6.1-alpha.4）：fileHash 是占位
domainRefs: [{ name, ref, scope }]  // 无 fileHash

// 新模型：fileHash 真实计算
domainRefs: [{ name, ref, scope, fileHash: '<sha256>' }]  // ✅
```

**`work-validator.ts` 的 BirthCert 组装**：

```ts
// 当前：blueprints[].domainRefs 填 []
const blueprintAssets = blueprintsIdx.blueprints.map(b => ({
  ...b,
  domainRefs: [],  // 占位
  workflowRefs: [],
  stackRefs: [],
}))

// 新模型：从 blueprints.json slim index 读取真实 fileHash
const blueprintAssets = blueprintsIdx.blueprints.map(b => ({
  name: b.name,
  version: b.version,
  fileHash: b.fileHash,  // Blueprint 自身
  domainRefs: b.domainRefs,    // 含 fileHash
  workflowRefs: b.workflowRefs,
  stackRefs: b.stackRefs,
}))
```

### 2.4 强制约束：Blueprint 必须引用 3 边界

`parseBlueprintSlim` 校验：
- `domainRefs.length >= 1`（必须至少 1 个 Domain）
- `workflowRefs.length >= 1`（必须至少 1 个 Workflow）
- `stackRefs.length >= 1`（必须至少 1 个 Stack）

错误码（新增）：
- `E_MD_BLUEPRINT_MISSING_DOMAIN` → Blueprint 必须至少引用 1 个 Domain
- `E_MD_BLUEPRINT_MISSING_WORKFLOW` → Blueprint 必须至少引用 1 个 Workflow
- `E_MD_BLUEPRINT_MISSING_STACK` → Blueprint 必须至少引用 1 个 Stack

**意义**：保证 Work 通过 Blueprint 一定能获得完整 3 边界（语义约束 + 结构约束 + 环境约束）。

### 2.5 PlanLock 升级为 3 组件 composite hash

```
当前 PlanLock (4 组件):
  workOxnHash + workDomainsHash + blueprintsHash + tasksHash + allHash

新 PlanLock (3 组件):
  workOxnHash + blueprintsHash (composite) + tasksHash + allHash
```

`blueprintsHash` = `hash(concatenate(blueprint.md + 3 边界 .md))`

drift 检测覆盖范围：
- Blueprint 文件本身
- Blueprint 组合的 Domain
- Blueprint 组合的 Workflow
- Blueprint 组合的 Stack

任一文件变化 → `blueprintsHash` 不匹配 → `IAP_ALIGN_LOCK_HASH_MISMATCH`。

### 2.6 向后兼容：现有 work.oxn 迁移

现有 work.oxn 含 `domain "X" ref "..."` + `blueprint "Y" ref "..."` 两种 ref 的：

**迁移工具**：`oxn migrate work-v1-to-v2 <work-name>`

逻辑：
1. 解析 work.oxn 提取所有 `domain` + `blueprint` refs
2. 对每个 blueprint ref，读取 blueprint 文件的 `## Refs`（如不存在则创建）
3. 如果 blueprint 文件无 `## Refs`，将 work 的 `domain` refs 提取到 blueprint 的 `## Refs`
4. 写回 blueprint 文件
5. 清理 work.oxn，删除 `domain` refs，只保留 `blueprint` refs
6. 重写 .work BirthCert（V1 → V2 schema）
7. 写迁移报告

### 2.7 work-skeleton 输出示例

**当前（v0.6.1-alpha.4）**：
```md
## Refs

### DocEngineeringContext
- kind: domain
- ref: "@prj/domains/DocEngineeringContext"

### doc-promote
- kind: blueprint
- ref: "@prj/workflows/doc-promote"
```

**新模型**：
```md
## Refs

### doc-promote
- kind: blueprint
- ref: "@prj/workflows/doc-promote"
```

Domain 引用完全由 `doc-promote.oxn` 的 `## Refs` 承担。

---

## 3. 决策 3：Round 模型改进

### 3.1 缺陷修复

**缺陷 1：`run` 不可重复**

`packages/cli/src/commands/work.ts:1550-1558` 的 guard：

```ts
// 当前：
if (workStateExists(projectRoot, workName)) {
  return outputError({
    code: 'OXN_WORK_ALREADY_EXISTS',
    message: `work "${workName}" already exists`,
    ...
  }, format)
}
```

Round 2+ 时 `.run/state.json` 已存在，re-run 报 `OXN_WORK_ALREADY_EXISTS`。

**修复**：
```ts
// 新行为：
if (workStateExists(projectRoot, workName)) {
  const state = loadWorkState(...)
  if (state.status === 'finalized') {
    return error('OXN_WORK_ALREADY_FINALIZED', ...)
  }
  // Round 2+ 允许 re-run（不报错）
  // re-run 重置当前 Round 的 task 状态为 pending
  resetCurrentRoundTasks(state)
  return ok('work re-run for round ${state.currentRound}')
}
```

**缺陷 2：`maxIterations` 未强制**

`packages/engine/src/Work/dual-state-exec.ts:496-560` 的 `nextRoundWork` 无 `currentRound >= maxIterations` 检查。

**修复**：
```ts
export function nextRoundWork(...) {
  const state = loadWorkState(...)
  if (state.currentRound >= state.skillContext.maxIterations) {
    throw new IAPError(
      'IAP_ALIGN_ROUND_MAX_EXCEEDED',
      `Round ${state.currentRound} reached max iterations (${state.skillContext.maxIterations}). ` +
      `Use 'oxn work finalize' to close the work.`,
      { currentRound: state.currentRound, maxIterations: state.skillContext.maxIterations }
    )
  }
  // 原有逻辑
  ...
}
```

**缺陷 3：Round 切换纯手动（保持现状）**

不自动切换——工程师显式跑 `oxn work next-round --verdict FAILED`。理由：
- 避免无限循环（自动 + 无限制 = 死循环）
- 便于人工调整 Intent（自动 = 跳过 Intent 调整）
- 工程师决定何时开启新 Round

### 3.2 Task 状态保留不重置（codify 为 invariant）

**当前行为**：`nextRoundWork` 不重置 task 状态。Round 1 中 `passed` 的 task 在 Round 2 仍 `passed`。

**codify 为 invariant**：

`.openxenon/assets/domains/WorkOrchestrationContext.md` `inv-` 添加：

```
- value: Round 切换不重置 task 状态（passed 的 task 保留，failed 的回 pending 供工程师重跑或调整）
- value: roundHistory 不可丢（finalize 保留所有 round 记录供 E4 Insight）
- value: Round 切换手动触发（oxn work next-round），不自动循环（避免无限循环 + 便于人工调整 Intent）
```

### 3.3 Round 2+ 流程（修复后）

修复后 Round 2+ 可执行完整流程：

```
Round 1: oxn work run → [submit × 4] → verdict FAIL
   ↓
编辑 work.oxn（调整 Intent）
   ↓
oxn work lock（重算 planLock hash）
   ↓
oxn work run（Round 2 启动，state.json 允许 re-run）✅
   ↓
[submit × N]（仅重跑 failed task，passed task 跳过）
   ↓
oxn work next-round --verdict PASSED → finalize
   ↓
oxn work finalize
```

### 3.4 文档与实现对齐

`docs/zh-cn/work.md` §3 Round 描述（line 58-96）更新：

| 维度 | 文档 v0.6.1 | 实际 v0.6.1 | 文档 v0.6.1-alpha.5 |
|---|---|---|---|
| `run` 可重复 | ✅（line 60 隐含） | ❌ 报 OXN_WORK_ALREADY_EXISTS | ✅ 明确"Round 2+ re-run 允许" |
| `maxIterations` 硬限制 | ❌ 未提 | ❌ 未实现 | ✅ 明确"超出 → IAP_ALIGN_ROUND_MAX_EXCEEDED" |
| 切换触发 | 手动 | 手动 | 手动（保持） |
| Task 跨 Round | 保留 | 保留 | 保留（codify 为 invariant） |

---

## 4. 决策 4：Work 阶段缩减为 IAP 三阶段实体

### 4.1 设计原则

**Work = 3 个 IAP 子顶层实体（Intent / Align / Proof）**。"Work 只要确保三个阶段衔接稳固，阶段内的变化不会影响整个 Work"。

当前 Work 有 9 阶段（migrate / create / add-task / validate / lock / run / submit / status / finalize），多数可收敛到 3 个 IAP 阶段的子步骤。3 个阶段是 Work 的**稳定结构**（不可变），子步骤是**可变层**（可增/减/合并）。

**Work = 3 个 IAP 子顶层实体（Intent / Align / Proof）**。"Work 只要确保三个阶段衔接稳固，阶段内的变化不会影响整个 Work"。

当前 Work 有 9 阶段（migrate / create / add-task / validate / lock / run / submit / status / finalize），多数可收敛到 3 个 IAP 阶段的子步骤。3 个阶段是 Work 的**稳定结构**（不可变），子步骤是**可变层**（可增/减/合并）。

```
Work (E2 动态协作空间)
│
├── Intent (工程师主权)        ← Intent 阶段：声明意图 + 选 Asset 边界 + 锁定不可变
│   ├── create     — 建 work 骨架 + Blueprint 自动生成 task
│   ├── add-task   — 编辑/追加 task.oxn（可选子步骤）
│   └── lock       — validate（内含）+ hash + 写 planLock
│
├── Align (AI 主权)            ← Align 阶段：多 Round 对齐执行 task
│   ├── run        — 启动状态机 + Round 初始化
│   └── submit     — 推进 task part × N（AI 逐个执行）
│
└── Proof (Engine 主权)        ← Proof 阶段：跑探针 + 写 verdict
    └── finalize   — 汇总 Round + 写 frozen.json + 标记终态
```

### 4.2 当前 9 阶段 → 3 IAP 阶段映射

| 当前 9 阶段 | 新 3 阶段模型 | 变化 |
|---|---|---|
| `migrate` | — | 降级为辅助工具命令（V0→V1 迁移） |
| `create` | **Intent**.create | 不变 |
| `add-task` | **Intent**.add-task | 降为可选子步骤（大多数 case 已被 create 自动生成覆盖）|
| `validate` | **Intent**.lock（内含）| 合并到 lock（`lock --dry-run` 保留只校验不锁）|
| `lock` | **Intent**.lock | 吸收 validate（内部先校验再算 hash）|
| `run` | **Align**.run | 不变 |
| `submit` | **Align**.submit | 不变（保持独立，避免 run 参数复杂化）|
| `status` | — | 降级为辅助查询命令（不改变状态）|
| `finalize` | **Proof**.finalize | 不变 |

### 4.3 3 个子顶层实体详细设计

#### 4.3.1 Intent 子实体（工程师主权）

**职责**：声明工作意图 + 选 Asset 边界 + 锁定 .oxn 不可变

**子步骤**：

```
Intent 内部流转:
  create → [add-task?] → lock
    │         (可选)       │
    │                      │
    ├─ create:              ├─ lock:
    │  解析 blueprint        │  ├─ validate（内含）
    │  自动生成 tasks       │  │  ├─ 语法校验
    │  写 work.oxn + md    │  │  ├─ task DAG 校验
    │                      │  │  └─ Asset 引用校验
    │                      │  └─ 算 4 组件 hash
    │                      │  └─ 写 planLock
    │                      │  └─ 标记 .oxn 不可变
    └─ Blueprint 自动生成    └─ .work BirthCert 写入
```

**关键产物**：`work.oxn` + `tasks/*.oxn` + `.work`（BirthCert + planLock）

**主权操作**：
- ✅ 工程师：编辑 `work.oxn`（手写 Intent 表达）
- ✅ 工程师：`oxn work create` / `oxn work add-task` / `oxn work lock`
- ❌ 不可写：AI 不可在 Intent 阶段落盘（Intent 完成后 .oxn 已锁定）

**validate 合并到 lock 的设计**：
- `oxn work lock` 命令内部先做 validate（语法 + DAG + 引用），通过后再算 hash
- `oxn work lock --dry-run` 保留只校验不锁（用于提前发现错误）
- `validate` 作为独立命令**保留**（向后兼容），但等价于 `lock --dry-run`

**add-task 降为可选的判断**：
- v0.6.1-alpha.0 起 `create` 已从 Blueprint slots 自动生成所有 task
- `add-task` 唯一独有价值：Work 运行中追加 task（但与 planLock 冲突）
- 实际使用率极低——多数 Work 的 task 在 `create` 时已全部生成
- 结论：降级为可选子步骤（与 `create` 并列在 Intent 阶段内），不强制

#### 4.3.2 Align 子实体（AI 主权）

**职责**：多 Round 对齐 + 执行 task + 落盘产物

**子步骤**：

```
Align 内部流转:
  run → submit × N
    │      │
    │      ├─ 推进 task part 状态
    │      ├─ 跑 part-level probe
    │      └─ 写 task state.json + trace.jsonl
    │
    └─ 启动状态机 + Round 1 初始化
       └─ 写 .run/state.json
```

**关键产物**：`.run/state.json`（WorkspaceState）+ `.run/trace.jsonl`（事件流）+ `tasks/<t>/state.json`（TaskState）

**主权操作**：
- ✅ AI：`oxn work submit`（推进 task part + 落盘产物）
- ✅ Engine：`oxn work run`（启动状态机，状态机本身就是 AI 执行的引擎）
- ❌ 不可写：工程师不可在 Align 阶段直接修改 .run/state.json（AI 主权）

**run 与 submit 保持独立**：
- `run` 是"启动"语义（启动状态机 + 初始化 Round 1），执行 1 次
- `submit` 是"推进"语义（推进 task part），执行 N 次
- 合并会参数复杂化（`run` 需知道推到哪个 task part）——不合并

#### 4.3.3 Proof 子实体（Engine 主权）

**职责**：汇总所有 Round + 写 verdict + 标记终态

**子步骤**：

```
Proof 内部流转:
  finalize
    ├─ 关闭最后一个 Round（设 endedAt + verdict）
    ├─ 汇总 roundHistory[]
    ├─ 映射终态（PASSED → passed, FAILED → failed）
    └─ 写 .run/frozen.json
```

**关键产物**：`.run/frozen.json`（WorkFrozenSnapshot）+ Work 终态（passed/failed/error）

**主权操作**：
- ✅ Engine：`oxn work finalize`（汇总 + frozen.json + 终态）
- ❌ 不可写：AI / 工程师不可在 Proof 完成后继续修改（Work 终态）

**finalize 保持单步骤**：
- finalize 是"结束"语义，与 next-round 的"继续"语义不冲突
- 合并需要区分"finalize 后继续"vs "finalize 后结束"——不合并

### 4.4 2 个关键衔接点（critical handoff）

Work 只需守护 2 个阶段衔接点，**衔接稳固则 Work 稳定**：

| 衔接 | 触发 | 守卫机制 | 错误码 |
|---|---|---|---|
| **Intent → Align** | `lock` 完成（planLock 写入）| `run` 时检查 planLock 存在 | `IAP_ALIGN_LOCK_NOT_FOUND`（缺 planLock 拒绝 run）|
| **Align → Proof** | 所有 task submit 完成（work status = passed/failed）| `finalize` 时检查 task 状态 | 警告非 passed 的 task 存在 |
| **Proof → Round 循环** | verdict FAIL + `next-round` 手动触发 | 跨阶段回到 Intent | 工程师显式编辑 → `lock` → `run` → `submit` |

**衔接设计原则**：阶段衔接由 Engine 守卫（planLock + status check），阶段内部流转可自由演进。

### 4.5 辅助命令降级（非阶段）

以下命令从"阶段"降级为"辅助命令"——任何阶段都可调用，**不改变 Work 状态机**：

| 命令 | 用途 | 何时可用 |
|---|---|---|
| `oxn work status` | 查询状态 | 任何时刻 |
| `oxn work context` | AI 上下文渲染 | lock 后 |
| `oxn work list-tasks` | 列出 task | 任何时刻 |
| `oxn work migrate` | V0→V1 迁移工具 | create 前 |
| `oxn work unlock` | 解锁 planLock | lock 后 |
| `oxn work next-round` | Round 切换 | run 后 |
| `oxn work validate` | 等价于 `lock --dry-run`（向后兼容）| 任何时刻 |

**降级理由**：
- `status`：只读取，不改变状态
- `migrate`：V0 历史兼容，新建 Work 不需要
- `unlock` / `next-round`：状态机操作（解锁 / Round 切换），不是主流程
- `context` / `list-tasks`：查询 / 调试辅助

### 4.6 阶段内自治原则

**核心原则**："阶段内的变化不会影响整个 Work"——3 个阶段（Intent / Align / Proof）是**稳定骨架**，子步骤（create / lock / run / submit / finalize）是**可变层**。

**自治场景示例**：
- Intent 阶段未来可加 `oxn work ai-suggest`（AI 推荐 Blueprint）— 不影响 Align/Proof
- Align 阶段未来可加 `oxn work parallel-submit`（并发推进多 task）— 不影响 Intent/Proof
- Proof 阶段未来可加 `oxn work insight-export`（导出 E4 Insight 推荐）— 不影响 Intent/Align

**稳定骨架约束**：
- Intent → Align 衔接：planLock 必须存在
- Align → Proof 衔接：task 状态必须确定（passed/failed）
- 这 2 个衔接点不可移除

### 4.7 validate 与 lock 合并的细节

**当前行为**：
- `oxn work validate`：校验 work.oxn 语法 + task DAG + Asset 引用 + 写 .work BirthCert（planLock=null）
- `oxn work lock`：算 4 组件 hash + 写 planLock

**新行为**：
- `oxn work lock`：内部先 validate（语法 + DAG + 引用），通过后算 hash + 写 planLock
- `oxn work lock --dry-run`：仅 validate，不算 hash（用于提前发现错误）
- `oxn work validate`：保留作为 alias，等价于 `oxn work lock --dry-run`（向后兼容）

**`lock --dry-run` 的使用场景**：
- 工程师编写 work.oxn 后，想快速验证语法（DAG 无环、引用存在）但不锁定
- CI 流水线中校验 work.oxn 合规性（不写 planLock）

**风险**：
- `lock` 失败可能由 validate 错误引起（语法 / DAG / 引用）或 hash 错误（极少）
- 但从"2 步失败"变"1 步失败"——错误信息相同

### 4.8 实施影响

**主要修改**：
- `docs/zh-cn/work.md` 全面重写（按 3 IAP 阶段重组）
- `.openxenon/assets/domains/WorkOrchestrationContext.md` 新增 "IAP 阶段实体" 概念
- `oxn-work` Skill `SKILL.md` 改 3 阶段
- `oxn-work` Skill `references/8-phase-detail.md` 改 3 阶段 + 子步骤 + 衔接点
- `workTypeToMode` 已删除（v0.6.1-alpha.4 Phase 0+1 提前完成）

**代码变更极少**（阶段名不变化，命令不删除）——主要工作是**文档重写** + 命令的语义注释更新。

### 4.9 与现有 ADR 关系

- **ADR-0054**（三边界框架）：Intent 阶段的 lock 引用校验支持 3 边界
- **ADR-0055**（Blueprint 组合模板）：Intent 阶段的 create 自动生成 task（来自 Blueprint slots）
- **ADR-0056**（External inline）：Intent 阶段的 validate 内含 External kind 校验
- **决策 1**（Asset 创建统一）：Asset 创建走完整 Intent → Align → Proof 三阶段
- **决策 2**（引用收敛）：lock 内含 validate 校验 Blueprint-only 引用
- **决策 3**（Round 改进）：next-round 跨阶段回到 Intent

---

## 5. 迁移方案（v0.6.1-alpha.5 之前 → 之后）

### 5.1 现有 work.oxn 含 domain ref → 提取到 Blueprint ## Refs

**触发场景**：v0.6.1-alpha.5 之前的所有 work.oxn（如 `.openxenon/works/three-boundary-phase*/work.oxn`）含 `domain "X" ref "..."`。

**迁移工具**：`oxn migrate work-v1-to-v2 <work-name> [--dry-run]`

**逻辑**：
1. 解析 work.oxn 提取 `domain` + `blueprint` refs
2. 读 blueprint 文件（如 `assets/workflows/doc-promote.oxn`）
3. 解析 blueprint 的 `## Refs`（如不存在则用空模板）
4. 对 work 的每个 `domain` ref，检查 blueprint `## Refs` 是否已包含；如无则添加（kind: domain, ref: @prj/.../X）
5. 写回 blueprint 文件
6. 更新 work.oxn：删除所有 `domain` refs，只保留 `blueprint` refs
7. 重写 .work BirthCert（V1 → V2 schema）
8. 重算 PlanLock 3 组件 hash
9. 写迁移报告（success/skipped/failed）

### 5.2 现有 BirthCert V1 → V2 schema

```ts
// V1 schema
BirthCertSchema = z.object({
  assets: z.object({
    domains: z.array(DomainAssetEntrySchema).default([]),     // 删除
    blueprints: z.array(BlueprintAssetEntrySchema).default([]),
  }),
  planLock: PlanLockSchema.nullable().default(null),  // 4 组件
})

// V2 schema
BirthCertSchema = z.object({
  assets: z.object({
    blueprints: z.array(BlueprintAssetEntrySchema).default([]),  // 唯一
  }),
  planLock: PlanLockSchema.nullable().default(null),  // 3 组件
})
```

**自动迁移**：`oxn work validate` 读 V1 BirthCert → 写 V2（如 `assets.domains` 非空则合并到 `blueprints[].domainRefs`）。

### 5.3 现有 --asset-kind 短路 → 标准 Work 流程

**触发场景**：v0.6.1-alpha.5 之前的 `oxn work create --asset-kind X` 走 `handleAssetModeCreate` 短路。

**迁移**：
- `handleAssetModeCreate` 函数删除
- `oxn work create --asset-kind X` 改为走标准 Work 流程（选 asset-create workflow + AssetModeContext domain）
- `oxn asset create` 子命令保留（作为 alias，内部调 `oxn work create --asset-kind`）

**对现有用户影响**：之前 `--asset-kind X` 1 秒出 Asset 文件；现在走完整 9 阶段需要 5-15 秒。需在 changelog 显式说明。

### 5.4 per-work-domains-merger → 合并到 blueprints-merger

**当前**：`per-work-domains-merger.ts`（286 行）独立解析 domain refs。

**新模型**：
- 删除独立文件
- domain refs 的解析逻辑**已经在** `per-work-blueprints-merger.ts` 的 `parseBlueprintSlim` 中（Phase 1 已实现）
- 只需从 `blueprints[].domainRefs` 读取即可

---

## 5. Breaking changes 清单（合并决策 1-4）

| # | 变更 | 决策 | 迁移路径 |
|---|---|---|---|
| BC-1 | `oxn work create --asset-kind X` 不再短路，走完整 9 阶段 | 决策 1 | 旧 `works/<w>/` 目录不存在（无 work artifact 可迁移）；新创建走标准 Work 流程 |
| BC-2 | `handleAssetModeCreate` 函数删除 | 决策 1 | N/A（internal 变更） |
| BC-3 | Work `## Refs` 只接受 `kind: blueprint` | 决策 2 | `oxn migrate work-v1-to-v2 <work-name>` 自动提取 domain refs 到 blueprint |
| BC-4 | BirthCert `assets` 删 `domains[]` 字段 | 决策 2 | 自动迁移（validate 读 V1 → 写 V2） |
| BC-5 | PlanLock 删 `workDomainsHash` 组件（变 3 组件）| 决策 2 | `blueprintsHash` 升级为 composite hash（Blueprint + 3 边界）|
| BC-6 | `per-work-domains-merger.ts` 文件删除 | 决策 2 | 逻辑合并到 blueprints-merger |
| BC-7 | `run` 行为变更：Round 2+ 允许 re-run | 决策 3 | 状态机增加 resetCurrentRoundTasks 逻辑 |
| BC-8 | `maxIterations` 硬限制：超出 → `IAP_ALIGN_ROUND_MAX_EXCEEDED` | 决策 3 | 用户在 finalize 时显式用 verdict=FINALIZE 覆盖 |
| BC-9 | 9 阶段 → 3 IAP 阶段实体（文档概念）| 决策 4 | 阶段名不变化（命令仍存在），文档重写 IAP 映射 |
| BC-10 | `validate` 命令等价于 `lock --dry-run`（向 `lock` 内部合并）| 决策 4 | `validate` 保留作为 alias |
| BC-11 | `add-task` 降为 Intent 阶段内可选子步骤 | 决策 4 | 命令保留但文档标注为"可选" |
| BC-12 | `status` / `migrate` 降为辅助命令 | 决策 4 | 从"阶段"列表中移除，文档归入"辅助命令" |

---

## 6. 关联 ADR

| ADR | 状态 | 主题 |
|---|---|---|
| [ADR-0050 Onboarding via starter-work](../.openxenon/docs/adrs/0050-onboarding-via-starter-work.md) | ✅ Adopted | onboarding 走完整 Work 流程 — 本 RFC 落地 |
| [ADR-0054 三边界框架](../.openxenon/docs/adrs/0054-three-boundary-framework.md) | ✅ Adopted | 3 边界正交维度 |
| [ADR-0055 Blueprint 组合模板](../.openxenon/docs/adrs/0055-blueprint-as-composition-template.md) | ✅ Adopted | Blueprint ## Refs 引用 3 边界 — 本 RFC 完善 |
| [ADR-0056 External inline + 状态管理](../.openxenon/docs/adrs/0056-external-inline-and-status.md) | ✅ Adopted | 边界内 inline 外部引用 |
| 新 ADR-0059 | 📝 Draft | Work 统一模型：Asset 创建 + 引用收敛 + Round 改进（本文档）|

---

## 7. 实施时间线

### Phase A：Round 缺陷修复（低风险，独立可做）

| 任务 | 工作量 | 风险 |
|---|---|---|
| 7A.1 修复 `run` 可重复（去 OXN_WORK_ALREADY_EXISTS guard + state.status=finalized 检查）| 0.5 天 | 低 |
| 7A.2 `nextRoundWork` 加 `currentRound >= maxIterations` 硬限制 | 0.3 天 | 低 |
| 7A.3 文档同步（work.md §3 + §11）| 0.3 天 | 极低 |
| 7A.4 WorkOrchestrationContext.md codify Round invariants | 0.2 天 | 极低 |
| 7A.5 单元测试覆盖（run re-run + maxIterations 硬限制）| 0.5 天 | 低 |
| 7A.6 集成测试（端到端：Round 1 fail → re-run → Round 2 pass → finalize）| 0.5 天 | 低 |

**Phase A 总计**：~2.3 天

### Phase B：Work 引用收敛到 Blueprint-only（Track A 删除）

| 任务 | 工作量 | 风险 |
|---|---|---|
| 7B.1 删除 `per-work-domains-merger.ts`（逻辑已合并到 blueprints-merger）| 0.3 天 | 中（影响 validate 流程）|
| 7B.2 BirthCert schema V1 → V2（删 `assets.domains[]` 字段）| 0.5 天 | 中（需 work-validator + work-migrator 同步）|
| 7B.3 PlanLock 删 `workDomainsHash`，blueprintsHash 升级为 composite（hash Blueprint + 3 边界）| 0.5 天 | 中（影响所有 lock 后 .oxn 漂移检测）|
| 7B.4 work-skeleton 删 `domainNames` + `stackNames` 参数，只生成 blueprint ref | 0.3 天 | 低 |
| 7B.5 `parseBlueprintSlim` 增强：`blueprint.domainRefs[].fileHash` 真实计算 | 0.5 天 | 低（数据流增强）|
| 7B.6 `parseBlueprintSlim` 加强制约束：Blueprint 必须引用 1 Domain + 1 Workflow + 1 Stack | 0.5 天 | 低 |
| 7B.7 `oxn migrate work-v1-to-v2` 迁移工具 | 1 天 | 中（需处理各种 work.oxn 变体）|
| 7B.8 现有 work.oxn 全部跑迁移工具 | 0.5 天 | 中 |
| 7B.9 单元测试（per-work-blueprints-merger 增强 + work-validator 简化 + 迁移工具）| 1 天 | 中 |
| 7B.10 集成测试（work-v1-to-v2 端到端）| 0.5 天 | 中 |

**Phase B 总计**：~5.6 天

### Phase C：Asset 创建统一为标准 Work

| 任务 | 工作量 | 风险 |
|---|---|---|
| 7C.1 删除 `handleAssetModeCreate` 短路函数（work.ts:402-451）| 0.3 天 | 中（影响 `oxn work create --asset-kind` 用户体验）|
| 7C.2 `work create` 子命令：检测 `--asset-kind` → 选择 asset-create workflow + AssetModeContext domain | 0.5 天 | 中 |
| 7C.3 work-skeleton 增强：根据 `--asset-kind` 自动注入 asset-create workflow + 4 tasks | 0.5 天 | 中 |
| 7C.4 `oxn asset create` 改为 `oxn work create --asset-kind` 的 alias（保留 CLI 兼容）| 0.3 天 | 低 |
| 7C.5 文档：oxn-asset Skill `references/asset-creation.md` 改写（Asset 创建走完整 Work 流程）| 0.5 天 | 低 |
| 7C.6 单元测试（`work create --asset-kind` 完整 9 阶段）| 1 天 | 中 |
| 7C.7 集成测试（端到端：Asset 创建走完整 Work → final 产出 .oxn 文件）| 0.5 天 | 中 |
| 7C.8 changelog 写明：`--asset-kind` 从 1 秒变 5-15 秒 | 0.1 天 | 极低 |

**Phase C 总计**：~3.7 天

### Phase D：阶段缩减为 IAP 三阶段实体（决策 4）

| 任务 | 工作量 | 风险 |
|---|---|---|
| 7D.1 `docs/zh-cn/work.md` 全面重写（按 3 IAP 阶段重组 + §3-§11 调整）| 1 天 | 低（纯文档）|
| 7D.2 `.openxenon/assets/domains/WorkOrchestrationContext.md` 新增 "IAP 阶段实体" 概念 | 0.3 天 | 极低 |
| 7D.3 `oxn-work` Skill `SKILL.md` 改 3 阶段实体描述 | 0.3 天 | 低 |
| 7D.4 `oxn-work` Skill `references/8-phase-detail.md` 改 3 阶段 + 子步骤 + 衔接点 | 0.5 天 | 低 |
| 7D.5 `oxn work lock` 内部合并 validate（lock --dry-run 保留只校验不锁）| 0.5 天 | 中（需 work-validator 拆分出 validate-only 路径）|
| 7D.6 `oxn work validate` 改为 `lock --dry-run` 的 alias | 0.1 天 | 极低 |
| 7D.7 `oxn-work` Skill 阶段表更新（8 → 3 阶段实体）| 0.3 天 | 低 |
| 7D.8 单元测试（lock 内含 validate + lock --dry-run）| 0.5 天 | 低 |

**Phase D 总计**：~3.5 天

### 总体时间线

| Phase | 工作量 | 累计 | 目标版本 |
|---|---|---|---|
| Phase A（Round 缺陷）| 2.3 天 | 2.3 天 | v0.6.1-alpha.5 |
| Phase B（引用收敛）| 5.6 天 | 7.9 天 | v0.6.1-alpha.6 |
| Phase C（Asset 统一）| 3.7 天 | 11.6 天 | v0.6.1 |
| Phase D（阶段缩减）| 3.5 天 | 15.1 天 | v0.6.1（并行文档）|

**目标版本**：
- v0.6.1-alpha.5（Phase A）
- v0.6.1-alpha.6（Phase B）
- v0.6.1 收尾（Phase C + D，Phase D 主要文档，可与 C 并行）

---

## 8. 决策清单汇总

| # | 决策 | 选择 |
|---|---|---|
| 1 | Asset 创建 | 完整 9 阶段 IAP 闭环（`--asset-kind` 不旁路，选 asset-create workflow）|
| 2 | Work 引用 | 完全收敛到 Blueprint-only（删除 Track A + Track B 完全 wire + 强制 3 边界约束）|
| 3 | Round 切换 | 保持手动 + 修复缺陷（run 可重复 + maxIterations 硬限制）|
| 4 | Task 跨 Round | 保留不重置（codify 为 invariant）|
| 5 | Blueprint 强制约束 | 必须引用至少 1 Domain + 1 Workflow + 1 Stack |
| 6 | RFC 形式 | 统一一份 |
| 7 | **Work 阶段结构** | **缩减为 IAP 三阶段实体（Intent = create+add-task+lock; Align = run+submit; Proof = finalize）；子步骤可变，阶段边界稳定** |
| 8 | **validate 合并到 lock** | **`lock` 内部先 validate 再算 hash；`validate` 保留为 `lock --dry-run` 的 alias** |
| 9 | **submit 保持独立** | **不合并到 run（run 只启动状态机，submit 推进 task part）** |
| 5 | Blueprint 强制约束 | 必须引用至少 1 Domain + 1 Workflow + 1 Stack |
| 6 | RFC 形式 | 统一一份 |

---

## 9. 后续工作（v0.6.2+）

- **Phase D**（v0.6.2）：Insight 工程化（Round history → E4 Insight 推荐）
- **Phase E**（v0.7+）：external Registry + Asset 知识库
- **Phase F**（v0.8+）：Hall v0.5 可视化（Mermaid 渲染 Round 流程图）

---

## 参考

- v0.6 IAP 架构重构 RFC：`../.openxenon/docs/rfcs/v0.6-iap-refactor-rfc.md`
- 三边界框架 + Blueprint 提升 RFC：`./three-boundary-blueprint-elevation-rfc.md`
- v0.7 Work Closed Loop Draft：`./2026-07-09-v0.7-work-closed-loop-and-cleanup.md`
- ADR-0050 Onboarding via starter-work：`../.openxenon/docs/adrs/0050-onboarding-via-starter-work.md`
- ADR-0055 Blueprint 组合模板：`../.openxenon/docs/adrs/0055-blueprint-as-composition-template.md`
- ADR-0054 三边界框架：`../.openxenon/docs/adrs/0054-three-boundary-framework.md`
- docs/zh-cn/work.md §3 Round 描述（line 58-96）+ §11 Round Loop（line 465-545）