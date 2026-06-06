# 核心概念

> v0.1 起，OpenXenon 有 **5 个核心实体**：`Domain` / `Blueprint` / `Work` / `Task` / `Proof`。
> 全部遵循 [IAP 范式（Intent-Align-Proof）](./iap-paradigm.md)；Intent/Align 两轴子集视图见 [intent-align.md](./intent-align.md)。

## 1. 四个核心实体一览

| 实体 | 范式 | 定义 | 物理归属 |
|---|---|---|---|
| **Domain** | Intent（业务） | DDD 限界上下文，承载 term / ban / invariant / context_map | `.openxenon/domains/<kebab>.oxn` |
| **Blueprint** | Intent（技术） | 技术流水线模板，定义 slot 拓扑（DAG） | `.openxenon/blueprints/<name>.oxn` |
| **Work** | Align（编排） | 工程师的意图沙盒，声明用到的 domain/blueprint ref，编排 task DAG | `.openxenon/works/<work-name>/work.oxn` |
| **Task** | Align（执行） | 1 blueprint + N parts 的执行单元；align 到 blueprint 的具体 slot | `.openxenon/works/<work>/tasks/<task>/task.oxn` |

## 2. Domain

Domain 是 DDD 限界上下文 — 自治、零外部依赖的业务语言载体。

```oxn
domain "MemberContext" {
  description = "会员限界上下文：管理注册、认证、会员等级"

  term {
    "Member":   "注册会员实体",
    "Account":  "会员的登录凭证",
    "Register": "提交注册表单创建 Member"
  }

  ban { "User", "Customer", "AccountHolder" }

  invariant { "密码任何时候都不能明文存储" }
  invariant { "同一邮箱在同一上下文内不可重复注册" }

  context_map {
    imports "OrderContext" as "Order"
  }
}
```

**关键约束**：
- 自治：Domain 内**不引用任何外部资产**（Asset Independence）
- term/ban：约束 AI 只能/不能使用哪些词汇
- invariant：业务不变量（v0.1 仅文档化，v0.2 接入 Probe 强制执行）
- context_map：跨域引用关系（仅声明，不传递依赖）

详见 [Domain 详解](../architecture/domain.md)。

## 3. Blueprint

Blueprint 是技术流水线模板 — 只声明 slot 拓扑，不含业务语义。

```oxn
blueprint "dev-workflow" {
  description = "开发工作流：构建 → 测试 → 验证"
  version = 1

  prop "env" { type = string; default = "dev" }

  slot "build"    { deps = [] }
  slot "test"     { deps = ["build"] }
  slot "verify"   { deps = ["test"] observe = ["ShellExec"] }
}
```

**关键约束**：
- 纯技术：Blueprint 不再带 noun/verb/expectation/rule 等业务/验证概念
- slot：Blueprint 的最小拓扑节点（v0.1 起替代旧的 `stage` 概念）
- observe：每个 slot 可选声明要观察的物理信号（v0.2 接入 Probe 强制执行）

详见 [Blueprint 详解](../architecture/blueprint.md)。

## 4. Work

Work 是工程师的意图沙盒 — 编排 task DAG，声明资源引用。

```oxn
work "Onboarding" {
  context {
    goal = "完成新会员注册并发放欢迎福利";
    constraints = ["不能直接读订单库"];
    loop_policy { max_iterations = 5 }
  }

  // 资源池：声明用到的 domain + blueprint（ref 寻址）
  domain "MemberContext"     ref "@prj/domains/MemberContext";
  domain "OrderContext"      ref "@prj/domains/OrderContext";
  blueprint "dev-workflow"   ref "@prj/blueprints/dev-workflow";

  // 任务编排：DAG
  task "RegisterMember" {
    domain "MemberContext";
    blueprint "dev-workflow";

    part "build" {
      skill_context = "实现 Member 注册 API，密码必须加密";
    }
  }
}
```

