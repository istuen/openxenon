---
title: Align axis
---

# Align axis

> The Align axis is AI's sovereignty. Within the boundaries drawn by Intent, AI orchestrates Work / Task / Part; engineers review; OXN constrains.

## What — Three-layer structure of the Align axis

| Entity | Responsibility |
|---|---|
| Work | Orchestrator: declares the ref pool (Domain / Blueprint references), arranges the task DAG |
| Task | Execution unit: 1 Blueprint + N Parts |
| Part | An execution step aligned with a Blueprint slot, containing `skill_context` + Probe |

```
Work
├── context { goal, constraints, loop_policy }
├── ref pool: domain "X" ref "..." / blueprint "Y" ref "..."
└── Task A
│   ├── domain + blueprint (align)
│   ├── Part "build"  { skill_context = "..." }
│   ├── Part "test"   { skill_context = "..." }
│   └── deps = []
└── Task B
    ├── domain + blueprint
    ├── Part "build"
    └── deps = ["Task A"]
```

---

## Work: orchestrator

Work is the space of "one complete job". It declares which Domain / Blueprint to use, and the dependency order between Tasks.

```oxn
work "<name>" {
  context {
    goal        = "..."
    constraints = ["..."]
    loop_policy { max_iterations = 3 }
  }

  // resource pool: declares Intent-side references
  domain    "<DomainName>"    ref "@prj/domains/<DomainName>"
  blueprint "<BlueprintName>" ref "@prj/blueprints/<BlueprintName>"

  // task orchestration
  task "<TaskName>" {
    domain    "<DomainName>"
    blueprint "<BlueprintName>"

    part "<slot-name>" { skill_context = "..." }
    part "<slot-name>" { skill_context = "..." }

    deps = ["<other-task>", ...]
  }
}
```

**scope addressing**:
- `@oxn`: built-in assets (`@oxn/probes/shell-exec`)
- `@prj`: in-project assets (`@prj/domains/MemberContext`)

---

## Task + Part: execution unit

Each Task aligns to multiple slots of 1 Blueprint (expressed through Parts). The `skill_context` inside a Part is the execution instruction AI sees; the Probe is the verification standard AI **cannot see**.

```oxn
task "RegisterMember" {
  domain "MemberContext"
  blueprint "dev-workflow"

  part "build" {
    skill_context = "Implement the Member registration API; passwords must be hashed"
    // probe { ... } — AI NOT visible
  }
  part "test" {
    skill_context = "Write unit tests for Member registration"
  }

  deps = []
}
```

**Information hiding**: AI sees only `skill_context`, not the Probe configuration inside the Part. This prevents AI from "optimizing against the verification standard" rather than actually solving the problem. See [Proof](./proof.md) for details.

---

## v1.1 8-stage flow

v1.1 introduces the `.work` static gate card + `planLock` mechanism. After lock, any `.oxn` asset drift triggers `IAP_ALIGN_LOCK_HASH_MISMATCH`.

```
create → add-task → validate → lock → run → submit → status
                      │         │
                      ▼         ▼
                   .work    .work.planLock
                static gate   4-component hash
                  card
```

### Step 1: Create work area

```bash
oxn work create <work-name> --blueprint <blueprint-name>
# Align axis
```

### Step 2: Add task

```bash
oxn work add-task \
  --work <work-name> \
  --task-name <task-name> \
  --blueprint <blueprint-name> \
  --domain <DomainName>
# Align axis
```

### Step 3: Validate (write .work gate card)

```bash
oxn work validate <work-name> --json
# Align axis
# Align axis
```

### Step 4: Lock (compute 4-component hash)

```bash
oxn work lock <work-name> --json
# Align axis
# Align axis
# Align axis
# Align axis
# Align axis
# Align axis
```

Any `.oxn` asset drift after lock = `IAP_ALIGN_LOCK_HASH_MISMATCH`. Unlock with `oxn work unlock <w>`.

### Step 5: Start run

```bash
oxn work run --work-file work.oxn --json
# Align axis
```

