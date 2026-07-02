# /oxn-work — Launch and Drive OpenXenon Work v1.1

## Objective

Create a **Work + at least one Task** workspace based on a Blueprint, and after the v1.1 hard-switch, enforce the 8-stage flow:
- `work.oxn` — workspace orchestrator (declares ref pool + task DAG; v0.6 primary, asset format = oxn)
- `work.md` — MD mirror of the same work (v0.6 auto-sync, located in the same directory as work.oxn at `assets/works/<w>/`, regenerated whenever work.oxn changes)
- `tasks/<name>/task.oxn` — single blueprint execution + explicit alignment

> v0.6 dual-track: `.oxn` is the source of truth; `.md` is a human-readable mirror. Editing either triggers `oxn work sync` to reconcile the other.
> Mirrors the dual-track design of domain / blueprint / stack (`assets/{kind}/<name>.oxn` + `<name>.md`) — see v0.6 RFC §3 Unified Paradigm.

After the v1.1 hard-switch, the original `oxn-leader` has been merged into `oxn work`; there is no standalone leader skill.

> **v1.1 upgrade highlights**: All work operations must first `work validate` to write the `.work` static gate card, then `work lock` to lock, and only then can `work run` be executed. After locking, any `.oxn` asset drift = `IAP_ALIGN_LOCK_HASH_MISMATCH`.

## Prerequisites

- Already in the OXN project root directory
- Project has been initialized with `oxn init` (`.openxenon/` boundary exists)
- Must have a Blueprint (located at `.openxenon/assets/blueprints/<name>.oxn`, v0.6 layout; fallback to `.openxenon/blueprints/` for legacy), created with `oxn blueprint create`
- **Optional**: Have a DDD Domain (located at `.openxenon/assets/domains/<kebab>.oxn`, v0.6 layout; fallback to `.openxenon/domains/` for legacy), created with `oxn domain create`

## Intent-Align Paradigm Reminder (v0.6 E1–E4 dual-layer narrative)

**v0.6 philosophical boundary** (post-refactor):

> **Engineers define intent, AI runs alignment, OXN produces proof.**

Four structural entities (E1–E4):

- **E1 Domain** = Business constraint hard boundary (term / ban / invariant; the business truth of business IAP)
- **E1 Blueprint** = Technical constraint hard boundary (slot topology; the technical feasibility of technical IAP)
- **E2 Work** = Align orchestrator (declares ref pool + task DAG; orchestrates business + technical constraints into multi-round alignment workflows)
- **E3 Task** = Align execution unit (aligns 1 blueprint + N domains + M parts)
- **E3 Part** = Align iteration step (each part contains intent_checklist + skill_context + optional probe)
- **E4 Insight** = Emergent layer (cross-work synthesis reasoning; outside current Work scope)

Engineering layers (L0–L3):

- **L0 Schema/Contract/Processor** — pure types and verdict functions (no IO)
- **L1 Infra/OXL** — IO execution and document parsing
- **L2 Builtin/Work** — business modules
- **L3 CLI/Daemon/Hall/Skills/Watcher** — user / process interfaces

> The legacy IAP three-axis narrative (Intent-Align-Proof) has been replaced by the E1-E4 four-structure model; Round snapshots are retained as the Align stage's iteration unit (v0.6 RFC §2.3).

Asset details:

- **Part / Probe** = **Not standalone assets**, **inline** within `task { part { probe {} } }` blocks

## v1.1 8-Stage Flow Chart

```
init → migrate → create → add-task → validate → lock → run → submit → finalize
                                              │         │
                                              ▼         ▼
                                          .work      .work.planLock
                                        static gate   4-component hash
                                         card        (workOxn/workDomains/
                                                      blueprints/tasks +
                                                      allHash)
                                                      Any drift after lock →
                                                      IAP_ALIGN_LOCK_HASH_MISMATCH
```

