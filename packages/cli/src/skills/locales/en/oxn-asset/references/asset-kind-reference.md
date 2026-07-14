# 5 AssetKind Quick Reference (v0.6.1-alpha.4)

> Load on demand from `oxn-asset` Skill. Consult when choosing AssetKind.

## 5 AssetKind Overview

| AssetKind | Purpose | H2 category whitelist | Typical H3 examples |
|---|---|---|---|
| **domain** | Business bounded context (DDD) | Terms / Bans / Invariants | Member, Account, Order |
| **workflow** | Execution flow (slot DAG, renamed from blueprint) | Slots (desc only) | env, timeout; build, test, verify |
| **stack** | Tech stack constraints (runtime/linter/test) | Tools | typescript, biome, bun-test |
| **blueprint** | Composition template (domain + workflow + stack) | **Use** + **Boundaries** (cross-kind references) | integrate-payment, dev-standard |
| **roadmap** | Navigation graph (scene → asset) | Scenes (sub: scene) | scene: doc, scene: dev |

> **v0.6.1-alpha.4 convergence**:
> - library/external Asset types removed (see ADR-0053)
> - Original blueprint (execution template) renamed to **workflow**; new blueprint is composition template
> - **External removed**: external resources declared via Asset Paper Schema `references: [{ url }]` field (no `## Externals`)

## Domain — Business Intent (boundary type)

**When to use**:
- Project initialization (oxn init generates starter Domain)
- Cross-team vocabulary unification (term / ban / invariant)
- Business boundary clarification

**Not suitable for**:
- Technical flow (use workflow)
- Toolchain constraints (use stack)

## Workflow — Execution Intent (boundary type, renamed from Blueprint)

**When to use**:
- Standardized dev flow (dev / test / verify / ship)
- CI/CD pipeline templates
- Multi-task DAG orchestration

**Slot dependency graph must be acyclic**: `deps: [a, b]` means this slot depends on outputs of a and b.

## Stack — Toolchain Constraints (boundary type)

**When to use**:
- Lock project runtime version (typescript >=5.0.0)
- Lock lint/test tools (biome, bun-test)
- Override `oxn init` auto-generated starter-stack

**Relation to Workflow**: stack provides **environment**, workflow provides **flow**.

## Blueprint — Composition Template (E1 Asset isolation layer)

**When to use**:
- Compose Domain + Workflow + Stack + other Blueprints into a reusable "recipe"
- Work references one Blueprint, no need to select 3 boundaries separately

**Distinction from Workflow**:
- Workflow = **how** (slot DAG flow template)
- Blueprint = **what combination** (Domain + Workflow + Stack composition)

**H2 categories**: `## Use` (references 3 boundaries) + `## Boundaries` (orchestration units)

```oxl
blueprint "integrate-payment" {
  abstract: Payment integration composition template

  ## Use
  ### payment-domain
  - kind: domain
  - ref: @md/domains/PaymentContext
  ### fix-issue-workflow
  - kind: workflow
  - ref: @md/workflows/fix-issue
  ### node-stack
  - kind: stack
  - ref: @md/stacks/node-ts

  ## Boundaries
  ### build
  - refs:
    - domain: payment-domain
    - workflow: fix-issue-workflow
    - stack: node-stack
  - observe: [ts-compiles]
  - deps: []
}
```

**Forbidden**:
- ❌ No External inside Blueprint (Blueprint is pure composition; external refs come from composed boundaries)
- ❌ Blueprint cannot form cycles via ref (DAG validation)

## Roadmap — Navigation Graph (meta index)

**When to use**:
- AI Agent needs to quickly locate "which Asset to use"
- Find Domain/Workflow/Stack/Blueprint by scene (doc/dev/debug/test/release/onboard)

**Relation to Work**: Roadmap is AI routing entrypoint, **does NOT participate** in Work's references DAG (meta reference relation is independent).
