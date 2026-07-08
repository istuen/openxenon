# Anti-Patterns (v1.1)

> This file is the on-demand supplement to `SKILL.md`. Consult during code review or troubleshooting.

## Runtime Anti-Patterns

| Anti-Pattern | Consequence | Fix |
|---|---|---|
| Skip validate+lock and go straight to run | Triggers `IAP_ALIGN_LOCK_NOT_FOUND` | Run the full 5→6 steps (validate → lock → run) |
| Bypass lock guard for production | No `--force` backdoor exists | Always go through the lock flow |
| Modify .oxn after locking | Triggers `IAP_ALIGN_LOCK_HASH_MISMATCH` (planLock has frozen the 4-component hash) | First `oxn work unlock`, then modify, then `validate → lock` |
| Delete .work file | Loses static gate card = `LOCK_NOT_FOUND` | Never delete; OXN will not auto-recover |
| Submit before run | `work run` is setup, `submit` is advance | Strict order: run → submit |
| Skip task creation | `work run` fails fast (`OXN_TASK_OXN_MISSING`) | First run `oxn work add-task` |
| work.oxn references task names that don't exist | `work run` validation fails | Align task blocks with `task` list in work.oxn |

## Conceptual Confusion Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Confuse `ref` with `align` | `domain "X" ref "..."` is a work-level declaration; `domain "X"` inside a task is align |
| Put `part` fields outside a task block | part must be nested inside a task block |

## Deprecated Syntax (Removed in v1.0+)

| Deprecated | Replace With |
|---|---|
| `task "X" align "Y.Z"` | `task "X" { blueprint "Y"; part "Z" }` |
| `inject "X"` | `domain "X"` inside task |
| Domain `noun` / `verb` / `domain_rules` | `term` / `ban` / `invariant` |
| Blueprint `expectation` / `rule` blocks | Removed; validation is handled by Probe |
| `work "X" ref "@oxn/blueprints/Y"` | `blueprint "Y" ref "...";` declaration |
| `oxn work new` | `oxn work create` |
| `oxn part new` / `oxn probe new` | Part / Probe **are not standalone assets**; write inline within task blocks |