### Step 6: Advance Task

```bash
oxn work submit --work <w> --task <t> --json
# Align axis
```

### Step 7: Query status

```bash
oxn work status --work <w> --json
```

---

## .work static gate card

`validate` writes `.work`, `lock` writes `.work.planLock`:

```json
{
  "planLock": {
    "workOxnHash":     "sha256-hex",
    "workDomainsHash": "sha256-hex",
    "blueprintsHash":  "sha256-hex",
    "tasksHash":       "sha256-hex",
    "allHash":         "sha256-hex"
  },
  "assets": { "domains": [...], "blueprints": [...] },
  "context": { "goal": "...", "constraints": [...], "maxIterations": 5 }
}
```

---

## State machine

### Work state

```
CREATED → IN_PROGRESS → PASSED  (all tasks pass)
                      → FAILED   (any task fails)
```

### Task state

```
CREATED → RUNNING → PASSED  (all parts pass)
                  → FAILED   (any part fails)
```

Two-layer independent read/write, allowing per-layer recovery on fault. See the legacy [State Schema](./reference/state-schema.md) (old doc).

---

## 4 major Work patterns

### Pattern 1: Single domain, single task (exploration)

Use case: exploratory work — 1 work + 1 task + 1 domain + 1 blueprint.

```oxn
work "explore-dsl" {
  context { goal = "Explore OXL syntax structure"; loop_policy { max_iterations = 3 } }
  domain "DSLContext" ref "@prj/domains/dsl-context"
  blueprint "explore-analyze-report" ref "@prj/blueprints/explore-analyze-report"

  task "explore" {
    domain "DSLContext"
    blueprint "explore-analyze-report"
    deps = []
    part "explore" { skill_context = "Explore grammar/schema/validator modules" }
  }
}
```

### Pattern 2: Single domain, multiple parts (development)

Use case: deep development in a single domain — 1 task with multiple parts aligned to Blueprint's multiple slots.

```oxn
task "register-member" {
  domain "MemberContext"
  blueprint "dev-workflow"
  deps = []
  part "build"  { skill_context = "Implement Member registration" }
  part "test"   { skill_context = "Write unit tests for Member registration" }
  part "verify" { skill_context = "End-to-end verify registration flow" }
}
```

### Pattern 3: Multiple tasks in series (fix)

Use case: process-oriented bug-fix diagnosis — N tasks chained by `deps`.

```oxn
task "diagnose" { ... deps = [] }
task "locate"   { ... deps = ["diagnose"] }
task "fix"      { ... deps = ["locate"] }
task "verify"   { ... deps = ["fix"] }
```

### Pattern 4: Cross-domain orchestration (onboarding)

Use case: across multiple bounded contexts — work-level declares N domains, each task injects 1.

```oxn
work "NewUserOnboarding" {
  domain "MemberContext" ref "@prj/domains/MemberContext"
  domain "OrderContext"  ref "@prj/domains/OrderContext"
  blueprint "dev-workflow" ref "@prj/blueprints/dev-workflow"

  task "RegisterMember" { domain "MemberContext"; blueprint "dev-workflow"; ... }
  task "GrantBonus"     { domain "OrderContext";  blueprint "dev-workflow"; ... }
}
```

---

## Anti-patterns

- **Don't skip validate + lock and run directly** — triggers `IAP_ALIGN_LOCK_NOT_FOUND`
- **Don't modify `.oxn` after lock** — triggers `IAP_ALIGN_LOCK_HASH_MISMATCH`
- **Don't submit before run** — `work run` is setup, `submit` is advance
- **Don't confuse ref with align** — `domain "X" ref "..."` is work-level declaration; `domain "X"` inside a task is align
- **Part / Probe are not standalone assets** — they are inlined in the task block; you cannot `oxn part new` / `oxn probe new`

## → Reference

- [Intent](./intent.md) — how Domain + Blueprint are defined
- [Proof](./proof.md) — Probe acceptance + frozen.json
- [Recipes](./recipes.md) — end-to-end real cases
