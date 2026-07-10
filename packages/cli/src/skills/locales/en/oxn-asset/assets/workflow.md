---
entity: workflow
version: 0.1.0
name: <name>
abstract: |
  TODO: One-line description of this execution flow's steps and dependencies.
  TODO: Applicable scenarios (2-3 lines)
references: []
citations: 0
---

# Workflow: <name>

> TODO: One-line description of this execution flow

## Props

### env
- type: enum
- values:
  - dev
  - staging
  - prod
- required: true
- default: dev

### timeout
- type: number
- default: 60000

## Slots

### analyze
- deps: []
- observe:
  - fs-exists
  - lint-check

### implement
- deps:
  - analyze
- observe:
  - ts-compiles
  - test-pass

### verify
- deps:
  - implement
- observe:
  - test-pass

## Externals (v0.6.1-alpha.4 optional)

> When this Workflow references external toolchain docs or CI config, add `## Externals` section.
> 6-value kind enum: rest-api | webhook | documentation | library | config | service
> url (network) or path (project-internal), choose one.

<!-- Examples: delete below and add your externals -->

