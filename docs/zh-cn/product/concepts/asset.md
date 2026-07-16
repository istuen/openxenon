---
redirectFrom:
  - /zh-cn/asset.html
title: 资产
---

# 资产（E1 · 静态边界）

> **Asset 是 OXN 的第一结构实体（E1）——工程师维护的硬约束边界**。Domain / Workflow / Stack 三类边界资产 + Blueprint 组合模板 + Roadmap 索引层构成 5 类型 Asset。
> Asset 创建后在 planLock + content_hash 下冻结，**不被 Work 改写，只被 Work 引用**——这是 OXN 区别于 OpenSpec 的关键设计反转。

## 1. 三边界 + 组合模板（v0.6.1-alpha.4 三边界框架）

E1 Asset 的"边界类型"明确为 3 个，覆盖 IAP Intent 的三个正交维度：

| 边界类型 | 关心什么 | 约束硬度 | IAP 角色 | 示例 |
|---|---|---|---|---|
| **Domain** | 业务上"说什么 / 不能说什么" | term 强制使用、ban 禁止使用、invariant 机器校验 | Intent 的语义约束 | `MemberContext` |
| **Workflow** | 技术上"分几步做、步间依赖"（slot DAG） | slot DAG 无环校验、slot 对齐 Part、observe 探针 | Intent 的结构约束 | `dev-workflow`、`fix-issue` |
| **Stack** | 工程师对 AI 设定的技术环境约束 | v0.6 硬要求，Proof 阶段直接断言 | Intent 的环境约束 | `node-ts`、`bun-react-stack` |

外加 2 类 AssetKind：

| AssetKind | 角色 | 何时使用 |
|---|---|---|
| **Blueprint** | 组合模板（E1 Asset 内的隔离层） | 组合 Domain + Workflow + Stack + Blueprint，供 Work 一次性引用 |
| **Roadmap** | meta 索引层（不参与 references DAG） | AI 路由入口（scene → asset） |

**关键边界**：
- 3 边界类型**不互相引用**（kind-isolation，references 仅同类型）
- **Blueprint** 是唯一允许跨类型引用的 Asset 类型（通过 `## Refs` 引用 Domain + Workflow + Stack + Blueprint）
- **Work 只引用 Blueprint**（一个 ref），Blueprint 内部组合 3 边界
- **Roadmap** 是索引层，不出现在自身 scene 表中

详见 [ADR-0054 三边界框架](../../../../.openxenon/docs/adrs/0054-three-boundary-framework.md) + [ADR-0055 Blueprint 组合模板](../../../../.openxenon/docs/adrs/0055-blueprint-as-composition-template.md)。

## 2. Asset vs OpenSpec specs/（设计反转）

OXN Asset 在目录形态上借鉴了 OpenSpec 的 `specs/`（按类型平铺），但语义完全**对立**：

| 维度 | OpenSpec specs/ | OXN Asset (E1) |
|---|---|---|
| **角色** | 被 change 改写的目标（delta 每次 archive 合并进 specs） | 被 Work 引用的硬约束边界（不被 Work 改写） |
| **版本** | 流动的——每次 archive 合并，规范持续演进 | 冻结的——创建后 planLock + content_hash，不可变 |
| **创建方式** | 随 change 自然生长 | 专门的 Asset 模式 Work 显式创建 |
| **修改方式** | 任何 change 都可以修改任何 spec | 只能通过专门的 Asset 模式 Work + audit pool approve 闸门 |
| **验证** | AI 自查 + 人工 review | Engine 独立第三方探针 + frozen.json |
| **引用语义** | change 里声明"我要改这些 specs" | Work 里声明"我在这些边界内执行" |
| **哲学** | Spec-Driven Development（规范是产物） | **Constraint-Driven Engineering**（约束是边界） |

**一句话总结**：OpenSpec 的 spec 是**"工作要改写的目标"**，OXN 的 Asset 是**"工作要遵守的边界"**。前者把规范当产物，后者把约束当协约。

## 3. 硬约束三层锁

Asset 创建后立即进入三层不可变锁定：

| 锁层 | 机制 | 绕过成本 |
|---|---|---|
| OS 层 | chmod 0o444（写前抬 0o644 → try/finally 回锁 0o444） | root 可绕过 |
| 内容层 | `content_hash` = SHA-256（写入时计算，读取时校验） | 改内容 hash 对不上 |
| WAL 层 | **planLock**（v0.6.1-alpha.3 起 3 组件 hash：workOxn/blueprints/tasks + allHash；blueprintsHash 含 Blueprint + 3 边界 composite hash） | 锁后任何 .md 漂移 → IAP_ALIGN_LOCK_HASH_MISMATCH |

