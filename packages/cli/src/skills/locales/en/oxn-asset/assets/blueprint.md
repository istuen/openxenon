---
entity: blueprint
version: 0.1.0
name: <name>
abstract: |
  TODO: One-line description of this composition template (domain + workflow + stack).
  TODO: Applicable scenarios (2-3 lines)
references: []
citations: 0
---

# Blueprint: <name>

> TODO: One-line description of this composition template's workflow

## Refs

<!-- Examples: delete below and add your boundary refs -->
<!-- Must reference at least 1 Domain + 1 Workflow + 1 Stack -->

### payment-domain
- kind: domain
- ref: @md/domains/PaymentContext

### fix-issue-workflow
- kind: workflow
- ref: @md/workflows/fix-issue

### node-stack
- kind: stack
- ref: @md/stacks/node-ts

<!-- Optional: nested Blueprint (multi-level composition) -->
<!-- ### base-setup-blueprint
- kind: blueprint
- ref: @md/blueprints/base-setup -->