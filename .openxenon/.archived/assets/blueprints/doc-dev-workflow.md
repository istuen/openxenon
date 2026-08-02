---
entity: blueprint
version: 0.2.0
name: doc-dev-workflow
abstract: |
  开发手册（docs/dev/{zh-cn,en}/）撰写 Blueprint。
  通过 ## Use 衔接 doc-author workflow（执行）+ 3 个核心 Domain（词汇）+ oxn-stack（实现）。
  Work 实例化本 Blueprint 即"用 Domain 落词到开发手册"。
  v0.2.0 (2026-07-28): Use/Boundaries 新模板（H3 以实体名命名）。
references:
  - "@md/workflows/doc-author"
  - "@md/domains/oxn-engine-domain"
  - "@md/domains/oxn-asset-domain"
  - "@md/domains/oxn-domain"
citations: 0
synced-at: 2026-07-28
---
<!-- ARCHIVED: 2026-08-02 v0.6.2-alpha.3 合并到 promote-target-aware-workflow;保留作历史溯源。详见 .openxenon/assets/blueprints/promote-target-aware-workflow.md。-->

# Blueprint: doc-dev-workflow

> 开发手册撰写组合模板。Work 实例化本 Blueprint 后走 doc-author 的 6 slot 流水线，
> 产出 docs/dev/{zh-cn,en}/<file>.md。产物受 doc-author.validate 强约束（无 .openxenon/ 路径）。

## Use

### doc-author
- workflow: @md/workflows/doc-author

### oxn-engine-domain
- domain: @md/domains/oxn-engine-domain

### oxn-asset-domain
- domain: @md/domains/oxn-asset-domain

### oxn-domain
- domain: @md/domains/oxn-domain

### oxn-stack
- stack: @md/stacks/oxn-stack

## Boundaries

### pick-domain
- refs:
  - domain: oxn-engine-domain
  - domain: oxn-asset-domain
  - domain: oxn-domain
- observe:
  - fs-exists
- deps: []
- desc: 3 个核心 Domain；开发手册焦点是 Engine 内部与 Asset 机制。

### aggregate-terms
- refs:
  - domain: oxn-engine-domain
  - domain: oxn-asset-domain
- observe:
  - lint-check
- deps:
  - pick-domain
- desc: 从 Domain 抽取术语写入 docs/glossary/zh-cn/<category>.md（约定职责）。

### outline
- refs: []
- observe:
  - docs-heading-check
- deps:
  - aggregate-terms
- desc: 章节大纲（What → Why → How → 参考）。开发手册焦点：实现视角、多代码少叙事。

### author
- refs:
  - domain: oxn-engine-domain
  - domain: oxn-asset-domain
- observe:
  - lint-check
- deps:
  - outline
- desc: 撰写正文。术语引用 docs/glossary/zh-cn/*；侧重 L0-L3 物理归属、Asset 机制。

### validate
- refs: []
- observe:
  - docs-heading-check
  - lint-check
  - docs-build
  - doc-boundary
- deps:
  - author
- desc: 校验：(1) 无 .openxenon/ 路径；(2) 章内模板；(3) glossary 链接存在；(4) 章节名合规；(5) docs:build 通过；(6) 文档三层守门（docs/{product,dev,rfc} → openxenon 边界）。

### publish
- refs: []
- observe:
  - fs-exists
- deps:
  - validate
- desc: 落盘到 docs/dev/{zh-cn,en}/<file>.md，更新 docs/.vitepress/config.ts sidebar（如 README 类不进站点构建则跳过）。