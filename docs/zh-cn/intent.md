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

## Stack：技术栈（v0.4 新增，可选）

> **v0.4 软推荐** — 不填不报错；不填则该 domain 不参与 stack invariant 校验。
> 详见 RFC：[`.openxenon/pools/sprints/v0.4-unify-md/design/v0.4-unify-md-rfc.md`](../../pools/sprints/v0.4-unify-md/design/v0.4-unify-md-rfc.md) §1

Stack 表示"工程师对 AI 设定的技术环境约束"——语言 / 运行时 / lint 工具 / 测试框架。它是 **Intent 语义约束**（回答"用什么技术写"），不是 **Align 可执行骨架**（回答"按什么路径写"）。

**关键边界**：
- ✅ **定义在 domain.md** 的 `## Stack` H2 下，目录仍是 `domains/`
- ✅ **blueprint 不重复定义 Stack**；运行时通过 `domain: <name>` 引用自动继承
- ✅ Proof 校验时把 `## Stack` 当作 invariant 的一种特化（如检测到 `language: typescript` 但产物是 `.js`，可判 fail）
- ❌ **不**新建 `stacks/` 目录（避免 5 类实体膨胀成 6 类）
- ❌ **不**硬要求填写（v0.4 软推荐；v0.5 视情况决定是否升级为硬要求）

### 完整结构（MD 范式）

```markdown
## Stack

### runtime
- language: typescript
- runtime: bun
- version: ">=1.1.0"

### linter
- tool: biome
- config: biome.json

### test
- runner: bun test
- coverage: "@oxn/probes/test-pass"
```

### 字段说明

| H3 子分类 | 字段 | 必填 | 说明 |
|---|---|---|---|
| `runtime` | `language` | 是 | 编程语言（typescript / python / rust / go …）|
| `runtime` | `runtime` | 是 | 运行时（bun / node / deno / python3 …）|
| `runtime` | `version` | 否 | 版本约束（semver range）|
| `linter` | `tool` | 是 | 静态检查工具（biome / eslint / clippy …）|
| `linter` | `config` | 否 | 配置文件路径（相对项目根）|
| `test` | `runner` | 是 | 测试运行器（bun test / pytest / cargo test …）|
| `test` | `coverage` | 否 | 覆盖率 probe 引用 |

**子分类可扩展**：上述是 v0.4 默认 3 类（runtime / linter / test）。工程师可按需新增 `## Stack` 下的 H3 子分类（如 `### build`、`### deploy`）。

### 命名约定

- H3 子分类名：kebab-case 或 snake_case（与 v0.3 H2 命名一致）
- 物理位置：`.openxenon/domains/<name>.md` 内的 `## Stack` H2 section

### 蓝图的引用继承

Blueprint 不重定义 Stack。运行时通过 `domain: <name>` 引用：

```oxn
work "feature-x" {
  domain "ExampleStackDomain" ref "@prj/domains/example-stack-domain"
  blueprint "dev-workflow" ref "@prj/blueprints/dev-workflow"
  // ↑ dev-workflow 继承 ExampleStackDomain 的 Stack 约束
}
```

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

## v0.3 统一 MD 范式（canonical 纯 MD 语法）

> **v0.3.0 改革的全部目的**：把 `.oxn` 容器指令（`:::intent{...}`）完全替换为**纯原生 Markdown**层级映射。
> 0 个 `:::intent{...}` 指令，0 个新 npm 依赖，0 个 Langium/.oxn 包袱。
>
> **.md 永远是 canonical 源**。`.oxn` 是可选的编译产物（CLI 暂未实装 `oxn domain compile`）。

### canonical 范式三原则

1. **H3 = canonical name** —— `### Cart` 已经是 term/prop/slot/task/part/probe/verdict 的官方名称，**不要再写 `- name: Cart`**
2. **一行一个 `- key: value`** —— 不要用 `;` 把多个 key 拼在一行
3. **数组用缩进列表** —— 不要用 `items: A, B, C` 逗号字符串或 `values: [a, b, c]` 内联数组

### 5 类资产统一范式

#### Domain（业务词典）

```markdown
## Terms

### Cart
- desc: 用户未结算的购物车集合（含 line items 与价格快照）

### Order
- desc: 提交后生成的不可变订单记录

## Bans

### forbidden-constructs
- items:
  - cart-job
  - order-pipeline
- desc: 不允许把 cart/order/charge 写成 Job/Pipeline 模式

## Invariants

### inv-cart-immutability
- value: Cart → Order 转换是不可变的
```

#### Blueprint（技术蓝图）

```markdown
## Props

### timeout
- type: number
- required: true
- default: 60000

### env
- type: enum
- values:
  - dev
  - staging
  - prod

## Slots

### build
- deps: []
- observe:
  - deps-resolved

### verify
- deps:
  - build
  - test
- observe:
  - lint-check
  - ts-compiles
```

#### Work（编排）

