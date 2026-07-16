---
redirectFrom:
  - /zh-cn/recipes.html
title: 实战案例
---

# 实战案例

> 5 个端到端实战案例：从单文件验证到跨域团队协作。每个 Recipe 可独立运行，完整源码在 `docs/examples/`。

## 选择你的 Recipe

| 场景 | Recipe | 模式 | 源码 |
|---|---|---|---|
| 第一次入门：验证一个文件 | [Recipe 1：单文件验证](#recipe-1单文件验证) | Proof-First | — |
| 单域完整开发 | [Recipe 2：开发新功能](#recipe-2开发新功能) | Develop | `examples/develop-member/` |
| 跨多个业务域 | [Recipe 3：跨域编排](#recipe-3跨域编排) | Onboarding | `examples/onboarding/` |
| Bug 修复流程化 | [Recipe 4：故障修复](#recipe-4故障修复) | Fix | `examples/fix-issue/` |
| 探索未知模块 | [Recipe 5：探索分析](#recipe-5探索分析) | Explore | `examples/explore-dsl/` |

---

## Recipe 1：单文件验证

**场景**：验证 AI 生成的 `dist/index.js` 存在且可运行。不涉及 Domain / Blueprint。

```bash
# 实战案例
oxn init

# 实战案例
oxn proof create check-build

# 实战案例
oxn proof probe add fs-exists --target ./dist/index.js
oxn proof probe add file-exports --target ./dist/index.js --export handler

# 实战案例

# 实战案例
oxn proof run check-build
# 实战案例
# 实战案例
# 实战案例

# 实战案例
oxn proof show check-build
cat .openxenon/proofs/check-build/frozen.json
```

**何时升级**：重复使用相同 Probe 组合时，升级到 [Recipe 2](#recipe-2开发新功能)。

---

## Recipe 2：开发新功能

**场景**：实现"会员注册"功能，用 Domain 约束术语、Blueprint 编排步骤。

### 步骤 1：定义 Domain

```bash
oxn domain create MemberContext
```

编辑 `.openxenon/domains/member-context.md`：

```oxn
domain "MemberContext" {
  description = "会员限界上下文"
  term {
    "Member":   "注册会员实体",
    "Register": "提交注册表单"
  }
  ban { "User", "Customer" }
  invariant { "密码任何时候都不能明文存储" }
}
```

```bash
oxn domain validate MemberContext
# 实战案例
```

### 步骤 2：定义 Blueprint

```bash
oxn blueprint create dev-workflow --slots build,test,verify
```

编辑 `.openxenon/blueprints/dev-workflow.md`（可选设置 DAG 依赖）。

```bash
oxn blueprint validate dev-workflow
```

### 步骤 3：创建 Work + Task

```bash
oxn work create develop-member --blueprint dev-workflow
```

编辑 `work.md`，添加 domain ref 与 task：

```oxn
work "develop-member" {
  context {
    goal = "实现新会员注册功能"
    constraints = ["必须使用 MemberContext.term.Member"]
    loop_policy { max_iterations = 5 }
  }
  domain "MemberContext" ref "@prj/domains/MemberContext"
  blueprint "dev-workflow" ref "@prj/blueprints/dev-workflow"

  task "register-member" {
    domain "MemberContext"
    blueprint "dev-workflow"
    deps = []
    part "build"  { skill_context = "实现 Member 注册 API" }
    part "test"   { skill_context = "为 Member 注册写单测" }
    part "verify" { skill_context = "端到端验证注册流程" }
  }
}
```

```bash
oxn work add-task --work develop-member --task-name register-member \
  --blueprint dev-workflow --domain MemberContext
```

### 步骤 4：锁定并运行

```bash
oxn work validate develop-member --json
oxn work lock develop-member --json
oxn work run develop-member --json

# 实战案例
oxn work submit --work develop-member --task register-member --json

# 实战案例
oxn work status --work develop-member --json
```

---

## Recipe 3：跨域编排

**场景**：新会员注册同时需要操作 OrderContext，两个限界上下文协作。

关键特征：work 级声明 N 个 domain ref，每个 task align 一个。

```oxn
work "NewUserOnboarding" {
  context {
    goal = "完成新会员注册并发放欢迎福利"
    constraints = ["不能直接读订单库"]
    loop_policy { max_iterations = 5 }
  }
  domain "MemberContext" ref "@prj/domains/MemberContext"
  domain "OrderContext"  ref "@prj/domains/OrderContext"
  blueprint "dev-workflow" ref "@prj/blueprints/dev-workflow"

  task "RegisterMember" {
    domain "MemberContext"
    blueprint "dev-workflow"
    deps = []
    part "build" { skill_context = "实现 Member 注册 API" }
  }

  task "GrantWelcomeBonus" {
    domain "OrderContext"
    blueprint "dev-workflow"
    deps = ["RegisterMember"]
    part "build" { skill_context = "根据 OrderContext 发放欢迎福利" }
  }
}
```

完整源码：[examples/onboarding/README.md](./examples/onboarding/README.md)

---

## Recipe 4：故障修复

**场景**：修复一个 bug，用多 task 链条做诊断 → 定位 → 修复 → 验证。

```oxn
work "fix-issue" {
  context {
    goal = "修复 work state 提交后未及时持久化的 bug"
    constraints = ["不破坏现有状态机"]
    loop_policy { max_iterations = 5 }
  }
  domain "WorkContext" ref "@prj/domains/WorkContext"
  blueprint "fix-issue" ref "@prj/blueprints/fix-issue"

  task "diagnose" { domain "WorkContext"; blueprint "fix-issue"; deps = []
    part "diagnose" { skill_context = "复现 bug，记录现场" }
  }
  task "locate" { domain "WorkContext"; blueprint "fix-issue"; deps = ["diagnose"]
    part "locate" { skill_context = "定位根本原因" }
  }
  task "fix" { domain "WorkContext"; blueprint "fix-issue"; deps = ["locate"]
    part "fix" { skill_context = "实施修复方案" }
  }
  task "verify" { domain "WorkContext"; blueprint "fix-issue"; deps = ["fix"]
    part "verify" { skill_context = "验证修复结果" }
  }
}
```

完整源码：[examples/fix-issue/README.md](./examples/fix-issue/README.md)

---

## Recipe 5：探索分析

**场景**：摸清一个模块的结构、写分析报告。最简单的 1 work + 1 task 模式。

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
      skill_context = "探索 grammar/schema/validator/compiler 四个模块"
    }
  }
}
```

完整源码：[examples/explore-dsl/README.md](./examples/explore-dsl/README.md)

---

## 模式选择速查

| 你的需求 | Recipe | 关键标志 |
|---|---|---|
| 第一次试水 | 1（单文件） | 1 个 Proof + 1-2 个 Probe |
| 单域开发 | 2（Develop） | 1 task 多 part（= blueprint 多 slot） |
| 跨域协作 | 3（Onboarding） | work 级 N domain + task 按需 inject |
| Bug 修复 | 4（Fix） | N task 串行 deps |
| 探索分析 | 5（Explore） | 1 task + 1 blueprint slot |

## → 参考

- [Intent](./intent.md) — Domain + Blueprint 怎么创建
- [Align](./align.md) — v1.1 8 阶段流程详解
- [DDD in Practice](./ddd-in-practice.md) — 何时升级到 Business Domain
