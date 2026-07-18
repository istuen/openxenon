---
title: CLI Reference
---

# CLI Reference

> `oxn` is the single entry for engineers and AI to operate OpenXenon. All commands are prefixed with `oxn`.

## Global options

| Option | Description |
|---|---|
| `-v, --verbose` | Verbose output |
| `-j, --json` | JSON-formatted output |
| `-y, --yaml` | YAML-formatted output |
| `--help` | Help info |

## Project-level vs global

| Scope | Usage | Effect |
|---|---|---|
| Project-level | `oxn <command>` | Operates on the current project's `.openxenon/` |
| Global | `oxn global <command>` | Operates on `~/.openxenon/` (shared across projects) |

> AI agents should use project-level commands. Global commands are mainly for engineers.

---

## Init

### `oxn init`

Initialize the project; create the `.openxenon/` boundary.

```bash
oxn init
oxn init --ai cursor     # generate Cursor Skill
oxn init --ai opencode   # generate OpenCode Skill
oxn init --ai codex      # generate Codex Skill
```

---

## Proof commands (Proof-First entry)

| Command | Effect |
|---|---|
| `oxn proof create <name>` | Create Proof space |
| `oxn proof probe add <probe> --target <path>` | Add a Probe |
| `oxn proof run <name>` | Run proof, emit `frozen.json` |
| `oxn proof list` | List all Proofs |
| `oxn proof show <name>` | Show details of a specific Proof |

See [Proof](./proof.md) for the full Proof axis concept.

---

## Work commands (v1.1 full flow)

### Lifecycle

> **v0.6.1+**: New `oxn work create` defaults to writing `works/<n>/work.md` (canonical .md).

| Command | Effect |
|---|---|
| `oxn work create <id> --blueprint <bp>` | Create Work skeleton (default .md) |
| `oxn work add-task --work <w> --task-name <t> --blueprint <bp> [--domain <d>]` | Create a Task |
| `oxn work validate <w> [--json]` | = `lock --dry-run` (backward-compat alias) |
| `oxn work lock <w> [--json]` | Lock the work (planLock + 4-component hash) |
| `oxn work unlock <w>` | Unlock the work |
| `oxn work run --work-file <path> [--json]` | Start the state machine |
| `oxn work submit --work <w> --task <t> [--json]` | Advance parts within the task |
| `oxn work status --work <w> [--json]` | Query work state |
| `oxn work complete --work-name <w>` | Complete the work |

### List and view

| Command | Effect |
|---|---|
| `oxn work list` | List all Work |
| `oxn work list-tasks --work <w>` | List all Tasks under a Work |
| `oxn work task-status --work <w> --task <t>` | View a single Task's state |
| `oxn work context --work <w> --task <t> [--json]` | Get the AI-visible context |

### Other

| Command | Effect |
|---|---|
| `oxn work task-edit --work <w> --task <t> [--objective S]` | Edit a Task |
| `oxn work task-delete --work <w> --task <t> --force` | Delete a Task |
| `oxn work migrate [--dry-run] [--work-name <w>]` | V0→V1 layout migration |
| `oxn work resume --work-name <w>` | Resume a work |

See [Align](./align.md) for the full v1.1 8-stage flow.

---

## Intent commands

### Blueprint

| Command | Effect |
|---|---|
| `oxn blueprint create <name> [--slots <list>]` | Create Blueprint skeleton |
| `oxn blueprint validate <name>` | Validate Blueprint |
| `oxn blueprint list` | List all Blueprints |

### Domain

| Command | Effect |
|---|---|
| `oxn domain create <DomainName>` | Create Domain skeleton (default .md) |
| `oxn domain validate <DomainName>` | Validate Domain |
| `oxn domain list` | List all Domains |

### Asset path resolution (v0.6.1)

CLI resolves assets in this order:
1. `<primary>/<name>.md`     — v0.6+ canonical
2. `<fallback>/<name>.md`   — v0.5 layout .md (if exists)

See [Intent](./intent.md) for full Domain + Blueprint syntax.

---

## External status management (v0.6.1-alpha.4)

Manage availability status of `## Externals` inline declarations in Domain/Workflow/Stack files:

### `oxn external check`

Scan all boundary files (Domain/Workflow/Stack) for `## Externals` declarations, check reachability of each external's url/path, update `.openxenon/.cache/external-status.json`.

