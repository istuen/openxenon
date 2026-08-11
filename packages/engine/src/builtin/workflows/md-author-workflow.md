---
entity: workflow
version: 0.1.0
name: md-author-workflow
abstract: |
  MD 文档编写 6 slot 流水线：retrieve → design → develop → test → verify → review。
  OXN 项目消费者 onboarding 5 起手 Asset 之一。
  与 OXN 自身 dev-workflow 4 slot 兼容（retrieve/design/develop/test 4 子集对齐）。
references:
  - doc-md-domain
  - md-stack
citations: 0
synced-at: 2026-08-04
---

# Workflow: md-author-workflow

> MD 文档编写通用流水线。OXN 内置 5 起手 Asset 之一。
> 6 slot 覆盖检索 → 设计 → 编写 → 测试 → 验证 → 评审全流程。
> 与 OXN 自身 [dev-workflow](../../../../.openxenon/assets/workflows/dev-workflow.md) 4 slot 兼容。

## Slots

### retrieve
- deps: []
- observe:
  - fs-content-match
- desc: 检索项目文档现状：读 README + 既有 docs/ 目录结构，理解上下文（术语支撑 doc-md-domain）。

### design
- deps:
  - retrieve
- observe:
  - fs-exists
- desc: 规划文档变更：设计章节结构、术语引用、引用列表；与 `doc-md-domain.inv-1` 章节 H2 规则兼容。

### develop
- deps:
  - design
- observe:
  - lint-check
- desc: 编写 MD 文档：按 design 章节结构落地；遵循 `doc-md-domain` ban 列表（无硬编码路径、无 TODO 标记）。

### test
- deps:
  - develop
- observe:
  - lint-check
- desc: 跑 md-stack 工具链验证：`markdownlint` + `markdown-link-check`（具体 Probe 名见 md-stack）。

### verify
- deps:
  - test
- observe:
  - fs-exists
- desc: 跑 `oxn asset validate` 校验 5 Asset 完整性；跑 `oxn assetmap suggest --goal "<修改目标>"` 验证路由。

### review
- deps:
  - verify
- observe: []
- desc: 人类/AI 同行评审：术语一致性、引用有效性、章节连贯性；评审通过后才能进 work.finalize。
