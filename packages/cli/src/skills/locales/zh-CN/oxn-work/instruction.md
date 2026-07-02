# /oxn-work — 发起 + 驱动 OpenXenon Work v1.1

## 目标

依据 Blueprint 创建一个 **Work + 至少一个 Task** 的工作区，并在 v1.1 hard-switch 之后强制走 8 阶段流程：
- `work.oxn` — workspace 编排器（声明 ref 池 + task DAG）
- `tasks/<name>/task.oxn` — 单 blueprint 执行 + 显式 align

v1.1 hard-switch 之后，原 `oxn-leader` 已并入 `oxn work`，无独立 leader skill。

> **v1.1 升级要点**：所有 work 操作必须先 `work validate` 写 `.work` 静态门禁卡，再 `work lock` 锁住，然后才能 `work run`。Lock 后任何 `.oxn` 资产漂移 = `IAP_ALIGN_LOCK_HASH_MISMATCH`。

## 前置条件

- 已在 OXN 项目根目录
- 项目已 `oxn init` 初始化（存在 `.openxenon/` 边界）
- 必须有 Blueprint（位于 `.openxenon/blueprints/<name>.oxn`），用 `oxn blueprint create` 创建
- **可选**：有 DDD Domain（位于 `.openxenon/domains/<kebab>.oxn`），用 `oxn domain create` 创建

## Intent-Align 范式提醒

- **Domain** = 业务 Intent（term/ban/invariant）
- **Blueprint** = 技术 Intent（slot 拓扑）
- **Work** = Align 编排器（声明 ref 池）
- **Task** = Align 执行单元（align 1 blueprint + N domains）
- **Part / Probe** = **不是独立资产**，**内联**在 `task { part { probe {} } }` 块里

## v1.1 8 阶段流程图

```
init → migrate → create → add-task → validate → lock → run → submit → finalize
                                              │         │
                                              ▼         ▼
                                          .work      .work.planLock
                                       静态门禁卡    4 组件 hash
                                                  (workOxn/workDomains/
                                                   blueprints/tasks +
                                                   allHash)
                                                  锁后任何漂移 →
                                                  IAP_ALIGN_LOCK_HASH_MISMATCH
```

**8 阶段详解**：
- **0**: `oxn work migrate`（V0→V1 布局迁移，PR-10；新建 work 可跳过）
- **1**: `oxn work create`（建 work 骨架）
- **2**: `oxn work add-task`（建至少 1 个 task.oxn）
- **3**: `oxn work validate`（校验 work.oxn + 写 `.work`）
- **4**: `oxn work lock`（锁住：写 planLock + 4 组件 hash）
- **5**: `oxn work run`（启动状态机；要求 lock 完成）
- **6**: `oxn work submit`（推进 task 内 part）
- **7**: `oxn work status`（查询 work 状态）
- **8**: `oxn work finalize`（收口：汇总所有 round + 写最终状态）

## 创建 Work + Task（v1.1 8 步）

### 步骤 0（V0→V1 迁移，可选）：`oxn work migrate`

```bash
oxn work migrate <work-name>
# 把 V0 布局 works/<w>/work-state.json 等迁移到 V1 布局 .run/
# 原 V0 文件备份到 .migrated-v0/（不删，留审计）
```

### 步骤 1：创建 Domain（可选）

```bash
oxn domain create MemberContext
oxn domain validate MemberContext
```

### 步骤 2：创建 Work 编排

```bash
oxn work create <work-name> --blueprint <bp>
# 编辑 .openxenon/works/<work>/work.oxn
```

或手写：

```oxn
work "MyFeature" {
  context { goal = "..."; constraints = []; loop_policy { max_iterations = 3 } }
  domain "MemberContext"   ref "@prj/domains/MemberContext";
  blueprint "dev-workflow" ref "@prj/blueprints/dev-workflow";
  task "step1" {
    domain "MemberContext";
    blueprint "dev-workflow";
    part "build" { skill_context = "..." }
    deps = [];
  }
}
```

### 步骤 3：创建至少一个 Task

