---
entity: rfc
id: RFC-0020
theme: three-boundary-blueprint-elevation
status: Accepted
date: 2026-07-10
accepted: 2026-07-10
supersedes: []
superseded-by: ~
related:
  - ADR-0054: docs/adrs/0054-three-boundary-framework.md
  - ADR-0055: docs/adrs/0055-blueprint-as-composition-template.md
  - ADR-0056: docs/adrs/0056-external-inline-and-status.md
  - ADR-0053: docs/adrs/0053-superseded-0048-library-external-scheme.md
  - ADR-0019: docs/adrs/0019-blueprint-type-paradigm.md
promoted-from: .openxenon/drafts/.archived/rfc/three-boundary-blueprint-elevation-rfc.md
synced-at: 2026-08-05
landing-reason: declarative
---

# RFC-0020: 三边界框架 + Blueprint 提升组合模板

> **类型**：RFC（OpenXenon 规范）
> **主题**：three-boundary-blueprint-elevation
> **状态**：✅ Accepted（v0.6.1-alpha.2 ~ v0.6.1-alpha.4 三阶段实施完成；Phase 3 收尾完成 ADR 处置 + 文档同步）
> **来源**：2026-07-10 opencode + user 协作
> **批次**：v0.6.1 体系重构（promote 自 .openxenon/drafts/rfc/three-boundary-blueprint-elevation-rfc.md）

---

## 0. 背景与动机

### 0.1 当前 Asset 类型体系的累积

v0.6.0 定义 E1 Asset 为 3 类型（Domain / Blueprint / Stack）。此后类型集经两次扩展：

| 版本 | 新增类型 | 驱动原因 | ADR |
|---|---|---|---|
| v0.6.1-alpha.1 | Roadmap | AI 路由入口（Asset 剪枝接口） | 无 ADR（feat commit） |
| v0.6.1-alpha.1 | Library | 外部文档已索引（替代 Memory 层） | ADR-0048 |
| v0.6.1-alpha.1 | External | 外部资源指针（URL + hash + ttl） | ADR-0048 |

当前 `AssetKind` union 为 6 类型：`domain | blueprint | stack | roadmap | library | external`。

### 0.2 当前 Work 与 Asset 的耦合

Work 直接引用 2 种 Asset 类型（Domain + Blueprint），Stack 为"孤儿"（骨架生成器写入但语法不支持、无下游处理）。具体：

| 能力 | Domain | Blueprint | Stack |
|---|---|---|---|
| MD-native `## Refs` 支持 | ✅ `kind: domain` | ✅ `kind: blueprint` | ❌ |
| BirthCert 字段 | `assets.domains` | `assets.blueprints` | ❌ |
| PlanLock hash 组件 | `workDomainsHash` | `blueprintsHash` | ❌ |
| 上下文注入 | `injectedDomains`（terms/bans/invariants） | （结构性的，不注入） | ❌ |
| Per-work merger | `per-work-domains-merger.ts` | `per-work-blueprints-merger.ts` | ❌ |

Stack 孤儿问题：`work-skeleton.ts` 会写入 `stack "X" ref "..."`，但无 `StackRefDecl` 语法规则、无 merger、无 BirthCert 字段、无上下文注入、无漂移检测。

### 0.3 类型扩展的 DRY 违规

6 处重复的 `['domain', 'blueprint', 'stack', 'roadmap', 'library', 'external']` 硬编码数组需手动同步：

- `Asset/validate.ts:69`
- `Asset/internal/reference-checker.ts:35`
- `Roadmap/sync.ts:27`
- `Roadmap/parser.ts:39`
- `cli/commands/asset.ts:40`
- `cli/commands/work.ts:390`

### 0.4 ADR-0019 的历史教训

ADR-0019 曾在 Blueprint 内部加 `type "task"|"plan"|"explore"` 字段——这是"类型模板化"的尝试，v0.6.1-alpha.0 被废弃（`slot` 语法已表达结构差异，Work modes 已表达语义差异），但 ADR 未标记 Superseded，`docs/zh-cn/asset.md §12` 仍错误地描述它为有效语法。

教训：语义子分类放在 Asset 内部、与结构语法功能重叠 → 废弃。但这不等于"内容模板化"方向错误——关键在于不与现有语法重叠、不增加 grammar 维护成本。

### 0.5 ADR-0048 的 Library/External 设计反思

ADR-0048 在反弹 Memory 中间层后，将 Library 和 External 设为 Asset 类型以保持"Asset + Work 二元结构"。但反思发现：

- **Library** 本质是"外部文档抓取记录"——它是分发/摄入关注点，不约束 AI 执行时做什么。不提供词汇（Domain）、结构（Blueprint）或环境（Stack）。
- **External** 本质是"指向 OXN 系统外的引用指针"——它是引用机制，不是执行边界。一个 Domain 需要引用外部 API、一个 Stack 需要引用外部工具链——这些都是边界内的外部引用，不需要独立成为 Asset 类型。

### 0.6 2026-07-10 kind-isolation journal 的确立

2026-07-10 的 journal 正式确立了 kind-isolation 原则：

> Decision #1: AssetKind reference isolation — references only same AssetKind; cross-kind via Roadmap scene; v0.6.2+ hard-block.
> Decision #2: Roadmap 承担跨类型组合。
> Decision #3: references 仅同 kind，避免依赖地狱。

本 RFC 在此基础上进一步推演：如果边界类型间不互相引用，跨类型组合应由谁承担？答案是 Blueprint（组合模板）。

---

## 1. 核心提案

### 1.1 三边界框架

将 E1 Asset 的"边界类型"明确为 3 个，覆盖 IAP Intent 的三个正交维度：

| 边界类型 | 约束什么 | IAP 中的角色 | 语义定位 |
|---|---|---|---|
| **Domain** | 词汇 / 禁用词 / 不变量（**说什么**） | Intent 的语义约束 | 业务边界 |
| **Workflow** | slots / deps / observe（**怎么做**） | Intent 的结构约束 | 执行边界 |
| **Stack** | runtimes / linters / testers（**在哪做**） | Intent 的环境约束 | 实现边界 |

> **命名变更**：现有 Blueprint（slots/deps/observe 执行模板）改名为 **Workflow**。新 **Blueprint** = 组合模板（见 §1.2）。

三者覆盖了 IAP Intent 的三个正交维度（语义 / 结构 / 环境），足够支撑整个体系。自定义类型（如 policy / scenario / tool）是三边界内的**内容模板标签**——暂不实现，未来可作为轻量元数据字段加入。

### 1.2 Blueprint 提升为组合模板

Blueprint 从"执行模板"（slots/deps/observe）提升为**组合模板**——E1 Asset 内的一种特殊类型，引用 3 边界类型 + 其他 Blueprint，是 Asset 与 Work 的中间件。

**核心价值——隔离层**：