三层锁确保 Asset 在被 Work 引用期间**绝对不可变**——Engine 在 Proof 阶段能直接断言"AI 是否越界修改了 ban 目录"。

## 4. Domain：业务边界

```oxn
domain "MemberContext" {
  description = "会员限界上下文：管理注册、认证、会员等级"

  term {                                      // ✅ ≥3 个核心实体
    "Member":   "注册会员实体"
    "Account":  "会员的登录凭证"
    "Register": "提交注册表单创建 Member"
  }

  ban { "User", "Customer", "AccountHolder" } // ✅ ≥2 个禁用词

  invariant {                                  // ✅ ≥1 个不变量
    "密码任何时候都不能明文存储"
    "同一邮箱在同一上下文内不可重复注册"
  }
}
```

**自治原则**：Domain 不引用 Asset（不含 `ref "@prj/assets/..."`）、不持有 Slot、不持有 Probe。

## 5. Blueprint：技术拓扑边界

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

Slot DAG 必须无环（Engine 校验拒绝 cycle）。

## 6. Stack：技术环境约束（v0.6 硬要求）

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

Stack 定义在 Domain 的 `## Stack` H2 section 下。Proof 阶段直接断言（如检测到 `language: typescript` 但产物是 `.js`，可判 fail）。

## 7. 物理目录（v0.6 默认）

```
.openxenon/
├── config.json                   ← assetRoot + assetDirs
├── assets/
│   ├── domain/<Name>.md          ← E1 Asset 默认路径
│   ├── blueprint/<name>.md
│   └── stack/<name>.md
├── works/<w>/
│   └── work.md                   ← ref @prj/assets/domains/MemberContext
└── ...
```

**兼容旧项目**：通过 config fallback 自动探测 `.openxenon/{domains,blueprints}/`。

## 8. 创建 Asset（两种路径）

**快速通道 CLI**（绕过 IAP）：
```bash
oxn domain create MemberContext
oxn blueprint create dev-workflow --slots build,test,verify
oxn stack create ExampleStackDomain
```

**严谨路径 Work**（IAP 完整周期）：
```bash
oxn work create MemberContext --type asset --asset-kind domain
# → 走 8 阶段流程（validate → lock → run → finalize）
# → .openxenon/assets/domains/MemberContext.md 正式入库
```

Skill `oxn-work` 教学推荐严谨路径（可追溯、有 planLock）。

## 9. 反模式

- ❌ 把 Asset 当"可随时修改的文档"——Asset 创建后 planLock 锁定，修改必须走专门的 Asset 模式 Work（`oxn work create --type asset`）
- ❌ 在 Work 内直接修改 Asset——Work 只能引用 Asset，不能改写
- ❌ Domain 里放 slot——Domain 是业务边界，slot 是技术拓扑，正交
- ❌ Blueprint 里放 term——同上
- ❌ 跳过 Work 的 IAP 闭环直接 `write_file` Asset（v0.6.3+ 必须通过 Work 路径）

## 10. Blueprint props 漏斗效应（ADR-0001）

**核心命题**：Blueprint props ≠ Part props 的简单合集，而是**漏斗**——通过硬编码 / 拼接 / 默认值吸收子层复杂度，对外暴露收敛后的稳定 API。

### 10.1 三层默认值优先级链

从高到低：

1. **父层显式**（Blueprint 顶层 `params` 或 Task `--param key=value`）
2. **本层 default**（Blueprint 的 props.default）
3. **子层 schema default**（Part / Probe 的 props.default）

### 10.2 漏斗效应的好处

- ✅ Task 命令行参数简短（只需关心 Blueprint 暴露面）
- ✅ Part 内部细节对调用者隐藏
- ✅ Part 改名 / 删除属性时**只需检查 Blueprint 引用**，无需追溯 Work

### 10.3 反模式

- ❌ 让调用者必须知道 Part 内部所有 props
- ❌ 在 Blueprint 里"反射式"暴露 Part 全部字段（破坏漏斗效应）

## 11. ArsenalResolver 优先级链（ADR-0004）

资产解析时按从高到低的优先级：

```
Project (`@prj/...`)  >  Global (`@gbl/...`)  >  Builtin (`@oxn/...`)
```

