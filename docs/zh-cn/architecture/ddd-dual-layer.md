# OpenXenon v0.1 DDD 双层架构

> 本文档描述 v0.1 引入的 Domain / Task / Workspace 三层架构，
> 替代了 v0.0.x 时代的"单 Blueprint + 单 Work"模型。

## 1. 核心动机

v0.0.x 的痛点：

- `Blueprint` 同时承担"业务蓝图"和"项目蓝图"两个角色
- `Work` 强绑一份 `Blueprint`，无法跨域编排
- `Part` 的 `align` 是字符串枚举，没有强制对应关系
- AI 在不同业务域之间无法做上下文隔离

v0.1 的设计原则（沿用 QA 历史对话的最终结论）：

- **Intent-Align 二元对偶**：声明 = 静态意图；实例 = 动态对齐
- **DDD 限界上下文**：每个 Blueprint 退化为"技术流水线模板"；新增 `Domain` 实体承载业务意图
- **全量隔离**：AI 看到的工作上下文只包含当前 Task inject 的 Domain
- **硬迁移**：旧 work.oxn 必须通过 `oxn work migrate` 升级

## 2. 实体层次

```
┌─────────────────────────────────────────────────────────────┐
│  Domain 顶层实体 (.openxenon/domains/<name>.oxn)             │
│  ─ DDD 限界上下文：language + domain_rules + context_map     │
│  ─ 谁写：业务专家 / 架构师                                   │
└─────────────────────────────────────────────────────────────┘
                              ↓ 注入 (inject)
┌─────────────────────────────────────────────────────────────┐
│  Blueprint 顶层实体 (.openxenon/blueprints/<name>.oxn)       │
│  ─ 技术流水线模板（既有 schema 不变）                        │
│  ─ 谁写：技术负责人 / CLI 工具生成                           │
└─────────────────────────────────────────────────────────────┘
                              ↓ 绑定 1 份 Blueprint
┌─────────────────────────────────────────────────────────────┐
│  Task (works/<w>/tasks/<t>/task.oxn)                         │
│  ─ 单 Blueprint 执行 + 单/多 Domain 注入                    │
│  ─ 跨域处理：拆 2 个 Task，分别注入不同 Domain               │
└─────────────────────────────────────────────────────────────┘
                              ↓ 编排 (DAG)
┌─────────────────────────────────────────────────────────────┐
│  Work (works/<w>/work.oxn)                                   │
│  ─ Workspace 编排器：声明 use_domain + use_blueprint + task  │
└─────────────────────────────────────────────────────────────┘
```

## 3. DSL 语法示例

### 3.1 Domain 顶层实体

```oxn
domain "MemberContext" {
  description = "会员限界上下文：管理注册、认证、会员等级"

  language {
    noun "Member" desc "注册会员实体"
    noun "Account" desc "会员的登录凭证"
    verb "Register" desc "提交注册表单创建 Member"
    verb "Authenticate" desc "校验登录凭证"
    ban = ["User", "Customer", "AccountHolder"]
  }

  domain_rules {
    rule "PasswordNeverPlaintext" desc "密码任何时候都不能明文存储"
    rule "EmailMustBeUnique" desc "同一邮箱在同一上下文内不可重复注册"
  }

  context_map {
    imports "OrderContext" as "Order"
  }
}
```

### 3.2 Blueprint（保持 v0.0.x 形态）

```oxn
blueprint "dev-workflow" {
  version = 1
  description = "dev-workflow"
  slot "develop" { }
  slot "test" { deps = ["develop"] }
}
```

### 3.3 Work（v0.1 编排器）

```oxn
work "NewUserOnboarding" {
  context {
    goal = "完成新会员注册并发放欢迎福利"
    constraints = ["不能直接读订单库"]
    loop_policy { max_iterations = 5 }
  }

  use_domain "MemberContext";
  use_domain "OrderContext";
  use_domain "MarketingContext";

  use_blueprint "dev-workflow";

  task "RegisterMember" align "MemberContext.Register" {
    deps = []
    prop "username" = "new_user_123"
  }

  task "GrantWelcomeBonus" align "MarketingContext.GrantWelcomeBonus" {
    deps = ["RegisterMember"]
    prop "targetMemberId" = "RegisterMember.outputs.memberId"
  }
}
```

### 3.4 Task（单域注入）

```oxn
// .openxenon/works/onboarding/tasks/register-member/task.oxn
task "register-member" blueprint "dev-workflow" {
  inject "MemberContext"

  context {
    objective = "实现会员注册逻辑，遵循 MemberContext 的统一语言"
    constraints = [
      "必须使用 noun.Member 命名类",
      "禁止使用 ban 列表中的 User/Customer"
    ]
  }

  slot "develop" { deps = [] }
  slot "test" { deps = ["develop"] }
}
```

## 4. CLI 命令