```bash
oxn work add-task \
  --work <work-name> \
  --task-name <task-name> \
  --blueprint <blueprint-name> \
  [--domain <DomainName>]
```

### 步骤 4：编辑 task 内容（手写 `task.oxn`）

### 步骤 5：`work validate`

```bash
oxn work validate <work-name> --json
# 校验 work.oxn + 写 .work 静态门禁卡（assets 快照：域/蓝图 fileHash）
# planLock 此时为 null（未锁）
```

### 步骤 6：`work lock`

```bash
oxn work lock <work-name> --json
# 计算 4 组件 hash：
#   workOxnHash      = SHA-256(work.oxn)
#   workDomainsHash  = SHA-256(concatenated domain.oxn files)
#   blueprintsHash   = SHA-256(concatenated blueprint.oxn files)
#   tasksHash        = SHA-256(concatenated task.oxn files)
# 写入 .work.planLock + allHash
# 锁后任何 .oxn 资产漂移 = IAP_ALIGN_LOCK_HASH_MISMATCH
```

`oxn work unlock`（解锁，清 planLock 保留 assets）

### 步骤 7：驱动状态机

```bash
oxn work run --work-file <work>/work.oxn --json
oxn work submit --work <w> --task <t> --json
oxn work status --work <w> --json
```

## 参考命令

| 想做什么 | 命令 |
|---|---|
| 初始化项目边界 | `oxn init` |
| 创建一个 Blueprint 骨架 | `oxn blueprint create <name> [--slots <list>]` |
| 创建一个 Domain 骨架 | `oxn domain create <Name>` |
| 验证 Blueprint / Domain | `oxn {blueprint,domain} validate <name>` |
| 列出所有 Domain | `oxn domain list` |
| **v1.1 V0→V1 布局迁移** | `oxn work migrate <w>` |
| 创建 work 骨架（含 task 块） | `oxn work create <w> --blueprint <bp>` |
| 列出 work 下所有 task | `oxn work list-tasks --work <w>` |
| 查看 task 状态 | `oxn work task-status --work <w> --task <t>` |
| 获取 AI 上下文（**全量隔离**） | `oxn work context --work <w> --task <t>` |
| **v1.1 校验 work.oxn + 写 .work** | `oxn work validate <w>` |
| **v1.1 锁 work（planLock + 4 组件 hash）** | `oxn work lock <w>` |
| **v1.1 解锁 work** | `oxn work unlock <w>` |
| 启动 work 状态机 | `oxn work run --work-file <work.oxn>` |
| 推进 task 内 part | `oxn work submit --work <w> --task <t>` |
| 查询 work 状态 | `oxn work status --work <w>` |

## V0→V1 路径映射

v1.1 把 work 运行时状态从 work.oxn 同级目录搬到 `.run/` 子目录，方便 lock 守卫写静态卡：

| V0 路径 | V1 路径 |
|---|---|
| `works/<w>/work-state.json` | `works/<w>/.run/state.json` |
| `works/<w>/work-trace.jsonl` | `works/<w>/.run/trace.jsonl` |
| `works/<w>/work-frozen.json` | `works/<w>/.run/frozen.json` |
| `works/<w>/tasks/<t>/task-state.json` | `works/<w>/tasks/<t>/state.json` |
| `works/<w>/tasks/<t>/task-trace.jsonl` | `works/<w>/tasks/<t>/trace.jsonl` |
| `works/<w>/tasks/<t>/task-frozen.json` | `works/<w>/tasks/<t>/frozen.json` |
| （无） | `works/<w>/.work`（静态门禁卡） |
| （无） | `works/<w>/.migrated-v0/<rel>`（V0 备份） |

更紧凑表达（grep 模式）：
- V0: `works/<w>/work-{state,trace,frozen}.{json,jsonl}`
- V1: `works/<w>/.run/{state,trace,frozen}.{json,jsonl}`

迁移工具：`oxn work migrate <w>`（V0 备份到 `.migrated-v0/` 供审计，不删）。

## v1.1 错误处理速查

