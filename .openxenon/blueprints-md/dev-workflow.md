---
entity: blueprint
version: 1
name: dev-workflow
---

# Blueprint: dev-workflow

> TS 项目通用开发流程：构建（依赖图守卫）→ {开发（写代码）并行测试（写/补单测）} → 验证（lint+typecheck+test 全过）

## Props

### timeout
- type: number
- default: 60000

### strict
- type: boolean
- default: true

## Slots

### build
- deps: []
- observe:
  - deps-resolved

### develop
- deps:
  - build
- observe:
  - lint-check
  - ts-compiles

### test
- deps:
  - build
- observe:
  - test-pass

### verify
- deps:
  - develop
  - test
- observe:
  - lint-check
  - ts-compiles
  - test-pass
