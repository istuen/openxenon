---
entity: rfc
id: RFC-0001
theme: oxl-philosophy
status: Accepted
date: 2026-07-26
supersedes: []
superseded-by: ~
related:
  - ADR-0001: docs/adrs/0001-blueprint-props-funnel-effect.md
  - ADR-0021: docs/adrs/0021-intent-align-observe-keyword-separation.md
  - ADR-0052: docs/adrs/0052-langium-retirement-oxn-deprecation.md
  - ADR-0019: docs/adrs/0019-blueprint-type-paradigm.md
synced-at: 2026-07-27
---

# RFC-0001: OXL/Blueprint 哲学——Props 漏斗 + 关键字分离 + MD-native 语法

> **类型**：RFC（OpenXenon 规范）
> **主题**：oxl-philosophy
> **状态**：✅ Accepted（核心冻结，仅可追加 errata 段）
<!-- allow-version -->
> **批次**：2026-07-26 v0.7 RFC 首批 promote（Phase 2）
<!-- /allow-version -->

## 摘要

<!-- allow-version -->
OXL 语法与 Blueprint 设计的三大基石——**Props 漏斗效应**（Blueprint 收敛 Part 复杂度，三层默认值优先级链）+ **四关键字分离**（kind / intent / align / observe 避免 type 重载）+ **MD-native 语法统一**（v0.6.1 废除 Langium，`.md` 为唯一 canonical 格式，`.oxn` 不保留）。
<!-- /allow-version -->

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

<!-- allow-version -->
### D3：MD-native 语法统一（ADR-0052，v0.6.1 已实施）

v0.6.1 完成了 MD-native 语法改革（`:::intent{...}` → 纯 MD），`.md` 成为 canonical 格式，`.oxn` 不再保留。
<!-- /allow-version -->

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

### D5：Blueprint `kind` 字段语义（ADR-0019，Superseded-by ADR-0054/ADR-0055）

**历史决策**：ADR-0019 提出 Blueprint 通过 `type` 字段声明语义类别（task / plan / explore）——单字段承载 Blueprint 类别 + Plan 编排 + Explore 草稿三种语义。

**supersede 演化**：

| 维度 | ADR-0019（Superseded） | ADR-0054/0055（采纳） |
|---|---|---|
| 字段 | `type` | `kind` |
| 语义承载 | 类别 + 编排 + 草稿（重载） | 类别（task/plan/explore）单一维度 |
| 编排维度 | `type "plan"` 隐含 DAG 语义 | `slot "plan_dag"` 显式数据驱动 DAG |
| 与 Slot 关系 | 混淆（type 与 slot 语义重叠） | 正交（kind 表类别，slot 表数据维度） |

**RFC-0001 D2 已采纳 ADR-0054/0055 决策**：四关键字分离中 `kind` 字段替代原 `type` 字段。

**保留 ADR-0019 的意义**：记录 OXL 关键字段演化历史，避免后人重提 "恢复 `type` 字段"。

## 影响范围

- ✅ ADR-0001 / ADR-0021 / ADR-0052 Accept
- ✅ ADR-0019 已 Superseded，决策内容由 ADR-0054 + ADR-0055 + 本 RFC D2 + D5 共同承载
- ✅ 当前 OXL Grammar 已落实四关键字分离 + Props 漏斗
<!-- allow-version -->
- ✅ v0.6.1 后所有 `.oxn` 文件不被解析，错误信息引导写 `.md`
<!-- /allow-version -->
- 📝 Part 改名 / 删除属性时需同步检查 Blueprint 引用

## 相关术语

- [OXL](/product/zh-cn/concepts/glossary.html#oxl) — OpenXenon DSL
- [Blueprint](/product/zh-cn/concepts/glossary.html#blueprint) — Props 漏斗承担者
- [Part](/product/zh-cn/concepts/glossary.html#part) — Task 内执行单元
- [Probe](/product/zh-cn/concepts/glossary.html#probe) — observe 维度承载者
- [Asset](/product/zh-cn/concepts/glossary.html#asset) — E1 静态边界

## 相关决策

- [ADR-0001](../../adrs/0001-blueprint-props-funnel-effect.md) — Props 漏斗效应（2026-05-19）
- [ADR-0021](../../adrs/0021-intent-align-observe-keyword-separation.md) — 四关键字分离（2026-05-29）
- [ADR-0052](../../adrs/0052-langium-retirement-oxn-deprecation.md) — Langium 退役 + `.oxn` 废除（2026-07-21）
- [ADR-0019](../../adrs/0019-blueprint-type-paradigm.md) — Blueprint Type 范式（2026-05-22，Superseded-by ADR-0054/0055 → RFC D5 记录演化历史）

## Errata

<!-- allow-version -->
### v1.0.1 (2026-07-26)
<!-- /allow-version -->

- **ADR 引用路径修正**：原 `## 相关决策` 段链接指向 `.openxenon/drafts/rfc/00XX-*.md`，该路径在 Phase 3 ADR 归档后已失效（72 文件已移至 `.openxenon/.archived/docs/adrs/`）。现镜像到 `docs/adrs/`，RFC 链接指向 `../../adrs/00XX-*.md`（docs/ 内部，无跨层）。frontmatter `related` 同步更新为 `docs/adrs/00XX-*.md`。
- **修复触发**：grilling #7 发现 body markdown 链接死链 + 失效 frontmatter refs；边界检查器因错误相对路径漏报。
- **符合 RFC-0009 D4**：ADR 引用现在遵循"仅 related 段可引 docs/adrs/"规则。

### 2026-07-27 errata

- **新增 D5 Blueprint `kind` 字段语义 + ADR-0019 演化历史**：ADR-0019 已 Superseded by ADR-0054/0055，决策内容由 RFC D2 + D5 共同承载。本段记录 `type` 字段→`kind` 字段的演化路径与 supersede 关系。
- **frontmatter related 增补**：ADR-0019。
- **影响范围段**：增补 ADR-0019 Superseded 状态说明。

> 本段用于后续追加修正说明。核心决策自 RFC-0001 Accepted 起冻结。