---
entity: blueprint
version: 0.2.0
name: asset-workflow
abstract: |
  Asset 提升 Blueprint：从 .openxenon/drafts/ 收集散落草稿 → 按 Asset 模板编写 → 格式校验 → 落盘到 .openxenon/assets/{kind}/{name}.md。
  Work 实例化本 Blueprint 即"把草稿提升为正式 Asset"。
  4 条 Promote 工作流之一（与 doc-prod-workflow / doc-dev-workflow / doc-rfc-workflow 并列）。
  v0.2.0 (2026-07-28): Use/Boundaries 新模板（H3 以实体名命名）；references 清空（inv-15 kind-isolation）；execution ref → asset-create。
references: []
citations: 0
synced-at: 2026-07-28
---
<!-- ARCHIVED: 2026-08-02 v0.6.2-alpha.3 合并到 promote-target-aware-workflow;保留作历史溯源。详见 .openxenon/assets/blueprints/promote-target-aware-workflow.md。-->

# Blueprint: asset-workflow

> Asset 提升组合模板（4 条 Promote 工作流之一）。从 `.openxenon/drafts/` 散落草稿提升为 `.openxenon/assets/{kind}/{name}.md` 正式 Asset。
> 5 类 AssetKind 通用模板：domain / workflow / stack / blueprint / roadmap。

## Use

### asset-create
- workflow: @md/workflows/asset-create

### oxn-asset-domain
- domain: @md/domains/oxn-asset-domain

### oxn-stack
- stack: @md/stacks/oxn-stack

## Boundaries

### gather
- refs:
  - domain: oxn-asset-domain
  - workflow: asset-create
- observe:
  - fs-exists
  - lint-check
- deps: []
- desc: 收集 `.openxenon/drafts/` 中与目标 Asset 相关的散落草稿，列出 draft 清单；确定目标 AssetKind（domain / workflow / stack / blueprint / roadmap）。

### author
- refs:
  - domain: oxn-asset-domain
  - workflow: asset-create
- observe:
  - lint-check
- deps:
  - gather
- desc: 按目标 AssetKind 模板编写新 Asset：
  - Domain：3 字段 frontmatter（abstract + references + citations）+ terms/bans/invariants H3 段
  - Workflow：frontmatter + Use/Boundaries/Slots 段
  - Stack：frontmatter + Tools 段（version + role + command + config + desc）
  - Blueprint：frontmatter + Use/Boundaries 段（Use 引用 Domain + Workflow + Stack）
  - Roadmap：frontmatter + Scenes 段（场景路由表）

### validate
- refs:
  - domain: oxn-asset-domain
- observe:
  - heading-skeleton-check
  - lint-check
- deps:
  - author
- desc: 校验 Asset 格式：
  - 5 类 AssetKind 不混用（H2 分类严格隔离，违反 → E_MD_CATEGORY_UNKNOWN）
  - references 仅同 AssetKind（跨 kind 由 Blueprint 承担）
  - references 数量 ≤ 5（fan-out 上限）
  - 词汇禁用旧词（doc-author constraints 同步源）
  - name 与 file_stem 一致（toKebab 规范化）

### promote
- refs:
  - workflow: asset-create
- observe:
  - fs-exists
- deps:
  - validate
- desc: 落盘到 `.openxenon/assets/{kind}/{name}.md`，写 planLock（fileHash + citations + DAG）；更新相关 Roadmap scene（如影响 routing）；更新 INDEX（如有）。
- constraints:
  - 物理位置：`.openxenon/assets/{kind}/{name}.md`（v0.6 primary）；v0.5 fallback：`.openxenon/{kind}/{name}.md`
  - 命名：domain PascalCase（如 MemberContext）；其他 kebab-case（如 dev-workflow）
  - file_stem 规范化：toKebab(declared) === toKebab(file_stem)，不一致 → IAP_INTENT_NAME_FILE_MISMATCH