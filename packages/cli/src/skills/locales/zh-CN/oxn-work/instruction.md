# /oxn-work — Drive Work v0.7+

## 目标
建 **Work + ≥1 Task** 走 8 阶段：`create → add-task → validate → lock → run → submit → finalize`（`migrate?` 可选）

## 硬规则
- `validate`→`lock`→`run` 严格；无 `--force`
- lock 后漂移 = `HASH_MISMATCH`；OXN 不 commit/push
- Part/Probe 内联于 `task { part { probe {} } }`
- **v0.7+ PlanLock 5-hash**：lock 前必须写 `works/<w>/context.md` 与 `tasks/<t>/context.md`（inv-33）

## 范式
D=业务 Intent | B=技术 Intent | W=Align 编排 | T=Align 执行
- **AI Agent 通道内追踪边界**：AI 在 OXN 通道外做的事（读代码/试方案/放弃）OXN 不记录，仅工作上下文（context.md / memory.md）+ state.json + trace.jsonl + frozen.json 持久化（ADR-0084）

## 蓝图选择
| 需求 | 模板（.md 含 OXN 代码块）→ Blueprint |
|---|---|
| 摸清/报告 | `assets/work-explore.md` → `explore-analyze-report` |
| 单域开发 | `assets/work-develop.md` → `dev-workflow` |
| bug 修复 | `assets/work-fix.md` → `fix-issue` |
| 跨域 | `assets/work-onboarding.md` → `dev-workflow` (多 domain) |
| **MD 文档编写**（v0.7+ ADR-0089）| — → `md-author-blueprint` |

> v0.7+：Work 不再有 mode（task/explore/edit）；行为差异由 Blueprint slots/observe 承载。
> v0.7+：MD 文档编写场景用 `md-author-blueprint`（5 起手 Asset 之一）。

## 执行（v0.7+ AssetMap-driven Asset 选取）

1. **前置**：项目已 `oxn init`，所需 Asset 已就绪 — 若需创建/修改 Asset，**触发 `oxn-asset` Skill**。
2. **首次接入项目（v0.7+ ADR-0089）**：项目未 bootstrap 5 起手 Asset 时，触发 `oxn onboard` 流程：
   - 跑 `oxn onboard --detect --json` 探测项目状态
   - 解析探测结果 → 列 3 选项卡片（`A` 新项目 / `B1` 存量-Proof-First / `B2` 存量-探索建 Asset）
   - **等工程师确认选项** → 执行对应 `oxn onboard --new` / `--existing --proof-first` / `--existing --bootstrap`
   - Bootstrap 完成后（`.openxenon/.bootstrap-done` 标记存在），进入正常 Work 流程
3. **查 AssetMap 确定可用 Asset**（人机主动，非自动推荐）：
   - `oxn assetmap show <map> --scene <scene>` — 列出 scene 下的 Domain / Blueprint / Stack（`<map>` 默认 `oxn-system`；项目消费者可新建 `<project>-system`）
   - `oxn assetmap suggest --goal "<goal>" --scene <scene>` — 按关键词 jaccard 排序的候选
4. **人机分析，从 suggest 结果挑选**：
   - **Blueprint** — 1..N 个 pipeline（通常 1 个；多 blueprint 用于跨阶段不同流水线）
   - **Domain** — 1..N 个（Work 级声明，提供全局词汇；Task 级只能选其中 1 个）
   - **Stack** — 0..N 个（Work 级声明技术栈约束；不进 Task 层）
5. **fork 模板 + 改 work.md**（或用 `oxn work create` 直传）：
   ```bash
   oxn work create <name> \
     --blueprint <bp> \
     [--blueprint <bp2>] \
     --domain <d1> --domain <d2> \
     [--stack <s1>] \
     --goal "<goal>" \
     [--constraints "c1" "c2"]
   ```
   或手动 `fork assets/work-{explore,develop,fix,onboarding}.md → work.md` 自编辑 `## Refs` + `## Context`。
6. **走 8 阶段**：`references/8-phase-detail.md`
7. **报错**：`references/error-codes.md`

## 上下文注入（v0.7+ · Blueprint Context Template · 3-flag）

Work 启动后，AI Agent 必须通过 `oxn work inject` 获取完整上下文。设计参考：`.openxenon/drafts/design-blueprint-context-template.md`。

> **核心**：注入走 `oxn work inject` 子命令（3-flag），不是 `oxn work show`。show 是状态查询（返回 JSON/YAML 完整结构），inject 是 context-only 注入（Markdown 内容 + 轻量路径 JSON）。

### 注入命令速查

