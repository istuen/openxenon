---
entity: blueprint
version: 1
name: asset-archive
abstract: "Asset archive pipeline: check-references to confirm to move-to-archived"
references: []
citations: 0
---

# Blueprint: asset-archive

> Asset 归档流水线（oxn-asset Skill 步骤 5）：check-references → confirm → move-to-archived

<!-- auditTrail: created by oxn-asset Skill at 2026-07-10 -->

## Slots

### check-references
- deps: []
- observe: []

### confirm
- deps:
  - check-references
- observe: []

### move-to-archived
- deps:
  - confirm
- observe: []
