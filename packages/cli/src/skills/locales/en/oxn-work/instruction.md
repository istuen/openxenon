# /oxn-work — Drive Work v1.1

## Objective
Create **Work + ≥1 Task**, 8-stage flow: `create → add-task → validate → lock → run → submit → finalize` (`migrate?` optional)

## Hard Rules
- `validate` → `lock` → `run` strict; no `--force`
- Post-lock drift = `HASH_MISMATCH`; OXN never commits / pushes
- Part / Probe inline within `task { part { probe {} } }`

## Paradigm
D = business intent | B = technical intent | W = align orchestrator | T = align execution

## Execution
1. Prereq: project `oxn init`-ed, **required Assets (domain/blueprint/stack) ready** — to create/modify Assets, **trigger `oxn-asset` Skill** (this Skill does NOT manage Asset lifecycle)
2. Fork `assets/work-{explore,develop,fix,onboarding}.md` → rename to `work.oxn`
3. Templates are complete .md samples, directly parseable by `WorkCompiler.parse()` (not OXL code-block documentation)
4. Run 8 stages: `references/8-phase-detail.md`
5. On error: `references/error-codes.md`

## Blueprint Selection
| Need | Template (.md containing OXN code block) → Blueprint |
|---|---|
| Explore / report | `assets/work-explore.md` → `explore-analyze-report` |
| Single-domain dev | `assets/work-develop.md` → `dev-workflow` |
| Bug fix | `assets/work-fix.md` → `fix-issue` |
| Cross-domain | `assets/work-onboarding.md` → `dev-workflow` (multi-domain) |

> v0.7+: Work has no modes (task/explore/edit); behavior differences are carried by Blueprint slots/observe.

## Key Errors
`LOCK_NOT_FOUND` / `HASH_MISMATCH` → YIELD | `TASK_OXN_MISSING` → `add-task` | `ROUND_ALREADY_PASSED` → `work finalize`

## Don'ts
Skip validate+lock; modify `.oxn` after lock; deprecated syntax (`align|inject|noun|verb|new`).
