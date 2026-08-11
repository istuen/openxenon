---
entity: stack
version: 0.1.0
name: md-stack
abstract: |
  MD 文档编写工具链：md-pipeline（OXN 自身 MD 引擎）+ markdownlint + markdown-link-check。
  OXN 项目消费者 onboarding 5 起手 Asset 之一。
  关键约束：所有项目文档必走 md-pipeline 编译；commit 前必跑 markdownlint。
references: []
citations: 0
synced-at: 2026-08-04
---

# Stack: md-stack

> MD 文档编写工具链。OXN 内置 5 起手 Asset 之一。
> 项目消费者沿用 OXN 自身的 MD 工具链，确保文档编译/lint/链接校验一致性。

## Tools

### md-pipeline
- version: ">=0.6.0"
- role: MD 编译引擎（OXN 自身产品）；处理 frontmatter 解析 + 交叉引用 + 站点生成

### markdownlint
- command: "markdownlint-cli2 '**/*.md'"
- role: MD 风格 lint（规则集：MD041 标题层级 / MD033 内联 HTML / MD024 重复标题）

### markdown-link-check
- command: "markdown-link-check"
- role: 链接校验（内链/外链/锚链）；pre-commit 钩子必跑

### oxn-doc-cite
- command: "oxn doc cite"
- role: 引用编号唯一性校验（对应 doc-md-domain.inv-4 citation-numbering-unique）

### lefthook
- config: "lefthook.yml"
- role: Git hooks 集成（pre-commit 触发 markdownlint + markdown-link-check）
