# V0→V1 Path Mapping

> This file is the on-demand supplement to `SKILL.md`. **Load only when migrating legacy projects.**
>
> v1.1 moves work runtime state from the same directory as work.oxn into the `.run/` subdirectory, making it easier for the lock guard to write static cards.

## Path Mapping Table

| V0 Path | V1 Path |
|---|---|
| `works/<w>/work-state.json` | `works/<w>/.run/state.json` |
| `works/<w>/work-trace.jsonl` | `works/<w>/.run/trace.jsonl` |
| `works/<w>/work-frozen.json` | `works/<w>/.run/frozen.json` |
| `works/<w>/tasks/<t>/task-state.json` | `works/<w>/tasks/<t>/state.json` |
| `works/<w>/tasks/<t>/task-trace.jsonl` | `works/<w>/tasks/<t>/trace.jsonl` |
| `works/<w>/tasks/<t>/task-frozen.json` | `works/<w>/tasks/<t>/frozen.json` |
| (none) | `works/<w>/.work` (static gate card) |
| (none) | `works/<w>/.migrated-v0/<rel>` (V0 backup) |

## Compact Expression (grep pattern)

- V0: `works/<w>/work-{state,trace,frozen}.{json,jsonl}`
- V1: `works/<w>/.run/{state,trace,frozen}.{json,jsonl}`

## Migration Command

```bash
oxn work migrate <work-name>
# Migrate V0 layout works/<w>/work-state.json etc. to V1 layout .run/
# Original V0 files backed up to .migrated-v0/ (not deleted, left for audit)
```

Migration tool features:
- **Does not delete original files**: backed up to `works/<w>/.migrated-v0/<rel>` for audit
- **Idempotent**: re-runnable, won't damage V1 files
- **Skip for new works**: works without V0 paths go straight to V1 flow
