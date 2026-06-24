---
entity: blueprint
version: 1
name: release-cut
---

# Blueprint: release-cut

> OpenXenon 发版流程：bump 版本号 → 汇总 changelog → 打 tag → 验证 build 与 typecheck → 触发 CI 跨平台编译与发布

## Props

### next_version
- type: string
- required: true

### release_branch
- type: string
- default: main

## Slots

### bump-version
- deps: []
- observe:
  - fs-parseable
  - shell-exec

### gen-changelog
- deps:
  - bump-version
- observe:
  - fs-exists
  - fs-content-match

### tag
- deps:
  - gen-changelog
- observe:
  - shell-exec

### verify-build
- deps:
  - tag
- observe:
  - shell-exec
  - ts-compiles
  - test-pass

### publish
- deps:
  - verify-build
- observe:
  - shell-exec