```
Domain/Workflow/Stack (边界) ──单向影响──→ Blueprint (组合) ──单向影响──→ Work (实例)
     ↑ 最稳定层                    ↑ 隔离层                    ↑ 最动态层
     │ planLock + content_hash     │ 可动态/静态                │ per-execution
     │ 工程师维护                   │ 工程师/AI 组合             │ AI 执行 + Engine 公证
     │                            │                           │
     │ 变化 → 影响引用它的 Blueprint │ 变化 → 影响引用它的 Work    │ 变化不向上传播
     │ 不被 Blueprint/Work 改写     │ 不影响边界                 │ 不被 Work 改写
```

**Blueprint 的动态/静态取决于复用**：
- **静态 Blueprint**：被多个 Work 引用的稳定组合（如"标准文档发布流程" = Domain DocEngineeringContext + Workflow doc-promote + Stack node-ts）
- **动态 Blueprint**：为单次 Work 临时组合的 Blueprint（用完即弃，不沉淀）

### 1.3 External 收敛为边界内 inline 声明

External 从 Asset 类型降级为**边界类型内的 `## Externals` H2 category**。每种边界有 2 种引用：

| 引用类型 | 机制 | 作用域 |
|---|---|---|
| **内部引用** | frontmatter `references: []`（同类型 Asset） | kind-isolated（Domain 只引用 Domain） |
| **外部引用** | `## Externals` H2 category（inline 声明） | 指向 OXN 系统外（url 或 path） |

External 支持 `url`（网络路径）和 `path`（项目路径）双字段，统一处理：
- ADR-0048 原 Library 的用途（已索引外部文档）→ `external "react-docs" { path: "./.openxenon/libraries/react-docs.md"; kind: library }`
- ADR-0048 原 External 的用途（网络资源指针）→ `external "stripe-api" { url: "https://api.stripe.com/v1"; kind: rest-api; ttl: 7d }`
- 项目文档引用 → `external "arch-docs" { path: "./docs/architecture.md"; kind: documentation }`

**External 仅限 Domain / Workflow / Stack 内使用，Blueprint 不可用**——Blueprint 是纯组合层，只引用 Asset，不直接接触外部资源。

### 1.4 Library 删除

Library Asset 类型删除。其两个用途分别由以下机制承担：
- **外部文档已索引内容** → `.openxenon/libraries/*.md` 文件（非 Asset），由 External 的 `path` 字段引用
- **OXN 运行时产生的动态/临时性文档**（探索、讨论、Issue、Insight 报告等）→ `.openxenon/pools/` 酝酿，成熟后沉淀为 Domain

### 1.5 Work 只引用 Blueprint

Work 的 `## Refs` 从直接引用 Domain + Blueprint（+ 孤儿 Stack）简化为**只引用 Blueprint**。Work 解析 Blueprint → 提取 3 边界引用 → 分别注入上下文 / 生成任务。

---

## 2. 实体模型变更

### 2.1 E1-E4 四实体模型不变

保持 v0.6 确立的 E1-E4 四实体模型：

| 实体 | 定位 | 变化 |
|---|---|---|
| E1 Asset | 静态边界 | **类型体系重构**（见 §2.2） |
| E2 Work | 动态协作空间 | **引用模型简化**（只引用 Blueprint） |
| E3 Engine | 独立公证基座 | 不变 |
| E4 Insight | 涌现层 | 不变 |

### 2.2 E1 Asset 类型体系

从 6 类型重构为 5 类型：

| 类型 | 定位 | 引用规则 | MD-native entity |
|---|---|---|---|
| **Domain** | 业务边界 | 只引用 Domain（references） + 外部引用（Externals） | `entity: domain` |
| **Workflow** | 执行边界 | 只引用 Workflow（references） + 外部引用（Externals） | `entity: workflow` |
| **Stack** | 实现边界 | 只引用 Stack（references） + 外部引用（Externals） | `entity: stack` |
| **Blueprint** | 组合模板 | 跨类型引用 Domain + Workflow + Stack + Blueprint | `entity: blueprint` |
| **Roadmap** | meta 索引 | 跨类型索引所有类型（scene 表） | `entity: roadmap` |

### 2.3 单向依赖层级

```
3 边界类型 (最稳定)
    │
    │ 被引用（单向）
    ▼
Blueprint (组合模板, 隔离层)
    │
    │ 被引用（单向）
    ▼
Work (动态实例, 最动态)
```

**变化传播规则**：
- 边界变化 → 可影响引用它的 Blueprint → 可影响引用该 Blueprint 的 Work
- Blueprint 变化 → 可影响引用它的 Work → **不**影响边界
- Work 变化 → **不**向上传播

### 2.4 AssetKind 真相源

保持**纯目录**决定类型（现状不变）：

```
.openxenon/assets/
├── domains/        → entity: domain
├── workflows/      → entity: workflow  (🆕 从 blueprints/ 改名)
├── stack/          → entity: stack
├── blueprints/     → entity: blueprint (🆕 新语义：组合模板)
└── roadmaps/       → entity: roadmap
```

> **注意**：`blueprints/` 目录名不变，但语义从"执行模板"变为"组合模板"。原 `blueprints/` 下的文件需迁移到 `workflows/`（见 §11 迁移方案）。

---

## 3. MD-native 语法设计

本 RFC 基于 v0.3 MD-Native Grammar RFC（v2.0 已拍板）的 H1/H2/H3 + nested list 范式。所有示例均为 MD-native 格式。

### 3.1 Workflow（原 Blueprint 改名，执行边界）

```md
---
entity: workflow
version: 0.3.0
name: fix-issue
abstract: 问题修复流程模板
references:
  - @md/workflows/base-fix
---
# Workflow: fix-issue

> 问题修复流程：诊断 → 定位 → 修复 → 验证

## Props
### timeout
- type: number
- default: 60000
### strict
- type: boolean
- default: true

## Slots
### diagnose
- deps: []
- observe:
  - fs-content-match
### locate
- deps:
  - diagnose
- observe:
  - fs-exists
### fix
- deps:
  - locate
- observe:
  - ts-compiles
  - test-pass
### verify
- deps:
  - fix
- observe:
  - lint-check
  - ts-compiles
  - test-pass

## Externals
### ci-docs
- path: ./docs/development/ci-guide.md
- kind: documentation
- summary: CI 配置指南
```

**H2 categories**：`## Props` + `## Slots` + `## Externals`（+ 可选 `## Stack`，现有 Domain 已有此 category）

### 3.2 Blueprint（新，组合模板）

```md
---
entity: blueprint
version: 0.3.0
name: integrate-payment
abstract: 支付集成组合模板
references:
  - @md/blueprints/base-setup
---
# Blueprint: integrate-payment

> 组合 PaymentContext 业务边界 + fix-issue 执行边界 + node-ts 实现边界

## Refs
### PaymentContext
- kind: domain
- ref: @md/domains/PaymentContext
### fix-issue
- kind: workflow
- ref: @md/workflows/fix-issue
### node-ts
- kind: stack
- ref: @md/stacks/node-ts
### base-setup
- kind: blueprint
- ref: @md/blueprints/base-setup
```

