# src/leader-canary/ — mvp Leader Canary

This directory holds the **complete mvp (v1.0.0-alpha) leader CLI** as a
canary alongside the `reference` branch (v0.0.27, Arsenal + Hall + Daemon).

## What is here

| File | Source on `mvp` | Purpose |
|------|-----------------|---------|
| `oxn-leader.ts` | `src/cli/leader.ts` (full 592-line mvp leader) | All 4 mvp subcommands: `new`, `run`, `submit`, `status` |
| `index.ts` | (this dir) | Re-exports `oxn-leader.ts` as the canary default |

## Companion modules (also ported from `mvp`)

| Path | Source on `mvp` | Purpose |
|------|-----------------|---------|
| `src/oxn-dsl-mvp/index.ts` | `mvp:src/oxn-dsl/index.ts` | Langium-based OXN parser entrypoint |
| `src/oxn-dsl-mvp/langium/oxn-services.ts` | mvp | `createOxnServices()` (minimal `createServicesForGrammar` style) |
| `src/oxn-dsl-mvp/langium/oxn-parser.ts` | mvp | `OxnParser` class |
| `src/oxn-dsl-mvp/langium/oxn.langium` | mvp | Grammar source (mvp's extended grammar) |
| `src/oxn-dsl-mvp/generated/{ast,grammar,module}.ts` | mvp | Langium-generated artefacts (mvp superset) |
| `src/work-mvp/{state,state-io,trace,index}.ts` | mvp | Zod-typed state machine + append-only trace |

## How to switch

The CLI flag `--leader-mode`, the env var `OXN_LEADER_MODE`, and the
`.oxnrc` project file are all wired into a single priority chain (see
`docs/cli/config.md`):

```text
CLI flag  >  OXN_LEADER_MODE  >  .oxnrc  >  default (reference)
```

- `OXN_LEADER_MODE=reference` (default) — uses `src/cli/leader.ts`
  with subcommands `start | next | list`.
- `OXN_LEADER_MODE=mvp` — uses `src/cli/leader-canary-cli.ts`, which
  re-exports `src/leader-canary/oxn-leader.ts` (the mvp leader), with all
  imports pointing at `src/oxn-dsl-mvp/` and `src/work-mvp/`. Subcommands:
  `new | run | submit | status`.

To opt a project in permanently:

```bash
oxn config set --key leaderMode --value mvp
git add .oxnrc && git commit -m "opt into mvp canary"
```

## Why a separate copy of `oxn-dsl` and `work`

The mvp and reference OXN DSL grammars are **strict supersets** of each
other: mvp's grammar adds the `Work` / `Part` / `Skill` / `LoopPolicy`
syntax that the reference grammar does not have, while the reference
grammar (compiled to TypeScript via Langium) is the strict subset.

A single shared `src/oxn-dsl/` cannot serve both, because:

- The reference Port/Contract compiler (`createOxnCompiler`) and the mvp
  Langium parser (`createOxnServices` + `OxnParser`) have **different
  return types** and runtimes.
- The mvp `src/work/` modules (`state`, `state-io`, `trace`) reference
  types and types guards from `src/oxn-dsl/generated/ast` that do not
  exist on the reference side.

The canary pattern keeps both worlds runnable from a single binary
without forcing an early unification. When a future refactor merges the
two grammars, `oxn-dsl-mvp` and `work-mvp` collapse into the merged
`oxn-dsl` and `work` and the canary disappears.

## Why two tracks

- **`reference` (stable)**: full Arsenal + Hall + Daemon architecture,
  richer part model (`target` / `action` / `spec` / `probes`), Web UI.
- **`mvp` (exploration)**: simplified CLI-only leader, leaner part model
  (`skill { lifecycle, objective, acceptance, guidance }`), Langium-based
  DSL with a `work.oxn` self-contained file format.

Running them in parallel lets the team validate ideas on `mvp` without
disturbing the stable `reference` user base. See
`.openxenon/works/dual-track/work.oxn` for the bootstrap work.
