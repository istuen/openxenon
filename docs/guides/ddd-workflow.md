# DDD 工作流（端到端示例）

> 通过 4 个内置 work 示例展示 **Intent-Align 范式** 在 explore / develop / fix 三类典型场景的应用。

## 1. 总览

| 示例 | 类别 | Domain | Blueprint | Task 数 | 串行？ |
|---|---|---|---|---|---|
| `explore-dsl` | 探索类 | dsl-context | explore-analyze-report | 1 | ❌ |
| `develop-member` | 开发类 | member-context | dev-workflow | 1 | ❌ |
| `fix-issue` | 修复类 | work-context | fix-issue | 4 | ✅ |
| `onboarding` | 综合 | member-context + order-context | dev-workflow | 2 | ❌ |

所有示例位于：`src/oxl/examples/works/`

## 2. explore-dsl：探索类

**目的**：探索 OXL 语法结构。注入 `dsl-context` 约束 AI 使用 `Grammar/Schema/Validator/Compiler` 而非 `ParserImpl/LexerImpl`。

```oxn
// .openxenon/domains/dsl-context.oxn（Intent）
domain "DSLContext" {
  description = "OXL 自身限界上下文"
  term {
    "Grammar":   "Langium 语法定义",
    "Schema":    "Zod 校验 schema",
    "Validator": "语法/语义校验器",
    "Compiler":  "把 .oxn 编译为 AssemblyIR"
  }
  ban { "ParserImpl", "LexerImpl", "GrammarFile" }
}
```

```oxn
// src/oxl/examples/works/explore-dsl/work.oxn（Align）
work "explore-dsl" {
  context {
    goal = "探索 OXL 语法结构, 生成分析报告";
    loop_policy { max_iterations = 3; }
  }
  domain "DSLContext"                ref "@prj/domains/dsl-context";
  blueprint "explore-analyze-report" ref "@prj/blueprints/explore-analyze-report";

  task "explore-dsl" {
    domain "DSLContext";
    blueprint "explore-analyze-report";

    part "explore" { skill_context = "..." }
    part "analyze" { skill_context = "..." }
    part "report"  { skill_context = "..." }
    deps = [];
  }
}
```

```bash
oxn work run    --work-file src/oxl/examples/works/explore-dsl/work.oxn --json
oxn work submit --work-name explore-dsl --task explore-dsl --json
oxn work context   --work explore-dsl --task explore-dsl --json
```

**AI 关键约束**：用 `Grammar` 不写 `ParserImpl`。

## 3. develop-member：开发类

**目的**：实现新会员注册。注入 `member-context` 强制 AI 用 `Member` 而非 `User`/`Customer`。

```oxn
// .openxenon/domains/member-context.oxn（Intent）
domain "MemberContext" {
  description = "会员限界上下文"
  term {
    "Member": "注册会员实体",
    "Account": "会员的登录凭证"
  }
  ban { "User", "Customer", "AccountHolder" }
  invariant { "密码任何时候都不能明文存储" }
}
```

```oxn
// src/oxl/examples/works/develop-member/work.oxn（Align）
work "develop-member" {
  context {
    goal = "实现新会员注册功能";
    loop_policy { max_iterations = 5; }
  }
  domain "MemberContext"  ref "@prj/domains/member-context";
  blueprint "dev-workflow" ref "@prj/blueprints/dev-workflow";

  task "register-member" {
    domain "MemberContext";
    blueprint "dev-workflow";

    part "build"  { skill_context = "实现 Member 注册 API" }
    part "test"   { skill_context = "写 Member 注册测试" }
    part "verify" { skill_context = "运行 Member 注册验证" }
    deps = [];
  }
}
```

```bash
oxn work run    --work-file src/oxl/examples/works/develop-member/work.oxn --json
oxn work submit --work-name develop-member --task register-member --json
oxn work context   --work develop-member --task register-member --json
```

**AI 关键约束**：用 `Member` 不用 `User`。

## 4. fix-issue：修复类

**目的**：4 task 串行编排（diagnose → locate → fix → verify），每个 task 单独 inject `work-context`。

```oxn
// .openxenon/domains/work-context.oxn（Intent）
domain "WorkContext" {
  description = "任务执行沙盒"
  term {
    "Work": "工程师的意图沙盒",
    "Task": "执行单元",
    "Frozen": "验证后只读判决"
  }
  invariant { "frozen.json 只读" }
  invariant { "trace 追加写" }
}
```