**H2 categories**：`## Refs`（唯一 category）

**`## Refs` 下的 kind 值**：`domain | workflow | stack | blueprint`（4 种，由编译器 validate 校验）

**嵌套组合**：Blueprint 可引用其他 Blueprint（通过 `references` frontmatter + `## Refs` 中的 `kind: blueprint`）。递归解析需防环（DAG 校验）。

### 3.3 Domain（业务边界，含 External inline）

```md
---
entity: domain
version: 0.3.0
name: PaymentContext
abstract: 支付业务上下文
references:
  - @md/domains/OrderContext
---
# Domain: PaymentContext

> 支付领域的词汇约束与外部 API 引用

## Terms
### Transaction
- name: Transaction
- desc: 一笔支付交易
### IdempotencyKey
- name: IdempotencyKey
- desc: 用于去重的唯一请求标识符

## Bans
### forbidden-constructs
- items: 明文存储信用卡号, 直接访问用户密码 Hash

## Invariants
### inv-unique-txid
- value: 所有交易必须有唯一 transactionId
### inv-idempotency
- value: 支付操作必须支持幂等重试

## Externals
### stripe-api
- url: https://api.stripe.com/v1
- kind: rest-api
- ttl: 7d
- auth: api-key
- summary: Stripe 支付 API
### react-docs
- path: ./.openxenon/libraries/react-best-practices.md
- kind: library
- summary: React 最佳实践文档
### arch-docs
- path: ./docs/architecture.md
- kind: documentation
- summary: 项目架构文档
```

**H2 categories**：`## Terms` + `## Bans` + `## Invariants` + `## Externals`（+ 可选 `## Stack`）

### 3.4 Stack（实现边界，含 External inline）

```md
---
entity: stack
version: 0.3.0
name: node-ts
abstract: Node.js + TypeScript 技术栈
references: []
---
# Stack: node-ts

> Node.js + TypeScript + Bun 技术环境约束

## Runtimes
### node
- version: 20.x
- command: node
### bun
- version: 1.1.x
- command: bun

## Linters
### biome
- command: bun run check
- config: biome.json

## Tests
### bun-test
- command: bun test
- timeout: 130000

## Externals
### npm-registry
- url: https://registry.npmjs.org
- kind: service
- ttl: 1d
- summary: NPM 包注册表
### node-compat
- url: https://nodejs.org/api/index.json
- kind: documentation
- ttl: 30d
- summary: Node.js API 兼容性表
```

**H2 categories**：`## Runtimes` + `## Linters` + `## Tests` + `## Externals`

### 3.5 Work（只引用 Blueprint）

```md
---
entity: work
version: 0.3.0
name: integrate-payment-work
---
# Work: integrate-payment-work

## Context
### primary
- goal: 集成 Stripe 支付功能到现有订单系统
- constraints:
  - 不修改现有订单逻辑
  - 必须支持幂等重试

## LoopPolicy
### primary
- max_iterations: 3

## Refs
### integrate-payment
- kind: blueprint
- ref: @md/blueprints/integrate-payment

## Tasks
### stage-1-research
- blueprint: integrate-payment
- part: research-api
  - skill_context: 研究 Stripe API 文档，确定集成方案
### stage-2-implement
- blueprint: integrate-payment
- part: implement
  - skill_context: 实现支付集成代码
```

**关键变化**：`## Refs` 下只有 `kind: blueprint`，不再有 `kind: domain` / `kind: workflow` / `kind: stack`。

### 3.6 Roadmap（meta 索引，4 类型）

```md
---
entity: roadmap
version: 0.3.0
name: oxn-system
abstract: OXN 系统 Asset 导航
---
# Roadmap: oxn-system

## Scenes

### scene: dev

> Scenario: 改代码/加 CLI

| kind | name | description |
|---|---|---|
| domain | WorkOrchestrationContext | Work 编排词汇约束 |
| workflow | dev-workflow | 标准开发流程 |
| stack | node-ts | Node.js + TypeScript + Bun |
| blueprint | dev-standard | 开发标准组合模板 |

### scene: debug

> Scenario: Bug 修复

| kind | name | description |
|---|---|---|
| domain | IAPErrorContext | 错误类型词汇约束 |
| workflow | fix-issue | 问题修复流程 |
| blueprint | debug-standard | 调试标准组合模板 |
```

**关键变化**：scene 表 `kind` 列从 6 值（domain/blueprint/stack/roadmap/library/external）→ 4 值（domain/workflow/stack/blueprint）。Roadmap 自身不出现在 scene 表中（它是索引层，不是被索引的内容）。

---

## 4. 引用模型

### 4.1 2 种引用

每种边界类型有 2 种引用机制：

| 引用类型 | 语法 | 作用域 | hash 参与 | 示例 |
|---|---|---|---|---|
| **内部引用** | frontmatter `references: []` | 同类型 Asset only（kind-isolated） | ✅ 参与 content_hash | `references: [@md/domains/OrderContext]` |
| **外部引用** | `## Externals` H2 category | OXN 系统外（url 或 path） | ✅ 声明参与 hash；❌ 状态不参与 | `### stripe-api` + `- url: ...` |

### 4.2 Kind-isolation 规则

| 类型 | references 可引用 | `## Refs` 可引用 | `## Externals` 可用 |
|---|---|---|---|
| Domain | Domain only | — | ✅ |
| Workflow | Workflow only | — | ✅ |
| Stack | Stack only | — | ✅ |
| Blueprint | Blueprint only | Domain + Workflow + Stack + Blueprint | ❌ |
| Roadmap | — | — | ❌ |

> **Blueprint 的 references vs `## Refs`**：
> - `references`（frontmatter）：引用其他 Blueprint（同类型），参与 DAG 校验和 citations 计算
> - `## Refs`（H2 category）：跨类型引用 Domain + Workflow + Stack + Blueprint，是组合声明

### 4.3 Blueprint 跨类型例外

Blueprint 是唯一允许跨类型引用的类型。这通过 `## Refs` H2 category 实现，不通过 `references` frontmatter（后者仍 kind-isolated）。设计理由：

- 边界类型间的跨类型组合需求**必然存在**（一个工作需要 Domain + Workflow + Stack）
- kind-isolation 要求边界类型间不互相引用
- Blueprint 作为组合层承担跨类型组合，不违反 kind-isolation（因为 Blueprint 不是边界类型）
- Roadmap 作为索引层承担跨类型导航，也不违反 kind-isolation

### 4.4 External kind enum

External 的 `kind` 字段为编译器校验的 enum（非自由字符串）：

| kind 值 | 用途 | 示例 |
|---|---|---|
| `rest-api` | REST API 端点 | `url: https://api.stripe.com/v1` |
| `webhook` | Webhook 端点 | `url: https://api.stripe.com/webhooks` |
| `documentation` | 文档（项目内或网络） | `path: ./docs/architecture.md` 或 `url: https://react.dev/docs` |
| `library` | 已索引的库文档 | `path: ./.openxenon/libraries/react-best-practices.md` |
| `config` | 配置文件 | `path: ./.oxnrc` |
| `service` | 外部服务（非 REST） | `url: grpc://...` |

