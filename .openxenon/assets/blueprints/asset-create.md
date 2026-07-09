---
entity: blueprint
version: 1
name: asset-create
abstract: "Asset creation pipeline: choose-kind to fork-template to fill-content to validate-commit"
references: []
citations: 0
---

# Blueprint: asset-create

> Asset 创建流水线（oxn-asset Skill 步骤 1-3）：choose-kind → fork-template → fill-content → validate-commit

<!-- auditTrail: created by oxn-asset Skill at 2026-07-10 -->

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
