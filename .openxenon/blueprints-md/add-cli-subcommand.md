---
entity: blueprint
version: 1
name: add-cli-subcommand
---

# Blueprint: add-cli-subcommand

> 给 oxn CLI 增新子命令的技术流程：分析现有子命令布局 → 设计新子命令的协议与输出 → 实现子命令与测试 → 验证注册 + lint + test

## Props

### timeout
- type: number
- default: 60000

### strict
- type: boolean
- default: true

## Slots

### analyze-existing-cmds
- deps: []
- observe:
  - fs-exists

### design-cmd-protocol
- deps:
  - analyze-existing-cmds
- observe:
  - fs-exists

### implement-cmd
- deps:
  - design-cmd-protocol
- observe:
  - lint-check
  - ts-compiles

### verify-registration
- deps:
  - implement-cmd
- observe:
  - test-pass
