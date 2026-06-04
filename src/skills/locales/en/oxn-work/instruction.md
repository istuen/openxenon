# /oxn-work — Launch an OpenXenon Work (v0.1 dual-layer)

## Goal

Based on a Blueprint, create a **Work + at least one Task** workspace:
- `work.oxn` — workspace orchestrator (declares use_domain + use_blueprint + task DAG)
- `tasks/<name>/task.oxn` — single Blueprint execution + Domain injection

This Skill covers work + task creation; the state machine (run/act/submit) is in `/oxn-leader`.

> **Relationship with `/oxn-leader`**: this skill teaches AI how to **create** work + task. `/oxn-leader` teaches AI how to **drive** the work state machine. They are complementary, **not substitutes**.

> Legacy `oxn-task` / `oxn-explore` / `oxn-plan` are deprecated (v0.0.x dual-layer task/work model artifact). Do NOT call `oxn task *` historical commands.

## Prerequisites

- Inside an OXN project root
- Project is initialized with `oxn init` (has `.openxenon/` boundary)
- Must have a Blueprint at `.openxenon/blueprints/<name>.oxn`; use `oxn blueprint new` to create
- **Optional**: have a DDD Domain at `.openxenon/domains/<kebab>.oxn`; use `oxn domain new` to create

## Create Work + Task (v0.1 five steps)

### Step 1: Create Domain (if you need to constrain business language)

```bash
oxn domain new --name MemberContext
# Edit .openxenon/domains/member-context.oxn to fill language/rules
oxn domain validate --name MemberContext
```

### Step 2: Create Work orchestration

```bash
# Use leader new to generate work.oxn skeleton
oxn leader new --work-name <work-name> --blueprint-file .openxenon/blueprints/<bp>.oxn
# Edit works/<work>/work.oxn to add use_domain and task blocks
```

Or hand-write `works/<work>/work.oxn`:

```oxn
work "MyFeature" {
  context { goal = "..."; constraints = []; loop_policy { max_iterations = 3 } }
  use_domain "MemberContext"
  use_blueprint "dev-workflow"
  task "step1" align "dev-workflow.develop" { deps = [] }
}
```

### Step 3: Create at least one Task (v0.1 mandatory)

```bash
oxn work task new \
  --work-name <work-name> \
  --task-name <task-name> \
  --blueprint <blueprint-name> \
  [--inject <Domain1>,<Domain2>]
```

It does:
- Validate `--blueprint` appears in work.oxn's `use_blueprint` list (fail-fast)
- Validate `--inject` list appears in work.oxn's `use_domain` list (fail-fast)
- Generate `works/<w>/tasks/<t>/task.oxn` skeleton

### Step 4: Edit task content

```bash
oxn work task edit \
  --work-name <w> --task-name <t> \
  --objective "Implement member registration" \
  --add-constraint "use_kebab_case" \
  --add-constraint "no_plaintext_password"
```

### Step 5: Hand over to leader to drive

```bash
oxn leader run --work-file <work>/work.oxn --json
oxn leader submit --work-name <w> --task <t> --json
oxn leader status --work-name <w> --json
```

## Reference Commands

| What you want | Command |
|---------------|---------|
| Initialize project boundary | `oxn init` |
| Create a Blueprint skeleton | `oxn blueprint new <name> [--slots <list>]` |
| Create a Domain skeleton | `oxn domain new --name <name>` |
| Validate Blueprint / Domain | `oxn {blueprint,domain} validate <name>` |
| List all Domains | `oxn domain list` |
| List all tasks under a work | `oxn work task list --work-name <w>` |
| View task status | `oxn work task status --work-name <w> --task-name <t>` |
| Get AI context (**full isolation**) | `oxn get-context --work <w> --task <t>` |
| Drive state machine | `/oxn-leader` skill |

## Anti-patterns

- **Do NOT submit before run** — `run` is setup, `submit` is advance, wrong order → `OXN_WORK_NOT_FOUND`
- **Do NOT skip task creation** — v0.1 `leader run` fail-fast blocks
- **Do NOT reference task names in work.oxn that don't have a task.oxn** — `leader run` validation will fail
- **Do NOT confuse `use_domain` with `task.inject`** — `use_domain` is work-level declaration; `inject` is task-level filter