校验由 domain/workflow/stack compiler 的 `validate()` 方法实现：

```ts
const EXTERNAL_KINDS = ['rest-api', 'webhook', 'documentation', 'library', 'config', 'service'] as const

// validate():
if (!EXTERNAL_KINDS.includes(external.kind)) {
  errors.push({ code: 'E_MD_EXTERNAL_KIND_INVALID', message: `Invalid external kind: ${external.kind}` })
}
```

新增 kind 值需要修改 `EXTERNAL_KINDS` 常量——这是有意为之的摩擦，与"自定义类型暂不实现"的决策一致。

### 4.5 url vs path

External 声明中 `url` 和 `path` 二选一（互斥）：

| 字段 | 含义 | 示例 | 校验方式 |
|---|---|---|---|
| `url` | 网络路径 | `https://api.stripe.com/v1` | HTTP HEAD 请求 |
| `path` | 项目相对路径 | `./docs/architecture.md` | `existsSync()` |

编译器 `validate()` 校验：如果 `url` 和 `path` 同时存在 → `E_MD_EXTERNAL_URL_PATH_CONFLICT`；如果两者都不存在 → `E_MD_EXTERNAL_URL_PATH_REQUIRED`。

---

## 5. External 状态管理

### 5.1 设计原则

External 声明是**静态的**（Asset 不可变，参与 content_hash）。External 的**可用性状态是动态的**（API 可能宕机、文件可能被移动）。因此状态存储在独立索引文件中，不在 Asset 文件内。

### 5.2 状态索引文件

**位置**：`.openxenon/.cache/external-status.json`（与运行时缓存一起，gitignore）

**格式**：

```json
{
  "domain::PaymentContext::stripe-api": {
    "status": "available",
    "lastChecked": "2026-07-10T14:30:00Z"
  },
  "domain::PaymentContext::react-docs": {
    "status": "stale",
    "lastChecked": "2026-07-08T10:00:00Z",
    "error": "File not found"
  },
  "stack::node-ts::npm-registry": {
    "status": "unavailable",
    "lastChecked": "2026-07-10T14:25:00Z",
    "error": "ECONNREFUSED"
  }
}
```

**Key 格式**：`<entity-type>::<entity-name>::<external-name>`

### 5.3 状态值

| status | 含义 | Work 行为 |
|---|---|---|
| `available` | 资源可达 / 文件存在 | 正常读取内容 → 注入上下文 |
| `unavailable` | 资源不可达 / 文件不存在 | **跳过**，输出 warning |
| `stale` | TTL 过期 | **跳过**，输出 warning，提示跑 `oxn external check` |
| `unknown` | 尚未检测 | 尝试读取 → 成功则注入 + 更新为 available；失败则跳过 + 更新为 unavailable |

### 5.4 Work 解析时的跳过逻辑

```
Work 解析 Blueprint → 提取 Domain/Workflow/Stack 引用 → 解析各边界 → 发现 ## Externals
  → 查 .openxenon/.cache/external-status.json
  → status == available → 读取 url/path 内容 → 注入上下文
  → status == unavailable → 跳过，输出 warning："External 'stripe-api' unavailable, skipped"
  → status == stale → 跳过，输出 warning，提示跑 oxn external check
  → status == unknown → 尝试读取 → 成功则注入 + 更新状态为 available；失败则跳过 + 更新为 unavailable
```

**不阻塞 Work 执行**——External 是辅助性引用，不是硬约束。这与 Domain 的 terms/bans/invariants（硬约束，必须满足）有本质区别。

### 5.5 CLI 命令

```bash
# 扫描所有边界类型文件中的 external 声明，检查可用性，更新 external-status.json
oxn external check

# 检查特定 external
oxn external check --name "stripe-api"

# 查看所有 external 的状态
oxn external status

# 手动标记状态（不检查，直接设置）
oxn external mark "stripe-api" --status unavailable --reason "API 维护中"
```

`oxn external check` 工作流：
1. 遍历 `.openxenon/assets/{domains,workflows,stack}/*.md`
2. 解析每个文件中的 `## Externals` H2 category
3. 对每个 external：`url` → HTTP HEAD 请求；`path` → `existsSync()`
4. 更新 `.openxenon/.cache/external-status.json`

---

## 6. Work 影响分析

### 6.1 引用模型变化

| 维度 | 现状 | 新模型 |
|---|---|---|
| Work `## Refs` | `kind: domain` + `kind: blueprint` | **只有 `kind: blueprint`** |
| Work 解析路径 | 直接解析 Domain + Blueprint | 解析 Blueprint → 提取 3 边界引用 → 间接解析 |
| BirthCert assets | `{ domains: [...], blueprints: [...] }` | `{ blueprints: [...] }` |
| PlanLock hash | `workDomainsHash` + `blueprintsHash` + `tasksHash` | `blueprintsHash` + `tasksHash`（边界 hash 归入 blueprintHash） |
| WorkspaceState | `domains: [...]` + `blueprints: [...]` | `blueprints: [...]` |

### 6.2 上下文注入路径变化

**现状**：
```
Work → 直接读 Domain 文件 → 提取 terms/bans/invariants → 注入 AI 上下文
Work → 直接读 Blueprint 文件 → 提取 slots → 生成任务
```

**新模型**：
```
Work → 读 Blueprint 文件 → 提取 ## Refs（domain + workflow + stack 引用）
  → 读 Domain 文件 → 提取 terms/bans/invariants → 注入 AI 上下文
  → 读 Workflow 文件 → 提取 slots/deps/observe → 生成任务结构
  → 读 Stack 文件 → 提取 runtimes/linters/testers → 注入环境约束
  → 读各边界 ## Externals → 查状态 → 可用则注入外部内容
```

增加了一层间接（Work → Blueprint → 3 边界），但获得了**隔离性**：边界变化不直接影响 Work，只影响 Blueprint。

### 6.3 BirthCert schema 变更

```ts
// 现状
assets: z.object({
  domains: z.array(DomainAssetEntrySchema).default([]),
  blueprints: z.array(BlueprintAssetEntrySchema).default([]),
})

// 新模型
assets: z.object({
  blueprints: z.array(BlueprintAssetEntrySchema).default([]),
})
```

每个 `BlueprintAssetEntry` 需扩展，包含其引用的 3 边界 hash（用于 drift 检测）：

```ts
BlueprintAssetEntrySchema = z.object({
  name: z.string().min(1),
  version: z.number().int().min(1).default(1),
  fileHash: z.string().regex(/^[0-9a-f]{64}$/),
  // 🆕 组合的边界 hash（用于 drift 检测）
  domainRefs: z.array(AssetRefEntrySchema).default([]),
  workflowRefs: z.array(AssetRefEntrySchema).default([]),
  stackRefs: z.array(AssetRefEntrySchema).default([]),
})
```

### 6.4 PlanLock hash 变更

