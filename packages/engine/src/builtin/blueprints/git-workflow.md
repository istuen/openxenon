---
entity: blueprint
version: 0.1.0
name: git-workflow
---

# Blueprint: git-workflow

## Version

- version: 1

## Slots

### ensure_clean_workspace
- deps: []
- observe:
  - git-clean
  - git-branch-exists

### prepare_branch
- deps:
  - ensure_clean_workspace
- observe:
  - git-status-clean

### develop
- deps:
  - prepare_branch

### verify_merge_feasible
- deps:
  - develop
- observe:
  - git-merge-feasible
