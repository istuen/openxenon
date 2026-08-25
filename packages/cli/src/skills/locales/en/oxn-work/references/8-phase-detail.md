# 3-Stage Flow Details (v1.3 · RFC-0033 minimized)

> This file is the on-demand supplement to `SKILL.md`. Consult when executing actual `oxn work` stages.

## 3-Stage Overview (RFC-0033 D1)

```
migrate? → create → run → submit → status
                    │       │
                    ▼       ▼
                 state    hash + DRIFT
                 machine  (observable not blocking)
```

- `migrate?` (optional): V0→V1 layout migration; skip for new works
- `create`: create work skeleton
- `run [--validate-only]`: validate + start state machine
- `submit`: advance task part + compute workMdHash fingerprint + DRIFT detection
- `status`: query work status

🗑️ RFC-0033 D1/D2 removed: `validate` / `lock` / `unlock` / `add-task` (downgraded to helper, AI can edit work.md directly)

## Create Work + Task (3-step example)

### Step 0 (V0→V1 migration, optional)

```bash
oxn work migrate <work-name>
# Migrate V0 layout works/<w>/work-state.json etc to V1 layout .run/
# Backup V0 files to .migrated-v0/ (not deleted, kept for audit)
```

### Step 1: Prerequisite (create/modify Asset, **not in this Skill's scope**)

> **Note**: this Skill does NOT manage Asset creation/modification. To create/modify Domain/Blueprint/Stack, trigger **`oxn-asset` Skill**.
>
> Assume Assets are ready.

### Step 2: Create Work orchestration

```bash
oxn work create <work-name> --blueprint <bp>
# Edit .openxenon/works/<work>/work.md
```

Or write manually:

```oxn
work "MyFeature" {
  context { goal = "..."; constraints = []; loop_policy { max_iterations = 3 } }
  blueprint "dev-workflow" ref "@prj/blueprints/dev-workflow";
  task "step1" {
    blueprint "dev-workflow";
    part "build" { skill_context = "..." }
    deps = [];
  }
}
```

### Step 3: Create at least one Task (optional, AI can edit work.md ## Tasks directly)

```bash
oxn work add-task \
  --work <work-name> \
  --task-name <task-name> \
  --blueprint <blueprint-name>
```

### Step 4: Edit task content (manually write `task.md`)

### Step 5: `work run --validate-only` (replaces legacy `oxn work validate`)

```bash
oxn work run <work-name> --validate-only --json
# Validate work.md + write .work (assets snapshot: domain/blueprint fileHash; backward compatible)
# RFC-0033 D2: PlanLock deleted, no planLock field written
```

### Step 6: `work run` (start state machine)

```bash
oxn work run <work-name> --json
# RFC-0033 D2: lock not required; work.md freely modifiable
```

### Step 7: `work submit` (advance task + hash fingerprint + DRIFT detection)

```bash
oxn work submit <work-name> --task <task-name> --json
# RFC-0033 D3: at submit compute workMdHash → record in trace.jsonl SUBMIT event
# RFC-0033 D4: compare with previous SUBMIT workMdHash → mismatch append ASSET_DRIFT (not blocking)
```

### Step 8: `work status` (query state)

```bash
oxn work status <work-name> --json
# RFC-0033 D5: work.md is source of truth for work existence (.work file optional, backward compatible)
```

### Step 9 (Modify work.md / context.md)

```
🗑️ RFC-0033 D2: no unlock needed; work.md / context.md freely modifiable;
   next submit auto-detects hash change + records ASSET_DRIFT event.
```

## RFC-0032 + RFC-0033 Retirement Records
- **RFC-0032 D6**: Round model removed → `finalize` subcommand removed (depends on frozen.json)
- **RFC-0032 D10**: IAP retired to narrative layer
- **RFC-0032 D13**: Work tracks own process (trace records facts)
- **RFC-0032 D25**: Proof removed → PlanLock removed (RFC-0033 D2)
- **RFC-0032 D27**: Probe retained as Engine tool capability
- **RFC-0033 D1**: 3-step lifecycle create → run → submit
- **RFC-0033 D2**: PlanLock entirely removed
- **RFC-0033 D3**: hash redefined as submit-time completion fingerprint
- **RFC-0033 D4**: DRIFT observable not blocking
- **RFC-0033 D5**: `.work` single file removed (retained as backward-compatible assets snapshot)
- **RFC-0033 D6**: hash carrier = trace.jsonl (state.json doesn't store hash)

## Command Reference Table

| Want to | Command |
|---|---|
| Initialize project boundary | `oxn init` |
| Create Blueprint skeleton | `oxn blueprint create <name> [--slots <list>]` |
| Create Domain skeleton | `oxn domain create <Name>` |
| Validate Blueprint / Domain | `oxn {blueprint,domain} validate <name>` |
| List all Domains | `oxn domain list` |
| V0→V1 layout migration | `oxn work migrate <w>` |
| Create work skeleton (with task block) | `oxn work create <w> --blueprint <bp>` |
| List work's tasks | `oxn work list-tasks --work <w>` |
| View task status | `oxn work task-status --work <w> --task <t>` |
| Get AI context (full isolation) | `oxn work context --work <w> --task <t>` |
| Validate work.md + write .work (replaces legacy validate) | `oxn work run <w> --validate-only` |
| Start work state machine | `oxn work run <w>` |
| Advance task part + hash fingerprint + DRIFT detection | `oxn work submit <w> --task <t>` |
| Query work status | `oxn work status --work <w>` |

🗑️ **Retired commands** (v1.3): `oxn work validate` / `oxn work lock` / `oxn work unlock`

## Pattern Selection Quick Reference

| Your need | Choose pattern | Key marker | Template |
|---|---|---|---|
| Explore a domain, write report | Pattern 1 (explore) | 1 task + 1 blueprint slot | `assets/work-explore.md` |
| Single-domain full development | Pattern 2 (develop) | 1 task multiple parts (= blueprint multiple slots) | `assets/work-develop.md` |
| Bug fix, process diagnosis | Pattern 3 (fix) | N task serial deps | `assets/work-fix.md` |
| Cross-multiple bounded contexts | Pattern 4 (onboarding) | work-level N domain + task inject on demand | `assets/work-onboarding.md` |