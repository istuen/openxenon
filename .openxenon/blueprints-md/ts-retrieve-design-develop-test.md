---
entity: blueprint
version: 1
name: ts-retrieve-design-develop-test
---

# Blueprint: ts-retrieve-design-develop-test

> TypeScript 项目四阶段工作流：检索（项目现状）→ 设计（结构与类型）→ 开发（实现代码）→ 测试（lint/type/test 验证）

## Slots

### retrieve
- deps: []
- observe:
  - fs-match

### design
- deps:
  - retrieve
- observe:
  - fs-exists

### develop
- deps:
  - design
- observe:
  - lint-check
  - type-check

### test
- deps:
  - develop
- observe:
  - test-runner
