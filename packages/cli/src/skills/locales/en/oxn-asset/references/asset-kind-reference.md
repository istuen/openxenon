# 5 AssetKind Quick Reference

> This file is the on-demand supplement to the `oxn-asset` Skill. Consult when selecting an AssetKind.

## 5 AssetKind Overview

| AssetKind | Purpose | H2 Categories | Typical H3 Examples |
|---|---|---|---|
| **domain** | Business bounded context (DDD) | Terms / Bans / Invariants | Member, Account, Order |
| **blueprint** | Technical workflow (slot DAG) | Props / Slots | env, timeout; build, test, verify |
| **stack** | Tech stack constraints (runtime/linter/test) | Runtimes / Linters / Tests | typescript, biome, bun-test |
| **library** | Documentation aggregation (external knowledge) | Sources | axios-docs, express-routing |
| **external** | External resource links (API/service) | Links | payment-api, log-aggregator |

## Domain — Business Intent

**When to use**:
- Project initialization (let AI generate starter Domain on `oxn init`)
- Cross-team vocabulary unification (term / ban / invariant)
- Business boundary clarification (which business logic belongs to which context)

**Not applicable**:
- Technical workflow (use blueprint)
- Toolchain constraints (use stack)

## Blueprint — Technical Intent

**When to use**:
- Standardized development workflow (dev / test / verify / ship)
- CI/CD pipeline templates
- Multi-task DAG orchestration

**Slot dependency graph must be acyclic**: `deps: [a, b]` means this slot depends on outputs from a and b.

## Stack — Toolchain Constraints

**When to use**:
- Lock project runtime version (typescript >=5.0.0)
- Lock lint/test tools (biome, bun-test)
- Override `oxn init` auto-generated starter-stack

**Relationship to Blueprint**: stack provides **environment**, blueprint provides **workflow**.

## Library — Documentation Aggregation

**When to use**:
- Fetch external docs and generate AI-consumable .md
- Third-party SDK docs (axios, express, react)
- Internal wiki aggregation

**Difference from External**: library = **pull in and consume**; external = **link to outside**.

## External — External Resources

**When to use**:
- Third-party API links (Stripe, GitHub)
- External service addresses (log aggregator, monitoring)
- Resources needing TTL refresh

**TTL semantics**: external older than ttl is considered stale and needs re-fetch.

## 5 AssetKind Relationship Diagram

```
┌─────────────────────────────────────────────┐
│  Stack (env)  ──→  Blueprint (workflow)     │
│       │                    │                │
│       └──→  Work refs ─────┘                │
│                  │                          │
│                  ▼                          │
│            Domain (business boundary)       │
│                  │                          │
│                  ▼                          │
│         Library + External (external knowledge) │
└─────────────────────────────────────────────┘
```

Work references multiple AssetKinds via `--asset domain=X --asset blueprint=Y --asset stack=Z`.