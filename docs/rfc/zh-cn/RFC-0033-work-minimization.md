---
entity: rfc
id: RFC-0033
theme: work-minimization
status: Accepted
date: 2026-08-23
accepted: 2026-08-23
accepted-at: 2026-08-23
synced-at: 2026-08-23
---

# RFC-0033: Work 极简化 — 删 PlanLock + Hash 绑定 submit

> **主题**：Work 生命周期从 6 步收敛到 3 步（create → run → submit）。删除 PlanLock 机制（其为 Proof 而生，Proof 已删则阻断价值消失）。Hash 语义重新定义：从"防漂移的锁"变成"submit 时刻的完成指纹"，记入 trace.jsonl，允许漂移但可观测。
> **来源**：2026-08-23 Work 做轻讨论（RFC-0032 Phase 4 完成后的架构收敛）
> **状态**：✅ **Accepted**（2026-08-23）— 决策已锁定，实施由后续 Work 承载。

## 决策要点

1. **D1 · 生命周期 3 步**：`create → run → submit`。删除 `validate`（并入 run 的 `--validate-only` 参数）、`lock`（PlanLock 整体删除）。`add-task` 降级为辅助工具（AI 可直接改 work.md 绕过）。

2. **D2 · PlanLock 整体删除**：PlanLock 为 Proof 而生（Proof 需要"不可篡改证据"就得先"锁住计划"）。Proof 已删（RFC-0032 D25），PlanLock 的阻断能力价值消失。`birth-cert.ts` 的 `planLock` 字段 + `plan-hash.ts` 的 `verifyPlanLock` 阻断逻辑 + `work-lock.ts` 全部删除。

3. **D3 · Hash 重新定义 = submit 时刻的完成指纹**：Hash 不再保护计划（work.md 可随便改），只在 submit（Task 完成登记）时算，作为"完成时刻的指纹"记入 trace.jsonl 的 SUBMIT 事件。语义：完成盖章，不是防改锁。

4. **D4 · DRIFT 可观测不阻断**：submit 时算 work.md hash → 对比上次 SUBMIT 事件的 hash → 不一致 append 一条 `ASSET_DRIFT` 事件到 trace.jsonl（不阻断 submit）。指纹数 = submit 次数；正常 1 Task 1 条指纹，多次 DRIFT = Blueprint 或 AI 遇到问题（可观测，不硬编码判断）。

5. **D5 · .work 与 .run 收敛**：`.work`（BirthCert）的 `assets[]`（资产引用 + fileHash 快照）并入 `.run/state.json` 或直接由 work.md 的 `## Use` 段承载（运行时读取）。`.work` 单文件删除，统一为 `.run/` 目录。`.run/frozen.json` 已随 RFC-0032 Phase 2 删除。

6. **D6 · Hash 载体 = trace.jsonl**：Hash 不存 state.json（state 只存运行时 status）。Hash 作为 trace.jsonl 事件属性存在。state.json 退化为纯运行时状态：`{ workName, status, tasks: [{taskName, status, ...}] }`。

7. **D7 · 演进与协作不分**：演进型 Work（改 Asset）与协作型 Work（写代码）走同一条 3 步路径。差异由 trace 的 DRIFT 事件频率自然涌现（演进型少 DRIFT，协作型可能多），不在路径上区分，不硬编码规则。

8. **D8 · Probe 是范围判断者，非 Work**：改 work.md 的合法性（改了已完成 Task？改了 acceptance？）由 Probe 结果涌现——Probe 用新 acceptance 检查产物，COMPLETED 即合法，DEVIATED 即不合法。Work 不判断"改得对不对"，只记录"改了"（DRIFT）+ "Probe 结果"。禁止硬编码"已完成 Task 不能改"等规则（会变僵尸功能）。

## Hash 语义对照

| 维度 | 旧（PlanLock 思路，RFC-0032 前） | 新（本 RFC） |
|---|---|---|
| Hash 保护对象 | 计划（work.md 文件） | 无（不保护，允许改） |
| Hash 时机 | lock 时算基准 + run/submit 时验证 | 仅 submit 时算 |
| Hash 语义 | 防漂移的锁 | 完成时刻的指纹 |
| Hash 载体 | `.work.planLock`（state.json 外的单文件） | trace.jsonl 的 SUBMIT 事件属性 |
| 漂移处理 | 阻断（HASH_MISMATCH 拒绝 run/submit） | 记录（DRIFT 事件 append，不阻断） |
| 基准更新 | unlock → edit → re-lock（重流程） | submit 时自然覆盖（上次 submit hash 即基准） |

## 生命周期对照

```
旧（6 步）: create → add-task → validate → lock → run → submit
新（3 步）: create → run → submit
```

