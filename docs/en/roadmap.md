---
title: Roadmap
---

# Roadmap

> OpenXenon evolves through four phases (P0–P3). Current version: v0.1.2.

## P0–P3 roadmap

| Phase | Goal | Core capability | One-line value |
|---|---|---|---|
| **P0: Proof axis standalone** | Proof closed-loop | `oxn proof create / probe add / run` | "AI says it's done? Only after OXN accepts it" |
| **P1: Intent axis technicalized** | Program Domain + Blueprint | Built-in ProgramContext; Blueprint templated | "Give AI a programming glossary and a blueprint" |
| **P2: Intent axis businessized** | Business Domain + DDD | Business Domain modeling; team-shared intent space | "Unify business language; align team intent" |
| **P3: Intent axis assetized** | Intent emergence + Hall | Execution-trace analysis; auto-generated intent candidates | "Past projects don't need to be redone" |

### P0 (currently complete)

- Proof-First entry: `oxn proof create / probe add / run / list / show`
- `frozen.json` is tamper-proof
- AI can only operate Proof through the CLI

### P1 (currently complete)

- OXN Engine = DSL + Runtime + CLI
- Domain / Blueprint / Work / Task full chain
- Program Domain built-in glossary
- Daemon supervisor + escape mechanism
- v1.1 `.work` static gate card + planLock 4-component hash

### P2 (currently in progress)

- Business Domain modeling (DDD)
- CI gating: Probe wired to `language-ban-checker`
- Team-shared intent space (Git + `@prj` references)

### P3 (planned)

- Execution trace → intent-space transformation
- Auto-generated intent candidates
- Hall (seminar room)

---

## Self-bootstrap verification

OpenXenon uses OpenXenon to manage its own development:

| Level | Definition | Status |
|---|---|---|
| L1 build self-bootstrap | `bun run build` → `oxn` executable | ✅ |
| L2 asset self-bootstrap | Domain / Blueprint / Work / Task full chain runs through | ✅ |
| L2+ DSL self-bootstrap | Grammar → Schema → Validator → Generator linked | ✅ |
| L3 quality self-bootstrap | OpenXenon's own development managed by OpenXenon | 🔜 P2 target |

---

## Two-tier emergence path

OpenXenon's capability upgrades are not top-down impositions, but bottom-up triggers driven by real pain:

### Emergence 1: Proof → Blueprint

```
Manual Proof once    → "AI's false-done got caught"     → Proof-First value established
Manual Proof 5 times → "Re-entering the same probe each time" → introduces Blueprint (Probe templating)
Manual Proof 10 times → "Can I save these probes?"      → introduces Domain (concept vocabulary)
```

### Emergence 2: Program Domain → Business Domain

```
Fix bugs        → "Blueprint + built-in Domain is so convenient"
3 features      → "Blueprint is full of tech jargon"
10 features     → "AI understands the jargon, but not the business intent"
                ↓
        Introduce Business Domain (DDD)
```

---

## Versioning and changelog

Changelog entry: [CHANGELOG.md](./changelog/CHANGELOG.md) (legacy doc)

Changelog fragments are kept under `.changes/`, organized by version. To release a new version, run:

```bash
bun run version:check
bun run version:sync
```

## → Reference

- [Introduction](../index.md) — OpenXenon's vision and positioning
- Legacy doc: [IAP as a signal system](./horizon/iap-as-signal-system.md) (old SSOT)
