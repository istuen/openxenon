# v1.3 Error Handling Quick Reference (RFC-0033 D2 PlanLock retired)

> This file is the on-demand supplement to `SKILL.md`. Consult when errors occur.
>
> Full error code definitions: `src/core/errors/iap-error.ts`.

## Error Code Quick Reference

| Error Code | Trigger Condition | Action |
|---|---|---|
| `IAP_ALIGN_CHECKLIST_MISSING` | task.part.intent_checklist required but missing | YIELD_TO_HUMAN |
| `OXN_WORK_NOT_STARTED` | submit before run | First run `oxn work run <name>` |
| `OXN_WORK_NOT_FOUND` | work never created | Call `oxn work create` |
| `OXN_TASK_OXN_MISSING` | task.md not found at `work run` time | Call `oxn work add-task` |
| `OXN_TASK_NOT_FOUND` | submit's task name doesn't exist | Fix `--task` flag |
| `OXN_INTENT_CONTEXT_MISSING` | context.md missing at run --validate-only | Write `works/<w>/context.md` |
| `OXN_INTENT_SCOPE_VIOLATION` | Task Artifact out-of-bounds Blueprint Scope | Fix Task `## Artifacts` section (don't modify Blueprint Scope) |
| `OXN_CLI_INPUT_ERROR` | `oxn work inject` with no flag | Add `--paths` / `--context` / `--memory` |

🗑️ **Retired error codes** (v1.3 RFC-0033 D2):
- `IAP_ALIGN_LOCK_NOT_FOUND` — PlanLock retired, no lock required
- `IAP_ALIGN_LOCK_HASH_MISMATCH` — PlanLock retired, hash drift doesn't block
- `IAP_ALIGN_WORK_REMOVED` — PlanLock retired, work.md missing goes to `OXN_WORK_NOT_FOUND`

🗑️ **Retired error codes** (v1.2 RFC-0032 D6):
- `OXN_ROUND_ALREADY_PASSED` — Round retired
- `OXN_ROUND_VERDICT_INVALID` — Round verdict retired

## Error Debugging Flow

When executing `work run` / `work submit`, OXN Engine checks in this order:

1. **work directory + work.md exist** — missing throws `OXN_WORK_NOT_FOUND`
2. **work.md syntax + DAG + refs** — fail throws `OXN_WORK_VALIDATE_FAILED` / `OXN_INTENT_*`
3. **.run/state.json exists** (submit only) — missing throws `OXN_WORK_NOT_STARTED`

🗑️ RFC-0033 D2 retired planLock guards; work.md freely modifiable, hash drift only records ASSET_DRIFT event (not blocking).

## Drift Observability (DRIFT · RFC-0033 D4)

```
Workflow:
  1. Modify work.md (legal operation)
  2. oxn work submit <w> --task <t>
  3. submit internal: call hashWorkPlan to compute workMdHash
  4. Read trace.jsonl last SUBMIT's previousHash
  5. Mismatch → append ASSET_DRIFT event (does NOT block submit)
  6. Append SUBMIT event (with new workMdHash + probeResult)

Observable signals:
  - trace.jsonl contains event='ASSET_DRIFT' events
  - submit output data.drift = { component, previousHash, currentHash }
  - Multiple DRIFTs = Blueprint or AI encountered issues (human review)
```

## YIELD_TO_HUMAN Boundary

> OXN does NOT auto-fix any errors. Once an error is triggered, engineer decides the path:
> - `OXN_INTENT_*` → modify work.md / context.md / task.md content
> - `OXN_TASK_*` → call add-task / edit-task
> - `OXN_WORK_NOT_*` → re-create or re-run
>
> v1.3 **provides no `--force` backdoor**. All errors require engineer decision on fix path.