# /oxn-work — 发起 + 驱动 OpenXenon Work

## 目标

依据 Blueprint 创建一个 **Work + 至少一个 Task** 的工作区：
- `work.oxn` — workspace 编排器（声明 ref 池 + task DAG）
- `tasks/<name>/task.oxn` — 单 blueprint 执行 + 显式 align

本 Skill 覆盖 work + task 的**完整生命周期**（创建 + 状态机驱动）。v0.1 hard-switch 之后，原 `oxn-leader` 已并入 `oxn work`，无独立 leader skill。

> **状态机驱动**：用 `oxn work run / submit / status / context` — 一站式。

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

## 创建 Work + Task（五步）

### 步骤 1：创建 Domain（可选）

```bash
oxn domain create MemberContext
# 编辑 .openxenon/domains/member-context.oxn 填写 term/ban/invariant
oxn domain validate MemberContext
```

> 内容创作指南见 `/oxn-cli` Skill 的「Intent 创作最佳实践」章节。

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

会做：
- 校验 `--blueprint` 必须出现在 work.oxn 的 blueprint ref 列表（fail-fast）
- 校验 `--domain` 必须出现在 work.oxn 的 domain ref 列表（fail-fast）
- 生成 `works/<w>/tasks/<t>/task.oxn` 骨架

### 步骤 4：编辑 task 内容

```bash
oxn work task-edit \
  --work <w> --task <t> \
  --add-constraint "use_kebab_case" \
  --add-constraint "no_plaintext_password"
```

> **Part / Probe 的实际内容**（skill_context / acceptance / probe { prop / output }）通过**手写** `task.oxn` 完成。详见 `/oxn-cli` Skill 的「Intent 创作最佳实践 — Part / Probe 内联创作」。

### 步骤 5：驱动状态机

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
| 创建 work 骨架（含 task 块） | `oxn work create <w> --blueprint <bp>` |
| 列出 work 下所有 task | `oxn work list-tasks --work <w>` |
| 查看 task 状态 | `oxn work task-status --work <w> --task <t>` |
| 获取 AI 上下文（**全量隔离**） | `oxn work context --work <w> --task <t>` |
| 启动 work 状态机 | `oxn work run --work-file <work.oxn>` |
| 推进 task 内 part | `oxn work submit --work <w> --task <t>` |
| 查询 work 状态 | `oxn work status --work <w>` |

## work.oxn 4 大模式（AI 创作模板库）

> 下面 4 个模式对应 `src/oxn-dsl/examples/works/` 下的真实范例，可直接 fork 改写。

### 模式 1：单域单 task（explore 类）

**适用**：探索性工作（摸清一个域的结构 / 收集信息），不需要完整流水线。

**骨架**（参考 `examples/works/explore-dsl/work.oxn`）：

```oxn
work "explore-dsl" {
  context {
    goal = "探索 OXN DSL 语法结构，生成分析报告"
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
        "已读 src/oxn-dsl/langium/oxn.langium",
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

**骨架**（参考 `examples/works/develop-member/work.oxn`）：

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

**适用**：修复类工作流（diagnose → locate → fix → verify），每个 task 单独 inject 同一 domain。

**骨架**（参考 `examples/works/fix-issue/work.oxn`）：

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

**适用**：跨多个限界上下文的复合工作（注册 + 营销 + 订单）。

**骨架**（参考 `examples/works/onboarding/work.oxn`）：

```oxn
work "NewUserOnboarding" {
  context {
    goal = "完成新会员注册并发放欢迎福利"
    constraints = ["不能直接读订单库", "必须调用订单上下文的能力"]
    loop_policy { max_iterations = 5 }
  }

  // ✅ work 级声明多个 domain（资源池）
  domain "MemberContext"  ref "@prj/domains/MemberContext"
  domain "OrderContext"   ref "@prj/domains/OrderContext"
  blueprint "dev-workflow" ref "@prj/blueprints/dev-workflow"

  // ✅ task 按需 inject 1 个 domain（不是所有）
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

**口诀**：work 级声明 N 个 domain，每个 task 按需 inject 1 个。**context_map 用于显式声明跨域依赖**。

### 模式选择速查

| 你的需求 | 选哪个模式 | 关键标志 |
|---|---|---|
| 摸清一个域、写报告 | 模式 1（explore） | 1 task + 1 blueprint slot |
| 单域完整开发 | 模式 2（develop） | 1 task 多 part（= blueprint 多 slot） |
| bug 修复、流程化诊断 | 模式 3（fix） | N task 串行 deps |
| 跨多个限界上下文 | 模式 4（onboarding） | work 级 N domain + task 按需 inject |

## 反模式

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
