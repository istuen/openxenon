---
title: 对齐轴
---

# 对齐轴

> Align 轴是 AI 的主权领域。AI 在 Intent 划定的边界内编排 Work / Task / Part，工程师审核，OXN 约束。

## What —— Align 轴的三层结构

| 实体 | 中文 | 职责 |
|---|---|---|
| Work | 工作 | 编排器：声明 ref 池（Domain / Blueprint 引用），编排 task DAG |
| Task | 任务 | 执行单元：1 个 Blueprint + N 个 Part |
| Part | 构件 | 对齐到 Blueprint slot 的执行步骤，含 `skill_context` + Probe |

```
Work
├── context { goal, constraints, loop_policy }
├── ref 池：domain "X" ref "..." / blueprint "Y" ref "..."
└── Task A
│   ├── domain + blueprint（align）
│   ├── Part "build"  { skill_context = "..." }
│   ├── Part "test"   { skill_context = "..." }
│   └── deps = []
└── Task B
    ├── domain + blueprint
    ├── Part "build"
    └── deps = ["Task A"]
```

---

## Work：编排器

Work 是"一次完整作业"的空间。它声明要用哪些 Domain / Blueprint，以及 Task 之间的依赖顺序。

```oxn
work "<name>" {
  context {
    goal        = "..."
    constraints = ["..."]
    loop_policy { max_iterations = 3 }
  }

  // 资源池：声明 Intent 端引用
  domain    "<DomainName>"    ref "@prj/domains/<DomainName>"
  blueprint "<BlueprintName>" ref "@prj/blueprints/<BlueprintName>"

  // 任务编排
  task "<TaskName>" {
    domain    "<DomainName>"
    blueprint "<BlueprintName>"

    part "<slot-name>" { skill_context = "..." }
    part "<slot-name>" { skill_context = "..." }

    deps = ["<other-task>", ...]
  }
}
```

**scope 寻址**：
- `@oxn`：内置资产（`@oxn/probes/shell-exec`）
- `@prj`：项目内资产（`@prj/domains/MemberContext`）

---

## Task + Part：执行单元

每个 Task 对齐 1 个 Blueprint 的多个 slot（通过 Part 表达）。Part 内的 `skill_context` 是 AI 看到的执行指令，Probe 是 AI **看不到**的验证标准。

```oxn
task "RegisterMember" {
  domain "MemberContext"
  blueprint "dev-workflow"

  part "build" {
    skill_context = "实现 Member 注册 API，密码必须加密"
    // probe { ... } — AI 不可见
  }
  part "test" {
    skill_context = "写 Member 注册的单元测试"
  }

  deps = []
}
```

**信息隐藏**：AI 只能看到 `skill_context`，看不到 Part 内的 Probe 配置。这防止 AI "针对验证标准优化"而非真正解决问题。详见 [Proof](./proof.md)。

---

## v1.1 8 阶段流程

v1.1 引入 `.work` 静态门禁卡 + `planLock` 锁定机制，锁后任何 `.oxn` 资产漂移都会触发 `IAP_ALIGN_LOCK_HASH_MISMATCH`。

```
create → add-task → validate → lock → run → submit → status
                      │         │
                      ▼         ▼
                   .work    .work.planLock
                静态门禁卡   4 组件 hash
```

### 步骤 1：创建工作区

```bash
oxn work create <work-name> --blueprint <blueprint-name>
# 对齐轴
```

### 步骤 2：创建任务

```bash
oxn work add-task \
  --work <work-name> \
  --task-name <task-name> \
  --blueprint <blueprint-name> \
  --domain <DomainName>
# 对齐轴
```

### 步骤 3：校验（写 .work 门禁卡）

```bash
oxn work validate <work-name> --json
# 对齐轴
# 对齐轴
```

### 步骤 4：锁定（计算 4 组件 hash）

```bash
oxn work lock <work-name> --json
# 对齐轴
# 对齐轴
# 对齐轴
# 对齐轴
# 对齐轴
# 对齐轴
```

锁后任何 `.oxn` 资产漂移 = `IAP_ALIGN_LOCK_HASH_MISMATCH`。解锁用 `oxn work unlock <w>`。