| 旧步骤 | 新状态 | 处置 |
|---|---|---|
| create | 保留 | 产出 work.md + context.md + blueprints.json + tasks/<t>/task.md + .run/state.json |
| add-task | 降级辅助 | AI 可直接改 work.md 的 ## Tasks 段；add-task 仅作模板生成器 |
| validate | 并入 run | `oxn work run <name> --validate-only`（只校验不执行） |
| lock | **删除** | PlanLock 整体删 |
| run | 保留 | 跑状态机 + append TASK/PART 事件 |
| submit | 保留 | 完成登记 + 算 hash 指纹 + append SUBMIT 事件 + DRIFT 检测 |

## 文件模型（收敛后）

```
.openxenon/works/<w>/
├── work.md              ← 静态计划（含 ## Context + ## Use + ## Tasks 全部 Task 定义）
├── context.md           ← Work 上下文
├── blueprints.json      ← 引用的 Blueprint 清单
├── tasks/
│   └── <t>/
│       ├── task.md      ← Task 专属上下文（可选，AI 可直接写 work.md）
│       └── context.md   ← Task 上下文（可选）
└── .run/
    ├── state.json       ← 纯运行时状态（status + tasks[].status，无 hash）
    └── trace.jsonl      ← 事件流（含 SUBMIT 事件带 hash + ASSET_DRIFT 事件）
```

**删除**：`.work`（BirthCert 单文件）、`.run/frozen.json`（已随 RFC-0032 删）、`.run/tasks/`（如有重复）。

## trace.jsonl 事件模型

### 保留事件类型
- `WORK_STARTED` / `TASK_STARTED` / `TASK_STATUS` / `PART_START` / `PART_COMPLETE` / `PROBE_RESULT`（现有）

### 新增事件类型

```jsonc
// submit 时算 hash，记完成指纹
{
  "event": "SUBMIT",
  "workName": "...",
  "taskName": "...",
  "partName": "...",
  "probeResult": "COMPLETED",         // 或 DEVIATED
  "workMdHash": "sha256:...",         // 本次 submit 时 work.md 的 hash
  "at": "2026-08-23T..."
}

// submit 时检测到 hash 变化（vs 上次 SUBMIT）
{
  "event": "ASSET_DRIFT",
  "workName": "...",
  "component": "workMd",              // 漂移组件（当前仅 workMd，因 Tasks 全在 work.md）
  "previousHash": "sha256:...",       // 上次 SUBMIT 的 hash
  "currentHash": "sha256:...",        // 本次 submit 的 hash
  "detectedAt": "2026-08-23T...",
  "submitIndex": 3                    // 第几次 submit 检测到
}
```

### 指纹语义

- 1 个 Task 正常 = 1 条 SUBMIT 事件（1 个完成指纹）
- 改过 work.md 再 submit = 1 条 ASSET_DRIFT + 1 条新 SUBMIT（旧指纹保留在 trace 历史，新指纹覆盖基准）
- 多次 ASSET_DRIFT = Blueprint 或 AI 遇到问题（可观测，不阻断，不硬编码判断）

## 影响范围

### 代码删除

| 路径 | 动作 |
|---|---|
| `packages/engine/src/Work/birth-cert.ts` | **删除 `planLock` 字段 + `PlanLockSchema` + `verifyPlanLock` + `setPlanLock` + `clearPlanLock`**；`assets[]` 保留（迁移到 state.json 或运行时读 work.md ## Use） |
| `packages/engine/src/Work/plan-hash.ts` | **保留 `hashWorkPlan` / `normalizeText` / `hashText`**（submit 时算 hash 复用）；删 `verifyPlanLock` 相关逻辑（在 birth-cert.ts） |
| `packages/engine/src/Work/work-lock.ts` | **整体删除**（lock/unlock 子命令的 engine 支持） |
| `packages/cli/src/commands/work.ts` | 删 `lock` / `unlock` / `validate` 子命令；`run` 加 `--validate-only` 参数；`submit` 加 hash 计算 + DRIFT 检测 + trace 事件 |
| `packages/engine/src/Work/dual-state-exec.ts` | 删 `verifyPlanLock` 调用点（run/submit 入口的阻断逻辑） |

### 代码修改

| 路径 | 动作 |
|---|---|
| `packages/cli/src/commands/work.ts` `submit` 子命令 | 加：submit 时调 `hashWorkPlan` 算 workMdHash → 读 trace 上次 SUBMIT 的 hash → 不一致 append ASSET_DRIFT → append SUBMIT 事件带 hash |
| `packages/cli/src/commands/work.ts` `run` 子命令 | 加 `--validate-only` 参数（调 validateAndWriteArtifacts，不跑状态机）；删 run 入口的 verifyPlanLock 阻断 |
| `packages/engine/src/Work/task-trace.ts` | 加 SUBMIT + ASSET_DRIFT 事件类型到 TraceEvent union |
| `.run/state.json` schema | 删 roundHistory / currentRound（Round 已删 RFC-0032）；保留 assets 快照（从 .work 迁入）或删（运行时读 work.md） |

