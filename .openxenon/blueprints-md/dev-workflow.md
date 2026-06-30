---
entity: blueprint
version: 1
name: dev-workflow
oxn-source-sha: cbb0c08de0fe855a709c70aef33e0e5c540305e40365942992a2180c3442f94e
synced-at: 2026-06-26T01:19:20.333Z
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
