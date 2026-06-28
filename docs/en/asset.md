---
title: Asset
---

# Asset (E1 · Static Boundary)

> **Asset is OXN's first structural entity (E1) — engineer-maintained hard constraint boundaries**. Domain/Blueprint/Stack are the stable reference frame for Work. Once created, Assets are frozen under planLock + content_hash — **referenced by Work, never rewritten by Work**. This is OXN's key design reversal from OpenSpec.

## Asset vs OpenSpec specs/

| Dimension | OpenSpec specs/ | OXN Asset (E1) |
|---|---|---|
| **Role** | Target rewritten by changes | Boundary referenced by Work |
| **Version** | Fluid (merged on each archive) | Frozen (planLock + content_hash) |
| **Creation** | Grows with changes | Explicit Asset-mode Work |
| **Modification** | Any change can modify any spec | Only via Asset-mode Work + audit pool approve |
| **Verification** | AI self-check + human review | Engine independent third-party probes + frozen.json |
| **Philosophy** | Spec-Driven (spec is product) | **Constraint-Driven** (constraint is boundary) |

## Three Asset Types

| Asset | Concern | Example |
|---|---|---|
| **Domain** | Business terms/bans/invariants | `MemberContext` |
| **Blueprint** | Technical slot DAG + probe standards | `dev-workflow` |
| **Stack** | Technical environment constraints (v0.6 hard req) | `tech-stack` |

## Hard Constraint Three-Layer Lock

1. **OS**: chmod 0o444
2. **Content**: SHA-256 content_hash
3. **WAL**: planLock 4-component hash

## Default Layout (v0.6)

```
.openxenon/assets/{domain,blueprint,stack}/{name}.oxn
```

See [Asset (ZH-CN)](./asset.md) for full detail. [Core Concepts](./core-concepts.md) · [Work](./work.md).