### Domain 处理

| 文件 | 动作 |
|---|---|
| `oxn-work-domain.md` | 删 §PlanLock + Inv6PlanLockHashConsistency + Inv7LockThenNoDrift + Inv31ContextMDInPlanLock + Inv33TaskContextInPlanLock；§BirthCert 改为"运行时读 work.md ## Use，不存 .work"；§Loop 生命周期改为 create→run→submit；新增 §HashAsSubmitFingerprint term；新增 §DriftObservableNotBlocking term |
| `oxn-probe-domain.md` | Inv22ProbeFromBlueprint 保留（Probe 标准来自 Blueprint observe）；加备注：acceptance 即 Probe 标准，submit 时 Probe COMPLETED 才算完成 |

### Skill 同步

| 文件 | 动作 |
|---|---|
| `packages/cli/src/skills/locales/{zh-CN,en}/oxn-work/instruction.md` | 8 阶段 → 3 阶段；删 IAP 三阶段叙事 + finalize + Proof + frozen.json + ROUND_ALREADY_PASSED；CLI 白名单删 `lock/unlock/validate`，run 加 `--validate-only`；失败处理删 HASH_MISMATCH（改为 DRIFT 不阻断） |

### 文档更新

| 文件 | 动作 |
|---|---|
| `architecture.md` | §1 Work 行加"3 步生命周期 + Hash 绑定 submit"；§3 目录树删 `.work` |
| `README.md` + `introduction.md` | Work 生命周期表改 3 步 |
| `AGENTS.md` | 常用命令段同步 |

## 开放问题（实施时定）

| 问题 | 备注 |
|---|---|
| `.work` 的 `assets[]` 迁移目标 | 选项：(a) 并入 state.json 的 `assets` 字段；(b) 运行时直接读 work.md ## Use 段（不存冗余）。倾向 (b)（单一真相源） |
| `--validate-only` 的输出 | 复用现有 validateAndWriteArtifacts 的输出格式 |
| 旧 Work 迁移 | `.work` 文件存在但无 planLock 的旧 Work：读时忽略 .work，从 work.md 重建状态；不做 schema migration |
| trace 上次 SUBMIT hash 读取 | 选项：(a) 逆序读 trace.jsonl 找最后一条 SUBMIT；(b) state.json 存 lastSubmitHash 缓存。倾向 (a)（trace 是真相源，state 不存 hash） |

## 相关术语

- Work（DAG 协作空间，3 步生命周期）— [`oxn-work-domain`](../../../.openxenon/assets/domains/oxn-work-domain.md)
- HashAsSubmitFingerprint（submit 时刻的完成指纹）— 本 RFC D3
- DriftObservableNotBlocking（漂移可观测不阻断）— 本 RFC D4
- Probe（完成判断者，Engine 工具能力）— [`oxn-probe-domain`](../../../.openxenon/assets/domains/oxn-probe-domain.md) + RFC-0032 D27

## 相关决策

- **RFC-0032 D25**：Proof 删除 — 本 RFC D2 的前提（PlanLock 为 Proof 而生，Proof 删则 PlanLock 删）
- **RFC-0032 D27**：Probe 保留为 Engine 能力 — 本 RFC D8 的基础（Probe 是范围判断者）
- **RFC-0032 D13**：Work 记录协作过程是自身职责 — 本 RFC D6 的基础（trace 记事实，Hash 是事实属性）
- **RFC-0032 D6**：Round 删除 — 本 RFC state.json 删 roundHistory 的前提
- **RFC-0032 D10**：IAP 退役到理念叙事层 — 本 RFC Skill 删 IAP 三阶段叙事的基础

## 退役机制

| 机制 | 退役原因 | 替代 |
|---|---|---|
| PlanLock 5-hash 阻断 | 为 Proof 而生，Proof 已删 | submit 时 hash 指纹 + DRIFT 事件（可观测不阻断） |
| `.work` BirthCert 单文件 | planLock 删后只剩 assets[] 冗余 | work.md ## Use 段（运行时读） |
| `oxn work lock/unlock` 命令 | PlanLock 删 | 无（3 步生命周期无 lock 步） |
| `oxn work validate` 独立命令 | 无独立性（run 内部已调） | `oxn work run --validate-only` |
| state.json 存 hash | Hash 语义变指纹（属 trace 事件） | trace.jsonl 的 SUBMIT 事件属性 |
| HASH_MISMATCH 阻断错误码 | 不再阻断 | ASSET_DRIFT 事件（记录不阻断） |

## Errata

<!-- status: Accepted 后冻结，仅可追加 errata 段 -->
