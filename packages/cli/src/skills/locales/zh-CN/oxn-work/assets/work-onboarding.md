---
entity: work
version: 0.1.0
name: NewUserOnboarding
---

# Work: NewUserOnboarding

> 完成新会员注册并发放欢迎福利

## Context

### primary
- goal: 完成新会员注册并发放欢迎福利
- constraints:
  - 不能直接读订单库
  - 必须调用订单上下文的能力
- max_iterations: 5

## Tasks

### RegisterMember
- blueprint: @md/blueprints/dev-workflow
- domain: @md/domains/MemberContext
- part: develop
  - skill_context: 实现 Member 注册 API，密码必须加密

### GrantWelcomeBonus
- blueprint: @md/blueprints/dev-workflow
- domain: @md/domains/OrderContext
- part: develop
  - skill_context: 调用 Order 上下文发放欢迎积分
