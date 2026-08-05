---
entity: blueprint
version: 0.1.0
name: md-author-blueprint
abstract: |
  MD 文档编写组合模板（4 part）。OXN 项目消费者 onboarding 5 起手 Asset 之一（ADR-0089 D1）。
  引用 doc-md-domain（词汇）+ md-author-workflow（执行）+ md-stack（实现）。
  与 OXN 自身 dev-workflow / doc-author Blueprint 兼容。
references:
  - doc-md-domain
  - md-author-workflow
  - md-stack
citations: 0
synced-at: 2026-08-04
---

# Blueprint: md-author-blueprint

> MD 文档编写组合模板。OXN 内置 5 起手 Asset 之一。
> 4 part（write-doc / edit-doc / validate-doc / publish-doc）覆盖文档全生命周期。
> Skill 场景标识：与 `/oxn-work` Skill 配合，AI 通过此 Blueprint 标识**文档编写场景**（ADR-0089 D6）。

## Use

### doc-md-domain
- domain: doc-md-domain

### md-author-workflow
- workflow: md-author-workflow

### md-stack
- stack: md-stack

## Boundaries

### write-doc
- refs:
  - workflow: md-author-workflow
  - domain: doc-md-domain
- observe:
  - lint-check
- deps:
  - retrieve
- desc: 从 0 创建新文档。Workflow 进入 retrieve → design → develop；产出文档 first draft。

### edit-doc
- refs:
  - workflow: md-author-workflow
  - domain: doc-md-domain
- observe:
  - lint-check
- deps:
  - write-doc
- desc: 编辑已有文档。Workflow 进入 design → develop → test；产出修改 + diff 记录。

### validate-doc
- refs:
  - workflow: md-author-workflow
  - stack: md-stack
- observe:
  - lint-check
- deps:
  - edit-doc
- desc: 校验文档。Workflow 进入 verify → review；跑 md-stack 全部工具 + 引用编号校验。

### publish-doc
- refs:
  - workflow: md-author-workflow
  - stack: md-stack
- observe:
  - shell-exec
- deps:
  - validate-doc
- desc: 发布文档。跑 `md-pipeline` 编译 + 部署到 GitHub Pages / VitePress 站点。
