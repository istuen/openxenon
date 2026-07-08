# 5 种 AssetKind 速查

> 本文件是 `oxn-asset` Skill 的按需加载补充。选 AssetKind 时查阅。

## 5 种 AssetKind 总览

| AssetKind | 用途 | H2 分类白名单 | 典型 H3 示例 |
|---|---|---|---|
| **domain** | 业务限界上下文（DDD） | Terms / Bans / Invariants | Member, Account, Order |
| **blueprint** | 技术流程（slot DAG） | Props / Slots | env, timeout; build, test, verify |
| **stack** | 技术栈约束（runtime/linter/test） | Runtimes / Linters / Tests | typescript, biome, bun-test |
| **library** | 文档聚合（外部知识汇总） | Sources | axios-docs, express-routing |
| **external** | 外部资源链接（API/服务） | Links | payment-api, log-aggregator |

## Domain — 业务 Intent

**何时用**：
- 项目初始化（oxn init 时让 AI 生成 starter Domain）
- 跨 team 统一词汇（term / ban / invariant）
- 业务边界澄清（哪些业务逻辑属于哪个 context）

**不适用**：
- 技术流程（用 blueprint）
- 工具链约束（用 stack）

## Blueprint — 技术 Intent

**何时用**：
- 标准化开发流程（dev / test / verify / ship）
- CI/CD pipeline 模板
- 多 task DAG 编排

**Slot 依赖图必须无环**：`deps: [a, b]` 表示该 slot 依赖 a 和 b 的产物。

## Stack — 工具链约束

**何时用**：
- 锁定项目 runtime 版本（typescript >=5.0.0）
- 锁定 lint/test 工具（biome, bun-test）
- 强制覆盖 `oxn init` 自动生成的 starter-stack

**与 Blueprint 关系**：stack 提供**环境**，blueprint 提供**流程**。

## Library — 文档聚合

**何时用**：
- 抓取外部文档生成可 AI 消费的 .md
- 第三方 SDK 文档（axios, express, react）
- 内部 wiki 聚合

**与 External 区别**：library = **拉过来消费**；external = **链接指向外部**。

## External — 外部资源

**何时用**：
- 第三方 API 链接（Stripe, GitHub）
- 外部服务地址（log aggregator, monitoring）
- 需要 TTL 刷新的资源

**TTL 语义**：超过 ttl 的 external 视为过期，需要重新 fetch。

## 5 种 AssetKind 关系图

```
┌─────────────────────────────────────────────┐
│  Stack（环境）  ──→  Blueprint（流程）      │
│       │                    │                │
│       └──→  Work 引用 ────┘                │
│                  │                          │
│                  ▼                          │
│            Domain（业务边界）                │
│                  │                          │
│                  ▼                          │
│         Library + External（外部知识）       │
└─────────────────────────────────────────────┘
```

Work 通过 `--asset domain=X --asset blueprint=Y --asset stack=Z` 同时引用多个 AssetKind。