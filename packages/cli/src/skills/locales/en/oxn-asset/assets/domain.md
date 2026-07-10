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

> TODO: One-line description of this bounded context

## Terms

### Member
- desc: Registered member entity with basic info + auth state

### Account
- desc: Member's login credentials, bound to Member.id

### Order
- desc: Order entity with item list + payment state

## Bans

### forbidden-constructs
- items:
  - User
  - Customer
  - AccountHolder
- desc: User, Customer, AccountHolder (unified as Member)

## Invariants

### inv-audit
- value: Any member state change must be logged to audit_log

### inv-unique-email
- value: Same email cannot register twice in same context

### inv-idempotency
- value: Payment API must support idempotency (idempotency_key)

## Externals (v0.6.1-alpha.4 optional)

> When this Domain needs to reference OXN-external resources, add `## Externals` section.
> 6-value kind enum: rest-api | webhook | documentation | library | config | service
> url (network) or path (project-internal), choose one.

<!-- Examples: delete below and add your externals -->

<!-- ### payment-api
- url: https://api.example.com/v1
- kind: rest-api
- ttl: 7d
- auth: api-key
- summary: TODO -->