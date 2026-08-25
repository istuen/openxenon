# Anti-Patterns (v1.3 · RFC-0033 minimized)

> This file is the on-demand supplement to `SKILL.md`. Consult during code review or troubleshooting.

## Runtime Anti-Patterns

| Anti-Pattern | Consequence | Fix |
|---|---|---|
| Skip run and go directly to submit | `submit` returns `OXN_WORK_NOT_STARTED` | Strict order: create → run → submit |
| Skip run --validate-only | Missing .work + blueprints.json assets snapshot; downstream consumers reading may fail | First `oxn work run <w> --validate-only`, then `oxn work run <w>` |
| Expect OXN to BLOCK work.md modifications | Will NOT block (RFC-0033 D4: DRIFT observable not blocking) | At submit, check trace.jsonl for ASSET_DRIFT event appended |
| Search for .work file | .work retired (RFC-0033 D5) | work.md is the source of truth for work existence |
| Search for oxn work lock/unlock/validate | Commands retired (RFC-0033 D2) | Use `oxn work run --validate-only` |

## Conceptual Confusion Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Mix ref with align | `domain "X" ref "..."` is work-level declaration; `domain "X"` inside task is align |
| Add `part` field outside task block | part must be nested in task block |

## Deprecated Syntax (removed since v1.0+)

| Deprecated | Replaced by |
|---|---|
| `task "X" align "Y.Z"` | `task "X" { blueprint "Y"; part "Z" }` |
| `inject "X"` | `domain "X"` inside task |
| Domain `noun` / `verb` / `domain_rules` | `term` / `ban` / `invariant` |
| Blueprint `expectation` / `rule` block | Removed; validation handled by Probe |
| `work "X" ref "@oxn/blueprints/Y"` | `blueprint "Y" ref "...";` declaration |
| `oxn work new` | `oxn work create` |
| `oxn work validate` | `oxn work run <w> --validate-only` (RFC-0033 D1) |
| `oxn work lock` / `oxn work unlock` | Retired (RFC-0033 D2; work.md freely modifiable) |
| `oxn part new` / `oxn probe new` | Part / Probe **not standalone assets**, inline in task block |