```markdown
## Context

### primary
- goal: 演示 Work canonical 范式
- constraints:
  - 必须用 oxn work 命令
- max_iterations: 3

## Tasks

### t1-build
- blueprint: order-workflow
- domain: OrderDomain
- part: build
  - skill_context: 构建产物
```

#### Task（执行单元）

```markdown
## Parts

### build
- skill_context: 构建产物

## Probes

### schema-valid
- scheme: schema
- expect: every LineItem has all of sku quantity unit_price
```

#### Proof（判决书）

```markdown
## Verdicts

### build-exists
- type: pass
- value: dist/oxn 文件存在且 sha256 与 lock 记录一致

### type-check
- type: fail
- value: bun run typecheck 1 error

## Runtime

### snapshot
- observed_at: 2026-06-23T12:00:00Z
- probes_run: 3
- probes_passed: 2
- probes_inconclusive: 1
```

### 5 个反模式（v0.3.0 全部禁止）

| 反模式 | 错误样例 | 正确样例 |
|---|---|---|
| `;` 内联分隔 key | `- type: string; default: USD; required: true` | 拆成 3 行 `- type: string` / `- default: USD` / `- required: true` |
| 冗余 `- name:` | `### Cart` + `- name: Cart` | 只保留 `### Cart` |
| `items: A, B, C` 逗号字符串 | `- items: cart-job, order-pipeline` | `- items:` + 缩进列表 |
| `values: [a, b, c]` 内联数组 | `- values: [dev, staging, prod]` | `- values:` + 缩进列表 |
| 意义不明 wrapper H3 | `### main` (work context) | `### primary` |

### 自然语言字段允许 `;`

`desc` / `value` / `expect` / `guidance` / `instruction` 等自然语言字段**允许 `;`**（中文常用 `;` 作为句内分隔符）。

结构性字段（`type` / `default` / `required` / `items` / `values` / `deps` / `observe` / `domain` / `blueprint` / `part` / `scheme` / `name`）**禁止 `;`**。

### 完整样例

5 类实体的完整 canonical .md 样例见 [`src/oxl/examples-md/`](https://github.com/istuen/openxenon/tree/feat/v0.3-md-ssot/src/oxl/examples-md)（电商 Order 业务场景统一串联）。

### CI 守卫

`bun scripts/check-md-canonical.ts <dir>` —— 扫任意 .md 目录，校验 canonical 范式 5 条规则。
退出码 0 = 全部通过，1 = 有违规（带 file:line:rule 详情）。

| 规则 | 触发条件 |
|---|---|
| E_MD_CANONICAL_NAME_REDUNDANT | `- name: <H3-text>` 冗余 |
| E_MD_CANONICAL_ITEMS_COMMA_STRING | `items: A, B, C` 逗号字符串 |
| E_MD_CANONICAL_VALUES_INLINE_ARRAY | `values: [a, b, c]` 内联数组 |
| E_MD_CANONICAL_SEMICOLON_INLINE | 结构性字段含 `;` |
| E_MD_INVALID_SYNTAX | md-bridge pipeline 解析失败 |

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

## Intent Pool 第一轮落地 (v0.2 Sprint 4 T8)

Intent Pool v3 把 v0.1.x 的 `forges/` 设计笔记分化为 5 个池 (research / design / issue / audit / journal)。本 PR (Sprint 4) 是**第一轮最小切片**:

- **当前仅 `pools/research/` 池可用** — 其他 4 池 union 留 Sprint 6 启用
- **Hall 扫描迁移**：`scanIntentPools()` 新增, 兼容期仍扫 `scanForgeDrafts()`
- **forges/ 兼容期**：`warnOnForgesDeprecated` 开关默认 `false` (静默), Sprint 6 flip 后打印 WARN
- **Heading 模板**：research 池 `# What` `# Why` `# How` 三公共必填 (留 `# Reference` 可选)
- **lint 集成**：`bun scripts/check-heading-skeleton.ts` 扫 pools/ + forges/, 退出码 0/1
- **lefthook pre-commit 钩子**：第 5 个 hook `heading-skeleton` (其他 4 个: biome / eslint / typecheck / test)

### 5 池 heading 模板 (设计稿约定, Sprint 6 启用)

| 池 | 必填 heading |
|---|---|
| research | `# What` `# Why` `# How` (`# Reference` 可选) |
| design | `# What` `# Why` `# How` `# 决策记录` `# 范围之外` |
| issue | `# What` `# Why` `# How` `# 复现步骤` `# 期望` `# 实际` |
| audit | `# What` `# Why` `# How` `# 证据` `# 结论` |
| journal | `# What` `# Why` `# How` `# 时间线` |

### 相关命令

```bash
# 校验 heading 骨架
bun scripts/check-heading-skeleton.ts .openxenon/pools/research/

# 启用 forges/ WARN
oxn config set warnOnForgesDeprecated true

# Hall 扫描 (含 pools + forges)
bun src/hall/index.ts
```
