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
1. Prereq: `oxn init` + `.openxenon/assets/blueprints/*.oxn`
2. Fork `assets/work-{explore,develop,fix,onboarding}.md` → rename to `work.oxn`
3. Templates are complete .md samples, directly parseable by `WorkCompiler.parse()` (not OXL code-block documentation)
4. Run 8 stages: `references/8-phase-detail.md`
5. On error: `references/error-codes.md`

## Patterns
| Need | Template (.md containing OXN code block) |
|---|---|
| Explore / report | `assets/work-explore.md` |
| Single-domain dev | `assets/work-develop.md` |
| Bug fix | `assets/work-fix.md` |
| Cross-domain | `assets/work-onboarding.md` |

## Key Errors
`LOCK_NOT_FOUND` / `HASH_MISMATCH` → YIELD | `TASK_OXN_MISSING` → `add-task` | `ROUND_ALREADY_PASSED` → `work finalize`

## Don'ts
Skip validate+lock; modify `.oxn` after lock; deprecated syntax (`align|inject|noun|verb|new`).