```oxn
// src/oxl/examples/works/fix-issue/work.oxn（Align）
work "fix-issue" {
  context {
    goal = "修复 work state 在 submit 后未及时持久化的 bug";
    loop_policy { max_iterations = 5; }
  }
  domain "WorkContext"  ref "@prj/domains/work-context";
  blueprint "fix-issue" ref "@prj/blueprints/fix-issue";

  task "diagnose" {
    domain "WorkContext";
    blueprint "fix-issue";
    part "diagnose" { skill_context = "诊断 bug 现象" }
    deps = [];
  }
  task "locate" {
    domain "WorkContext";
    blueprint "fix-issue";
    part "locate" { skill_context = "定位 bug 代码位置" }
    deps = ["diagnose"];
  }
  task "fix" {
    domain "WorkContext";
    blueprint "fix-issue";
    part "fix" { skill_context = "实施修复" }
    deps = ["locate"];
  }
  task "verify" {
    domain "WorkContext";
    blueprint "fix-issue";
    part "verify" { skill_context = "验证修复结果" }
    deps = ["fix"];
  }
}
```

```bash
oxn work run --work-file src/oxl/examples/works/fix-issue/work.oxn --json
# 依次 submit 四个 task
oxn work submit --work-name fix-issue --task diagnose --json
oxn work submit --work-name fix-issue --task locate   --json
oxn work submit --work-name fix-issue --task fix      --json
oxn work submit --work-name fix-issue --task verify   --json
oxn work status --work-name fix-issue --json
```

**AI 关键约束**：Artifact 路径不可改。

## 5. onboarding：综合

**目的**：跨域编排（MemberContext + OrderContext），2 task 并行。

```oxn
// src/oxl/examples/works/onboarding/work.oxn（Align）
work "Onboarding" {
  context {
    goal = "完成新会员注册并发放欢迎福利";
    constraints = ["不能直接读订单库", "必须调用订单上下文的能力"];
    loop_policy { max_iterations = 5 }
  }

  domain "MemberContext"  ref "@prj/domains/member-context";
  domain "OrderContext"   ref "@prj/domains/order-context";
  blueprint "dev-workflow" ref "@prj/blueprints/dev-workflow";

  task "RegisterMember" {
    domain "MemberContext";
    blueprint "dev-workflow";
    part "build" { skill_context = "实现 Member 注册" }
    part "test"  { skill_context = "测试 Member 注册" }
    deps = [];
  }

  task "GrantWelcomeBonus" {
    domain "OrderContext";     // 跨域：用 Order 的能力
    blueprint "dev-workflow";
    part "build" { skill_context = "发放欢迎福利" }
    deps = ["RegisterMember"];
  }
}
```

```bash
oxn work run --work-file src/oxl/examples/works/onboarding/work.oxn --json
oxn work submit --work-name onboarding --task RegisterMember --json
oxn work submit --work-name onboarding --task GrantWelcomeBonus --json
oxn work status --work-name onboarding --json
```

**AI 关键约束**：
- `RegisterMember` 任务只看 MemberContext（不能看 OrderContext）
- `GrantWelcomeBonus` 任务只看 OrderContext（通过 deps 触发）

## 6. 三类对比

| 维度 | explore-dsl | develop-member | fix-issue | onboarding |
|---|---|---|---|---|
| 类别 | 探索 | 开发 | 修复 | 综合 |
| Domain 数 | 1 | 1 | 1 | 2（跨域） |
| Blueprint slot 数 | 3 | 3 | 4 | 3 |
| Task 数 | 1 | 1 | 4 | 2 |
| 串行编排 | ❌ | ❌ | ✅ | ✅（deps） |
| 跨域 | ❌ | ❌ | ❌ | ✅ |
| AI 关键约束 | 用 Grammar | 用 Member | 路径不可改 | 各 task 独立 align |

## 7. 跑通所有示例

```bash
# 1. 跑 onboarding
oxn work run --work-file src/oxl/examples/works/onboarding/work.oxn --json

# 2. 跑 develop-member
oxn work run --work-file src/oxl/examples/works/develop-member/work.oxn --json

# 3. 跑 fix-issue（4 个 task 串行）
oxn work run --work-file src/oxl/examples/works/fix-issue/work.oxn --json
# 依次 submit 4 个 task

# 4. 跑 explore-dsl
oxn work run --work-file src/oxl/examples/works/explore-dsl/work.oxn --json
```

每个示例的 work.oxn + task.oxn 都已在仓库 `src/oxl/examples/works/` 中。

## 8. 下一章

- [故障排查](./troubleshooting.md)
- [CLI 命令参考](../reference/cli-reference.md)
