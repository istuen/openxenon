---
entity: blueprint
version: 1
name: asset-evolve
abstract: "Asset evolve pipeline: read-current to plan-changes to apply-evolve"
references: []
citations: 0
---

# Blueprint: asset-evolve

> Asset 演进流水线（oxn-asset Skill 步骤 4）：read-current → plan-changes → apply-evolve

<!-- auditTrail: created by oxn-asset Skill at 2026-07-10 -->

## Slots

### read-current
- deps: []
- observe: []

### plan-changes
- deps:
  - read-current
- observe: []

### apply-evolve
- deps:
  - plan-changes
- observe: []
