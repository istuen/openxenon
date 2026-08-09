# 5 种 AssetKind 速查（v0.6.1-alpha.4）

> 本文件是 `oxn-asset` Skill 的按需加载补充。选 AssetKind 时查阅。

## 5 种 AssetKind 总览

| AssetKind | 用途 | H2 分类白名单 | 典型 H3 示例 |
|---|---|---|---|
| **domain** | 业务限界上下文（DDD） | Terms / Bans / Invariants / **Externals**（可选）| Member, Account, Order |
| **workflow** | 执行流程（slot DAG，原 Blueprint 改名） | Props / Slots / **Externals**（可选）| env, timeout; build, test, verify |
| **stack** | 技术栈约束（runtime/linter/test） | Runtimes / Linters / Tests / **Externals**（可选）| typescript, biome, bun-test |
| **blueprint** | 组合模板（domain + workflow + stack 组合） | **Refs**（跨类型引用）| integrate-payment, dev-standard |
| **assetmap** | 导航图（scene → asset） | Scenes (sub: scene) | scene-doc, scene-dev |

> **v0.6.1-alpha.4 收敛**：
> - library/external 资产类型已删除（详见 ADR-0053）
> - 原 blueprint（执行模板）改名为 **workflow**；新 blueprint 是组合模板
> - **External inline**：外部资源引用通过边界类型内的 `## Externals` H2 category 声明

## Domain — 业务 Intent（边界类型）

**何时用**：
- 项目初始化（oxn init 时让 AI 生成 starter Domain）
- 跨 team 统一词汇（term / ban / invariant）
- 业务边界澄清（哪些业务逻辑属于哪个 context）

**不适用**：
- 技术流程（用 workflow）
- 工具链约束（用 stack）

**可选 `## Externals`**：当 Domain 需引用外部 API（如 PaymentContext → Stripe API），在 body 内声明：
```oxl
## Externals
### stripe-api
- url: https://api.stripe.com/v1
- kind: rest-api
- ttl: 7d
- auth: api-key
```

## Workflow — 执行 Intent（边界类型，原 Blueprint 改名）

**何时用**：
- 标准化开发流程（dev / test / verify / ship）
- CI/CD pipeline 模板
- 多 task DAG 编排

**Slot 依赖图必须无环**：`deps: [a, b]` 表示该 slot 依赖 a 和 b 的产物。

**可选 `## Externals`**：当 Workflow 需引用外部工具链文档：

```oxl
## Externals
### ci-docs
- path: ./docs/development/ci-guide.md
- kind: documentation
```

## Stack — 工具链约束（边界类型）

**何时用**：
- 锁定项目 runtime 版本（typescript >=5.0.0）
- 锁定 lint/test 工具（biome, bun-test）
- 强制覆盖 `oxn init` 自动生成的 starter-stack

**与 Workflow 关系**：stack 提供**环境**，workflow 提供**流程**。

**可选 `## Externals`**：当 Stack 需引用外部工具配置源：

```oxl
## Externals
### npm-registry
- url: https://registry.npmjs.org
- kind: service
- ttl: 1d
```

## Blueprint — 组合模板（E1 Asset 内的隔离层）

**何时用**：
- 把 Domain + Workflow + Stack + 其他 Blueprint 组合成一个可复用的"配方"
- Work 只引用一个 Blueprint，无需分别选 3 边界

**与 Workflow 区别**：
- Workflow = **怎么做**（slot DAG 流程模板）
- Blueprint = **用什么组合**（Domain + Workflow + Stack 的组合声明）

**唯一 H2 category**：`## Refs`

```oxl
blueprint "integrate-payment" {
  abstract: 支付集成组合模板

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
}
```

**禁止**：
- ❌ 不在 Blueprint 内声明 `## Externals`（Blueprint 是纯组合层，外部引用由被组合的 Domain/Workflow/Stack 承担）
- ❌ Blueprint 不能引用 Blueprint 形成环（DAG 校验）

## Roadmap — 导航图（meta 索引层）

**何时用**：
- AI Agent 需要快速定位"该用哪个 Asset"时
- 按场景（doc/dev/debug/test/release/onboard）查找相关 Domain/Workflow/Stack/Blueprint

**与 Work 关系**：Roadmap 是 AI 路由入口，**不参与** Work 的 references DAG（meta 引用关系独立）。

## 5 种 AssetKind 关系图（v0.6.1-alpha.4 三边界）

```
┌────────────────────────────────────────────────────────┐
│  3 边界类型（kind-isolated）                              │
│  ├── Domain（业务）     ─┐                              │
│  ├── Workflow（执行）   ─┼─→ Blueprint（组合模板）     │
│  └── Stack（环境）      ─┘            │               │
│                                       ▼               │
│                                     Work（实例）        │
│                                       │               │
│                                       ▼               │
│                                   Engine（公证）       │
│                                                         │
│  Roadmap（meta 索引层）                                 │
│  └── scene → domain/workflow/stack/blueprint           │
│      （不参与 references DAG，不在自身 scene 中）       │
└────────────────────────────────────────────────────────┘
```

**Work 通过 `--blueprint <bp>` 引用 Blueprint**（一个 ref），Blueprint 内部组合 3 边界。Work 不直接感知 3 边界类型。

## External inline — 边界内的外部引用（v0.6.1-alpha.4）

每个边界类型（domain/workflow/stack）可声明 `## Externals` H2 category。**Blueprint 不支持**。

### 完整 schema

```oxl
### external-name
- url: https://api.example.com/v1   # 或 path（互斥）
- kind: rest-api                     # 必填，6 值 enum
- ttl: 7d                            # 可选
- auth: api-key                      # 可选
- summary: ...                       # 可选
```

### 6 值 kind enum

`rest-api` | `webhook` | `documentation` | `library` | `config` | `service`

### url vs path 互斥

- `url`：网络路径（`https://api.example.com/v1`）
- `path`：项目相对路径（`./docs/architecture.md`）
- 两者**二选一**（同时存在报错 `E_MD_EXTERNAL_URL_PATH_CONFLICT`；都不存在报错 `E_MD_EXTERNAL_URL_PATH_REQUIRED`）

### 状态管理

External 状态存储在 `.openxenon/.cache/external-status.json`（gitignore），**不参与** Asset content_hash。

**4 状态值**：`available` | `unavailable` | `stale` | `unknown`

**Key 格式**：`<entity-type>::<entity-name>::<external-name>`

### CLI

```bash
oxn external check              # 扫描 + 检查可达性 + 更新状态
oxn external status             # 显示所有状态
oxn external mark --name "X" --status <s> [--reason "..."]
```

## 5 种 AssetKind + External inline 关系图

```
┌────────────────────────────────────────────────────────┐
│  3 边界类型（kind-isolated）                              │
│  ├── Domain     ─┐                                       │
│  │   │ Externals │─ external-status.json (独立索引)       │
│  ├── Workflow   ─┤                                       │
│  │   │ Externals │                                       │
│  ├── Stack      ─┘                                       │
│  │     │ Externals │                                     │
│  └── (仅这 3 种有 Externals)                             │
│       │                                                   │
│       ▼                                                   │
│  Blueprint（组合模板，仅 ## Refs，无 Externals）         │
│       │                                                   │
│       ▼                                                   │
│  Work（实例）── references Blueprint（一个 ref）          │
└────────────────────────────────────────────────────────┘
```