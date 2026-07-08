---
entity: domain
version: 0.1.0
name: <name>
abstract: |
  TODO: One-line description of this bounded context's business boundary.
  TODO: Key business scenarios (2-3 lines)
references: []
citations: 0
---

# Domain: <name>

> TODO: One-line description of this bounded context's business boundary

## Terms

### Member
- desc: Registered member entity with profile info + auth status

### Account
- desc: Member's login credential, bound to Member.id

### Order
- desc: Order entity with line items + payment status

## Bans

### forbidden-constructs
- items:
  - User
  - Customer
  - AccountHolder
- desc: User, Customer, AccountHolder (use Member consistently)

## Invariants

### inv-audit
- value: All member state changes must be recorded in audit_log

### inv-unique-email
- value: Same email cannot register twice within a context

### inv-idempotency
- value: Payment API must be idempotent (idempotency_key)