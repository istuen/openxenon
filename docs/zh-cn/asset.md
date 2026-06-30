---
title: 资产
---

# 资产（E1 · 静态边界）

> **Asset 是 OXN 的第一结构实体（E1）——工程师维护的硬约束边界**。Domain / Blueprint / Stack 三类资产构成 Work 引用的稳定参照系。
> Asset 创建后在 planLock + content_hash 下冻结，**不被 Work 改写，只被 Work 引用**——这是 OXN 区别于 OpenSpec 的关键设计反转。

## 1. 三类核心资产

| 资产 | 关心什么 | 约束硬度 | 示例 |
|---|---|---|---|
| **Domain** | 业务上"说什么 / 不能说什么" | term 强制使用、ban 禁止使用、invariant 机器校验 | `MemberContext` |
| **Blueprint** | 技术上"分几步做、步间依赖" | slot DAG 无环校验、slot 对齐 Part、observe 探针 | `dev-workflow` |
| **Stack** | 工程师对 AI 设定的技术环境约束 | v0.6 硬要求，Proof 阶段直接断言 | `tech-stack` |

**关键边界**：三类资产**不互相引用**——Domain 不写 slot，Blueprint 不写 term。Work 在编排时才把三者绑在一起。

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
| WAL 层 | **planLock**（4 组件 hash：workOxn/workDomains/blueprints/tasks + allHash） | 锁后任何 .oxn 漂移 → IAP_ALIGN_LOCK_HASH_MISMATCH |

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
│   ├── domain/<Name>.oxn         ← E1 Asset 默认路径
│   ├── blueprint/<name>.oxn
│   └── stack/<name>.oxn
├── works/<w>/
│   └── work.oxn                  ← ref @prj/assets/domains/MemberContext
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
# → .openxenon/assets/domains/MemberContext.oxn 正式入库
```

Skill `oxn-work` 教学推荐严谨路径（可追溯、有 planLock）。

## 9. 反模式

- ❌ 把 Asset 当"可随时修改的文档"——Asset 创建后 planLock 锁定，修改必须走专门的 Asset 模式 Work + audit pool approve
- ❌ 在 Work 内直接修改 Asset——Work 只能引用 Asset，不能改写
- ❌ Domain 里放 slot——Domain 是业务边界，slot 是技术拓扑，正交
- ❌ Blueprint 里放 term——同上

---

## → 参考

- [Core Concepts](./core-concepts.md) — E1-E4 完整概念
- [Work](./work.md) — E2 动态协作 + IAP + Round
- [Insight](./insight.md) — E4 涌现层
- [v0.6 RFC](../../.openxenon/pools/sprints/v0.6-iap-refactor/design/v0.6-iap-refactor-rfc.md)
