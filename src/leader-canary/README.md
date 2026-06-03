# src/leader-canary/ — mvp Leader Canary

This directory holds the **state-machine core** from the `mvp` branch
(v1.0.0-alpha, "Leader AI Orchestrator") as a canary alongside the
`reference` branch (v0.0.27, Arsenal + Hall + Daemon).

## What is here

| File | Source on `mvp` | Purpose |
|------|-----------------|---------|
| `state.ts` | `src/work/state.ts` | Zod schema for `state.json` (work state machine) |
| `state-io.ts` | `src/work/state-io.ts` | load/save state.json, path helpers |
| `trace.ts` | `src/work/trace.ts` | Append-only `work-trace.jsonl` writer/reader |
| `index.ts` | (this dir) | Re-exports the three modules above |

## What is NOT here (and why)

The full `mvp` leader CLI (`src/cli/leader.ts` with subcommands
`run` / `submit` / `status` / `new`) depends on a **Langium-based OXN
parser** (`createOxnServices` / `OxnParser`) that exists on `mvp` but
not on `reference`. The `reference` branch uses a **Port/Contract
blueprint compiler** (`createOxnCompiler` in `src/oxn-dsl/compiler/`)
instead. Porting the mvp leader fully would mean rebuilding the parsing
layer on reference — out of scope for the dual-track bootstrap.

## How to switch

Set the `OXN_LEADER_MODE` env var:

- `OXN_LEADER_MODE=reference` (default) — uses the reference-native
  leader CLI (subcommands `start` / `next` / `list`)
- `OXN_LEADER_MODE=mvp` — switches the `leader` subcommand to the mvp
  canary (subcommands `status <name>` / `trace <name>`, read-only)

The wiring point is `src/cli/index.ts:81`; the canary CLI lives in
`src/cli/leader-canary-cli.ts`.

## Why two tracks

The two branches represent two product directions:

- **`reference` (stable)**: full Arsenal + Hall + Daemon architecture,
  richer part model (`target` / `action` / `spec` / `probes`), Web UI.
- **`mvp` (exploration)**: simplified CLI-only leader, skinnier part
  model (`skill { lifecycle, objective, acceptance, guidance }`).

Running them in parallel lets the team validate ideas on `mvp` without
disturbing the stable `reference` user base. See
`.openxenon/works/dual-track/work.oxn` for the bootstrap work that set
this up.
