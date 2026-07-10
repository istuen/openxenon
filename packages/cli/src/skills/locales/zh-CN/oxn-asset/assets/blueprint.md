---
entity: blueprint
version: 0.1.0
name: <name>
abstract: |
  TODO: 一句话描述本组合模板的边界组合（domain + workflow + stack）。
  TODO: 适用场景（2-3 行）
references: []
citations: 0
---

# Blueprint: <name>

> TODO: 一句话描述本组合模板的工作流程

## Refs

<!-- 示例：删除下方示例，添加你的 boundary refs -->
<!-- 至少引用 1 个 Domain + 1 个 Workflow + 1 个 Stack -->

### payment-domain
- kind: domain
- ref: @md/domains/PaymentContext

### fix-issue-workflow
- kind: workflow
- ref: @md/workflows/fix-issue

### node-stack
- kind: stack
- ref: @md/stacks/node-ts

<!-- 可选：嵌套 Blueprint（多层组合） -->
<!-- ### base-setup-blueprint
- kind: blueprint
- ref: @md/blueprints/base-setup -->