| 错误码 | 触发条件 | 行动 |
|---|---|---|
| `IAP_ALIGN_CHECKLIST_MISSING` | task.part.intent_checklist 必填缺失 | YIELD_TO_HUMAN |
| `IAP_ALIGN_LOCK_NOT_FOUND` | .work.planLock 缺失/未锁 | YIELD_TO_HUMAN：未调 `oxn work lock` / init 缺失 |
| `IAP_ALIGN_LOCK_HASH_MISMATCH` | 4 组件 hash 之一漂移（workOxn/workDomains/blueprints/tasks） | YIELD_TO_HUMAN：context.component 字段定位漂移源 |
| `IAP_ALIGN_WORK_REMOVED` | work.oxn 失踪但 .work 还在（锁后被破坏） | YIELD_TO_HUMAN（区别于 WORK_NOT_FOUND：两个都无） |
| `OXN_ROUND_ALREADY_PASSED` | 已 PASSED 仍调 next-round | YIELD_TO_HUMAN：调 `oxn work finalize` 收口 |
| `OXN_ROUND_VERDICT_INVALID` | `--verdict` 值不在 PASSED/FAILED/INCONCLUSIVE | 修命令参数 |

三剑客守卫次序：先校验 planLock 存在 → 再校验 4 组件 hash → 最后校验 work.oxn 存在。

## 反模式

- **不要跳过 validate+lock 直接 run** — 触发 `IAP_ALIGN_LOCK_NOT_FOUND`
- **不要绕过 lock 守卫跑生产** — 无 `--force` 后门
- **不要在锁后修改 .oxn** — 触发 `IAP_ALIGN_LOCK_HASH_MISMATCH`（planLock 已冻 4 组件 hash）
- **不要删 .work 文件** — 丢失静态门禁卡 = LOCK_NOT_FOUND
- **不要先 submit 后 run** — `work run` 是 setup，`submit` 是 advance
- **不要跳过 task 创建** — `work run` 会 fail-fast 拦截（`OXN_TASK_OXN_MISSING`）
- **不要在 work.oxn 引用 task.oxn 不存在的 task 名** — `work run` 校验失败
- **不要把 ref 与 align 混为一谈** — `domain "X" ref "..."` 是 work 级声明，task 内 `domain "X"` 是 align
- **不要在 task 块外加 `part` 字段** — part 必须嵌套在 task 块内
- **不要写 `task "X" align "Y.Z"`** — 已废弃，改为 `task "X" { blueprint "Y"; part "Z" }`
- **不要写 `inject "X"`** — 已废弃，改为 task 内 `domain "X"`
- **不要在 Domain 用 `noun`/`verb`/`domain_rules`** — 改为 `term`/`ban`/`invariant`
- **不要在 Blueprint 加 `expectation`/`rule` 块** — 已删除，验证由 Probe 承担
- **不要写 `work "X" ref "@oxn/blueprints/Y"`** — 已废弃，改为 `blueprint "Y" ref "...";` 声明
- **不要写 `oxn work new`** — 改用 `oxn work create`
- **不要试图 `oxn part new` / `oxn probe new`** — Part / Probe **不是独立资产**，在 task 块内联写

## .work 静态门禁卡（v1.1 新增）

**v1.1 新增** `.work` 静态门禁卡：planLock（4 组件 hash）+ assets（域/蓝图 fileHash）+ context（goal/constraints/maxIterations）+ diagnostics（PR-14 软警告）。写一次后只读。

```json
{
  "planLock": {
    "workOxnHash":     "64-hex SHA-256",
    "workDomainsHash": "64-hex SHA-256",
    "blueprintsHash":  "64-hex SHA-256",
    "tasksHash":        "64-hex SHA-256",
    "allHash":          "64-hex SHA-256（4 组件综合）"
  },
  "assets": { "domains": [...], "blueprints": [...] },
  "context": { "goal": "...", "constraints": [...], "maxIterations": 5 }
}
```

`planLock` 内 `workOxnHash` / `workDomainsHash` / `blueprintsHash` / `tasksHash` / `allHash` 与 4 组件 hash 一起做 lock 守卫。