```ts
// 现状
PlanLockSchema = z.object({
  workOxnHash: z.string(),
  workDomainsHash: z.string(),
  blueprintsHash: z.string(),
  tasksHash: z.string(),
  allHash: z.string().optional(),
})

// 新模型
PlanLockSchema = z.object({
  workOxnHash: z.string(),
  blueprintsHash: z.string(),   // 包含 Blueprint + 其引用的 3 边界的 composite hash
  tasksHash: z.string(),
  allHash: z.string().optional(),
})
```

`blueprintsHash` 现在是 Blueprint 文件 hash + 其引用的 Domain/Workflow/Stack 文件 hash 的组合。drift 检测时，任何边界变化都会反映在 `blueprintsHash` 的变化上。

### 6.5 Per-work merger 变更

| 现状 | 新模型 |
|---|---|
| `per-work-domains-merger.ts` | 合并到 `per-work-blueprints-merger.ts`（Blueprint 解析时提取 Domain 引用） |
| `per-work-blueprints-merger.ts` | **重写**：解析 Blueprint `## Refs` → 提取 3 边界引用 → 生成 `blueprints.json`（包含 3 边界 slim index） |
| 无 Stack merger | Stack slim index 包含在 `blueprints.json` 中 |

`blueprints.json` 结构变化：

```json
{
  "schemaVersion": 2,
  "workName": "integrate-payment-work",
  "blueprints": [
    {
      "name": "integrate-payment",
      "file": "assets/blueprints/integrate-payment.md",
      "fileHash": "sha256:...",
      "refs": {
        "domains": [{"name": "PaymentContext", "file": "assets/domains/PaymentContext.md", "fileHash": "sha256:...", "terms": 4, "bans": 1, "invariants": 2}],
        "workflows": [{"name": "fix-issue", "file": "assets/workflows/fix-issue.md", "fileHash": "sha256:...", "slots": ["diagnose", "locate", "fix", "verify"]}],
        "stacks": [{"name": "node-ts", "file": "assets/stack/node-ts.md", "fileHash": "sha256:...", "runtimes": ["node", "bun"], "linters": ["biome"], "tests": ["bun-test"]}],
        "blueprints": [{"name": "base-setup", "file": "assets/blueprints/base-setup.md", "fileHash": "sha256:..."}]
      },
      "externals": [
        {"scope": "domain::PaymentContext", "name": "stripe-api", "kind": "rest-api", "status": "available"},
        {"scope": "stack::node-ts", "name": "npm-registry", "kind": "service", "status": "available"}
      ]
    }
  ]
}
```

### 6.6 Stack 孤儿修复

本 RFC 同时解决了 Stack 孤儿问题——Stack 通过 Blueprint 被引用，由 Blueprint merger 解析并提取 runtimes/linters/testers 注入上下文。不再需要在 Work 语法中加 `StackRefDecl`。

---

## 7. Asset 影响分析

### 7.1 AssetKind 变更

```ts
// 现状
export type AssetKind = 'domain' | 'blueprint' | 'stack' | 'roadmap' | 'library' | 'external'

// 新模型
export type AssetKind = 'domain' | 'workflow' | 'stack' | 'blueprint' | 'roadmap'
```

### 7.2 DRY 修复

6 处重复的硬编码数组收敛为单一 SSOT 常量：

```ts
// packages/engine/src/infra/paths.ts
export const ALL_ASSET_KINDS = ['domain', 'workflow', 'stack', 'blueprint', 'roadmap'] as const satisfies readonly AssetKind[]
```

其他 5 处引用此常量，不再各自维护数组。

### 7.3 创建/校验/列表/归档影响

| 操作 | 变化 |
|---|---|
| `oxn asset create --asset-kind workflow` | 🆕 新 kind（原 `blueprint` → `workflow`） |
| `oxn asset create --asset-kind blueprint` | 语义变化（创建组合模板，非执行模板） |
| `oxn asset create --asset-kind library` | ❌ 删除 |
| `oxn asset create --asset-kind external` | ❌ 删除 |
| `oxn asset list` | 列出 5 类型（原 6 类型） |
| `oxn asset validate` | 校验 5 类型 + External kind enum 校验 |
| `oxn asset archive/delete` | 5 类型 |

### 7.4 DAG 校验影响

DAG 校验仍按 `references` frontmatter 构建。变化：

- Domain 的 references 只指向 Domain（kind-isolated 强制）
- Workflow 的 references 只指向 Workflow
- Stack 的 references 只指向 Stack
- Blueprint 的 references 只指向 Blueprint（`## Refs` 中的跨类型引用不参与 references DAG，是组合声明）
- Roadmap 不参与 references DAG（现状不变）

### 7.5 目录结构变化

```
.openxenon/assets/
├── domains/        # 不变
├── workflows/      # 🆕 从 blueprints/ 迁移（原 Blueprint 执行模板 → Workflow）
├── stack/          # 不变
├── blueprints/     # 语义变更（组合模板）；原文件迁移到 workflows/ 后，此目录放新组合模板
└── roadmaps/       # 不变

# 删除的目录（如有）
# .openxenon/assets/libraries/  → ❌ 删除
# .openxenon/assets/externals/  → ❌ 删除

# 新增（非 Asset）
.openxenon/libraries/             # 🆕 外部文档 .md 文件（非 Asset，被 External path 引用）
.openxenon/.cache/external-status.json  # 🆕 External 状态索引
```

---

## 8. Roadmap 影响分析

### 8.1 Scene 表 kind 列变化

| 现状 | 新模型 |
|---|---|
| 6 kind 值：domain / blueprint / stack / roadmap / library / external | 4 kind 值：domain / workflow / stack / blueprint |

### 8.2 Roadmap 自身不在 scene 表中

Roadmap 是索引层，不是被索引的内容。scene 表只列出 4 种"可被组合/可被 Work 消费"的类型。

### 8.3 Roadmap sync 影响

`Roadmap/sync.ts` 的 `scanAllAssets` 遍历从 6 kind → 4 kind。`ALL_KINDS` 常量从 6 值 → 4 值。

---

## 9. 编译器变更

### 9.1 EntityCompiler / EntityRegistry 变更清单

基于 v0.3 MD-Native Grammar RFC 的 EntityCompiler + EntityRegistry 模式：

| 编译器 | 操作 | H2 categories 变化 | 说明 |
|---|---|---|---|
| `domain-compiler.ts` | **修改** | 新增 `## Externals` | 解析 + 校验 External inline 声明 |
| `workflow-compiler.ts` | **新建** | `## Props` + `## Slots` + `## Externals` | 从旧 `blueprint-compiler.ts` 复制改名，entityType 改为 `workflow` |
| `blueprint-compiler.ts` | **重写** | `## Refs`（唯一 category） | 新组合模板编译器；解析跨类型引用；校验 `## Refs` kind 值 ∈ {domain, workflow, stack, blueprint} |
| `stack-compiler.ts` | **修改** | 新增 `## Externals` | 解析 + 校验 External inline 声明 |
| `library-compiler.ts` | **删除** | — | Library entity 删除 |
| `external-compiler.ts` | **删除** | — | External 不再是顶层实体 |
| `roadmap-compiler.ts` | **修改** | scene 表 kind 列从 6 → 4 | 更新 `VALID_KINDS` |
| `work-compiler.ts` | **修改** | `## Refs` 只接受 `kind: blueprint` | 更新 ref 校验逻辑 |
| `task-compiler.ts` | 不变 | — | — |
| `proof-compiler.ts` | 不变 | — | — |

