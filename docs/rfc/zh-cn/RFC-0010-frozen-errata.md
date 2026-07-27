---
entity: rfc
id: RFC-0010
theme: frozen-errata
status: Accepted
date: 2026-07-26
supersedes: []
superseded-by: ~
related:
  - .openxenon/drafts/rfc-migration-master-plan.md
synced-at: 2026-07-26
---

# RFC-0010: RFC frozen + errata 演进策略

> **类型**：RFC（OpenXenon 规范 · meta-RFC）
> **主题**：frozen-errata
> **状态**：✅ Accepted（核心冻结，仅可追加 errata 段）
> **来源**：2026-07-25 grilling session #6（与 user 协作）
> **批次**：2026-07-26 v0.7 RFC 首批 promote（Phase 2）

## 摘要

RFC accepted 后核心冻结（不可编辑正文），仅可追加 errata 段。supersede 走新 RFC 标 `superseded-by` / `supersedes`。本策略与 OXP（v0.6.1 起的旧镜像层）一致但取代之——OXP 合并入 RFC，演进规则统一。

## 决策要点

### D1：accepted 状态冻结正文

RFC `status: Accepted` 后，正文段（摘要 / 决策要点 / 影响范围 / 相关术语 / 相关决策）**不可编辑**。

允许的操作：
- 追加 `## Errata` 段（修正说明，不 bump 版本号——见 RFC-0013 D6）
- 修改 frontmatter `synced-at` 字段
- 修改 frontmatter `superseded-by` 字段（指向新 RFC）

不允许的操作：
- 修改决策要点内容
- 删除既有决策
- 修改 frontmatter `id` / `theme` / `status: Accepted`

### D2：errata 段追加

当 RFC 决策需要修正说明但不应改变核心决策时，在 `## Errata` 段追加 errata：

```markdown
## Errata

### 2026-XX-XX: <errata 标题>

<修正说明——为什么需要补充、原决策哪里需要澄清、影响哪些读者。>

### v1.0.1 (2026-07-26)

- **ADR 引用路径修正**：原 `## 相关决策` 段链接指向 `.openxenon/drafts/rfc/00XX-*.md`，该路径在 Phase 3 ADR 归档后已失效（72 文件已移至 `.openxenon/.archived/docs/adrs/`）。现镜像到 `docs/adrs/`，RFC 链接指向 `../../adrs/00XX-*.md`（docs/ 内部，无跨层）。frontmatter `related` 同步更新为 `docs/adrs/00XX-*.md`。
- **修复触发**：grilling #7 发现 body markdown 链接死链 + 失效 frontmatter refs；边界检查器因错误相对路径漏报。
- **符合 RFC-0009 D4**：ADR 引用现在遵循"仅 related 段可引 docs/adrs/"规则。

> 本段用于后续追加修正说明。核心决策自 RFC-XXXX Accepted 起冻结。
```

每次 errata 追加不 bump 版本号——RFC 文档自 RFC-0013 D6 起移除 `version` 字段，对齐 IETF/Rust/Python 业界标准。历史版本号（如 `1.0.0` / `1.0.1`）仅在 Errata 段中追溯保留。

### D3：supersede 走新 RFC

推翻旧 RFC 不修改旧 RFC，而是新建 RFC：

```yaml
# 新 RFC frontmatter
supersedes:
  - RFC-XXXX

# 旧 RFC frontmatter（不可变，但允许改 superseded-by）
superseded-by: RFC-YYYY
```

新 RFC 的 `supersedes` 列出被推翻的旧 RFC id 列表。旧 RFC 的 `superseded-by` 指向新 RFC（仅一项）。

### D4：状态值定义

| status | 含义 |
|---|---|
| `Draft` | 起草中（未 promote 到 `docs/rfc/zh-cn/`，仍在工程师工作草稿区） |
| `Proposed` | 提交评审（已走 IAP gather 阶段，待 validate） |
| `Accepted` | 已接受（核心冻结，仅可追加 errata 段） |
| `Superseded` | 已被新 RFC 取代（指向 `superseded-by`） |
| `Withdrawn` | 主动撤销（与 Superseded 区别：非被推翻而是作者撤回） |

### D5：与 OXP 演进规则的差异

OXP（v0.6.1 起的旧镜像层）已废除——其演进规则（核心冻结 + errata）由本 RFC 继承并取代。OXP 文件在 Phase 3 删除（物理移动到 `.openxenon/.archived/docs/oxps/` 或直接删除）。

## 影响范围

- ✅ 与 RFC-0009 三情态分离对齐（规定性情态的标准演进策略）
- ✅ doc-rfc-workflow v0.2 Blueprint 的 promote 阶段记录"accepted 后核心冻结"
- ✅ 48 条 ADR → 8 RFC + 4 meta-RFC 全部按本策略冻结

## 相关术语

- [FrozenPlusErrata](/glossary/zh-cn/project-terms.html#frozenpluserrata) — 本 RFC 命名
- [Prescriptive Modality](/glossary/zh-cn/project-terms.html#prescriptive-modality) — 规定性情态
- [RFC](/glossary/zh-cn/project-terms.html#rfc) — 规定性文档载体

## 相关决策

- [.openxenon/drafts/rfc-migration-master-plan.md](../../.openxenon/drafts/rfc-migration-master-plan.md) — RFC 迁移主计划 D6 锁定本策略
- [RFC-0009](./RFC-0009-doc-three-modalities.md) — 文档三情态分离（meta）
- [RFC-0011](./RFC-0011-builtin-asset-two-layer.md) — 内置 Asset 两层机制（meta）
- [RFC-0012](./RFC-0012-bootstrap-exemption.md) — 自举种子豁免（meta）

## Errata

### 2026-07-27：RFC-0013 D6 errata

- RFC 文档移除 `version` 字段（前 `version: 1.0.1`）
- 对齐 IETF / Rust / Python 业界标准——RFC 不用版本号，用 status + Errata 段演进
- 影响：本 RFC 自身 + RFC-0001 ~ RFC-0012 共 12 个 RFC 的 frontmatter
- supersedes：RFC-0013 D6 取代本 RFC 中"version bump patch"条款
- 详见 [RFC-0013 D6](./RFC-0013-versioning-policy.md)

> 本段用于后续追加修正说明。核心决策自 RFC-0010 Accepted 起冻结。