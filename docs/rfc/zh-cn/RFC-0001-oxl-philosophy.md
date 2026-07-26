---
entity: rfc
id: RFC-0001
theme: oxl-philosophy
version: 1.0.0
status: Accepted
date: 2026-07-26
supersedes: []
superseded-by: ~
related:
  - ADR-0001: .openxenon/drafts/rfc/0001-blueprint-props-funnel-effect.md
  - ADR-0021: .openxenon/drafts/rfc/0021-intent-align-observe-keyword-separation.md
  - ADR-0052: .openxenon/drafts/rfc/0052-langium-retirement-oxn-deprecation.md
synced-at: 2026-07-26
---

# RFC-0001: OXL/Blueprint 哲学——Props 漏斗 + 关键字分离 + MD-native 语法

> **类型**：RFC（OpenXenon 规范）
> **主题**：oxl-philosophy
> **状态**：✅ Accepted（核心冻结，仅可追加 errata 段）
> **批次**：2026-07-26 v0.7 RFC 首批 promote（Phase 2）

## 摘要

OXL 语法与 Blueprint 设计的三大基石——**Props 漏斗效应**（Blueprint 收敛 Part 复杂度，三层默认值优先级链）+ **四关键字分离**（kind / intent / align / observe 避免 type 重载）+ **MD-native 语法统一**（v0.6.1 废除 Langium，`.md` 为唯一 canonical 格式，`.oxn` 不保留）。

## 决策要点

### D1：Blueprint Props 漏斗效应（ADR-0001）

Blueprint props ≠ Part props 合集，是**漏斗**——Blueprint 通过硬编码 / 拼接 / 默认值吸收子层复杂度。

三层默认值优先级链（从高到低）：

1. **父层显式**（Blueprint / Task `--param`）
2. **本层 default**（Blueprint 的 `params.default`）
3. **子层 schema default**（Part / Probe 的 `props.default`）

**效果**：Task 命令行参数简短（只需关心 Blueprint 暴露面），Part 内部细节对调用者隐藏。

### D2：四关键字分离（ADR-0021）

OXL 关键字按 4 个语义轴分离，避免 `type` 重载歧义：

| 关键字 | 含义 | 载体 | 谁写 |
|---|---|---|---|
| `kind` | Blueprint 类别（task/plan/explore） | Blueprint 顶层 | 工程师 |
| `intent` | Part 能力声明（"我提供什么"） | Part 块 | 工程师 |
| `align` | 能力实现（"我具体怎么做"） | Part 块 | AI / 工程师 |
| `observe` | Probe 维度（"我测什么"） | Probe 块 | 工程师 |

**反模式**（否决）：
- ❌ `type` 重载（既表 Blueprint 类别，又表 Part 能力）
- ❌ `role` / `port` 命名（语义不清）
- ❌ `Blueprint type task` 隐式（应显式 `kind "task"`）

### D3：MD-native 语法统一（ADR-0052，v0.6.1 已实施）

v0.6.1 完成了 MD-native 语法改革（`:::intent{...}` → 纯 MD），`.md` 成为 canonical 格式，`.oxn` 不再保留。

**实施内容**：
- 删除 Langium 基础设施（`packages/engine/src/oxl/langium-driver/`）
- 移除 npm 依赖（`langium ^4.3.0` + `langium-cli ^4.3.0`）
- 删除 79 个 `.oxn` git-tracked 文件
- 删除 build script `langium:generate`
- 删除 CLI `--oxn-legacy` flag
- 17 个测试文件删除 + 8 个混合文件清理

**量化影响**：166 → 0 failures，1487 tests pass。

### D4：解析路径单一化

不再维护两套解析路径（Langium + mdast），只保留 mdast pipeline。OXL 编译期可做引用完整性校验（`@term/...` 物理可寻址——见 RFC-0006）。

## 影响范围

- ✅ ADR-0001 / ADR-0021 / ADR-0052 Accept
- ✅ 当前 OXL Grammar 已落实四关键字分离 + Props 漏斗
- ✅ v0.6.1 后所有 `.oxn` 文件不被解析，错误信息引导写 `.md`
- 📝 Part 改名 / 删除属性时需同步检查 Blueprint 引用

## 相关术语

- [OXL](/glossary/zh-cn/core-terms.html#oxl) — OpenXenon DSL
- [Blueprint](/glossary/zh-cn/asset-terms.html#blueprint) — Props 漏斗承担者
- [Part](/glossary/zh-cn/work-terms.html#part) — Task 内执行单元
- [Probe](/glossary/zh-cn/proof-terms.html#probe) — observe 维度承载者
- [Asset](/glossary/zh-cn/asset-terms.html#asset) — E1 静态边界

## 相关决策

- [ADR-0001](../../.openxenon/drafts/rfc/0001-blueprint-props-funnel-effect.md) — Props 漏斗效应（2026-05-19）
- [ADR-0021](../../.openxenon/drafts/rfc/0021-intent-align-observe-keyword-separation.md) — 四关键字分离（2026-05-29）
- [ADR-0052](../../.openxenon/drafts/rfc/0052-langium-retirement-oxn-deprecation.md) — Langium 退役 + `.oxn` 废除（2026-07-21）

## Errata

> 本段用于后续追加修正说明。核心决策自 RFC-0001 Accepted 起冻结。