### 9.2 intent-entity-types.json 更新

```json
["domain", "workflow", "stack", "blueprint", "roadmap", "work", "task", "proof"]
```

变化：`blueprint` 语义变更（组合模板）；新增 `workflow`；删除 `library`、`external`。

### 9.3 @md/ scope 更新

```ts
// packages/engine/src/oxl/md-bridge/parse-md-ref.ts
export type MDScope = 'blueprints' | 'workflows' | 'domains' | 'stacks' | 'roadmaps'

const VALID_SCOPES: ReadonlySet<string> = new Set([
  'blueprints', 'workflows', 'domains', 'stacks', 'roadmaps'
])
```

新增 `workflows` scope。`blueprints` scope 语义变更为组合模板。

### 9.4 DEFAULT_ASSET_DIRS 更新

```ts
// packages/engine/src/infra/paths.ts
export const DEFAULT_ASSET_DIRS = {
  domain: 'domains',
  workflow: 'workflows',     // 🆕 从 blueprint: 'blueprints' 拆分
  stack: 'stack',
  blueprint: 'blueprints',   // 语义变更：组合模板
  roadmap: 'roadmaps',
} as const
// 删除: library, external
```

### 9.5 External kind 校验实现

在 `domain-compiler.ts`、`workflow-compiler.ts`、`stack-compiler.ts` 中共享 External 校验逻辑：

```ts
// packages/engine/src/oxl/md-bridge/compilers/external-validate.ts（新共享模块）
const EXTERNAL_KINDS = ['rest-api', 'webhook', 'documentation', 'library', 'config', 'service'] as const

export function validateExternals(externals: ExternalEntry[]): ValidationError[] {
  const errors: ValidationError[] = []
  for (const ext of externals) {
    if (!EXTERNAL_KINDS.includes(ext.kind)) {
      errors.push({ code: 'E_MD_EXTERNAL_KIND_INVALID', message: `Invalid external kind: ${ext.kind}` })
    }
    if (ext.url && ext.path) {
      errors.push({ code: 'E_MD_EXTERNAL_URL_PATH_CONFLICT', message: `External '${ext.name}' has both url and path` })
    }
    if (!ext.url && !ext.path) {
      errors.push({ code: 'E_MD_EXTERNAL_URL_PATH_REQUIRED', message: `External '${ext.name}' needs url or path` })
    }
  }
  return errors
}
```

---

## 10. 引用拓扑总结

```
┌──────────────────────────────────────────────────────────────────────┐
│                       OpenXenon 体系                                   │
│                                                                      │
│  E1 Asset (静态边界)                                                   │
│  ├── 3 边界类型 (kind-isolated, 2 种引用: 内部 + 外部)                  │
│  │   ├── Domain   = 业务边界 (terms/bans/invariants)                   │
│  │   │   ├── 内部引用: references → Domain (同类型)                    │
│  │   │   └── 外部引用: ## Externals (url | path, kind enum)           │
│  │   ├── Workflow = 执行边界 (slots/deps/observe)                      │
│  │   │   ├── 内部引用: references → Workflow (同类型)                  │
│  │   │   └── 外部引用: ## Externals                                   │
│  │   └── Stack    = 实现边界 (runtimes/linters/testers)               │
│  │       ├── 内部引用: references → Stack (同类型)                     │
│  │       └── 外部引用: ## Externals                                   │
│  │                                                                   │
│  ├── Blueprint = 组合模板 (跨类型引用, 隔离层)                          │
│  │   ├── references → Blueprint (同类型, DAG 校验)                    │
│  │   └── ## Refs: domain + workflow + stack + blueprint (跨类型)      │
│  │   └── ## Externals: ❌ 不可用                                       │
│  │                                                                   │
│  └── Roadmap = 统一入口 (meta 索引, 跨类型导航)                        │
│      └── ## Scenes: 表格索引 domain/workflow/stack/blueprint          │
│                                                                      │
│  .openxenon/libraries/*.md (外部文档, 非 Asset, 被 External path 引用) │
│  .openxenon/.cache/external-status.json (External 状态索引, gitignore) │
│  .openxenon/pools/ (运行时产物酝酿, 非 Asset)                          │
│  ├── drafts/   → 探索草稿, 成熟后沉淀为 Domain/Workflow                │
│  ├── issues/   → 问题记录, 修复后提取约束 → Domain                     │
│  └── journals/ → 日志, 复盘后提取经验 → Domain                        │
│                                                                      │
│  单向依赖: 边界 ──→ Blueprint ──→ Work                                 │
│  变化传播: 边界变化→影响 Blueprint; Blueprint变化→不影响边界;            │
│           Blueprint变化→影响 Work; Work变化→不向上传播                  │
│                                                                      │
│  E2 Work (动态实例)                                                    │
│  └── ## Refs: 只引用 Blueprint (kind: blueprint only)                 │
│      └── Work 解析 Blueprint → 提取 3 边界 → 注入上下文/生成任务        │
│      └── Work 解析各边界 ## Externals → 查状态 → 可用则注入             │
│                                                                      │
│  E3 Engine (公证) / E4 Insight (涌现)                                  │
│  └── Proof/Insight 产物在 pools/ 酝酿 → 成熟后沉淀为 Domain            │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 11. 迁移方案

### 11.1 现有 Blueprint → Workflow 迁移

**步骤**：

1. `blueprints/` 目录下所有 `.md` 文件迁移到 `workflows/` 目录
2. 每个文件 frontmatter `entity: blueprint` → `entity: workflow`
3. H1 `# Blueprint: X` → `# Workflow: X`
4. `## Props` 和 `## Slots` 内容不变
5. 已有 `references` 指向其他 Blueprint 的 → 改为指向 Workflow（`@md/blueprints/X` → `@md/workflows/X`）

**自动化**：可通过 `oxn migrate --from v0.6.1-alpha.1 --to v0.6.1` 命令批量执行。

### 11.2 新 Blueprint 从 Work refs 提取

对于每个现有 Work，如果它引用了 Domain + Blueprint（+ Stack），则：

1. 创建新 Blueprint 文件：`.openxenon/assets/blueprints/<work-name>-composition.md`
2. 将 Work 的 `## Refs` 中的 domain + blueprint（→ workflow）+ stack 引用提取到 Blueprint 的 `## Refs`
3. Work 的 `## Refs` 替换为单一 `kind: blueprint` 引用

**示例**：

