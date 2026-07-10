# /oxn-work — Drive Work v1.1

## Goal
Create a **Work + ≥1 Task**, run through 8 phases: `create → add-task → validate → lock → run → submit → finalize` (`migrate?` optional)

## Hard Rules
- `validate`→`lock`→`run` is strict; no `--force`
- Drift after lock = `HASH_MISMATCH`; OXN does not commit/push
- Part/Probe inline in `task { part { probe {} } }`

## Paradigm
D=Business Intent | B=Tech Intent | W=Align orchestration | T=Align execution

## Blueprint Selection
| Need | Template (.md with OXN blocks) → Blueprint |
|---|---|
| Explore / report | `assets/work-explore.md` → `explore-analyze-report` |
| Single-domain dev | `assets/work-develop.md` → `dev-workflow` |
| Bug fix | `assets/work-fix.md` → `fix-issue` |
| Cross-domain | `assets/work-onboarding.md` → `dev-workflow` (multi domain) |

> v0.7+: Work no longer has mode (task/explore/edit); behavior differences carried by Blueprint slots/observe.

## Execution (v0.6.4 Roadmap-driven Asset selection)

1. **Prereq**: project initialized via `oxn init`; required Assets ready — to create/modify Assets, **invoke `oxn-asset` Skill**.
2. **Query Roadmap for available Assets** (human/AI initiated, NOT auto-recommended):
   - `oxn roadmap show oxn-system --scene <scene>` — list Domain / Blueprint / Stack under scene
   - `oxn roadmap suggest --goal "<goal>" --scene <scene>` — jaccard keyword ranking candidates
3. **Human analysis, pick from suggest results**:
   - **Blueprint** — 1..N pipelines (typically 1; multiple blueprints for cross-phase different pipelines)
   - **Domain** — 1..N (Work-level declaration, provides global vocabulary; Task level picks exactly 1)
   - **Stack** — 0..N (Work-level tech-stack constraints; not injected into Task layer)
4. **Fork template + edit work.md** (or pass via `oxn work create`):
   ```bash
   oxn work create <name> \
     --blueprint <bp> \
     [--blueprint <bp2>] \
     --domain <d1> --domain <d2> \
     [--stack <s1>] \
     --goal "<goal>" \
     [--constraints "c1" "c2"]
   ```
   Or manually `fork assets/work-{explore,develop,fix,onboarding}.md → work.md` and edit `## Refs` + `## Context` by hand.
5. **Run 8 phases**: `references/8-phase-detail.md`
6. **Errors**: `references/error-codes.md`

## Multiple Assets and Tasks relationship

- **Work-level `## Refs`**: declare `domain[]` + `blueprint[]` + `stack[]` ref pool (N items)
- **Task-level**: each task picks **single** 1 blueprint + 1 domain in `task.oxn` (subset of Work-level ref pool)
- **add-task validation**: task's chosen blueprint/domain **must** exist in Work-level ref pool (`add-task` errors with `not declared in work`)
- **planLock impact**: Work-level multi-refs cause `domains.json` / `blueprints.json` slim index to contain N entries; hash algorithm unchanged (hash the whole .json file)

## Errors
`LOCK_NOT_FOUND`/`HASH_MISMATCH` → YIELD | `TASK_OXN_MISSING` → `add-task` | `ROUND_ALREADY_PASSED` → `work finalize`

## Prohibitions
Skip validate+lock; modify `.oxn` after lock; legacy syntax (`align|inject|noun|verb|new`).