## work.oxn 4 大模式（AI 创作模板库）

> 下面 4 个模式对应 `src/oxl/examples/works/` 下的真实范例，可直接 fork 改写。

### 模式 1：单域单 task（explore 类）

**适用**：探索性工作（摸清一个域的结构 / 收集信息），不需要完整流水线。

**骨架**（参考 `examples/works/explore-dsl/work.oxn`）：

```oxn
work "explore-dsl" {
  context {
    goal = "探索 OXL 语法结构，生成分析报告"
    constraints = ["使用 oxn 命令而非直接读源码"]
    loop_policy { max_iterations = 3 }
  }
  domain "DSLContext" ref "@prj/domains/dsl-context"
  blueprint "explore-analyze-report" ref "@prj/blueprints/explore-analyze-report"

  task "explore" {
    domain "DSLContext"
    blueprint "explore-analyze-report"
    deps = []
    part "explore" {
      skill_context = "探索 grammar/schema/validator/compiler 四个子模块"
      acceptance = [
        "已读 src/oxl/langium-driver/oxn.langium",
        "已用 oxn dev compile 跑通一个范例",
        "输出 .openxenon/works/<w>/report.md"
      ]
    }
  }
}
```

**口诀**：1 work + 1 task + 1 domain + 1 blueprint（slot 数 = task 数）。

### 模式 2：单域多 part（develop 类）

**适用**：单域深度开发（一个限界上下文内的完整实现）。

```oxn
work "develop-member" {
  context {
    goal = "实现新会员注册功能"
    constraints = [
      "必须使用 MemberContext.term.Member，不能用 User/Customer",
      "密码必须 hash 后存储"
    ]
    loop_policy { max_iterations = 5 }
  }
  domain "MemberContext" ref "@prj/domains/member-context"
  blueprint "dev-workflow" ref "@prj/blueprints/dev-workflow"

  task "register-member" {
    domain "MemberContext"
    blueprint "dev-workflow"
    deps = []
    part "develop" { skill_context = "实现 Member 注册功能" }
    part "test"    { skill_context = "为 Member 注册写单测" }
    part "verify"  { skill_context = "端到端验证注册流程" }
  }
}
```

**口诀**：1 work + 1 task（带多 part，对齐 blueprint 的多个 slot）+ 1 domain。Part 数 = Blueprint slot 数。

### 模式 3：多 task 串行（fix 类）

```oxn
work "fix-issue" {
  context {
    goal = "修复 work state 在 submit 后未及时持久化的 bug"
    constraints = ["不破坏现有 leader 状态机", "frozen.json 路径不能改"]
    loop_policy { max_iterations = 5 }
  }
  domain "WorkContext" ref "@prj/domains/work-context"
  blueprint "fix-issue" ref "@prj/blueprints/fix-issue"

  task "diagnose" { domain "WorkContext"; blueprint "fix-issue"; deps = []
    part "diagnose" { skill_context = "复现 bug，记录现场" }
  }
  task "locate"   { domain "WorkContext"; blueprint "fix-issue"; deps = ["diagnose"]
    part "locate" { skill_context = "定位根本原因" }
  }
  task "fix"      { domain "WorkContext"; blueprint "fix-issue"; deps = ["locate"]
    part "fix" { skill_context = "实施修复方案" }
  }
  task "verify"   { domain "WorkContext"; blueprint "fix-issue"; deps = ["fix"]
    part "verify" { skill_context = "验证修复结果" }
  }
}
```

**口诀**：N task 链式 `deps`，每个 task align 同一个 blueprint 的不同 slot。Domain 共享。

### 模式 4：跨域编排（onboarding 类）

```oxn
work "NewUserOnboarding" {
  context {
    goal = "完成新会员注册并发放欢迎福利"
    constraints = ["不能直接读订单库", "必须调用订单上下文的能力"]
    loop_policy { max_iterations = 5 }
  }

  domain "MemberContext"  ref "@prj/domains/MemberContext"
  domain "OrderContext"   ref "@prj/domains/OrderContext"
  blueprint "dev-workflow" ref "@prj/blueprints/dev-workflow"

  task "RegisterMember" {
    domain "MemberContext"
    blueprint "dev-workflow"
    deps = []
    part "develop" {
      skill_context = "实现 Member 注册 API，密码必须加密"
    }
  }
}
```