迁移前 Work：
```md
## Refs
### PaymentContext
- kind: domain
- ref: @md/domains/PaymentContext
### fix-issue
- kind: blueprint
- ref: @md/blueprints/fix-issue
### node-ts
- kind: stack
- ref: @md/stacks/node-ts
```

迁移后 Blueprint（`.openxenon/assets/blueprints/integrate-payment-composition.md`）：
```md
## Refs
### PaymentContext
- kind: domain
- ref: @md/domains/PaymentContext
### fix-issue
- kind: workflow
- ref: @md/workflows/fix-issue
### node-ts
- kind: stack
- ref: @md/stacks/node-ts
```

迁移后 Work：
```md
## Refs
### integrate-payment-composition
- kind: blueprint
- ref: @md/blueprints/integrate-payment-composition
```

### 11.3 Library 现有文件处理

如果 `.openxenon/assets/libraries/` 下有 `.md` 文件：

1. 提取文件内容（去掉 `entity: library` frontmatter）
2. 移动到 `.openxenon/libraries/` 目录
3. 在引用该 Library 的 Domain（或其他边界）中添加 `## Externals` 声明：`path: ./.openxenon/libraries/<name>.md; kind: library`

### 11.4 External 现有文件处理

如果 `.openxenon/assets/externals/` 下有 `.md` 文件：

1. 提取 `## Links` 中的每个 link
2. 在引用该 External 的 Domain（或其他边界）中添加对应的 `## Externals` 声明
3. 删除原 `.openxenon/assets/externals/` 目录

### 11.5 Roadmap scene 表迁移

现有 Roadmap 文件中 scene 表的 `kind` 列：
- `blueprint` → `workflow`（如果是执行模板）
- `blueprint` → `blueprint`（如果是组合模板——需人工判断）
- `library` → 删除该行（或转换为对应 Domain 的 External 引用）
- `external` → 删除该行（或转换为对应 Domain 的 External 引用）

---

## 12. ADR 处置

### 12.1 ADR-0019 标记 Superseded

ADR-0019（Blueprint Type 范式 task/plan/explore）在 v0.6.1-alpha.0 已被废弃但未正式标记。

**处置**：
1. 新建 ADR-00NN（Superseded ADR-0019），记录废弃原因（slot 语法已替代结构差异，Work modes 已替代语义差异）
2. 更新 `.openxenon/docs/adrs/INDEX.md`，将 ADR-0019 标记为 Superseded
3. 更新 `docs/zh-cn/asset.md §12`，移除 `type` 字段描述

### 12.2 ADR-0048 标记 Superseded

ADR-0048（library/ + external/ 子目录设计）被本 RFC 收敛。

**处置**：
1. 新建 ADR-00NN（Superseded ADR-0048），记录收敛原因（Library 降级为 .md 文件 + External 降级为边界内 inline 声明）
2. 更新 `.openxenon/docs/adrs/INDEX.md`，将 ADR-0048 标记为 Superseded
3. ADR-0051（Asset-as-Paper 论文结构）**不标记 Superseded**——`abstract` / `references` / `citations` 字段仍保留在所有 Asset 类型中

### 12.3 新 ADR 建议

| ADR | 主题 |
|---|---|
| ADR-00NN | 三边界框架（Domain/Workflow/Stack 正交维度） |
| ADR-00NN | Blueprint 提升为组合模板（E1 Asset 内的组合型） |
| ADR-00NN | External 收敛为边界内 inline 声明（url/path + kind enum + 状态索引） |
| ADR-00NN | Workflow 命名（原 Blueprint 改名） |
| ADR-00NN | Work 只引用 Blueprint（引用模型简化） |
| ADR-00NN | Superseded ADR-0019（Blueprint type 字段废弃） |
| ADR-00NN | Superseded ADR-0048（library/external Asset 类型收敛） |

---

## 13. Breaking Changes 清单

### 13.1 版本号建议

**v0.6.1**——这是一次重大的 Asset 类型体系重构 + Work 引用模型简化，在 v0.6.1 正式发布前通过 alpha.2 ~ alpha.4 逐步落地。

### 13.2 Breaking changes

| # | 变更 | 影响面 | 迁移路径 |
|---|---|---|---|
| BC-1 | Blueprint → Workflow 改名 | 所有 `.md` 文件中 `entity: blueprint`（执行模板语义）→ `entity: workflow` | `oxn migrate --from v0.6.1-alpha.1 --to v0.6.1` |
| BC-2 | 新 Blueprint 语义（组合模板） | `blueprints/` 目录语义变更 | 从 Work refs 提取组合 |
| BC-3 | Work `## Refs` 只接受 `kind: blueprint` | 所有 Work 文件的 `## Refs` | 从 Work refs 提取 Blueprint |
| BC-4 | BirthCert schema 变更 | 所有 `.work` 文件 | 自动迁移（work-migrator 扩展） |
| BC-5 | PlanLock hash 变更 | 所有 planLock | 自动迁移 |
| BC-6 | AssetKind 从 6 → 5 | 6 处硬编码数组 | 收敛为 SSOT 常量 |
| BC-7 | Library entity 删除 | `.openxenon/assets/libraries/` | 迁移到 `.openxenon/libraries/` + External 引用 |
| BC-8 | External entity 删除 | `.openxenon/assets/externals/` | 迁移到边界内 `## Externals` |
| BC-9 | `@md/` scope 新增 `workflows` | `parse-md-ref.ts` | 向后兼容（新 scope 不影响旧引用） |
| BC-10 | Roadmap scene 表 kind 列 6 → 4 | 所有 Roadmap 文件 | 人工判断 + 迁移 |

### 13.3 Changelog 片段

在 `.changes/0-6-1-three-boundary-blueprint-elevation.md` 中记录。

---

## 14. 开放问题

### 14.1 Blueprint 嵌套深度限制

Blueprint 可引用其他 Blueprint（`## Refs` 中 `kind: blueprint`）。是否需要限制嵌套深度？

**建议**：DAG 校验防环即可，不限制深度。实际使用中超过 3 层嵌套的组合模板可读性会下降，但这是工程约定，不是语法强制。

### 14.2 External TTL 刷新机制

External 的 `ttl` 字段（如 `7d`、`30d`）如何触发刷新？

**建议**：
- 手动：`oxn external check` 检查 TTL 是否过期 → 更新状态为 `stale`
- 自动（v0.6.2+）：daemon 定时扫描 → TTL 过期 → 标记 `stale` → 通知工程师
- Work 解析时发现 `stale` → 跳过 + warning（不自动刷新，避免阻塞）

### 14.3 Roadmap 是否引用 Blueprint

Roadmap scene 表是否应包含 `kind: blueprint` 行？

**建议**：是。Blueprint 是可被 Work 引用的组合模板，Roadmap 应索引它们。scene 表 4 kind 值：domain / workflow / stack / blueprint。

### 14.4 Blueprint 组合的 externals 透传

Blueprint 引用的 Domain 有 `## Externals`。Work 解析时：
- 直接读 Domain 的 Externals → 查状态 → 注入？
- 还是 Blueprint 的 `blueprints.json` slim index 中记录 externals → Work 读 slim index？

