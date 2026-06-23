---
entity: blueprint
version: 1
name: fix-issue
---

# Blueprint: fix-issue

> 问题修复流程：诊断（带源码取证）→ 定位（带证据落盘）→ 修复（带回归）→ 验证（lint+typecheck+test 全过）

## Props

### timeout
- type: number
- default: 60000

### strict
- type: boolean
- default: true

## Slots

### diagnose
- deps: []
- observe:
  - fs-content-match

### locate
- deps:
  - diagnose
- observe:
  - fs-exists

### fix
- deps:
  - locate
- observe:
  - ts-compiles
  - test-pass

### verify
- deps:
  - fix
- observe:
  - lint-check
  - ts-compiles
  - test-pass
