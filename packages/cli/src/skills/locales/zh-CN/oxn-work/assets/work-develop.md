---
entity: work
version: 0.1.0
name: develop-member
---

# Work: develop-member

> 实现新会员注册功能

## Context

### primary
- goal: 实现新会员注册功能
- constraints:
  - 必须使用 MemberContext.term.Member，不能用 User/Customer
  - 密码必须 hash 后存储
- max_iterations: 5

## Tasks

### register-member
- blueprint: dev-workflow
- domain: MemberContext
- part: develop
  - skill_context: 实现 Member 注册功能
- part: test
  - skill_context: 为 Member 注册写单测
- part: verify
  - skill_context: 端到端验证注册流程
