# OXN Unified Architecture

This document describes the **unified OXN architecture** that resulted
from merging the `reference` (v0.0.27, Arsenal+Hall+Daemon) and `mvp`
(v1.0.0-alpha, Leader AI Orchestrator) tracks into a single coherent
codebase on the `explore/dual-track` branch.

## TL;DR

There is now exactly one `oxn` binary, one OXN grammar, one
`src/cli/leader.ts` entry point, and one set of `src/oxn-dsl/` + `src/work/`
modules. The earlier `-mvp` and `reference` namespaces have been
collapsed; the `--leader-mode=mvp` and `OXN_LEADER_MODE=mvp` flags are
still honored for backward compatibility but resolve to the same code
path.

## Unification decisions

| Concern | Decision | Rationale |
|---------|----------|-----------|
| **OXN grammar** | A1 — keep reference's Port/Contract semantics, add mvp's `skill` block | Preserves reference's "AI 不知道验证标准, Core 不产生逻辑" philosophy while letting AI actions be self-described via `skill { lifecycle, objective, acceptance, guidance }` |
| **state.json schema** | B1 — mvp schema + `partExecutions[]` for probes | Keeps the lightweight mvp state machine but threads per-part probe results through it so reference's verification path still works |
| **Trace events** | C1 — JSONL + probe events | Same append-only format the mvp work-trace uses; adds `probe-result` events |
| **Langium services** | D1 — reference's `createDefaultCoreModule` + mvp's `OxnParser` class | Reference has the more complete Langium stack; mvp's `OxnParser` becomes a thin convenience wrapper |

## What lives where

```
src/oxn-dsl/                      ← unified grammar + Port/Contract + Langium
  ├─ index.ts                    ← single barrel: re-exports both surfaces
  ├─ langium/oxn.langium         ← unified grammar source (the .langium file)
  ├─ langium/oxn-services.ts      ← reference-style createOxnServices + mvp-style OxnParser
  ├─ compiler/                    ← reference's blueprint compiler
  ├─ scope/, loader/, ...         ← reference's Port/Contract ecosystem
  └─ generated/                   ← Langium-generated ast/grammar/module (single canonical)

src/work/                         ← unified state machine (mvp + PartExecution)
  ├─ state.ts                    ← WorkState schema (zod) with partExecutions
  ├─ state-io.ts                 ← load/save state.json
  ├─ trace.ts                    ← append-only work-trace.jsonl
  └─ index.ts                    ← re-exports

src/cli/leader.ts                ← single entry: new | run | submit | status
                                  + reference aliases: start | next | list
```

## Unified grammar superset

The `oxn.langium` grammar is the union of both tracks. Every existing
file in `src/builtin/`, `src/oxn-dsl/builtin/`, and `src/leader/works/`
parses with the unified grammar without modification.

**What the unified grammar adds on top of reference:**

- `PartSkill` block (in `PartDeclaration` and `SlotBinding`):
  ```oxn
  part "p" align "P" {
    skill {
      lifecycle = "code";
      objective = "what the AI should do";
      acceptance = ["verifiable outcomes"];
      guidance = "extra hints for the AI";
    }
  }
  ```
- `WorkContext` block (in `BlueprintDeclaration` and `WorkDeclaration`):
  ```oxn
  work "w" ref "@oxn/blueprints/..." {
    context {
      goal = "...";
      constraints = ["..."];
      loop_policy { max_iterations = 5; }
    }
    ...
  }
  ```
- `LoopPolicy` rule
- `TopLevelEntity*` (multi-entity per file) — top-level work.oxn can
  carry work + N part bodies together

**What the unified grammar retains from reference:**

- `description`, `prop`, `observe`, `execution`, `probe` (in parts)
- `expectation`, `rule` (in blueprints)
- `BlueprintDeclaration` with `version`, `slot { deps }`, etc.
- All semantic-checking rules from `src/oxn-dsl/validator/`

## Unified WorkState schema

`src/work/state.json` carries both mvp-style fields and reference-style
probe results. Example after `submit --run-probes` on a part:

```json
{
  "workName": "w",
  "status": "running",
  "currentPart": "alpha",
  "completedParts": [],
  "loopMeta": { "currentIteration": 0, "maxIterations": 3 },
  "frozenPath": null,
  "createdAt": "2026-...",
  "updatedAt": "2026-...",

  "skillContext": {                              // mvp
    "overallGoal": "...",
    "constraints": ["..."],
    "maxIterations": 3
  },
  "partSpecs": [{                                 // mvp
    "partName": "alpha",
    "align": "Alpha",
    "ref": "@oxn/parts/alpha",
    "skill": { "lifecycle": "code", "objective": "...", "acceptance": ["..."] }
  }],
  "partExecutions": [{                           // reference + new
    "partName": "alpha",
    "align": "alpha",
    "status": "passed",
    "probes": [
      {
        "probeName": "part-reachable",
        "passed": true,
        "output": { "ref": "@oxn/parts/alpha" },
        "executedAt": "2026-..."
      }
    ]
  }]
}
```

## Unified work-trace events

`work-trace.jsonl` carries mvp events plus reference probe events:

```jsonl
{"event":"work-started","workName":"w","blueprint":"...","parts":[...],"at":"..."}
{"event":"submit","iteration":1,"probeResults":[...],"at":"..."}
{"event":"probe-result","partName":"alpha","probes":[...],"at":"..."}
```

## Single leader entry

`oxn leader` exposes a unified subcommand set:

| Subcommand | Origin | Purpose |
|------------|--------|---------|
| `new` | mvp | Generate `work.oxn` from a blueprint |
| `run` | mvp | Start the state machine |
| `submit` | mvp | Advance one part (use `--run-probes` to also run aligned probes) |
| `status` | mvp | Read current state |
| `start` | reference alias | Copy a builtin `ldr-*.oxn` template |
| `next` | reference alias | `submit --run-probes` |
| `list` | reference alias | List builtin templates |

## Backward compatibility

- `--leader-mode=mvp` (CLI flag), `OXN_LEADER_MODE=mvp` (env var),
  and `.oxnrc` with `"leaderMode": "mvp"` all still work but resolve
  to the same unified leader. A one-time deprecation hint is logged to
  stderr so old scripts can be migrated.
- `src/cli/leader-canary-cli.ts`, `src/leader-canary/`, `src/oxn-dsl-mvp/`,
  `src/work-mvp/` are all removed.

## Migration guide for downstream callers

If you were importing from the deleted `-mvp` namespaces:

| Old import | New import |
|------------|------------|
| `from '../oxn-dsl-mvp'` | `from '../oxn-dsl'` |
| `from '../work-mvp'` | `from '../work'` |
| `from '../leader-canary/oxn-leader'` | `from '../cli/leader'` (the unified leader) |
| `import('./leader-canary-cli')` | `import('./leader')` |

The exported names are identical (e.g. `createOxnServices`, `OxnParser`,
`WorkState`, `appendTrace`), so the only change is the module path.
