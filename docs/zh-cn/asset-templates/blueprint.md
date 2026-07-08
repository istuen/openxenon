---
entity: blueprint
version: 0.1.0
name: NAME
abstract: |
  TODO: 一句话描述本技术流程的步骤与依赖。
  TODO: 适用场景（2-3 行）
references: []
citations: 0
---

# Blueprint: NAME

> TODO: 一句话描述本技术流程

## Props

### TODO_feature
- type: string
<!-- 示例：取消注释即用
### env
- type: enum
- values:
  - dev
  - staging
  - prod
- required: true
- default: dev

### timeout
- type: number
- default: 60000
-->

## Slots

### build
- deps: []

### test
- deps:
  - build

### lint
- deps:
  - build

### verify
- deps:
  - test
  - lint

<!-- 示例（取消注释即用）：
### analyze
- deps: []
- observe:
  - fs-exists
  - lint-check

### implement
- deps:
  - analyze
- observe:
  - ts-compiles
  - test-pass
-->
