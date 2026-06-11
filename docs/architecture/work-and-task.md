# Work + Task 详解

> Work 与 Task 是 OpenXenon v0.1 的**编排与执行单元**（Align 端）。Work 负责"用什么 + 怎么连"，Task 负责"1 blueprint 的具体执行"。

> **代码物理归属**：Work 运行时位于 L2 Module（`src/work/`）；完整 L0-L3 分层与依赖规则见 [L0-L3 宪法](./l0-l3-constitution.md)。

## 1. 定位

| 实体 | 范式 | 职责 |
|---|---|---|
| **Work** | Align（编排） | 工程师的意图沙盒；声明用到的 domain/blueprint ref；编排 task DAG |
| **Task** | Align（执行） | 1 blueprint + N parts 的执行单元；align 到 blueprint 的具体 slot |
| **Part** | Align（细节） | Task 内的动态执行单元；align 到 blueprint 的 slot；含 skill_context + probe |

## 2. Work 结构

```oxn
work "<name>" {
  context {
    goal        = "...";
    constraints = ["..."];
    loop_policy { max_iterations = N; }
  }

  // 资源池：声明用到的 Intent 资源
  domain     "<DomainName>"     ref "@prj/domains/<DomainName>";
  blueprint  "<BlueprintName>"  ref "@prj/blueprints/<BlueprintName>";

  // 任务编排
  task "<TaskName>" {
    domain    "<DomainName>";
    blueprint "<BlueprintName>";

    part "<slot-name>" { skill_context = "..." }
    part "<slot-name>" { skill_context = "..." }

    deps = ["<other-task-name>", ...];
  }
}
```

## 3. Task 结构

```oxn
// .openxenon/works/<work>/tasks/<task>/task.oxn
task "<name>" {
  domain    "<DomainName>";        // 显式声明本 task 参与哪些 domain
  blueprint "<BlueprintName>";     // 必须出现在 work.oxn 的 blueprint ref 列表

  part "<slot-name>" {
    skill_context = "...";          // AI 看到的执行指令
    probe "<name>" ref "@oxn/probe/<name>" {   // v0.2 接入
      params = { ... }
    }
  }

  deps = ["<other-task>", ...];    // v0.1 仅文档化
}
```

## 4. 三层 ref 寻址

| 作用域 | 格式 | 含义 | 示例 |
|---|---|---|---|
| `@oxn` | `@oxn/<type>/<name>` | 内置资产（OpenXenon 自带） | `@oxn/probe/shell-exec` |
| `@prj` | `@prj/<type>/<name>` | 项目内资产（`.openxenon/<type>/<name>.oxn`） | `@prj/domains/MemberContext` |

**优先级**：`@prj` > `@oxn`（项目优先于内置；跨项目共享走 Git 仓库级别）

## 5. 完整示例

```oxn
// .openxenon/works/onboarding/work.oxn
work "Onboarding" {
  context {
    goal = "完成新会员注册并发放欢迎福利";
    constraints = ["不能直接读订单库", "必须调用订单上下文的能力"];
    loop_policy { max_iterations = 5 }
  }

  // 资源池（Intent 端 ref）
  domain "MemberContext"     ref "@prj/domains/MemberContext";
  domain "OrderContext"      ref "@prj/domains/OrderContext";
  blueprint "dev-workflow"   ref "@prj/blueprints/dev-workflow";

  // 任务编排（Align 端）
  task "RegisterMember" {
    domain "MemberContext";
    blueprint "dev-workflow";

    part "build" { skill_context = "实现 Member 注册 API，密码必须加密"; }
    part "test"  { skill_context = "写 Member 注册的单元测试"; }

    deps = [];
  }

  task "GrantWelcomeBonus" {
    domain "MemberContext";
    blueprint "dev-workflow";

    part "build" { skill_context = "发放新人福利" }

    deps = ["RegisterMember"];
  }
}
```

```oxn
// .openxenon/works/onboarding/tasks/register-member/task.oxn
task "register-member" {
  domain "MemberContext";
  blueprint "dev-workflow";

  part "build" {
    skill_context = "实现 Member 注册，遵循 Member 命名，禁用 User/Customer";
  }
  part "test" {
    skill_context = "写 Member 注册测试";
  }
}
```

## 6. 全量隔离（Full Isolation）

**核心设计**：`oxn work context --work X --task Y` 的输出**只包含该 task 显式 align 的 domain**。

```
work.oxn 声明:    domain ref [A, B, C]
task.oxn align:   domain "A"
get-context 输出:  只有 A 的 term/ban/invariant；B 和 C 不可见
```

**为什么**：
- AI 不被无关业务术语干扰
- 跨域操作必须显式声明（task 必须 align 到那个 domain）
- 业务边界在 AI 视角得到强制

**例外**：Work 级（不传 `--task`）的 `get-context` 返回 work 完整资源池，**不隔离**（用于 Work 编排视角）。

## 7. 物理布局

```
.openxenon/works/<work-name>/
├── work.oxn                  ← Work 编排器
├── state.json                ← WorkspaceState（work 级）
├── work-trace.jsonl          ← Work 级追加写 trace
├── CONTEXT.md                ← AI 上下文（自动生成，可读格式）
└── tasks/
    └── <task-name>/
        ├── task.oxn          ← Task 执行单元
        ├── state.json        ← TaskState（task 级）
        ├── work-trace.jsonl  ← Task 级追加写 trace
        └── frozen.json       ← 验证后只读判决（pass/fail 之后生成）
```

## 8. Work Lifecycle

| 状态 | 含义 |
|---|---|
| **CREATED** | Work 已创建，task.oxn 待补 |
| **IN_PROGRESS** | 至少一个 task 正在执行 |
| **PASSED** | 全部 task pass |
| **FAILED** | 某个 task probe 失败 |

## 9. Task Lifecycle

| 状态 | 含义 |
|---|---|
| **CREATED** | task.oxn 已创建 |
| **RUNNING** | 至少一个 part 在执行 |
| **PASSED** | 全部 part pass + probe pass |
| **FAILED** | 某个 part probe fail |

## 10. 跨域编排

**原则**：跨域 = 拆多个 task，每个 task 单独 align。

```oxn
work "CrossDomainWork" {
  domain "MemberContext"  ref "@prj/domains/MemberContext";
  domain "OrderContext"   ref "@prj/domains/OrderContext";
  blueprint "dev-workflow" ref "@prj/blueprints/dev-workflow";

  task "HandleOrder" {            // 仅 align OrderContext
    domain "OrderContext";
    blueprint "dev-workflow";
    part "build" { skill_context = "处理订单" }
  }

  task "NotifyMember" {            // 仅 align MemberContext
    domain "MemberContext";
    blueprint "dev-workflow";
    part "build" { skill_context = "通知会员" }
    deps = ["HandleOrder"];        // 任务级依赖
  }
}
```

## 11. v0.1 限制

- 跨 task prop 引用（如 `parts.X.outputs.field`）**未实装**（v0.2 引入）
- 任务级 `deps` 仅文档化，**执行仍走 Work 串行**（v0.2 引入并行）
- Part 级 `probe` 块语法已就绪，**运行时未实装**（v0.2 接入 Kernel 判决）
- `skill_context` 是字符串提示，**不是结构化指令**（v0.3 引入）

## 12. 下一章

- [State 详解](./state.md) — 双层 state.json
- [信息隐藏原则](../core/document.md#27-信息隐藏原则) — AI 看不到什么
- [OXN DSL 参考](../reference/oxl.md) — 完整语法
