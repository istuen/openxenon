# 8-Stage Flow Details (v1.1)

> This file is the on-demand supplement to `SKILL.md`. Consult when executing actual `oxn work` stages.

## 8-Stage Overview

```
migrate? → create → add-task → validate → lock → run → submit → status → finalize
                                       │        │
                                       ▼        ▼
                                  .work       .work.planLock
                                 static gate   4-component hash
                                   card
```

- `migrate?` (step 0, optional): V0→V1 layout migration; skip for new works
- `create`: create work skeleton
- `add-task`: create at least 1 task.oxn
- `validate`: validate work.oxn + write `.work`
- `lock`: write planLock + 4-component hash
- `run`: start state machine (requires lock complete)
- `submit`: advance parts within task
- `status`: query work status
- `finalize`: close, aggregate all rounds + write final state

## Creating Work + Task (8-Step Example)

### Step 0 (V0→V1 Migration, Optional)

```bash
oxn work migrate <work-name>
# Migrate V0 layout works/<w>/work-state.json etc. to V1 layout .run/
# Original V0 files backed up to .migrated-v0/ (not deleted, left for audit)
```

### Step 1: Prerequisite (Create/Modify Assets — **OUT OF SCOPE for this Skill**)

> **Note**: This Skill does NOT manage Asset creation/modification. To create/modify Domain/Blueprint/Stack etc., trigger the **`oxn-asset` Skill** (it goes through `oxn work create --type asset --asset-kind X` for IAP closed loop).
>
> Assume Assets are already in place.

### Step 2: Create Work Orchestration

```bash
oxn work create <work-name> --blueprint <bp>
# Edit .openxenon/works/<work>/work.oxn
```

Or write manually:

```oxn
work "MyFeature" {
  context { goal = "..."; constraints = []; loop_policy { max_iterations = 3 } }
  domain "MemberContext"   ref "@prj/domains/MemberContext";
  blueprint "dev-workflow" ref "@prj/blueprints/dev-workflow";
  task "step1" {
    domain "MemberContext";
    blueprint "dev-workflow";
    part "build" { skill_context = "..." }
    deps = [];
  }
}
```

### Step 3: Create at Least One Task

```bash
oxn work add-task \
  --work <work-name> \
  --task-name <task-name> \
  --blueprint <blueprint-name> \
  [--domain <DomainName>]
```

### Step 4: Edit Task Content (write `task.oxn` manually)

### Step 5: `work validate`

```bash
oxn work validate <work-name> --json
# Validates work.oxn + writes .work static gate card (assets snapshot: domain/blueprint fileHash)
# planLock is null at this point (not locked)
```

### Step 6: `work lock`

```bash
oxn work lock <work-name> --json
# Computes 4-component hash:
#   workOxnHash      = SHA-256(work.oxn)
#   workDomainsHash  = SHA-256(concatenated domain.oxn files)
#   blueprintsHash   = SHA-256(concatenated blueprint.oxn files)
#   tasksHash        = SHA-256(concatenated task.oxn files)
# Writes .work.planLock + allHash
# After locking, any .oxn asset drift = IAP_ALIGN_LOCK_HASH_MISMATCH
```

`oxn work unlock` (unlock, clears planLock but retains assets)

### Step 7: Drive State Machine

```bash
oxn work run --work-file <work>/work.oxn --json
oxn work submit --work <w> --task <t> --json
oxn work status --work <w> --json
```

### RFC-0032 Phase 2/3 (0.6.4-alpha.0+): `oxn work finalize` removed

Work lifecycle now 4 steps: `create → lock → run → submit`.
Original Step 8 (`finalize` aggregating rounds + writing frozen.json) was removed in Phase 2 (it depended on `frozen/work-domains.ts`).
Reference: `.openxenon/drafts/design-mvp-convergence-grilling.md` and RFC-0032 §D10/D13.

## Reference Commands

| What you want to do | Command |
|---|---|
| Initialize project boundary | `oxn init` |
| Create Blueprint skeleton | `oxn blueprint create <name> [--slots <list>]` |
| Create Domain skeleton | `oxn domain create <Name>` |
| Validate Blueprint / Domain | `oxn {blueprint,domain} validate <name>` |
| List all Domains | `oxn domain list` |
| V0→V1 layout migration | `oxn work migrate <w>` |
| Create work skeleton (with task block) | `oxn work create <w> --blueprint <bp>` |
| List all tasks under a work | `oxn work list-tasks --work <w>` |
| View task status | `oxn work task-status --work <w> --task <t>` |
| Get AI context (full isolation) | `oxn work context --work <w> --task <t>` |
| Validate work.oxn + write .work | `oxn work validate <w>` |
| Lock work (planLock + 4-component hash) | `oxn work lock <w>` |
| Unlock work | `oxn work unlock <w>` |
| Start work state machine | `oxn work run --work-file <work.oxn>` |
| Advance parts within task | `oxn work submit --work <w> --task <t>` |
| Query work status | `oxn work status --work <w>` |

## Pattern Selection Quick Reference

| Your Need | Choose Pattern | Key Indicator | Template |
|---|---|---|---|
| Explore a domain, write a report | Pattern 1 (explore) | 1 task + 1 blueprint slot | `assets/work-explore.oxn` |
| Single-domain full development | Pattern 2 (develop) | 1 task with multiple parts (= blueprint multiple slots) | `assets/work-develop.oxn` |
| Bug fix, process-driven diagnosis | Pattern 3 (fix) | N tasks with serial deps | `assets/work-fix.oxn` |
| Cross multiple bounded contexts | Pattern 4 (onboarding) | N domains at work level + task injects as needed | `assets/work-onboarding.oxn` |
