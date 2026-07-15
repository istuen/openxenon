# 5 AssetKind Quick Reference (v0.6.1-alpha.4)

> Load on demand from `oxn-asset` Skill. Consult when choosing AssetKind.

## 5 AssetKind Overview

| AssetKind | Purpose | H2 category whitelist | Typical H3 examples |
|---|---|---|---|
| **domain** | Business bounded context (DDD) | Terms / Bans / Invariants / **Externals** (optional) | Member, Account, Order |
| **workflow** | Execution flow (slot DAG, renamed from blueprint) | Props / Slots / **Externals** (optional) | env, timeout; build, test, verify |
| **stack** | Tech stack constraints (runtime/linter/test) | Runtimes / Linters / Tests / **Externals** (optional) | typescript, biome, bun-test |
| **blueprint** | Composition template (domain + workflow + stack) | **Refs** (cross-kind references) | integrate-payment, dev-standard |
| **roadmap** | Navigation graph (scene → asset) | Scenes (sub: scene) | scene: doc, scene: dev |

> **v0.6.1-alpha.4 convergence**:
> - library/external Asset types removed (see ADR-0053)
> - Original blueprint (execution template) renamed to **workflow**; new blueprint is composition template
> - **External inline**: external resource references declared via `## Externals` H2 category inside boundary types

## Domain — Business Intent (boundary type)

**When to use**:
- Project initialization (oxn init generates starter Domain)
- Cross-team vocabulary unification (term / ban / invariant)
- Business boundary clarification

**Not suitable for**:
- Technical flow (use workflow)
- Toolchain constraints (use stack)

**Optional `## Externals`**: When Domain needs to reference external APIs (e.g., PaymentContext → Stripe API).

## Workflow — Execution Intent (boundary type, renamed from Blueprint)

**When to use**:
- Standardized dev flow (dev / test / verify / ship)
- CI/CD pipeline templates
- Multi-task DAG orchestration

**Slot dependency graph must be acyclic**: `deps: [a, b]` means this slot depends on outputs of a and b.

**Optional `## Externals`**: When Workflow references external toolchain docs.

## Stack — Toolchain Constraints (boundary type)

**When to use**:
- Lock project runtime version (typescript >=5.0.0)
- Lock lint/test tools (biome, bun-test)
- Override `oxn init` auto-generated starter-stack

**Relation to Workflow**: stack provides **environment**, workflow provides **flow**.

**Optional `## Externals`**: When Stack references external tool config sources.

## Blueprint — Composition Template (E1 Asset isolation layer)

**When to use**:
- Compose Domain + Workflow + Stack + other Blueprints into a reusable "recipe"
- Work references one Blueprint, no need to select 3 boundaries separately

**Distinction from Workflow**:
- Workflow = **how** (slot DAG flow template)
- Blueprint = **what combination** (Domain + Workflow + Stack composition)

**Only H2 category**: `## Refs`

```oxl
blueprint "integrate-payment" {
  abstract: Payment integration composition template

  ## Refs
  ### PaymentContext
  - kind: domain
  - ref: @md/domains/PaymentContext
  ### fix-issue
  - kind: workflow
  - ref: @md/workflows/fix-issue
  ### node-ts
  - kind: stack
  - ref: @md/stacks/node-ts
}
```

**Forbidden**:
- ❌ No `## Externals` inside Blueprint (Blueprint is pure composition; external refs come from composed Domain/Workflow/Stack)
- ❌ Blueprint cannot form cycles via ref (DAG validation)

## Roadmap — Navigation Graph (meta index)

**When to use**:
- AI Agent needs to quickly locate "which Asset to use"
- Find Domain/Workflow/Stack/Blueprint by scene (doc/dev/debug/test/release/onboard)

**Relation to Work**: Roadmap is AI routing entrypoint, **does NOT participate** in Work's references DAG (meta reference relation is independent).

## External inline — boundary-internal external references (v0.6.1-alpha.4)

Each boundary type (domain/workflow/stack) can declare `## Externals` H2 category. **Blueprint does NOT support**.

### Complete schema

```oxl
### external-name
- url: https://api.example.com/v1   # or path (mutually exclusive)
- kind: rest-api                     # required, 6-value enum
- ttl: 7d                            # optional
- auth: api-key                      # optional
- summary: ...                       # optional
```

### 6-value kind enum

`rest-api` | `webhook` | `documentation` | `library` | `config` | `service`

### url vs path mutual exclusion

- `url`: network path (`https://api.example.com/v1`)
- `path`: project-relative path (`./docs/architecture.md`)
- **Choose one** (both → `E_MD_EXTERNAL_URL_PATH_CONFLICT`; neither → `E_MD_EXTERNAL_URL_PATH_REQUIRED`)

### Status management

External status stored in `.openxenon/.cache/external-status.json` (gitignore), **NOT part of** Asset content_hash.

**4 status values**: `available` | `unavailable` | `stale` | `unknown`

**Key format**: `<entity-type>::<entity-name>::<external-name>`

### CLI

```bash
oxn external check              # scan + check reachability + update status
oxn external status             # show all status
oxn external mark --name "X" --status <s> [--reason "..."]
```

## 5 AssetKind + External inline relation diagram

```
┌────────────────────────────────────────────────────────┐
│  3 boundary types (kind-isolated)                        │
│  ├── Domain     ─┐                                       │
│  │   │ Externals │─ external-status.json (independent)  │
│  ├── Workflow   ─┤                                       │
│  │   │ Externals │                                       │
│  ├── Stack      ─┘                                       │
│  │     │ Externals │                                     │
│  └── (only these 3 have Externals)                       │
│       │                                                   │
│       ▼                                                   │
│  Blueprint (composition, only ## Refs, no Externals)    │
│       │                                                   │
│       ▼                                                   │
│  Work (instance)── references Blueprint (one ref)        │
└────────────────────────────────────────────────────────┘
```