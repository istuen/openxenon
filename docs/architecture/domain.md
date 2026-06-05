# Domain 详解

> Domain 是 OpenXenon v0.1 的**业务限界上下文**（DDD Bounded Context），承载 term / ban / invariant / context_map 四类业务语义。

## 1. 定位

**Domain = 业务 Intent**

Domain 是"业务侧说什么、不能说什么"的形式化表达。它：
- **不**包含任何技术实现（slot / probe / execution 都不在 Domain 里）
- **不**依赖其他 Domain（context_map 只是声明，不传递）
- **不**持有运行时状态

## 2. 完整结构

```oxn
domain "<DomainName>" {
  description = "<一句话业务定位>"

  term {
    "<Noun>":   "<noun 的业务定义>",
    "<Verb>":   "<verb 的业务定义>",
    "<Adjective>": "..."
  }

  ban { "<禁用词1>", "<禁用词2>" }

  invariant { "<业务不变量1>" }
  invariant { "<业务不变量2>" }

  context_map {
    imports "<OtherDomain>" as "<Alias>"
  }
}
```

## 3. 字段说明

| 字段 | 必填 | 说明 |
|---|---|---|
| `description` | 否 | 一句话业务定位（让 AI 快速理解上下文） |
| `term` | 否 | 核心词汇表（map 格式：key = 词，value = 释义）。AI 写代码时**必须**使用这些词 |
| `ban` | 否 | 禁用词表。AI **不得**使用这些词（用于强制统一语言，防止"User/Customer/Member"混用） |
| `invariant` | 否 | 业务不变量列表。v0.1 仅文档化，v0.2 接入 `language-ban-checker` Probe 强校验 |
| `context_map` | 否 | 跨域引用声明。仅声明"我与谁打交道"，不传递依赖；只用于文档可读性 |

## 4. 物理位置

```
.openxenon/
└── domains/
    ├── member-context.oxn        # Domain 名: MemberContext
    ├── order-context.oxn         # Domain 名: OrderContext
    └── marketing-context.oxn     # Domain 名: MarketingContext
```

**命名约定**：
- Domain 名：PascalCase（如 `MemberContext`）
- 文件名：kebab-case（如 `member-context.oxn`）
- Context Map alias：简短 PascalCase（如 `Order`、`DSL`）

## 5. 与 Blueprint 的关系

| 维度 | Domain | Blueprint |
|---|---|---|
| 范式 | Intent（业务） | Intent（技术） |
| 关心 | "业务上要做什么/不能做什么" | "技术上 slot 怎么排" |
| 维护者 | 业务专家 / 架构师 | 技术负责人 / CLI 工具生成 |
| 复用性 | 跨项目可复用 | 跨项目可复用 |
| 验证手段 | v0.1 文档化，v0.2 Probe 校验 | Probe 实测 |

两者**正交**：Domain 不引用 Blueprint，Blueprint 不引用 Domain。Work 在编排时才把两者绑在一起。

## 6. 完整示例

```oxn
// Domain: MemberContext
// 会员限界上下文：管理注册、认证、会员等级
//
// 在 work.oxn 通过 domain "MemberContext" ref "..." 引用

domain "MemberContext" {
  description = "会员限界上下文：管理注册、认证、会员等级"

  term {
    "Member":   "注册会员实体",
    "Account":  "会员的登录凭证",
    "Register": "提交注册表单创建 Member",
    "Authenticate": "校验登录凭证"
  }

  ban { "User", "Customer", "AccountHolder" }

  invariant { "密码任何时候都不能明文存储" }
  invariant { "同一邮箱在同一上下文内不可重复注册" }

  context_map {
    imports "OrderContext" as "Order"
  }
}
```

## 7. 自治原则（Asset Independence）

Domain 必须满足以下约束：

1. **不引用 Asset** — Domain 内不出现 `ref "@oxn/..."` 或 `ref "@prj/..."`
2. **不持有 Slot** — Domain 不含 slot/observe
3. **不持有 Probe** — Domain 不含 probe 引用
4. **不持有 Execution** — Domain 不含 execution

> 原因：Domain 是"业务说什么"，Blueprint/Probe 是"技术怎么做"，两者关注点分离。

违反此约束会让 Domain 失去跨项目/跨技术栈的可复用性。

## 8. v0.1 限制

- `invariant` 仅文档化，**无运行时强校验**（v0.2 接入 Probe）
- `context_map.imports` 仅声明，**不强制被引用**（v0.2 引入跨域编排校验）
- `term` 仅作 AI 提示，**无自动 rename 工具**（v0.3+）

## 9. 下一章

- [Blueprint 详解](./blueprint.md) — 与 Domain 正交的技术模板
- [Intent-Align 范式](../core/intent-align.md) — 为什么 Domain 是 Intent
