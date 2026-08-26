---
redirectFrom:
  - /zh-cn/asset.html
title: 资产
---

# 资产（静态边界）

> 术语查询见 [术语表](./glossary.md)（RFC-0017 单一权威源）。本页不重定义术语。

> **Asset 是工程师维护的硬约束边界**——给 AI Agent 协作画红线。Asset 创建后被 Work 引用，不被 Work 改写。
> 5 类 AssetKind：Domain / Workflow / Stack / Blueprint / Roadmap。Blueprint 是唯一允许跨类型引用的 Asset 类型。

## 1. 5 类 AssetKind

| 类型 | 关心什么 | 约束硬度 |
|---|---|---|
| **Domain** | 业务上"说什么 / 不能说什么" | term 强制使用、ban 禁止使用、invariant 机器校验 |
| **Workflow** | 技术上"分几步做、步间依赖"（slot DAG） | DAG 无环校验、slot 对齐 Part、observe 探针 |
| **Stack** | 工程师对 AI 设定的技术环境约束 | Probe 阶段直接断言（language / runtime / linter / test） |
| **Blueprint** | 组合模板——引用 Domain + Workflow + Stack + Blueprint | `## Refs` 校验（kind-isolation） |
| **Roadmap** | meta 索引层（scene → asset） | scene 表校验 |

**kind-isolation 规则**：3 边界类型（Domain / Workflow / Stack）不互相引用；Blueprint 是唯一允许跨类型引用的 Asset 类型；Roadmap 不出现在自身 scene 表。

## 2. Asset vs OpenSpec specs/（设计反转）

| 维度 | OpenSpec specs/ | OXN Asset |
|---|---|---|
| 角色 | 被 change 改写的目标（delta 合并） | 被 Work 引用的硬约束边界（不改写） |
| 版本 | 流动的（每次 archive 合并） | 冻结的（创建后不再修改，演进走新版） |
| 验证 | AI 自查 + 人工 review | Engine 独立第三方探针 |
| 创建 | 随 change 自然生长 | 专门的 Asset 模式 Work 显式创建 |

**一句话**：OpenSpec 的 spec 是"工作要改写的目标"，OXN 的 Asset 是"工作要遵守的边界"。

## 3. 物理目录

```
.openxenon/assets/
├── domain/<Name>.md
├── workflow/<name>.md
├── stack/<name>.md
├── blueprint/<name>.md
└── roadmap/oxn-system.md
```

**兼容旧项目**：通过 config fallback 自动探测 `.openxenon/{domains,blueprints}/` 等历史路径。

## 4. 创建 Asset

**快速通道 CLI**（仅骨架）：
```bash
oxn asset create <name> --kind <domain|workflow|stack|blueprint|roadmap>
```

**严谨路径 Work**（IAP 完整周期）：
```bash
oxn work create <name> --blueprint asset-create --mode skeleton
# → 走 3 步生命周期（create → run → submit）骨架生成
# → .openxenon/assets/<kind>/<name>.md 正式入库
```

Skill `oxn-asset` 推荐严谨路径（可追溯 + DRIFT 可观测）。

## 5. 演进路径

- **不变性**：Asset 创建后**不被 Work 改写**，仅被 Work 引用
- **演进**：通过新版 Asset + 旧版归档实现；Blueprint 引用切到新版即可
- **审计**：Asset 演进本身是另一个 Work（走标准 3 步），DRIFT 标记记录引用切换点

**v0.6 收敛**：删除 planLock + content_hash + chmod 0o444 三层锁（RFC-0033）。Asset 不可变性由"演进走新版 Asset + Work 引用锁定版本"保证，不再依赖 OS 层锁。

## 6. Asset Paper 结构（v0.6.3+）

Asset 不只是"规则堆砌"，而是"微型论文 + 引用网络"。4 个新字段：

```yaml
abstract: |                # 论文摘要（必填，老 Asset 默认空字符串）
  本文档定义支付核心领域的边界。
references:                # 引用其他 Asset（依赖 DAG 出边）
  - asset: stack-nodejs
citations: 3               # 被引用次数（Engine 自动维护）
auditTrail:                # 版本历史（自动追加）
  - version: 1.2.0
    date: 2026-10-15
    author: engineer-X
    changes: 新增 §3.4 幂等性约束
```

完整设计见 [Asset Paper Schema · 资产论文结构](./asset-paper.md)。

## 反模式

- ❌ 把 Asset 当"可随时修改的文档"——演进必须走新版 Asset
- ❌ 在 Work 内直接修改 Asset——Work 只能引用，不能改写
- ❌ Domain 里放 slot（Domain 是业务边界，slot 是技术拓扑，正交）
- ❌ Blueprint 里放 term（同上）
- ❌ 跳过 Work 路径直接 `write_file` Asset（v0.6+ 必须通过 Work）

## 下一步

- [Asset Paper Schema](./asset-paper.md) — 论文结构 + 引用计数 + DAG
- [Work](./work.md) — Asset 引用的执行场景
- [术语表](./glossary.md) — 术语查询
</content>
</invoke>