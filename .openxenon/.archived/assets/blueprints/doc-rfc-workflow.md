---
entity: blueprint
version: 0.3.0
name: doc-rfc-workflow
abstract: |
  RFC 提升 Blueprint：从 .openxenon/drafts/ 收集散落草稿 → 按 RFC 模板编写（摘要/决策要点/影响范围/相关术语/相关决策/Errata）→ 格式校验 → 落盘到 docs/rfc/zh-cn/RFC-XXXX-<theme>.md。
  Work 实例化本 Blueprint 即"把草稿提升为正式 RFC（OpenXenon 规范）"。
  4 条 Promote 工作流之一（与 asset-workflow / doc-prod-workflow / doc-dev-workflow 并列）。
  v0.2 取代旧 doc-promote.md（OXP 双层废除，统一为单层 RFC）。
  v0.3.0 (2026-07-28): Use/Boundaries 新模板（H3 以实体名命名）。
references:
  - "@md/workflows/doc-author"
  - "@md/domains/oxn-domain"
  - "@md/domains/oxn-engine-domain"
citations: 0
synced-at: 2026-07-28
---
<!-- ARCHIVED: 2026-08-02 v0.6.2-alpha.3 合并到 promote-target-aware-workflow;保留作历史溯源。详见 .openxenon/assets/blueprints/promote-target-aware-workflow.md。-->

# Blueprint: doc-rfc-workflow

> RFC 提升组合模板（4 条 Promote 工作流之一）。从 `.openxenon/drafts/` 散落草稿提升为 `docs/rfc/zh-cn/RFC-XXXX-<theme>.md` 正式 RFC（OpenXenon 规范）。
> 历史版本曾以 `doc-promote.md` 形式错位在 workflows/ 目录（entity: blueprint 错位 + 引用 DocEngineeringContext archived + 路径漂移），于 2026-07-22 收敛重写。
> v0.2（2026-07-26）：OXP 双层废除，统一为单层 RFC 机制；更新 promote 目标路径与模板字段。

## Use

### doc-author
- workflow: @md/workflows/doc-author

### oxn-domain
- domain: @md/domains/oxn-domain

### oxn-engine-domain
- domain: @md/domains/oxn-engine-domain

### oxn-stack
- stack: @md/stacks/oxn-stack

## Boundaries

### gather
- refs:
  - domain: oxn-domain
- observe:
  - fs-exists
  - lint-check
- deps: []
- desc: 收集 `.openxenon/drafts/` 中与目标 RFC 相关的散落草稿，列出 draft 清单；词汇层引用 [oxn-domain](../domains/oxn-domain.md)。

### author
- refs:
  - domain: oxn-domain
  - domain: oxn-engine-domain
- observe:
  - lint-check
- deps:
  - gather
- desc: 按 RFC 模板（摘要 → 决策要点 → 影响范围 → 相关术语 → 相关决策 → Errata）编写新 RFC，多对一综合（多 drafts 综合为一个 RFC）；分配 RFC-XXXX 编号 + theme 字段；frontmatter 字段详见 `.openxenon/drafts/rfc-format-design.md`。

### validate
- refs: []
- observe:
  - docs-heading-check
  - lint-check
  - docs-build
  - doc-boundary
- deps:
  - author
- desc: 校验 RFC 格式（heading skeleton + 引用完整性 + term/ban/invariant 合规；词汇禁用旧词清单见 [doc-author](../workflows/doc-author.md) constraints）。
- constraints:
  - 禁止出现 `.openxenon/` 相对路径（除 `related` 段指向 ADR 文件外；规划层 drafts/ 引用不进入产物）
  - 术语引用必须指向 `docs/glossary/zh-cn/<category>.html#<term>`（F9：RFC 只引用 glossary）
  - 禁止引用 `docs/product/`、`docs/dev/`（规定性文档不依赖描述性文档）
  - frontmatter 必填字段：`entity=rfc`、`id`（RFC-XXXX）、`theme`、`status`（Draft/Proposed/Accepted/Superseded/Withdrawn）、`date`、`synced-at`
  - `id` 必须与文件名 `RFC-XXXX-<theme>.md` 一致
  - `theme` 必须在主题清单内（参见 `.openxenon/drafts/rfc-format-design.md` §1.3）

### promote
- refs: []
- observe:
  - fs-exists
- deps:
  - validate
- desc: 落盘到 `docs/rfc/zh-cn/RFC-XXXX-<theme>.md`，按需更新 `docs/rfc/zh-cn/README.md` 索引；accepted 后核心冻结（仅可追加 errata 段，version bump patch）。