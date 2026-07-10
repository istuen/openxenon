---
title: Asset
---

# Asset (E1 · Static Boundary)

> **Asset is OXN's first structural entity (E1) — engineer-maintained hard constraint boundaries**. **v0.6.1-alpha.4**: 5 AssetKind total — 3 boundary types (Domain/Workflow/Stack) + Blueprint (composition template) + Roadmap (meta index). Once created, Assets are frozen under planLock + content_hash — **referenced by Work, never rewritten by Work**. This is OXN's key design reversal from OpenSpec.

## Asset vs OpenSpec specs/

| Dimension | OpenSpec specs/ | OXN Asset (E1) |
|---|---|---|
| **Role** | Target rewritten by changes | Boundary referenced by Work |
| **Version** | Fluid (merged on each archive) | Frozen (planLock + content_hash) |
| **Creation** | Grows with changes | Explicit Asset-mode Work |
| **Modification** | Any change can modify any spec | Only via Asset-mode Work + audit pool approve |
| **Verification** | AI self-check + human review | Engine independent third-party probes + frozen.json |
| **Philosophy** | Spec-Driven (spec is product) | **Constraint-Driven** (constraint is boundary) |

## Five AssetKind (v0.6.1-alpha.4 Three-Boundary Framework)

**3 boundary types** (kind-isolated, 2 reference types: internal + external):

| AssetKind | Concern | IAP Role |
|---|---|---|
| **Domain** | Business terms/bans/invariants | Intent semantic constraint |
| **Workflow** | slot DAG (deps/observe) | Intent structural constraint |
| **Stack** | runtime/linter/tester configs | Intent environmental constraint |
| **Blueprint** | Composition template (## Refs) | Cross-kind isolation layer |
| **Roadmap** | Meta index (scene → asset) | AI routing entrypoint |

**Key invariants**:
- 3 boundary types **don't reference each other** (kind-isolation)
- **Blueprint** is the only cross-kind composer (via `## Refs` for Domain/Workflow/Stack/Blueprint)
- **Work** only references Blueprint (one ref), not 3 boundary types directly

See [ADR-0054 Three-Boundary Framework](./.openxenon/docs/adrs/0054-three-boundary-framework.md) + [ADR-0055 Blueprint Composition Template](./.openxenon/docs/adrs/0055-blueprint-as-composition-template.md).

## External inline (v0.6.1-alpha.4)

Each boundary type (Domain/Workflow/Stack) supports `## Externals` H2 category to reference OXN-external resources. **Blueprint does NOT support Externals**.

**Field schema** (url or path, mutually exclusive):

```oxl
### external-name
- url: https://api.example.com/v1   # or path
- kind: rest-api                     # 6-value enum
- ttl: 7d                            # optional
- auth: api-key                      # optional
- summary: ...                       # optional
```

**Kind enum**: `rest-api` | `webhook` | `documentation` | `library` | `config` | `service`

**Status management**: 4 values (`available`/`unavailable`/`stale`/`unknown`) stored in `.openxenon/.cache/external-status.json` (gitignore, doesn't participate in Asset hash).

**CLI**: `oxn external check | status | mark --name <n> --status <s> [--reason "..."]`

See [ADR-0056 External Inline + Status](./.openxenon/docs/adrs/0056-external-inline-and-status.md).

## Hard Constraint Three-Layer Lock

1. **OS**: chmod 0o444
2. **Content**: SHA-256 content_hash
3. **WAL**: planLock — **v0.6.1-alpha.3**: 3-component hash (workOxn/blueprints/tasks + allHash); `blueprintsHash` contains Blueprint + 3 boundary composite hash for broader drift detection

## Default Layout (v0.6.1-alpha.4)

```
.openxenon/assets/
├── domains/        # entity: domain
├── workflows/      # entity: workflow (renamed from blueprints/, Phase 0)
├── stack/          # entity: stack
├── blueprints/     # entity: blueprint (new semantics: composition template)
└── roadmaps/       # entity: roadmap

.openxenon/libraries/             # 🆕 external library docs (.md files, not Asset)
.openxenon/.cache/                # runtime cache (gitignore)
└── external-status.json          # 🆕 external status index
```

See [Asset (ZH-CN)](./asset.md) for full detail. [Core Concepts](./core-concepts.md) · [Work](./work.md).
