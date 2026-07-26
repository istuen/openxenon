---
entity: rfc
id: RFC-0009
theme: doc-three-modalities
version: 1.0.1
status: Accepted
date: 2026-07-26
supersedes: []
superseded-by: ~
related:
  - .openxenon/drafts/rfc-migration-master-plan.md
synced-at: 2026-07-26
---

# RFC-0009: 文档三情态分离——Asset / RFC / Doc

> **类型**：RFC（OpenXenon 规范 · meta-RFC）
> **主题**：doc-three-modalities
> **状态**：✅ Accepted（核心冻结，仅可追加 errata 段）
> **来源**：2026-07-25 grilling session #6（与 user 协作）
> **批次**：2026-07-26 v0.7 RFC 首批 promote（Phase 2）

## 摘要

OXN 项目文档按"情态"分三类——**Asset（定义性）** / **RFC（规定性）** / **Doc（描述性）**。废除旧 ADR + OXP 双层机制，统一为单层 RFC（规定性）层。每一情态各居其位，互不依赖；三情态全集中的任意两情态组合是设计错误信号。

## 决策要点

### D1：三情态定义

| 情态 | 回答 | 物理位置 | 演进策略 |
|---|---|---|---|
| **Definitional Modality（定义性）** | "X 是什么" | `.openxenon/assets/{kind}/*.md`（E1 Asset） | Asset 工作流（planLock + DAG 校验） |
| **Prescriptive Modality（规定性）** | "为什么决定 X" | `docs/rfc/zh-cn/RFC-XXXX-<theme>.md` | frozen + errata，version bump patch |
| **Descriptive Modality（描述性）** | "怎么用 X" | `docs/{product,dev}/{zh-cn,en}/*.md` | 产品手册与开发手册 |

### D2：废除 ADR + OXP 双层

| 旧机制 | 新机制 |
|---|---|
| ADR（内部 SSOT, append-only） | （废除） |
| OXP（外部镜像，frozen） | RFC（合并两者职责） |
| ADR → OXP 投影 | 直接落 RFC |

**48 条 Adopted ADR** 已迁移为 **8 主题 RFC**（RFC-0001 to RFC-0008）+ **4 meta-RFC**（RFC-0009 to RFC-0012）。

### D3：情态隔离规则

1. `docs/` 内部互引 ✅（product ↔ dev ↔ rfc 同树）
2. `docs/` → `.openxenon/` ❌（严格隔离）
3. `.openxenon/drafts/` → `docs/` ✅（仅通过 promote workflow）
4. `.openxenon/assets/` → `docs/` ❌（边界不依赖手册）

### D4：RFC 引用约束

- RFC 内部互引 RFC ✅
- RFC → glossary：强制 `docs/glossary/zh-cn/<category>.html#<term>`（RFC 只引用 glossary）
- RFC → ADR：仅 `related` 段可引 `docs/adrs/XXXX-*.md`（供追溯）
- RFC → docs/{product,dev}：❌ 禁止（规定性不依赖描述性）

### D5：3 情态全集中的两情态组合是设计错误信号

| 组合 | 含义 | 状态 |
|---|---|---|
| Asset + RFC | 既是定义又是规定 | 设计错误——归并到 RFC（规定性优先） |
| Asset + Doc | 既是定义又是描述 | 设计错误——归并到 Doc（描述性优先） |
| RFC + Doc | 既是规定又是描述 | 设计错误——归并到 RFC（规定性优先） |

## 影响范围

- ✅ RFC-0010（frozen+errata）+ RFC-0011（builtin Asset 两层）+ RFC-0012（自举种子豁免）三 meta-RFC 与本 RFC 互锁
- ✅ v0.7+ 文档架构 SSOT 切换到三情态
- ✅ AGENTS.md §文档三层架构段（Phase 5.1 重写）
- ✅ 4 类 Promote 工作流（asset-workflow / doc-prod-workflow / doc-dev-workflow / doc-rfc-workflow）与三情态 1:1 对应

## 相关术语

- [Definitional Modality](/glossary/zh-cn/project-terms.html#definitional-modality) — Asset 情态
- [Prescriptive Modality](/glossary/zh-cn/project-terms.html#prescriptive-modality) — RFC 情态
- [Descriptive Modality](/glossary/zh-cn/project-terms.html#descriptive-modality) — Doc 情态
- [RFC](/glossary/zh-cn/project-terms.html#rfc) — 规定性文档载体
- [Asset](/glossary/zh-cn/asset-terms.html#asset) — 定义性文档载体

## 相关决策

- [.openxenon/drafts/rfc-migration-master-plan.md](../../.openxenon/drafts/rfc-migration-master-plan.md) — RFC 迁移主计划（19 项决策锁定）
- [RFC-0010](./RFC-0010-frozen-errata.md) — RFC frozen+errata 演进策略（meta）
- [RFC-0011](./RFC-0011-builtin-asset-two-layer.md) — 内置 Asset 两层机制（meta）
- [RFC-0012](./RFC-0012-bootstrap-exemption.md) — 自举种子豁免（meta）

## Errata

### v1.0.1 (2026-07-26)

- **ADR 引用路径修正**：原 `## 相关决策` 段链接指向 `.openxenon/drafts/rfc/00XX-*.md`，该路径在 Phase 3 ADR 归档后已失效（72 文件已移至 `.openxenon/.archived/docs/adrs/`）。现镜像到 `docs/adrs/`，RFC 链接指向 `../../adrs/00XX-*.md`（docs/ 内部，无跨层）。frontmatter `related` 同步更新为 `docs/adrs/00XX-*.md`。
- **修复触发**：grilling #7 发现 body markdown 链接死链 + 失效 frontmatter refs；边界检查器因错误相对路径漏报。
- **符合 RFC-0009 D4**：ADR 引用现在遵循"仅 related 段可引 docs/adrs/"规则。

> 本段用于后续追加修正说明。核心决策自 RFC-0009 Accepted 起冻结。