**口诀**：work 级声明 N 个 domain，每个 task 按需 inject 1 个；domain 内部用 `term / ban / invariant` 三件套表达统一语言与硬规则；`invariant` 写法决策（1 条→单块单条 / 同主题→单块多条 / 异主题→多块按 `// ── <主题> ──` 分组）见 oxn-cli skill 的「invariant 写法决策树」章节，三者 IR 等价。

### 模式选择速查

| 你的需求 | 选哪个模式 | 关键标志 |
|---|---|---|
| 摸清一个域、写报告 | 模式 1（explore） | 1 task + 1 blueprint slot |
| 单域完整开发 | 模式 2（develop） | 1 task 多 part（= blueprint 多 slot） |
| bug 修复、流程化诊断 | 模式 3（fix） | N task 串行 deps |
| 跨多个限界上下文 | 模式 4（onboarding） | work 级 N domain + task 按需 inject |

## git 工作空间指引（v0.0.27+）

OXN 在 git worktree 场景下提供 **builtin `git-workflow` 蓝图**（`src/builtin/blueprints/git-workflow.oxn`），4 阶段 slot 全部对接 L1 git 适配器（`src/infra/git/workspace.ts`）+ 4 个 catalog 探针（`git-clean` / `git-branch-exists` / `git-status-clean` / `git-merge-feasible`）。

**核心边界**：**OXN 永远不替人 commit / push / merge**。它只观察并产出可合并性证据，让人类在 `git merge` 时消费。

### 派生 builtin 蓝图（标准 cp 约定）

```bash
oxn init
cp src/builtin/blueprints/git-workflow.oxn .openxenon/blueprints/git-workflow.oxn
oxn domain create ProgramContext          # 至少含 term: WorkingTree / Branch / MergeCommit
oxn blueprint validate git-workflow
```

### 与 work 8 阶段流程集成

```bash
oxn work create gw-feat-x --blueprint git-workflow
oxn work add-task gw-feat-x --task ship --blueprint git-workflow --domain ProgramContext
# 编辑 work.oxn + tasks/ship/task.oxn（4 part = 4 slot）
oxn work validate gw-feat-x --json
oxn work lock gw-feat-x --json
```

### 人工 git 操作（OXN 不参与）

```bash
git worktree add -b feat/gw-feat-x ../wt-feat-x
cd ../wt-feat-x && $EDITOR files && git add -A && git commit -m "feat: ..."
cd -
oxn work run gw-feat-x --json
oxn work submit gw-feat-x --task ship --json          # 4 次（4 part = 4 slot）
oxn work status gw-feat-x --json                       # overallStatus = passed
```

### 拿到可合并性证据（关键）

`oxn work context` 不暴露 `checkMergeFeasibility`（写工作空间 → 违反 OXN 不替人决策边界）。要拿到证据，**手工调探针**或读 L1 适配器：

```bash
# E2E 测试演示（src/cli/__tests__/work-git-workspace-e2e.test.ts）
#  调 checkMergeFeasibility(branch, 'main', worktreePath)：
#    → can_ff_merge / can_merge_clean / has_conflicts / dirty_worktree / unknown
```

### 不做的事

- ❌ `oxn work create --worktree`（方案 C，未实现）
- ❌ OXN 替人 commit / merge（哲学边界）
- ❌ 锁后漂移源 `.oxn`（不会触发 planLock — 锁的是 per-work slim 索引 `works/<w>/blueprints.json`）

### 进一步阅读

- 详细设计：`docs/architecture/git-workflow-workspace.md`
- 4 probe 注册：`src/kernel/verdicts/catalog.ts:390-491`
- L1 适配器：`src/infra/git/workspace.ts:1-317`
- E2E 端到端验证：`src/cli/__tests__/work-git-workspace-e2e.test.ts`