**8-Stage Details**:
- **0**: `oxn work migrate` (V0→V1 layout migration, PR-10; skip for new works)
- **1**: `oxn work create` (create work skeleton)
- **2**: `oxn work add-task` (create at least 1 task.oxn)
- **3**: `oxn work validate` (validate work.oxn + write `.work`)
- **4**: `oxn work lock` (lock: write planLock + 4-component hash)
- **5**: `oxn work run` (start state machine; requires lock complete)
- **6**: `oxn work submit` (advance parts within task)
- **7**: `oxn work status` (query work status)
- **8**: `oxn work finalize` (close: aggregate all rounds + write final state)

## Creating Work + Task (v1.1 8 Steps)

### Step 0 (V0→V1 Migration, Optional): `oxn work migrate`

```bash
oxn work migrate <work-name>
# Migrate V0 layout works/<w>/work-state.json etc. to V1 layout .run/
# Original V0 files backed up to .migrated-v0/ (not deleted, left for audit)
```

### Step 1: Create Domain (Optional)

```bash
oxn domain create MemberContext
oxn domain validate MemberContext
```

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

## Reference Commands

| What you want to do | Command |
|---|---|
| Initialize project boundary | `oxn init` |
| Create a Blueprint skeleton | `oxn blueprint create <name> [--slots <list>]` |
| Create a Domain skeleton | `oxn domain create <Name>` |
| Validate Blueprint / Domain | `oxn {blueprint,domain} validate <name>` |
| List all Domains | `oxn domain list` |
| **v1.1 V0→V1 layout migration** | `oxn work migrate <w>` |
| Create work skeleton (with task block) | `oxn work create <w> --blueprint <bp>` |
| List all tasks under a work | `oxn work list-tasks --work <w>` |
| View task status | `oxn work task-status --work <w> --task <t>` |
| Get AI context (**full isolation**) | `oxn work context --work <w> --task <t>` |
| **v1.1 validate work.oxn + write .work** | `oxn work validate <w>` |
| **v1.1 lock work (planLock + 4-component hash)** | `oxn work lock <w>` |
| **v1.1 unlock work** | `oxn work unlock <w>` |
| Start work state machine | `oxn work run --work-file <work.oxn>` |
| Advance parts within task | `oxn work submit --work <w> --task <t>` |
| Query work status | `oxn work status --work <w>` |

## V0→V1 Path Mapping

v1.1 moves work runtime state from the same directory as work.oxn into the `.run/` subdirectory, making it easier for the lock guard to write static cards:

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

More compact expression (grep pattern):
- V0: `works/<w>/work-{state,trace,frozen}.{json,jsonl}`
- V1: `works/<w>/.run/{state,trace,frozen}.{json,jsonl}`

Migration tool: `oxn work migrate <w>` (V0 backed up to `.migrated-v0/` for audit, not deleted).

## v1.1 Error Handling Quick Reference

| Error Code | Trigger Condition | Action |
|---|---|---|
| `IAP_ALIGN_CHECKLIST_MISSING` | task.part.intent_checklist required but missing | YIELD_TO_HUMAN |
| `IAP_ALIGN_LOCK_NOT_FOUND` | .work.planLock missing / not locked | YIELD_TO_HUMAN: `oxn work lock` not called / init missing |
| `IAP_ALIGN_LOCK_HASH_MISMATCH` | One of the 4-component hashes drifted (workOxn/workDomains/blueprints/tasks) | YIELD_TO_HUMAN: check context.component field to locate drift source |
| `IAP_ALIGN_WORK_REMOVED` | work.oxn missing but .work still exists (destroyed after lock) | YIELD_TO_HUMAN (distinct from WORK_NOT_FOUND: both are absent) |
| `OXN_ROUND_ALREADY_PASSED` | Already PASSED, but `next-round` called again | YIELD_TO_HUMAN: call `oxn work finalize` to close |
| `OXN_ROUND_VERDICT_INVALID` | `--verdict` value not in PASSED/FAILED/INCONCLUSIVE | Fix the command flag |

