---
entity: blueprint
version: 1
name: refactor-safe
---

# Blueprint: refactor-safe

> 结构性重构（重命名 / 提取 / 跨层搬迁）：先全量定位调用方 → 设计新结构 → 同步迁移调用 → 验证旧路径消失 + 架构守卫 + 全量回归

## Props

### old_path
- type: string
- required: true

### new_path
- type: string
- required: true

### layer
- type: string
- default: L2-Builtin

## Slots

### map-callers
- deps: []
- observe:
  - fs-content-match
  - fs-match

### extract
- deps:
  - map-callers
- observe:
  - fs-exists
  - ts-compiles

### migrate-calls
- deps:
  - extract
- observe:
  - fs-content-match

### verify
- deps:
  - migrate-calls
- observe:
  - fs-not-exists
  - lint-check
  - ts-compiles
  - test-pass
