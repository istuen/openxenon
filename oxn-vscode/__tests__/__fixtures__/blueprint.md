---
entity: blueprint
version: 0.3.0
name: ci-pipeline
---

# Blueprint: ci-pipeline

> CI 流水线

## Props

### env
- type: enum
- values: [dev, staging, prod]
- required: true
- default: dev

## Slots

### build
- deps: []
- observe:
  - fs-exists
  - ts-compiles

### test
- deps:
  - build
- observe:
  - test-pass
