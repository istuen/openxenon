---
entity: work
version: 0.1.0
name: fix-issue
---

# Work: fix-issue

> 修复 work state 在 submit 后未及时持久化的 bug

## Context

### primary
- goal: 修复 work state 在 submit 后未及时持久化的 bug
- constraints:
  - 不破坏现有 leader 状态机
  - frozen.json 路径不能改
- max_iterations: 5

## Tasks

### diagnose
- blueprint: @md/blueprints/fix-issue
- domain: @md/domains/WorkContext
- part: diagnose
  - skill_context: 复现 bug，记录现场

### locate
- blueprint: @md/blueprints/fix-issue
- domain: @md/domains/WorkContext
- part: locate
  - skill_context: 定位根本原因

### fix
- blueprint: @md/blueprints/fix-issue
- domain: @md/domains/WorkContext
- part: fix
  - skill_context: 实施修复方案

### verify
- blueprint: @md/blueprints/fix-issue
- domain: @md/domains/WorkContext
- part: verify
  - skill_context: 验证修复结果