```bash
# Work 级（三件套）
oxn work inject <name> --paths      # 路径元数据（JSON）
oxn work inject <name> --context    # context.md 内容（Markdown）
oxn work inject <name> --memory     # memory.md 内容（Phase 2 前返回 null）

# Task 级（加 --task 限定）
oxn work inject <name> --task <t> --paths
oxn work inject <name> --task <t> --context
oxn work inject <name> --task <t> --memory

# 至少需要一个 flag；缺省 → OXN_CLI_INPUT_ERROR
```

### Work 级上下文注入（4 步）

```
1. oxn work inject <name> --paths
   → 返回 JSON：
     {
       work_md:    ".openxenon/works/<name>/work.md",
       context_md: ".openxenon/works/<name>/context.md",
       memory_md:  ".openxenon/works/<name>/memory.md",
       tasks: [
         { name: "dev", task_md: "...", context_md: "...", memory_md: "..." },
         { name: "doc", task_md: "...", context_md: "...", memory_md: "..." },
       ]
     }
   → AI Agent 拿到三件套路径，可选择性读文件

2. oxn work inject <name> --context
   → 输出 works/<name>/context.md 内容（Markdown，非 JSON）
   → AI Agent 拿到 WorkContext（PlanLock 锁定的静态结构骨架）
   → 若文件不存在 → OXN_INTENT_CONTEXT_MISSING（提示 AI 先写再 lock）

3. AI Agent 读 Blueprint ## Use 引用的所有 Domain/Workflow/Stack 文件
   → 自己判断哪些 Terms/Invariants 与本 Work Goal 相关
   → 不复制内容（Blueprint 保持纯净，参见 inv-26）

4. AI Agent 读 Blueprint ## Boundaries + ## Scope + ## Context Template
   → 理解 Slot 拓扑 + 文件边界 + 组装指令
```

### Task 级上下文注入（2 步）

```
Task 切换时：
5. oxn work inject <name> --task <t> --context
   → 输出 works/<name>/tasks/<t>/context.md 内容（Markdown）
   → AI Agent 拿到 TaskContext（PlanLock 锁定的 Per-Slot 子集）

6. oxn work inject <name> --task <t> --memory
   → 输出 works/<name>/tasks/<t>/memory.md 内容
   → Phase 2 前返回 null + 提示 "(memory.md not yet implemented — Phase 2)"
```

### 关键原则

- **语义内容用 Markdown**（context.md 是 LLM 原生格式，零解析开销）
- **元数据用 JSON**（`--paths` 返回轻量 JSON；key 用 snake_case：work_md / context_md / memory_md / task_md）
- **3-flag 注入**：`--paths` / `--context` / `--memory`，不用 `--with-context` 全量返回
- **不返回 Work 全部结构**（避免 token 膨胀 + LLM JSON 解析开销）
- **至少 1 个 flag**：无 flag 调用 → `OXN_CLI_INPUT_ERROR` 提示用 `--paths` 或 `--context`

### Task ## Artifacts 声明（inv-35 · lock 时 Scope 校验）

Task.md 写 `## Artifacts` 段声明预期产物路径，lock 时 Engine 校验 ⊆ Blueprint `## Scope.allow`：

```yaml
## Artifacts
  - path: packages/engine/src/Work/plan-hash.ts
    type: code
  - path: packages/engine/src/Work/birth-cert.ts
    type: code
  - path: packages/engine/src/__tests__/plan-hash-5hash.test.ts
    type: test
```

**type 取值**：`code` | `config` | `document` | `test`（来自 `enums.ts`）。

**校验规则**：
- 每个 Artifact path ⊆ Blueprint ## Scope.allow glob 列表
- 每个 Artifact path ∩ Blueprint ## Scope.forbid glob 列表 = ∅
- 缺省 Scope（allow=[]）→ 允许任意路径（向后兼容）

**校验失败** → `OXN_INTENT_SCOPE_VIOLATION` (YIELD_TO_HUMAN)，列出违规 path + Scope 段。AI Agent 应：
1. 修正 Task ## Artifacts 段（删除越界 path 或调整 path）
2. **不能改 Blueprint ## Scope 来绕过**（Scope 是 Blueprint 作者的边界声明）
3. 如确需越界 → 走 `oxn asset evolve` 派生新版本 Blueprint

### 写入 context.md 流程（Intent 阶段）

