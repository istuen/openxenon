---
entity: blueprint
version: 1
name: add-cli-subcommand
oxn-source-sha: d8ebf036c22b075ec1a95eb0ad78b1b208c39f82af9ab58411b419113183c83c
synced-at: 2026-06-26T01:19:20.326Z
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