```bash
oxn external check              # check all externals
oxn external check --name "stripe-api"  # check specific external
```

**4 status values**: `available` / `unavailable` / `stale` / `unknown`

### `oxn external status`

Display current external status from `.openxenon/.cache/external-status.json`.

```bash
oxn external status             # human-readable
oxn external status --json      # JSON output
```

### `oxn external mark`

Manually mark an external's status (without reachability check).

```bash
oxn external mark --name "stripe-api" --status stale --reason "API maintenance"
```

See ADR-0056 External Inline + Status.

---

## Developer commands

| Command | Effect |
|---|---|
| `oxn dev compile <file.md> [-o DIR]` | Compile a `.md` file |
| `oxn dev unpack <file.bundle.md> [-o DIR]` | Unpack a bundle |
| `oxn dev validate [--standard]` | Standard validation |
| `oxn dev migrate-yaml <file> [--all]` | YAML migration |
| `oxn dev promote <task-dir> [--as-new N]` | Promote assets |

---

## Skill Initialization

```bash
oxn init --ai opencode      # Generate OpenCode Skill (one-step init)
oxn init --ai claude        # Claude Code Skill
```

> v0.6+ unified Skill: `/oxn-work` (IAP unified entry point). Legacy `/oxn-proof` and `/oxn-cli` Skills removed.

---

## Exit codes

| Exit code | Meaning |
|---|---|
| 0 | Success |
| 1 | IAPError — recoverable business error (JSON output to stdout) |
| 2 | OXNCrash — unrecoverable system error (output to stderr) |

### AI-consuming IAPError

When the CLI returns exit code 1, the JSON output is formatted as:

```json
{
  "error": {
    "type": "IAPError",
    "code": "IAP_ALIGN_LOCK_HASH_MISMATCH",
    "message": "work.md has drifted: hash mismatch",
    "context": { "component": "workOxn", "locked": "...", "current": "..." },
    "action": "YIELD_TO_HUMAN"
  }
}
```

---

## Error code quick reference

| Code | Meaning | Action |
|---|---|---|
| `OXN_NO_PROJECT` | Project not initialized | `oxn init` |
| `OXN_INVALID_NAME` | Bad name format | Use kebab-case / PascalCase |
| `OXN_TASK_OXN_MISSING` | task.md missing | `oxn work add-task` |
| `OXN_TASK_NOT_FOUND` | Task not found | First `oxn work run` |
| `OXN_BLUEPRINT_NOT_IN_WORK` | Blueprint not declared in work.md | Edit work.md |
| `OXN_DOMAIN_NOT_IN_WORK` | Domain not declared in work.md | Edit work.md |
| `OXN_DSL_PARSE_FAILED` | .md syntax error | See error message and fix |
| `OXN_WORK_ALREADY_EXISTS` | Duplicate run | Use `status` to inspect |
| `OXN_WORK_NOT_FOUND` | Work not found | Confirm the work name |
| `IAP_ALIGN_LOCK_NOT_FOUND` | `.work.planLock` missing | First `oxn work lock` |
| `IAP_ALIGN_LOCK_HASH_MISMATCH` | Asset drift after lock | Inspect the drift source, or unlock → re-lock |
| `IAP_ALIGN_WORK_REMOVED` | work.md missing | YIELD_TO_HUMAN |

---

## Typical workflow

```bash
# CLI reference
oxn init

# CLI reference
oxn domain create MemberContext
# CLI reference
oxn domain validate MemberContext

# CLI reference
oxn blueprint create dev-workflow --slots build,test
oxn blueprint validate dev-workflow

# CLI reference
oxn work create onboarding --blueprint dev-workflow

# CLI reference
oxn work add-task --work onboarding --task-name register \
  --blueprint dev-workflow --domain MemberContext

# CLI reference
oxn work validate onboarding --json
oxn work lock onboarding --json

# CLI reference
oxn work context --work onboarding --task register --json

# CLI reference
oxn work run onboarding --json
oxn work submit --work onboarding --task register --json

# CLI reference
oxn work status --work onboarding --json
```

## → Reference

- [Quickstart](./quickstart.md) — Proof-First entry
- [Align](./align.md) — v1.1 8-stage details
