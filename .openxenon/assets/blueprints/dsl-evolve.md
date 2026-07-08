---
entity: blueprint
version: 1
name: dsl-evolve
oxn-source-sha: c8abf4c0812e984a9262d7a03520bb9413e5c4439124e48fa212d37fe61f07cc
synced-at: 2026-06-26T01:19:20.288Z
---

# Blueprint: dsl-evolve

> OXL 演进流程：提出语法变更 → 迁移 example → 重新生成 generated/ → 全量验证（lint+typecheck+test）

## Props

### langium_source
- type: string
- default: src/oxl/langium/oxn.langium

### examples_dir
- type: string
- default: src/oxl/examples

## Slots

### propose-grammar
- deps: []
- observe:
  - fs-exists
  - fs-parseable

### migrate-examples
- deps:
  - propose-grammar
- observe:
  - fs-content-match

### regen-generated
- deps:
  - migrate-examples
- observe:
  - shell-exec

### verify
- deps:
  - regen-generated
- observe:
  - lint-check
  - ts-compiles
  - test-pass