### 11.1 设计意图

- ✅ **项目级资产可覆盖 builtin**——工程师可渐进式替换 builtin 实现
- ✅ **不污染 builtin**——项目级仅在当前项目可见
- ✅ **L2-Builtin 独占 BUILTIN_\*** 常量驻留位置，Kernel / OXL 永不直接依赖

### 11.2 调用方

Work 看到的是 `ArsenalResolver`（而非 `BuiltinArsenal` 直接引用）。DSL 通过 Port 注入获得 Resolver，Arsenal 类（Forge / Promote）封装解析逻辑。

### 11.3 反模式

- ❌ 在 L0 Kernel / L1 OXL 直接 `import { BUILTIN_PROBES } from '...'`——必须通过 Resolver 端口
- ❌ 项目级资产尝试覆盖 builtin 时不同名命名（导致 resolver 看到两个实体）

## 12. ~~Blueprint Type 范式（ADR-0019）~~ ⛔ Superseded

> **本节描述的 `type "task"|"plan"|"explore"` 字段已被废弃**。v0.6.1-alpha.0 P0 移除 builtin blueprint 模板的 `type` 字段，v0.6.1-alpha.4 三边界 RFC 正式标记 Superseded（[ADR-0052](../../../../.openxenon/docs/adrs/0052-superseded-0019-blueprint-type-paradigm.md)）。
>
> **替代方案**：
> - Blueprint 结构差异由 `slot` DAG 拓扑表达（linear task vs DAG plan）
> - 行为差异（task/explore）由 Blueprint `observe` 探针的 `kind: warning`/`mandatory` 表达
> - Work 模式（task/explore/edit）已废弃（v0.7+），行为完全由 Blueprint 承载
>
> 历史信息保留在 [ADR-0019](../../../../.openxenon/docs/adrs/0019-blueprint-type-paradigm.md)，仅供追溯。

## 12.1 External inline（`## Externals`）— v0.6.1-alpha.4

每个边界类型（Domain/Workflow/Stack）可声明 `## Externals` H2 category 引用 OXN 系统外的资源。**Blueprint 不支持**（Blueprint 是纯组合层）。

### 字段 schema

```oxl
### external-name
- url: https://api.example.com/v1   # 或 path（互斥）
- kind: rest-api                     # enum 6 值
- ttl: 7d                            # 可选
- auth: api-key                      # 可选
- summary: ...                       # 可选
```

### Kind enum（6 值，编译器强制）

| kind | 用途 | 示例 |
|---|---|---|
| `rest-api` | REST API 端点 | `url: https://api.stripe.com/v1` |
| `webhook` | Webhook 端点 | `url: https://api.stripe.com/webhooks` |
| `documentation` | 文档（项目内或网络） | `path: ./docs/arch.md` 或 `url: https://react.dev/docs` |
| `library` | 已索引的库文档 | `path: ../../../../.openxenon/libraries/react-docs.md` |
| `config` | 配置文件 | `path: ./.oxnrc` |
| `service` | 外部服务（非 REST） | `url: grpc://...` |

### 2 种引用 vs Internal references

| 引用类型 | 机制 | 作用域 |
|---|---|---|
| **Internal** | frontmatter `references: []` | 同类型 Asset only（kind-isolated） |
| **External** | `## Externals` H2 category | OXN 系统外（url 或 path） |

### 状态管理

External 声明是静态的（Asset 不可变），可用性状态是动态的。存储在 `.openxenon/.cache/external-status.json`（gitignore），不参与 Asset hash。

**4 状态值**：`available` / `unavailable` / `stale` / `unknown`

### CLI

```bash
oxn external check        # 扫描所有边界 + 检查可达性 + 更新状态
oxn external status       # 显示所有 external 状态
oxn external mark <name> --status <s> [--reason "..."]  # 手动标记
```

详见 [ADR-0056 External inline + 状态管理](../../../../.openxenon/docs/adrs/0056-external-inline-and-status.md) + [ADR-0053 Superseded ADR-0048](../../../../.openxenon/docs/adrs/0053-superseded-0048-library-external-scheme.md)（library/external Asset 类型收敛的史料）。

## 13. catalog.json 与 Probe 黑名单（ADR-0035）

### 13.1 catalog.json 替代 catalog.md

Asset 索引位于 `.openxenon/assets/catalog.json`（**不入 git**，本地缓存）。JSON 优先于 MD，因为：

