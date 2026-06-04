# /oxn-leader — Drive the OpenXenon Work State Machine (v0.1 dual-layer)

## Goal

As an AI agent, use `oxn leader` to drive a **Work + Task** dual-layer state machine:
- **work.oxn level**: workspace orchestration (declares `use_domain` + `use_blueprint` + task DAG)
- **task.oxn level**: single Blueprint execution + N Domain injection

> This skill is auto-compiled by `oxn init` into `.opencode/skills/oxn-leader/SKILL.md`.

> **Relationship with `/oxn-work`**: this skill teaches AI how to **drive** the state machine (run/submit/status). `/oxn-work` teaches AI how to **create** works and tasks. They are complementary, **not substitutes**.

## Prerequisites

- Inside an OXN project root (already ran `oxn init`)
- Has a Blueprint at `.openxenon/blueprints/<name>.oxn`
- **Has used `oxn work task new` to create at least one task for the work** (v0.1 mandatory)

## Core Loop (v0.1 four phases)

### Phase 0: Prepare (mandatory before each submit)

```bash
# Get the AI-visible working context (**full isolation**: only see the task's own inject domains)
oxn get-context --work <work-name> --task <task-name> --json
```

Read from the response:
- `injectedDomains[].name` — which domains are injected
- `allowedLanguage.mustUseNouns` / `mustUseVerbs` / `banned` — words AI must/must-not use
- `taskSlots[].name` — slot list for the current task

### Phase 1: `run` — Start the workspace state machine

```bash
oxn leader run --work-file <path-to-work.oxn> --json
```

It does three things:
1. Validates that all tasks declared in work.oxn have task.oxn (fail-fast: `OXN_TASK_OXN_MISSING`)
2. Writes `works/<w>/workspace.json` (workspace-level state)
3. For each task, writes `works/<w>/tasks/<t>/state.json` (task-level state)

Read `tasks[]` from the response, each task has `taskName / status / currentPart / partCount`.

### Phase 2: Act — Execute current task's current part

Advance by `taskSlots[].name` order:
- Read `task.oxn`'s `context.objective / context.constraints`
- Execute in the filesystem (read source, write code, run tests)
- Strictly obey `allowedLanguage` constraints

### Phase 3: `submit` — Submit evidence, advance task state machine

```bash
# v0.1: --task is required
oxn leader submit --work-name <work-name> --task <task-name> [--run-probes] --json
```

Does:
1. Advance current part to completedParts
2. Write task-level state + sync workspace index
3. Write task-level trace (`works/<w>/tasks/<t>/work-trace.jsonl`)
4. When task all parts done → write `works/<w>/tasks/<t>/frozen.json`

### Phase 4: `status` — Query progress

```bash
oxn leader status --work-name <work-name> --json
```

Returns v0.1 task breakdown:
```json
{
  "workName": "fix-issue",
  "workspace": { "status": "running", "taskCount": 4 },
  "tasks": [
    { "taskName": "diagnose", "status": "passed", "currentPart": null },
    { "taskName": "locate", "status": "running", "currentPart": "locate" },
    { "taskName": "fix", "status": "pending" },
    { "taskName": "verify", "status": "pending" }
  ]
}
```

### Loop Until

- `workspace.status === "passed"` → all tasks done
- `loopMeta.iteration >= loopMeta.maxIterations` → loop limit reached
- `workspace.status === "failed"` → some task probe failed (v0.2)

## Subcommand Cheatsheet

| Subcommand | Purpose | v0.1 Change |
|------------|---------|-------------|
| `new` | Generate work.oxn from blueprint | Still uses use_blueprint + task blocks |
| `run` | Start workspace + each task state machine | **NEW**: fail-fast task.oxn check |
| `submit` | Advance task's part | **BREAKING**: `--task` is required |
| `status` | Read workspace state | **NEW**: `tasks[]` breakdown |
| `start` | (reference alias) copy builtin ldr-*.oxn template | compatible |
| `next` | (reference alias) = `submit --run-probes` | compatible (still need --task) |
| `list` | (reference alias) list builtin ldr templates | compatible |

## Error Code Cheatsheet (v0.1 new)

| Code | Meaning | Fix |
|------|---------|-----|
| `OXN_TASK_OXN_MISSING` | work declares N tasks but task.oxn missing | `oxn work task new --work X --task Y --blueprint B` |
| `OXN_TASK_NOT_FOUND` | submit on a task that hasn't started | Run `oxn leader run` first |
| `OXN_BLUEPRINT_NOT_IN_WORK` | work.oxn doesn't use_blueprint this | Edit work.oxn |
| `OXN_DOMAIN_NOT_IN_WORK` | work.oxn doesn't use_domain this | Edit work.oxn |
| `OXN_FILE_NOT_FOUND` | Blueprint or work.oxn not found | Create or specify path |
| `OXN_DSL_PARSE_FAILED` | .oxn syntax error | Show user the error |
| `OXN_WORK_ALREADY_EXISTS` | Duplicate run | Use `status` to view existing |
| `OXN_WORK_NOT_FOUND` | submit/status on non-existent work | Confirm work name |

## Completion Criteria

When `workspace.status === "passed"`:
1. **Stop and tell the user the frozen.json path for each task** (`works/<w>/tasks/<t>/frozen.json`)
2. Let them review

You are an AI agent, not a validator. Probes run in kernel (v0.2 connects), you just submit.