**建议**：后者。`blueprints.json` 已包含 `externals` 数组（见 §6.5），Work 读 slim index 即可，不需要递归解析每个边界的原始文件。

### 14.5 Library .md 文件管理 CLI

`.openxenon/libraries/*.md` 文件（非 Asset）如何管理？

**建议**：
- 创建/更新：跑 Work（IAP 闭环），AI fetch 外部文档 → 写入 .md
- 列出：`oxn library list`
- 查看：`oxn library show <name>`
- 删除：`oxn library remove <name>`
- 这些命令操作的是普通 .md 文件，不走 Asset lifecycle

---

## 15. 实施时间线

> **分支策略**：从 `feat/doc-three-tier-arch`（当前分支，含 v0.6.1 alpha 最新进展）派生子分支，串行合并，目标在 v0.6.1 正式发布前完成全部三边界框架 + Blueprint 提升 + External 收敛。

| 阶段 | 版本 | 分支 | 任务 | 工作量 |
|---|---|---|---|---|
| Phase 0 | v0.6.1-alpha.2 | `feat/v0.6.1-alpha.2-three-boundary` | DRY 修复（`ALL_ASSET_KINDS` SSOT）+ Workflow 改名（Blueprint→Workflow）+ 新建 `workflow-compiler.ts` + 重写 `blueprint-compiler.ts`（组合模板）+ 目录迁移（`blueprints/`→`workflows/`） | 4 天 |
| Phase 1 | v0.6.1-alpha.3 | `feat/v0.6.1-alpha.3-blueprint-elevate` | Blueprint 组合模板 + Work 引用模型简化（`## Refs` 只引用 Blueprint）+ BirthCert/PlanLock schema 变更 + per-work merger 重写 + Stack 孤儿修复 | 5 天 |
| Phase 2 | v0.6.1-alpha.4 | `feat/v0.6.1-alpha.4-external-inline` | External inline（`## Externals` H2 category）+ 状态管理（`.cache/external-status.json`）+ CLI 命令（`oxn external check/status/mark`）+ Library/External entity 删除 + 迁移工具 + Roadmap scene 表更新 | 5 天 |
| Phase 3 | v0.6.1 | `feat/v0.6.1-finalize` | 合并 alpha.2-4 + ADR 处置（ADR-0019/0048 Superseded + 新 ADR）+ 文档更新（`docs/zh-cn/`）+ changelog 片段 | 2 天 |

**依赖关系**：

```
Phase 0 (Workflow 改名 + DRY 修复, 基础)
    ↓
Phase 1 (Blueprint 提升 + Work 简化, 核心)
    ↓
Phase 2 (External inline + Library/External 删除, 依赖 Phase 0+1)
    ↓
Phase 3 (ADR + 文档 + Roadmap, 收尾)
```

**总工作量**：约 16 工作日。

---

## 16. 决策清单

| # | 决策 | 选择 | 理由 |
|---|---|---|---|
| 1 | Work 机制存废 | 保留 | 静态边界的动态实例，不可合并 |
| 2 | 边界类型数量 | 3 个：Domain + Workflow + Stack | 覆盖 IAP Intent 三正交维度 |
| 3 | 现有 Blueprint 改名 | Blueprint → Workflow | slots/deps/observe 语义不变，仅 entity type 改名 |
| 4 | 新 Blueprint 定位 | E1 Asset 组合模板 | `## Refs` 引用 domain + workflow + stack + blueprint |
| 5 | Blueprint 层级 | E1 Asset | 保持 E1-E4 四实体模型不变 |
| 6 | Library 定位 | 删除 Asset 类型 | 运行时产物在 pools/ 酝酿 → 沉淀为 Domain；indexed 内容是 .md 文件 |
| 7 | External 定位 | 边界内 `## Externals` H2 category | inline 声明，非顶层实体 |
| 8 | External 作用域 | 仅 Domain/Workflow/Stack | Blueprint 不可用（纯组合层） |
| 9 | External kind | 编译器 enum 校验 | 6 值：rest-api/webhook/documentation/library/config/service |
| 10 | External 状态 | `.openxenon/.cache/external-status.json` | 独立索引，不参与 Asset hash |
| 11 | Work 跳过逻辑 | 不可用 External 跳过 + warning | 不阻塞执行 |
| 12 | AssetKind union | 5 类型 | domain/workflow/stack/blueprint/roadmap |
| 13 | AssetKind 真相源 | 纯目录 | 现状不变 |
| 14 | 引用模型 | 2 种引用：内部（references 同类型）+ 外部（Externals inline） | kind-isolation + Blueprint 跨类型例外 |
| 15 | 单向依赖 | 边界 → Blueprint → Work | Blueprint 隔离层 |
| 16 | Roadmap 定位 | meta 索引层 | 4 类型索引 |
| 17 | 自定义类型 | 暂不实现 | 未来作为边界内内容模板标签 |
| 18 | CLI 命令 | `oxn external check/status/mark` | — |
| 19 | RFC 语法基础 | MD-native（H1/H2/H3 + nested list） | 非 Langium |
| 20 | ADR-0019 处置 | 标记 Superseded | Blueprint type 字段废弃 |
| 21 | ADR-0048 处置 | 标记 Superseded | Library/External Asset 类型收敛 |
| 22 | 编译器变更 | EntityCompiler/EntityRegistry 模式 | 新建 workflow-compiler、重写 blueprint-compiler、删除 library/external-compiler |
| 23 | @md/ scope | 新增 workflows | blueprints scope 语义变更为组合模板 |
| 24 | DEFAULT_ASSET_DIRS | 新增 workflow: 'workflows' | 删除 library/external |

---

## 参考

- [v0.6 IAP 架构重构 RFC](../../docs/rfcs/v0.6-iap-refactor-rfc.md) — E1-E4 四实体模型
- [MD-Native Grammar RFC](../../docs/rfcs/md-native-grammar-rfc.md) — H1/H2/H3 + nested list 语法范式
- [ADR-0019](../../adrs/0019-blueprint-type-paradigm.md) — Blueprint Type 范式（将被 Superseded）
- [ADR-0020](../../adrs/0020-intent-align-unified-matrix.md) — Intent-Align 统一矩阵
- [ADR-0048](../../adrs/0048-asset-library-external-scheme.md) — library/external 子目录（将被 Superseded）
- [ADR-0051](../../adrs/0051-asset-paper-citation-network.md) — Asset-as-Paper 论文结构
- [2026-07-10 kind-isolation journal](../../pools/journals/2026-07-10-references-kind-isolation.md) — kind-isolation 原则确立
- [v0.6.3 Asset Paper Schema RFC](../../docs/rfcs/v0.6.3-asset-paper-schema-rfc.md) — Library/External 设计原始 RFC
- [ADR-0040~0047 Memory Series Superseded](../../adrs/2026-07-05-archive-0040-0047-memory-series-superseded.md) — Memory 层反弹记录