```
Step 1: oxn work create <name> --blueprint <bp>
        → 生成 work.md（Use + Tasks 结构 + Intent goal）

Step 2: oxn work add-task <name> --task <t> --blueprint <bp>
        → 生成 tasks/<t>/task.md（含 Parts + Refs + 🆕 ## Artifacts）

Step 3: AI Agent 读 Blueprint ## Context Template + ## Use refs
        → 自己判断从引用 Domain 取哪些 Terms/Invariants
        → 写 works/<name>/context.md（Work Context）
        → 按 Blueprint ## Boundaries 拆分 → 写 tasks/<t>/context.md（Task Context）

Step 4: oxn work validate <name>
        → 校验 Blueprint refs 解析 + Task ## Artifacts ⊆ Blueprint ## Scope.allow
        → 失败 → 看错误码（OXN_WORK_REFS_UNRESOLVED / OXN_INTENT_SCOPE_VIOLATION）修

Step 5: oxn work lock <name>
        → PlanLock 5-hash：
          workMdHash + workContextHash + blueprintsHash + tasksHash + taskContextsHash → allHash
        → context.md 不存在 → OXN_INTENT_CONTEXT_MISSING（必须先写）
        → 校验通过 → 写 planLock 到 .work
```

### 修改 context.md 流程

```
Step 1: oxn work unlock <name>
        → 清 planLock → 提示 "可编辑 work.md / context.md / tasks/<t>/task.md / tasks/<t>/context.md"

Step 2: 编辑 context.md / task context.md

Step 3: oxn work validate <name>
        → 重新校验 + 刷新 blueprints.json / .work

Step 4: oxn work lock <name>
        → 重新算 5-hash + 写 planLock
```

### PlanLock 5-hash 保障

- 同一 Blueprint 的 N 个 Work 的 WorkContext 结构一致（除 Goal 外）
- 跨 Work 比较 hash 一致 ⇒ 结构骨架一致
- lock 后漂移 → `IAP_ALIGN_LOCK_HASH_MISMATCH` (component='workContext' | 'taskContexts')
- 旧 3-hash `.work` 文件仍可读（向后兼容）

### 错误响应速查

| 错误码 | 触发 | AI 响应 |
|---|---|---|
| `OXN_INTENT_CONTEXT_MISSING` | lock 时 context.md 不存在 | 先写 `works/<name>/context.md` 再 lock |
| `OXN_INTENT_SCOPE_VIOLATION` | Task Artifact 越界 Scope | 修正 Task `## Artifacts` 段（不能改 Blueprint Scope） |
| `IAP_ALIGN_LOCK_HASH_MISMATCH` | lock 后 context.md / tasks/<t>/context.md 漂移 | 走 `oxn work unlock` → 确认改动 → re-lock |
| `OXN_CLI_INPUT_ERROR` | `oxn work inject <name>` 无 flag | 加 `--paths` / `--context` / `--memory` 重试 |

## 多 Asset 与 Tasks 的关系

- **Work 级 `## Refs`**：声明 domain[] + blueprint[] + stack[] ref 池（多个）
- **Task 级**：每个 task 在 `task.oxn` 内**单选** 1 blueprint + 1 domain（Work 级 ref 池的子集）
- **新增 task 校验**：task 选的 blueprint/domain **必须**在 Work 级 ref 池内（`add-task` 报错 `not declared in work`）
- **planLock 影响**：work 级多 ref 让 `domains.json` / `blueprints.json` slim 索引含 N 条 entry；hash 算法不变（hash 整个 .json）

## 错误
`LOCK_NOT_FOUND`/`HASH_MISMATCH` → YIELD | `TASK_OXN_MISSING` → `add-task` | `ROUND_ALREADY_PASSED` → `work finalize`

## 禁止
跳 validate+lock；锁后改 `.oxn`；废弃语法（`align|inject|noun|verb|new`）。

## v0.7+ Onboarding 触发规则（ADR-0089 D6）

**触发条件**：用户输入包含以下任一关键词时，先走 onboard 流程再决定下一步：
- "用 OXN 引导"、"OXN 引导"、"onboard me"、"set up OXN"、"use OXN"
- "5 分钟上手"、"quickstart"、"getting started"
- "在项目里用 OXN"、"add OXN to my project"

**Skill 内部执行流程**：
```
1. 调 `oxn onboard --detect --json`（detection，无副作用）
2. 解析返回数据：
   - projectType: 'new' | 'existing-empty' | 'existing-initialized' | 'existing-completed'
   - recommendation.path: 'A' | 'B1' | 'B2'
3. 在 UI 列出 3 选项卡片 + 当前 recommendation
4. **必须等工程师确认**（不能擅自决定）
5. 执行工程师选择的子命令：
   - 'A' → `oxn onboard --new`
   - 'B1' → `oxn onboard --existing --proof-first`
   - 'B2' → `oxn onboard --existing --bootstrap`
6. Bootstrap 完成后，进入正常 Work 流程
```

**禁止**：跳过 detect 直接选路径；擅自做工程师决策。