**关键约束**：
- 资源池：Work 顶部统一声明 domain/blueprint ref，task 通过 `domain/blueprint` 字段 align
- part 嵌套：task 内的 `part` 块 align 到 blueprint 的 slot
- deps：task 间依赖（数组）
- Work 内部不持有执行逻辑，只负责"该用什么 + 怎么连"

详见 [Work + Task 详解](../architecture/work-and-task.md)。

## 5. Task

Task 是单 blueprint 执行单元 — 1 task 绑 1 blueprint，可同时 align 多个 domain。

```oxn
// .openxenon/works/onboarding/tasks/register-member/task.oxn
task "register-member" {
  domain "MemberContext";
  blueprint "dev-workflow";

  part "build" {
    skill_context = "实现 Member 注册 API，遵循 Member 命名，禁用 User";
  }
  part "test" {
    skill_context = "写 Member 注册的单元测试";
  }

  deps = [];
}
```

**关键约束**：
- 1 task → 1 blueprint（不可绑多个）
- 1 task → N domain（显式声明参与本 task 的 domain）
- 1 task → N part（每个 part align 到 blueprint 的 slot）
- AI 看到 task 时，**只看到 align 到的 domain**（全量隔离）

## 6. 状态（State）

OpenXenon 运行时有两层独立 state：

| 层级 | 物理位置 | 内容 |
|---|---|---|
| **WorkspaceState** | `.openxenon/works/<w>/state.json` | work 全局状态、task 列表、blueprint 引用 |
| **TaskState** | `.openxenon/works/<w>/tasks/<t>/state.json` | 单 task 状态、part 执行历史、probe 结果 |

详见 [State 详解](../architecture/state.md)。

## 7. 其他概念

| 概念 | 定义 |
|---|---|
| **Probe** | 物理观测 + 纯函数判定（fs_exists/shell_exec 等） |
| **Skill** | 嵌入到 AI 助手软件的命令手册（`/oxn-work`、`/oxn-leader`） |
| **Arsenal** | 资产库（v0.0.x 兼容，不在 v0.1 核心流程） |
| **Hall** | 工程师用的 Web 控制台（🔜 v0.2） |
| **CONTEXT.md** | AI 可见的 task 工作上下文（**全量隔离**） |
| **frozen.json** | 验证后生成的判决书（task 目录内，只读） |

## 8. 概念关系图

```
Intent 端（声明 / 静态）                    Align 端（实例 / 动态）
─────────────────────                      ─────────────────────
                                                
Domain ────────────► (无实例)                Work
   │  业务 term/ban                             │  声明 ref 池
   │                                            │  编排 task DAG
   ▼                                            ▼
Blueprint ────────► (无实例)                Task
   │  slot 拓扑                                  │  align 1 blueprint
   │  ┌──┬──┬──┐                                │  align N domains
   │  │s1│s2│s3│  (slot names)                   │  ├─ part "s1" (align slot s1)
   │  └──┴──┴──┘                                │  ├─ part "s2" (align slot s2)
   │                                            │  └─ part "s3" (align slot s3)
   ▼                                            ▼
Slot ─────────────► Part                    (1:N align)
Observe ──────────► Probe                   (1:N align)
Prop Def ─────────► Prop Assign             (1:1)
```

## 9. 下一章

- 想理解 **IAP 三轴的设计动机** → [IAP 范式理念指南](./iap-paradigm.md)
- 想理解 **Intent/Align 两轴的设计动机** → [Intent-Align 子集视图](./intent-align.md)
- 想了解 **Domain 怎么写** → [Domain 详解](../architecture/domain.md)
- 想了解 **Blueprint 怎么写** → [Blueprint 详解](../architecture/blueprint.md)
- 想了解 **Work/Task 怎么编排** → [Work + Task 详解](../architecture/work-and-task.md)
- 想了解 **OXN DSL 完整语法** → [OXN DSL 参考](../reference/oxn-dsl.md)
