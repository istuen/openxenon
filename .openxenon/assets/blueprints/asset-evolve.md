---
entity: blueprint
version: 1
name: asset-evolve
---

# Blueprint: asset-evolve

> Asset 演进流水线（oxn-asset Skill 步骤 4）：read-current → plan-changes → apply-evolve

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
