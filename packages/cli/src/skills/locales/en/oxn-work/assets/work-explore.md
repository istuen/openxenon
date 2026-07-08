---
entity: work
version: 0.1.0
name: explore-dsl
---

# Work: explore-dsl

> Explore OXL grammar structure, generate analysis report

## Context

### primary
- goal: Explore OXL grammar structure, generate analysis report
- constraints:
  - Use oxn commands instead of reading source directly
- max_iterations: 3

## Tasks

### explore
- blueprint: @md/blueprints/explore-analyze-report
- domain: @md/domains/DSLContext
- part: explore
  - skill_context: Explore four sub-modules: grammar/schema/validator/compiler
