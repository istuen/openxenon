---
entity: blueprint
version: 1
name: asset-archive
---

# Blueprint: asset-archive

> Asset 归档流水线（oxn-asset Skill 步骤 5）：check-references → confirm → move-to-archived

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
