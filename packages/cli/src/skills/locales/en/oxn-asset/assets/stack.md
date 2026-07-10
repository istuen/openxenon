---
entity: stack
version: 0.1.0
name: <name>
abstract: |
  TODO: One-line description of tech stack (language + runtime + toolchain).
  TODO: Key constraints (2-3 lines)
references: []
citations: 0
---

# Stack: <name>

> TODO: One-line description of this tech stack

## Runtimes

### typescript
- version: ">=5.0.0"

### node
- version: ">=20.0.0"

## Linters

### biome
- config: "biome.json"

## Tests

### bun-test
- command: "bun test"
- coverage: "@oxn/probes/test-pass"

## Externals (v0.6.1-alpha.4 optional)

> When this Stack references external tool config sources (e.g., npm registry, Node.js compat table), add `## Externals` section.
> 6-value kind enum: rest-api | webhook | documentation | library | config | service
> url (network) or path (project-internal), choose one.

<!-- Examples: delete below and add your externals -->