- ✅ 便于 CI / Skill 自动校验
- ✅ 与 frozen.json 同格式家族（一致工具链）
- ❌ catalog.md 不可机读、易过期

### 13.2 Probe 不入 catalog

Probes 是"AI 盲区"（不应让 AI 看见全部 Probe 再选择性调用）。catalog **仅含** Asset：

| 类型 | 入 catalog |
|---|---|
| Domain | ✅ |
| Blueprint | ✅ |
| Stack | ✅ |
| Probe | ❌（AI 看不到全部，Skill 按需引导） |

### 13.3 CLI 命令

```bash
oxn arsenal list            # 列出当前可见 Asset（Project + Global + Builtin）
oxn arsenal show <name>     # 显示 Asset 详情
```

---

## 14. Asset 论文结构（ADR-0051 · v0.6.3+）

> Asset 是一篇"微型论文"——结构固定、逻辑自洽、可被引用、可被验证。**完整设计见 [Asset Paper Schema · 资产论文结构](./asset-paper.md)**，本节为概览。

### 14.1 Schema 扩展（4 新字段）

```yaml
---
type: domain
id: payment-core
version: 1.2.0
status: stable

# 🆕 论文结构（v0.6.3 引入）
abstract: |                          # 论文摘要（必填，老 Asset 默认空字符串）
  本文档定义支付核心领域的边界。
references:                          # 引用其他 Asset（依赖 DAG 出边）
  - asset: stack-nodejs
  - asset: api-rest-standard
citations: 3                         # 被引用次数（Engine 自动维护）
auditTrail:                          # 版本历史
  - version: 1.2.0
    date: 2026-10-15
    author: engineer-X
    changes: 新增 §3.4 幂等性约束
---
```

### 14.2 引用计数 → 影响半径

```typescript
function impactRadius(asset: Asset): 'low' | 'medium' | 'high' | 'critical' {
  const citations = asset.citations ?? 0
  if (citations >= 10) return 'critical'  // 重构级
  if (citations >= 5) return 'high'      // 重大变更
  if (citations >= 1) return 'medium'    // 业务级
  return 'low'                            // 局部
}
```

**变更策略**：
- **critical** (≥10) — 触发 planLock 重算 + 全量测试
- **high** (5-9) — 触发相关模块测试
- **medium** (1-4) — 仅相关业务测试
- **low** (0) — 孤岛 Asset，无验证

### 14.3 DAG 校验 + 循环依赖检测

```bash
$ oxn asset validate --check-dag
# → 自动检测 references[] 拓扑
# → 孤儿引用：OXN_ASSET_ORPHAN_REFERENCE
# → 循环依赖：OXN_ASSET_CIRCULAR_DEPENDENCY
```

### 14.4 库/外部子目录

```
.openxenon/assets/
├── domain/                          # 原
├── blueprint/                       # 原
├── stack/                           # 原
├── library/                         # 🆕 外部信息聚合（Work 产出）
└── external/                        # 🆕 外部引用指针（URL + hash + ttl）
```

| 子目录 | 内容 | 大小限制 | 写入路径 |
|---|---|---|---|
| `library/` | AI 解析后写入 .md | < 50KB | 通过 Work |
| `external/` | 仅引用指针 | 无 | 手动 / 自动 fetch |

### 14.5 引用图渲染（v0.7.0 W11-12）

```bash
$ oxn asset graph payment-core
# digraph G {
#   payment-core -> stack-nodejs
#   payment-core -> api-rest-standard
# }

$ oxn asset graph payment-core --format mermaid
# graph LR
#   payment-core --> stack-nodejs
#   payment-core --> api-rest-standard
# }

$ oxn asset impact payment-core
# impact: high
# citations: 3
# referencedBy: [order-checkout, refund-flow, payment-gateway]
```

---

## → 参考

- [Core Concepts](./iap-paradigm.md) — E1-E4 完整概念
- [Work](./work.md) — E2 动态协作 + IAP + Round
- [Insight](./insight.md) — E4 涌现层
- [Asset Paper Schema · 资产论文结构](./asset-paper.md) — Asset-as-Paper 论文结构 + 引用计数 + DAG
- [v0.6.3 Asset Paper Schema RFC](../../../../.openxenon/pools/sprints/v0.6.x-observability-roadmap/design/v0.6.3-asset-paper-schema-rfc.md) 📝 Draft
- [v0.6 RFC](../../../../.openxenon/pools/sprints/v0.6-iap-refactor/design/v0.6-iap-refactor-rfc.md)
