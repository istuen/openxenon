---
entity: blueprint
version: 0.1.0
name: <name>
---

# Blueprint: <name>

> TODO: 一句话描述本编排模板的边界组合（domain + workflow + stack）

## Use

<!-- 示例：删除下方示例，添加你的 boundary refs -->
<!-- 至少引用 1 个 Domain + 1 个 Workflow + 1 个 Stack -->

### payment-domain
- domain: @md/domains/PaymentContext

### fix-issue-workflow
- workflow: @md/workflows/fix-issue

### node-stack
- stack: @md/stacks/node-ts

## Boundaries

<!-- 每个 boundary 是一个编排单元，引用边界 + 声明可用 Probe + deps -->

### build
- refs:
  - domain: payment-domain
  - workflow: fix-issue-workflow
  - stack: node-stack
- observe:
  - ts-compiles
  - fs-exists
- deps: []

### test
- refs:
  - domain: payment-domain
  - workflow: fix-issue-workflow
  - stack: node-stack
- observe:
  - test-pass
  - lint-check
- deps:
  - build

### deploy
- refs:
  - workflow: fix-issue-workflow
  - stack: node-stack
- observe:
  - fs-exists
- deps:
  - test