### 步骤 5：启动运行

```bash
oxn work run --work-file work.oxn --json
# 对齐轴
```

### 步骤 6：推进 Task

```bash
oxn work submit --work <w> --task <t> --json
# 对齐轴
```

### 步骤 7：查询状态

```bash
oxn work status --work <w> --json
```

---

## .work 静态门禁卡

`validate` 写入 `.work`，`lock` 写入 `.work.planLock`：

```json
{
  "planLock": {
    "workOxnHash":     "sha256-hex",
    "workDomainsHash": "sha256-hex",
    "blueprintsHash":  "sha256-hex",
    "tasksHash":       "sha256-hex",
    "allHash":         "sha256-hex"
  },
  "assets": { "domains": [...], "blueprints": [...] },
  "context": { "goal": "...", "constraints": [...], "maxIterations": 5 }
}
```

---

## 状态机

### Work 状态

```
CREATED → IN_PROGRESS → PASSED  (所有 task 通过)
                      → FAILED   (任一 task 失败)
```

### Task 状态

```
CREATED → RUNNING → PASSED  (所有 part 通过)
                  → FAILED   (任一 part 失败)
```

双层独立读写，故障时可独立恢复。详见旧 [State Schema](./reference/state-schema.md) （旧文档）。

---

## 4 大 Work 模式

### 模式 1：单域单 task（explore 类）

适用：探索性工作，1 work + 1 task + 1 domain + 1 blueprint。

```oxn
work "explore-dsl" {
  context { goal = "探索 OXL 语法结构"; loop_policy { max_iterations = 3 } }
  domain "DSLContext" ref "@prj/domains/dsl-context"
  blueprint "explore-analyze-report" ref "@prj/blueprints/explore-analyze-report"

  task "explore" {
    domain "DSLContext"
    blueprint "explore-analyze-report"
    deps = []
    part "explore" { skill_context = "探索 grammar/schema/validator 模块" }
  }
}
```

### 模式 2：单域多 part（develop 类）

适用：单域深度开发，1 task 多 part 对齐 Blueprint 多 slot。

```oxn
task "register-member" {
  domain "MemberContext"
  blueprint "dev-workflow"
  deps = []
  part "build"  { skill_context = "实现 Member 注册功能" }
  part "test"   { skill_context = "为 Member 注册写单测" }
  part "verify" { skill_context = "端到端验证注册流程" }
}
```

### 模式 3：多 task 串行（fix 类）

适用：bug 修复流程化诊断，N task 链式 deps。

```oxn
task "diagnose" { ... deps = [] }
task "locate"   { ... deps = ["diagnose"] }
task "fix"      { ... deps = ["locate"] }
task "verify"   { ... deps = ["fix"] }
```

### 模式 4：跨域编排（onboarding 类）

适用：跨多个限界上下文，work 级声明 N 个 domain，每个 task inject 1 个。

```oxn
work "NewUserOnboarding" {
  domain "MemberContext" ref "@prj/domains/MemberContext"
  domain "OrderContext"  ref "@prj/domains/OrderContext"
  blueprint "dev-workflow" ref "@prj/blueprints/dev-workflow"

  task "RegisterMember" { domain "MemberContext"; blueprint "dev-workflow"; ... }
  task "GrantBonus"     { domain "OrderContext";  blueprint "dev-workflow"; ... }
}
```

---

## 反模式

- **不要跳过 validate + lock 直接 run** — 触发 `IAP_ALIGN_LOCK_NOT_FOUND`
- **不要在 lock 后修改 .oxn** — 触发 `IAP_ALIGN_LOCK_HASH_MISMATCH`
- **不要先 submit 后 run** — `work run` 是 setup，`submit` 是 advance
- **不要把 ref 与 align 混为一谈** — `domain "X" ref "..."` 是 work 级声明，task 内 `domain "X"` 是 align
- **Part / Probe 不是独立资产** — 内联在 task 块里，不能用 `oxn part new` / `oxn probe new`

## → 参考

- [Intent](./intent.md) — Domain + Blueprint 怎么定义
- [Proof](./proof.md) — Probe 验收 + frozen.json
- [Recipes](./recipes.md) — 端到端真实案例
