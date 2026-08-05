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
| **MD authoring** (v0.7+ ADR-0089) | — → `md-author-blueprint` |

> v0.7+: Work no longer has mode (task/explore/edit); behavior differences carried by Blueprint slots/observe.
> v0.7+: MD authoring scenario uses `md-author-blueprint` (one of 5 starter Assets).

## Execution (v0.7+ AssetMap-driven Asset selection)

1. **Prereq**: project initialized via `oxn init`; required Assets ready — to create/modify Assets, **invoke `oxn-asset` Skill**.
2. **First-time project onboarding (v0.7+ ADR-0089)**: when project hasn't bootstrapped 5 starter Assets, trigger `oxn onboard` flow:
   - Run `oxn onboard --detect --json` (detection, side-effect-free)
   - Parse detection result → list 3 option cards (`A` new project / `B1` existing-Proof-First / `B2` existing-bootstrap)
   - **Wait for engineer confirmation** (do not auto-decide)
   - Execute chosen `oxn onboard --new` / `--existing --proof-first` / `--existing --bootstrap`
   - After bootstrap (`.openxenon/.bootstrap-done` marker exists), enter normal Work flow
3. **Query AssetMap for available Assets** (human/AI initiated, NOT auto-recommended):
   - `oxn assetmap show <map> --scene <scene>` — list Domain / Blueprint / Stack under scene (`<map>` defaults to `oxn-system`; project consumers can create `<project>-system`)
   - `oxn assetmap suggest --goal "<goal>" --scene <scene>` — jaccard keyword ranking candidates
4. **Human analysis, pick from suggest results**:
   - **Blueprint** — 1..N pipelines (typically 1; multiple blueprints for cross-phase different pipelines)
   - **Domain** — 1..N (Work-level declaration, provides global vocabulary; Task level picks exactly 1)
   - **Stack** — 0..N (Work-level tech-stack constraints; not injected into Task layer)
5. **Fork template + edit work.md** (or pass via `oxn work create`):
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
6. **Run 8 phases**: `references/8-phase-detail.md`
7. **Errors**: `references/error-codes.md`

## Multiple Assets and Tasks relationship

- **Work-level `## Refs`**: declare `domain[]` + `blueprint[] + `stack[]` ref pool (N items)
- **Task-level**: each task picks **single** 1 blueprint + 1 domain in `task.oxn` (subset of Work-level ref pool)
- **add-task validation**: task's chosen blueprint/domain **must** exist in Work-level ref pool (`add-task` errors with `not declared in work`)
- **planLock impact**: Work-level multi-refs cause `domains.json` / `blueprints.json` slim index to contain N entries; hash algorithm unchanged (hash the whole .json file)

## Errors
`LOCK_NOT_FOUND`/`HASH_MISMATCH` → YIELD | `TASK_OXN_MISSING` → `add-task` | `ROUND_ALREADY_PASSED` → `work finalize`

## Prohibitions
Skip validate+lock; modify `.oxn` after lock; legacy syntax (`align|inject|noun|verb|new`).

## v0.7+ Onboarding Trigger Rules (ADR-0089 D6)

**Trigger conditions**: when user input contains any of these keywords, run onboard first before deciding next step:
- "use OXN to onboard me", "onboard me with OXN", "set up OXN", "add OXN"
- "quickstart", "getting started", "5-minute setup"
- "use OXN in my project", "integrate OXN"

**Skill internal execution flow**:
```
1. Call `oxn onboard --detect --json` (detection, no side effects)
2. Parse returned data:
   - projectType: 'new' | 'existing-empty' | 'existing-initialized' | 'existing-completed'
   - recommendation.path: 'A' | 'B1' | 'B2'
3. List 3 option cards in UI + current recommendation
4. **Must wait for engineer confirmation** (do not auto-decide)
5. Execute engineer-chosen subcommand:
   - 'A' → `oxn onboard --new`
   - 'B1' → `oxn onboard --existing --proof-first`
   - 'B2' → `oxn onboard --existing --bootstrap`
6. After bootstrap completion, enter normal Work flow
```

**Prohibited**: skip detect and directly choose path; make engineer's decisions autonomously.
