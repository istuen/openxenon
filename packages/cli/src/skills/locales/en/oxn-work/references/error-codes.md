# v1.1 Error Handling Quick Reference

> This file is the on-demand supplement to `SKILL.md`. Consult when errors occur.
>
> Full error code definitions: `src/core/errors/iap-error.ts`.

## Error Code Quick Reference

| Error Code | Trigger Condition | Action |
|---|---|---|
| `IAP_ALIGN_CHECKLIST_MISSING` | task.part.intent_checklist required but missing | YIELD_TO_HUMAN |
| `IAP_ALIGN_LOCK_NOT_FOUND` | .work.planLock missing / not locked | YIELD_TO_HUMAN: `oxn work lock` not called / init missing |
| `IAP_ALIGN_LOCK_HASH_MISMATCH` | One of the 4-component hashes drifted (workOxn/workDomains/blueprints/tasks) | YIELD_TO_HUMAN: check `context.component` field to locate drift source |
| `IAP_ALIGN_WORK_REMOVED` | work directory deleted / work.oxn missing (regardless of .work status) | YIELD_TO_HUMAN (distinct from `WORK_NOT_FOUND`: work never existed) |
| `OXN_ROUND_ALREADY_PASSED` | Already PASSED, but `next-round` called again | YIELD_TO_HUMAN: call `oxn work finalize` to close |
| `OXN_ROUND_VERDICT_INVALID` | `--verdict` value not in PASSED/FAILED/INCONCLUSIVE | Fix the command flag |
| `OXN_TASK_OXN_MISSING` | task.oxn not found at `work run` time | Call `oxn work add-task` |
| `WORK_NOT_FOUND` | work was never created | Call `oxn work create` |

## Trio Guard Order

When executing `work run` / `work submit` / `work status`, OXN Engine checks strictly in this order:

1. **First check planLock exists** — missing throws `IAP_ALIGN_LOCK_NOT_FOUND`
2. **Then check 4-component hash** — drift throws `IAP_ALIGN_LOCK_HASH_MISMATCH` (the `context.component` field points to the drift source: `workOxn` / `workDomains` / `blueprints` / `tasks`)
3. **Finally check work.oxn exists** — missing throws `IAP_ALIGN_WORK_REMOVED`

## Troubleshooting After Lock

```
Error IAP_ALIGN_LOCK_HASH_MISMATCH
   │
   ▼
Read the context.component field
   │
   ├─ workOxn       → work.oxn itself was modified (should not be; unlock first, then modify)
   ├─ workDomains   → domain.oxn drift (unlock → modify domain → re-lock)
   ├─ blueprints    → blueprint.oxn drift (same as above)
   └─ tasks         → task.oxn drift (same as above)
```

## YIELD_TO_HUMAN Boundary

> OXN will not auto-fix any planLock drift. Once the hash is frozen, modifying an asset must go through the `unlock → modify → validate → lock` flow. This is a hard constraint of the v1.1 design, **with no `--force` backdoor**.
