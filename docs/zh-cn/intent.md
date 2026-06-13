---
title: 意图轴
---

# 意图轴

> Intent 轴是工程师的主权领域。Domain 锁定业务词典，Blueprint 锁定技术拓扑。
> 没有 Intent，AI 不行动，OXN 不证明。

## What —— Intent 轴的两个核心资产

Intent 轴由两块正交的资产组成：

| 资产 | 中文 | 关心什么 | 谁维护 |
|---|---|---|---|
| Domain | 领域 | 业务上"说什么 / 不能说什么" | 业务专家 / 架构师 |
| Blueprint | 蓝图 | 技术上"分几步做、步间依赖是什么" | 技术负责人 |

两者**不互相引用**——Domain 不写 slot，Blueprint 不写 term。Work 在编排时才把两者绑在一起。

---

## Domain：业务词典

Domain 是 DDD 限界上下文的可执行表达。它告诉 AI "用什么词、避开什么词、必须遵守什么规则"。

### 完整结构

```oxn
domain "<DomainName>" {
  description = "<一句话业务定位>"

  term {
    "<Noun>":   "<业务定义>",
    "<Verb>":   "<业务定义>"
  }

  ban { "<禁用词1>", "<禁用词2>" }

  invariant {
    "<业务不变量1>"
  }

  context_map {
    imports "<OtherDomain>" as "<Alias>"
  }
}
```

### 字段说明

| 字段 | 必填 | 说明 |
|---|---|---|
| `description` | 否 | 一句话业务定位 |
| `term` | 否 | 核心词汇表。AI 写代码时**必须**使用这些词 |
| `ban` | 否 | 禁用词表。AI **不得**使用这些词 |
| `invariant` | 否 | 业务不变量。v0.1 文档化，v0.2 接入 Probe 强校验 |
| `context_map` | 否 | 跨域引用声明（仅声明"我与谁打交道"，不传递依赖） |

### 完整示例

```oxn
domain "MemberContext" {
  description = "会员限界上下文：管理注册、认证、会员等级"

  term {
    "Member":   "注册会员实体",
    "Account":  "会员的登录凭证",
    "Register": "提交注册表单创建 Member"
  }

  ban { "User", "Customer", "AccountHolder" }

  invariant {
    "密码任何时候都不能明文存储"
    "同一邮箱在同一上下文内不可重复注册"
  }

  context_map {
    imports "OrderContext" as "Order"
  }
}
```

### 命名约定

- Domain 名：PascalCase（`MemberContext`）
- 文件名：kebab-case（`member-context.oxn`）
- 物理位置：`.openxenon/domains/<kebab-case>.oxn`

### 自治原则

Domain 必须满足：
- 不引用 Asset（不含 `ref "@prj/..."`）
- 不持有 Slot（不含 slot/observe）
- 不持有 Probe（不含 probe 引用）

---

## Blueprint：技术蓝图

Blueprint 是"分几步做"的纯技术模板。它只声明 slot 拓扑和依赖关系，不包含业务语义。

### 完整结构

```oxn
blueprint "<name>" {
  description = "<一句话技术定位>"
  version     = 1

  prop "<name>" { type = <type>; default? = <value> }

  slot "<name>" {
    deps    = ["<other-slot>", ...]
    observe = ["<SignalType>", ...]
  }
}
```

### 字段说明

| 字段 | 必填 | 说明 |
|---|---|---|
| `description` | 否 | 一句话技术定位 |
| `version` | 否 | 版本号，Promote 时递增 |
| `prop` | 否 | 参数声明。`type`：`string` / `number` / `boolean` / `enum(A,B,C)` |
| `slot` | **是** | 最小拓扑节点。可重复定义 |

### Slot 字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `name` | **是** | slot 唯一名（kebab-case），Part 通过 name 对齐 |
| `deps` | 否 | 依赖的其他 slot 名列表（构成 DAG） |
| `observe` | 否 | 物理观测信号列表，v0.1 文档化，v0.2 接入 Probe |

### DAG 编排示例

```oxn
blueprint "ci-pipeline" {
  description = "CI 流水线"
  version = 1

  slot "build"   { deps = [] }
  slot "test"    { deps = ["build"] }
  slot "lint"    { deps = ["build"] }
  slot "deploy"  { deps = ["test", "lint"] }
}
```

```
build ─┬─→ test  ─┐
       └─→ lint  ─┴─→ deploy
```

### 参数化示例

```oxn
blueprint "deploy-service" {
  prop "env"    { type = enum("dev", "staging", "prod"); default = "dev" }
  prop "region" { type = string; default = "us-west" }
  prop "replicas" { type = number; default = 3 }

  slot "build"  { deps = [] }
  slot "deploy" { deps = ["build"] }
}
```

### 命名约定

- Blueprint 名：kebab-case（`dev-workflow`、`fix-issue`）
- 物理位置：`.openxenon/blueprints/<name>.oxn`

---

## Program Domain：内置编程词典

OXN 内置了 `@oxn/domains/ProgramContext`，涵盖通用编程概念（SourceFile / Module / Function / BuildArtifact / TestSuite 等）。工程师**不写 DDD 就能用 Blueprint**。

配套内置 Probe：
- `fs-exists` / `fs-not-exists` / `fs-content-match` / `fs-parseable`
- `shell-exec` / `test-pass` / `ts-compiles` / `lint-check` / `deps-resolved`
- `http-responds` / `file-exports`

见 [Proof](./proof.md) 了解 Probe 类型完整列表。

---

## How —— 怎么用

### 创建和校验 Domain

```bash
oxn domain create MemberContext
# 意图轴
oxn domain validate MemberContext
# 意图轴

oxn domain list
```

### 创建和校验 Blueprint

```bash
oxn blueprint create dev-workflow --slots build,test,verify
# 意图轴
oxn blueprint validate dev-workflow
# 意图轴

oxn blueprint list
```

### Domain 与 Blueprint 的关系

两者**正交**。Domain 不引用 Blueprint，Blueprint 不引用 Domain。Work 在编排时才通过 `domain` / `blueprint` ref 把两者绑定。

```oxn
// work.oxn —— 在 Align 轴才把 Intent 绑在一起
work "Onboarding" {
  domain    "MemberContext" ref "@prj/domains/MemberContext"
  blueprint "dev-workflow" ref "@prj/blueprints/dev-workflow"

  task "RegisterMember" {
    domain "MemberContext"        // align 到这个 domain
    blueprint "dev-workflow"      // align 到这个 blueprint
    part "build" { skill_context = "实现 Member 注册" }
  }
}
```

见 [Align](./align.md) 了解完整的 Work → Task → Part 编排流程。

## → 参考

- Domain 完整语法：旧 [OXN DSL 参考](./reference/oxn-dsl.md)
- Blueprint DAG 设计原理：[Architecture](./architecture.md)
- 如何把 Intent 资产对接 AI：[Align](./align.md)
