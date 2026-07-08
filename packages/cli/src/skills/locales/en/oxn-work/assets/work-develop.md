---
entity: work
version: 0.1.0
name: develop-member
---

# Work: develop-member

> Implement new member registration feature

## Context

### primary
- goal: Implement new member registration feature
- constraints:
  - Must use MemberContext.term.Member, not User/Customer
  - Passwords must be hashed before storage
- max_iterations: 5

## Tasks

### register-member
- blueprint: @md/blueprints/dev-workflow
- domain: @md/domains/MemberContext
- part: develop
  - skill_context: Implement Member registration feature
- part: test
  - skill_context: Write unit tests for Member registration
- part: verify
  - skill_context: End-to-end verification of registration flow
