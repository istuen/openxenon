---
entity: blueprint
version: 1
name: git-workflow
---

# Blueprint: git-workflow

> Git workspace 隔离 + 质量门 + merge 可行性证据：3 阶段可被 Work 编排层选择性插入到任何主 Blueprint 的前后；OXN 只给证据，不替人决策

## Props

### strategy
- type: string
- default: none

### base_branch
- type: string
- default: current

### target_branch
- type: string
- default: current

### worktree_root
- type: string
- default: .openxenon/_worktree

## Slots

### prepare-workspace
- deps: []
- observe:
  - git-clean
  - git-branch-exists

### precommit
- deps:
  - prepare-workspace
- observe:
  - shell-exec

### finalize
- deps:
  - precommit
- observe:
  - shell-exec
  - git-status-clean
  - git-merge-feasible