| 命令 | 用途 |
|---|---|
| `oxn domain new --name X` | 创建 domain 骨架 |
| `oxn domain validate X` | 校验 domain 文件 |
| `oxn domain list` | 列出所有 domain |
| `oxn work task new --work X --task Y --blueprint B --inject D1,D2` | 在 work 下创建 task |
| `oxn work task list --work X` | 列出 work 下所有 task |
| `oxn work task status --work X --task Y` | 查看 task 状态 |
| `oxn work migrate [--dry-run]` | v0.1 硬迁移 |
| `oxn get-context --work X --task Y` | 获取 AI 可见上下文（**全量隔离**） |
| `oxn get-context --work X` | 获取 work 级上下文（无隔离） |

## 5. 上下文隔离机制

`oxn get-context --work X --task Y` 的执行流程：

1. 加载 `works/X/work.oxn` → 拿到 use_domain 列表
2. 加载 `works/X/tasks/Y/task.oxn` → 拿到 inject 列表
3. **关键**：只加载 inject 中的 domain 文件，不加载 use_domain 中的其他 domain
4. 汇总 language.nouns / verbs / ban → `allowedLanguage` 字段
5. 汇总 domain_rules → `domainRules` 字段
6. 加载 `works/X/tasks/Y/state.json` → 拿到 currentPart / status
7. 返回 JSON（也支持 `--emit-md` 写到 .md 文件）

返回示例：
```json
{
  "workspace": "onboarding",
  "task": "register-member",
  "blueprint": "dev-workflow",
  "currentPart": "develop",
  "taskStatus": "running",
  "injectedDomains": [
    {
      "name": "MemberContext",
      "language": { "nouns": [{"name": "Member"}], "verbs": [], "ban": [] },
      "rules": []
    }
  ],
  "allowedLanguage": {
    "mustUseNouns": ["Member"],
    "mustUseVerbs": [],
    "banned": []
  },
  "isolationNotice": "本 task 只能看到 inject 列表中的 domain，work 中其他 domain 一律不可见。"
}
```

## 6. 文件布局

```
.openxenon/
├── config.json
├── domains/                     🌟 v0.1 新增
│   ├── member-context.oxn
│   ├── order-context.oxn
│   └── marketing-context.oxn
├── blueprints/                  (保持不变，5 份 builtin)
│   ├── dev-workflow.oxn
│   ├── fix-issue.oxn
│   ├── explore-analyze-report.oxn
│   ├── add-summary-cmd.oxn
│   └── dual-track.oxn
└── works/                       (workspace 化)
    └── onboarding/
        ├── work.oxn             ← 编排器
        ├── state.json           ← workspace 级
        ├── work-trace.jsonl     ← workspace 级
        ├── CONTEXT.md           ← AI 上下文摘要（自动生成）
        └── tasks/
            ├── register-member/
            │   ├── task.oxn     ← 绑 1 份 Blueprint + inject 1 个 Domain
            │   ├── state.json
            │   └── work-trace.jsonl
            └── grant-welcome-bonus/
                ├── task.oxn
                ├── state.json
                └── work-trace.jsonl
```

## 7. 迁移路径

旧 work.oxn 语法：
```oxn
work "X" ref "@xxx/blueprints/Y" {
  part "alpha" align "Alpha" { }
}
```

新 work.oxn 语法：
```oxn
work "X" {
  use_blueprint "Y"
  task "alpha" align "Y.alpha" { deps = [] }
}
```

运行迁移：
```bash
oxn work migrate --dry-run   # 预览
oxn work migrate             # 实际迁移
```

迁移会：
- 把 `work/task/<name>.oxn` 转写到 `works/<name>/work.oxn`
- 把 `task "X" use "@xxx/blueprints/Y"` 改写为 `task "X" blueprint "Y"`
- 把单层 `state.json` 拆为 workspace 级 + 单一 task 级

## 8. v0.1 限制

- Slot inputs/outputs 不支持（v0.2 引入）
- language 约束不接 Probe（v0.2 引入 `language-ban-checker`）
- task 编排只支持串行 deps（v0.2 引入并行）
- 跨 task prop 引用 `parts.X.outputs.field` 是占位（v0.2 实装）

## 9. 决策依据

本文档的设计结论来源于与 AI 的多轮对话（见 `docs_tmp/oxn-ddd-1.md`）：

- **轮 1**：Matt Pocock "Software Fundamentals Matter More Than Ever" 演讲
- **轮 2**：Blueprint 是否带 DDD
- **轮 3**：一份 vs 多份业务蓝图
- **轮 4**：是否新增 Compose
- **轮 5**：Intent-Align 二元对偶 — **架构灵魂**

最终范式：**Work = Engineer 的意图工作空间**，可在同一空间内编排多个 Blueprint 的 Slot；跨域编排下沉到 Work 内部；不引入额外 Compose 层。
