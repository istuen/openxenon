---
entity: work
version: 0.1.0
name: NewUserOnboarding
---

# Work: NewUserOnboarding

> Complete new member registration and distribute welcome benefits

## Context

### primary
- goal: Complete new member registration and distribute welcome benefits
- constraints:
  - Cannot directly read the order database
  - Must call Order context capabilities
- max_iterations: 5

## Tasks

### RegisterMember
- blueprint: dev-workflow
- domain: MemberContext
- part: develop
  - skill_context: Implement Member registration API, password must be encrypted

### GrantWelcomeBonus
- blueprint: dev-workflow
- domain: OrderContext
- part: develop
  - skill_context: Call Order context to grant welcome bonus
