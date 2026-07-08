---
entity: blueprint
version: 0.1.0
name: <name>
abstract: |
  TODO: 一句话描述本技术流程的步骤与依赖。
  TODO: 适用场景（2-3 行）
references: []
citations: 0
---

# Blueprint: <name>

> TODO: 一句话描述本技术流程

## Props

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

## Slots

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

### verify
- deps:
  - implement
- observe:
  - test-pass