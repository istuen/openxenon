---
entity: blueprint
version: 1
name: asset-create
---

# Blueprint: asset-create

> Asset 创建流水线（oxn-asset Skill 步骤 1-3）：choose-kind → fork-template → fill-content → validate-commit

## Slots

### choose-kind
- deps: []
- observe: []

### fork-template
- deps:
  - choose-kind
- observe: []

### fill-content
- deps:
  - fork-template
- observe: []

### validate-commit
- deps:
  - fill-content
- observe: []