Trio guard order: first check planLock exists → then check 4-component hash → finally check work.oxn exists.

## Anti-Patterns

- **Do not skip validate+lock and go straight to run** — triggers `IAP_ALIGN_LOCK_NOT_FOUND`
- **Do not bypass lock guard for production** — no `--force` backdoor
- **Do not modify .oxn after locking** — triggers `IAP_ALIGN_LOCK_HASH_MISMATCH` (planLock has frozen the 4-component hash)
- **Do not delete .work file** — losing the static gate card = LOCK_NOT_FOUND
- **Do not submit before run** — `work run` is setup, `submit` is advance
- **Do not skip task creation** — `work run` will fail-fast ( `OXN_TASK_OXN_MISSING` )
- **Do not reference task names in work.oxn that don't exist in task.oxn** — `work run` validation fails
- **Do not confuse ref with align** — `domain "X" ref "..."` is a work-level declaration, `domain "X"` inside a task is align
- **Do not put `part` fields outside a task block** — part must be nested inside a task block
- **Do not write `task "X" align "Y.Z"`** — deprecated, use `task "X" { blueprint "Y"; part "Z" }` instead
- **Do not write `inject "X"`** — deprecated, use `domain "X"` inside task instead
- **Do not use `noun`/`verb`/`domain_rules` in Domain** — use `term`/`ban`/`invariant` instead
- **Do not add `expectation`/`rule` blocks in Blueprint** — removed, validation is handled by Probe
- **Do not write `work "X" ref "@oxn/blueprints/Y"`** — deprecated, use `blueprint "Y" ref "...";` declaration
- **Do not write `oxn work new`** — use `oxn work create` instead
- **Do not attempt `oxn part new` / `oxn probe new`** — Part / Probe **are not standalone assets**, write inline within task blocks

## .work Static Gate Card (v1.1 New)

**v1.1 New** `.work` static gate card: planLock (4-component hash) + assets (domain/blueprint fileHash) + context (goal/constraints/maxIterations) + diagnostics (PR-14 soft warnings). Written once, read-only afterwards.

```json
{
  "planLock": {
    "workOxnHash":     "64-hex SHA-256",
    "workDomainsHash": "64-hex SHA-256",
    "blueprintsHash":  "64-hex SHA-256",
    "tasksHash":        "64-hex SHA-256",
    "allHash":          "64-hex SHA-256 (4-component composite)"
  },
  "assets": { "domains": [...], "blueprints": [...] },
  "context": { "goal": "...", "constraints": [...], "maxIterations": 5 }
}
```

Inside `planLock`, `workOxnHash` / `workDomainsHash` / `blueprintsHash` / `tasksHash` / `allHash` together with the 4-component hash serve as the lock guard.

## work.oxn 4 Major Patterns (AI Creation Template Library)

> The 4 patterns below correspond to real examples under `src/oxl/examples/works/`; fork and adapt directly.

### Pattern 1: Single Domain, Single Task (explore category)

