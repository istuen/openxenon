---
redirectFrom:
  - /zh-cn/ddd-in-practice.html
title: DDD 实战
---

# DDD 实战

> 何时从 Program Domain 升级到 Business Domain。DDD 限界上下文在 OpenXenon 中的可执行化实践。

## What —— Program Domain vs Business Domain

OpenXenon 提供两级 Domain 抽象：

| 层级 | 类型 | 来源 | 何时用 |
|---|---|---|---|
| Program Domain | 编程概念词汇表 | OXN 内置 `@oxn/domains/ProgramContext` | 解决技术问题，不需要业务建模 |
| Business Domain | 业务限界上下文 | 工程师定义 `.openxenon/domains/<name>.md` | 业务复杂度涌现，需要统一业务语言 |

**Program Domain** 涵盖：SourceFile / Module / Function / BuildArtifact / TestSuite / TestCase / Dependency / ConfigFile / EntryPoint / APIEndpoint 等通用编程概念。

---

## Why —— 为什么有两级

两级涌现路径对应两个真实痛点：

### 涌现 1：Proof → Blueprint

```
手动 Proof 1 次  → "AI 假完成被抓住了"
手动 Proof 5 次  → "每次都重复输同样 probe，烦"
手动 Proof 10 次 → "能不能把 probe 存下来？"
                    ↓
              引入 Blueprint（Probe 模板化）
              引入 Program Domain（概念词汇化）
```

### 涌现 2：Program Domain → Business Domain

```
用 Program Domain 修 Bug        → "Blueprint + 内置 Domain 真方便"
用 Program Domain 做 3 个功能   → "Blueprint 里全是技术术语"
用 Program Domain 做 10 个功能  → "AI 理解了技术行话，但不理解业务意图"
                                 ↓
                        引入 Business Domain（DDD）
                        引入团队共享意图空间
```

**不需要先做 DDD**。先用 Program Domain 解决技术问题，业务复杂度自然涌现出 DDD 的需求。

---

## How —— 从 Program Domain 升级到 Business Domain

### 信号：什么时候该升级

- 同一个 term 在 team 里出现 3 种说法（"User" / "Customer" / "Member" 混用）
- AI 写的代码里出现了你不希望看到的词
- Blueprint 的 `skill_context` 写了太多业务解释
- Probe FAIL 不是因为代码错，而是因为 AI "理解错了业务意图"

### 升级步骤

#### 1. 识别限界上下文

找出现有代码中反复出现的业务名词，把它们归组：

```
会员相关：Member, Register, Authenticate, Account
订单相关：Order, Cart, Payment, Invoice
```

每个组就是一个候选的 Domain。

#### 2. 创建 Domain

```bash
oxn domain create MemberContext
```

编辑 `.openxenon/domains/member-context.md`：

```oxn
domain "MemberContext" {
  description = "会员限界上下文：注册、认证、会员等级"

  term {
    "Member":       "注册会员实体",
    "Account":      "会员的登录凭证",
    "Register":     "提交注册表单创建 Member",
    "Authenticate": "校验登录凭证"
  }

  ban { "User", "Customer", "AccountHolder", "Client" }

  invariant {
    "密码任何时候都不能明文存储"
    "同一邮箱在同一上下文内不可重复注册"
  }

  context_map {
    imports "OrderContext" as "Order"
  }
}
```

#### 3. 校验

```bash
oxn domain validate MemberContext
# DDD 实战
```

验证通过后，这个 Domain 就可以被任何 Work 的 task 引用。

#### 4. 在 Work 中引用

```oxn
work "develop-member" {
  domain "MemberContext" ref "@prj/domains/MemberContext"

  task "register-member" {
    domain "MemberContext"
    // AI 在 skill_context 中看到的是 MemberContext 的语言
    part "build" { skill_context = "实现 Member 注册 API" }
  }
}
```

当 AI 通过 `oxn work context` 获取上下文时，会收到：

```json
{
  "allowedLanguage": {
    "mustUseNouns": ["Member", "Account", "Register"],
    "banned": ["User", "Customer", "AccountHolder", "Client"]
  }
}
```

---

## CI 门控：让 Domain 进入 CI 流水线

v0.1 Domain 的 invariant 是文档化的，但在 CI 中可以靠 Probe 间接校验：

```bash
# DDD 实战
oxn domain validate MemberContext
oxn proof run check-domain-compliance
```

v0.2 将引入 `language-ban-checker` Probe，直接在代码中扫描 ban 词并 FAIL。

---

## Context Map：跨域协作

当你的系统有多个 Domain 时，用 `context_map` 声明它们的关系：

```oxn
domain "MemberContext" {
  context_map {
    imports "OrderContext" as "Order"
  }
}
```

这仅做文档声明，不传递依赖。实际的跨域编排在 Work 层：

```oxn
work "NewUserOnboarding" {
  domain "MemberContext" ref "@prj/domains/MemberContext"
  domain "OrderContext"  ref "@prj/domains/OrderContext"

  task "RegisterMember" { domain "MemberContext" }
  task "GrantBonus"     { domain "OrderContext"; deps = ["RegisterMember"] }
}
```

## → 参考

- [Intent](./intent.md) — Domain 完整语法
- [Recipes](./recipes.md) — 跨域编排完整示例
- [Architecture](../../dev/architecture.md) — L0-L3 分层中 Domain 的物理归属
