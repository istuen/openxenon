---
entity: work
version: 0.1.0
name: fix-issue
---

# Work: fix-issue

> Fix bug where work state is not persisted in time after submit

## Context

### primary
- goal: Fix bug where work state is not persisted in time after submit
- constraints:
  - Do not break existing leader state machine
  - frozen.json path must not change
- max_iterations: 5

## Tasks

### diagnose
- blueprint: fix-issue
- domain: WorkContext
- part: diagnose
  - skill_context: Reproduce bug, record the scene

### locate
- blueprint: fix-issue
- domain: WorkContext
- part: locate
  - skill_context: Identify root cause

### fix
- blueprint: fix-issue
- domain: WorkContext
- part: fix
  - skill_context: Implement fix

### verify
- blueprint: fix-issue
- domain: WorkContext
- part: verify
  - skill_context: Verify fix result