**Applies to**: Exploratory work (understanding a domain's structure / gathering information), no full pipeline needed.

**Skeleton** (reference `examples/works/explore-dsl/work.oxn`):

```oxn
work "explore-dsl" {
  context {
    goal = "Explore OXL grammar structure, generate analysis report"
    constraints = ["Use oxn commands instead of reading source directly"]
    loop_policy { max_iterations = 3 }
  }
  domain "DSLContext" ref "@prj/domains/dsl-context"
  blueprint "explore-analyze-report" ref "@prj/blueprints/explore-analyze-report"

  task "explore" {
    domain "DSLContext"
    blueprint "explore-analyze-report"
    deps = []
    part "explore" {
      skill_context = "Explore four sub-modules: grammar/schema/validator/compiler"
      acceptance = [
        "Read src/oxl/langium-driver/oxn.langium",
        "Successfully compiled an example using oxn dev compile",
        "Output .openxenon/works/<w>/report.md"
      ]
    }
  }
}
```

**Mnemonic**: 1 work + 1 task + 1 domain + 1 blueprint (slot count = task count).

### Pattern 2: Single Domain, Multiple Parts (develop category)

**Applies to**: In-depth development within a single domain (complete implementation inside one bounded context).

```oxn
work "develop-member" {
  context {
    goal = "Implement new member registration feature"
    constraints = [
      "Must use MemberContext.term.Member, not User/Customer",
      "Passwords must be hashed before storage"
    ]
    loop_policy { max_iterations = 5 }
  }
  domain "MemberContext" ref "@prj/domains/member-context"
  blueprint "dev-workflow" ref "@prj/blueprints/dev-workflow"

  task "register-member" {
    domain "MemberContext"
    blueprint "dev-workflow"
    deps = []
    part "develop" { skill_context = "Implement Member registration feature" }
    part "test"    { skill_context = "Write unit tests for Member registration" }
    part "verify"  { skill_context = "End-to-end verification of registration flow" }
  }
}
```

**Mnemonic**: 1 work + 1 task (with multiple parts, aligned with multiple blueprint slots) + 1 domain. Part count = Blueprint slot count.

### Pattern 3: Multi-Task Serial (fix category)

```oxn
work "fix-issue" {
  context {
    goal = "Fix bug where work state is not persisted in time after submit"
    constraints = ["Do not break existing leader state machine", "frozen.json path must not change"]
    loop_policy { max_iterations = 5 }
  }
  domain "WorkContext" ref "@prj/domains/work-context"
  blueprint "fix-issue" ref "@prj/blueprints/fix-issue"

  task "diagnose" { domain "WorkContext"; blueprint "fix-issue"; deps = []
    part "diagnose" { skill_context = "Reproduce bug, record the scene" }
  }
  task "locate"   { domain "WorkContext"; blueprint "fix-issue"; deps = ["diagnose"]
    part "locate" { skill_context = "Identify root cause" }
  }
  task "fix"      { domain "WorkContext"; blueprint "fix-issue"; deps = ["locate"]
    part "fix" { skill_context = "Implement fix" }
  }
  task "verify"   { domain "WorkContext"; blueprint "fix-issue"; deps = ["fix"]
    part "verify" { skill_context = "Verify fix result" }
  }
}
```

**Mnemonic**: N tasks with chained `deps`, each task aligns a different slot of the same blueprint. Domain is shared.

### Pattern 4: Cross-Domain Orchestration (onboarding category)

```oxn
work "NewUserOnboarding" {
  context {
    goal = "Complete new member registration and distribute welcome benefits"
    constraints = ["Cannot directly read the order database", "Must call Order context capabilities"]
    loop_policy { max_iterations = 5 }
  }

  domain "MemberContext"  ref "@prj/domains/MemberContext"
  domain "OrderContext"   ref "@prj/domains/OrderContext"
  blueprint "dev-workflow" ref "@prj/blueprints/dev-workflow"

  task "RegisterMember" {
    domain "MemberContext"
    blueprint "dev-workflow"
    deps = []
    part "develop" {
      skill_context = "Implement Member registration API, password must be encrypted"
    }
  }
}
```

**Mnemonic**: Declare N domains at the work level, each task injects 1 as needed; inside a domain, use the `term / ban / invariant` trio to express a unified language and hard rules; for `invariant` writing decisions (1 rule → single block single line / same topic → single block multiple lines / different topics → multiple blocks grouped by `// ── <topic> ──`), see the oxn-cli skill's "invariant writing decision tree" section — all three are IR-equivalent.

### Pattern Selection Quick Reference

| Your Need | Choose Pattern | Key Indicator |
|---|---|---|
| Explore a domain, write a report | Pattern 1 (explore) | 1 task + 1 blueprint slot |
| Single-domain full development | Pattern 2 (develop) | 1 task with multiple parts (= blueprint multiple slots) |
| Bug fix, process-driven diagnosis | Pattern 3 (fix) | N tasks with serial deps |
| Cross multiple bounded contexts | Pattern 4 (onboarding) | N domains at work level + task injects as needed |

## Git Workspace Guide (v0.0.27+)

OXN provides a **builtin `git-workflow` blueprint** (`src/builtin/blueprints/git-workflow.oxn`) in git worktree scenarios, with all 4-phase slots connected to the L1 git adapter (`src/infra/git/workspace.ts`) + 4 catalog probes (`git-clean` / `git-branch-exists` / `git-status-clean` / `git-merge-feasible`).

**Core boundary**: **OXN never commits / pushes / merges on behalf of humans.** It only observes and produces mergeability evidence for humans to consume when running `git merge`.

### Derived Builtin Blueprint (Standard cp Convention, v0.6 path)

```bash
oxn init
# v0.6.1-alpha.0: builtin blueprint derivation aligned with v0.6 assets/ layout
mkdir -p .openxenon/assets/blueprints
cp src/builtin/blueprints/git-workflow.oxn .openxenon/assets/blueprints/git-workflow.oxn
chmod 644 .openxenon/assets/blueprints/git-workflow.oxn  # unlock from 0o444 lock state
oxn domain create ProgramContext          # Must include at least term: WorkingTree / Branch / MergeCommit
oxn blueprint validate git-workflow
```

### Integration with Work 8-Stage Flow (v0.6.1-alpha.0: create auto-generates task.oxn skeletons)

```bash
# v0.6.1-alpha.0 #3-3 fix: work create automatically generates tasks/<slot>/task.oxn skeleton per blueprint slot
oxn work create gw-feat-x --blueprint git-workflow
# After creation, .openxenon/works/gw-feat-x/ automatically contains:
#   work.oxn
#   tasks/init/task.oxn
#   tasks/build/task.oxn
#   tasks/verify/task.oxn
#   tasks/ship/task.oxn       (git-workflow has 4 slots = 4 task.oxn skeletons)
# Just edit the files to fill skill_context etc., **no need to run add-task manually**

# Manual add-task is still available (if you need to add more tasks later):
oxn work add-task gw-feat-x --task extra --blueprint git-workflow --domain ProgramContext

oxn work validate gw-feat-x --json
oxn work lock gw-feat-x --json
```

### Manual Git Operations (OXN Does Not Participate)

```bash
git worktree add -b feat/gw-feat-x ../wt-feat-x
cd ../wt-feat-x && $EDITOR files && git add -A && git commit -m "feat: ..."
cd -
oxn work run gw-feat-x --json
oxn work submit gw-feat-x --task ship --json          # 4 times (4 part = 4 slot)
oxn work status gw-feat-x --json                       # overallStatus = passed
oxn work finalize gw-feat-x --json                     # Finalize (added in v0.6.1) — write final status
```

### Obtaining Mergeability Evidence (Critical)

`oxn work context` does not expose `checkMergeFeasibility` (writing the workspace → violates the OXN boundary of not making decisions for humans). To obtain evidence, **call probes manually** or read the L1 adapter:

```bash
# E2E test demo (src/cli/__tests__/work-git-workspace-e2e.test.ts)
#  Calling checkMergeFeasibility(branch, 'main', worktreePath):
#    → can_ff_merge / can_merge_clean / has_conflicts / dirty_worktree / unknown
```

### Things Not Done

- ❌ `oxn work create --worktree` (Plan C, not implemented)
- ❌ OXN committing / merging for humans (philosophical boundary)
- ❌ Drift source `.oxn` after lock (won't trigger planLock — it locks per-work slim index `works/<w>/blueprints.json`)

### Further Reading

- Detailed design: `docs/architecture/git-workflow-workspace.md`
- 4 probe registration: `src/kernel/verdicts/catalog.ts:390-491`
- L1 adapter: `src/infra/git/workspace.ts:1-317`
- E2E end-to-end validation: `src/cli/__tests__/work-git-workspace-e2e.test.ts`
