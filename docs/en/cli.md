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

| Command | Effect |
|---|---|
| `oxn work create <id> --blueprint <bp>` | Create Work skeleton |
| `oxn work add-task --work <w> --task-name <t> --blueprint <bp> [--domain <d>]` | Create a Task |
| `oxn work validate <w> [--json]` | Validate `work.oxn` + write `.work` gate card |
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
| `oxn domain create <DomainName>` | Create Domain skeleton |
| `oxn domain validate <DomainName>` | Validate Domain |
| `oxn domain list` | List all Domains |

See [Intent](./intent.md) for full Domain + Blueprint syntax.

---

## Developer commands

| Command | Effect |
|---|---|
| `oxn dev compile <file.oxn> [-o DIR]` | Compile a `.oxn` file |
| `oxn dev unpack <file.bundle.oxn> [-o DIR]` | Unpack a bundle |
| `oxn dev validate [--standard]` | Standard validation |
| `oxn dev migrate-yaml <file> [--all]` | YAML migration |
| `oxn dev promote <task-dir> [--as-new N]` | Promote assets |

---

## Skill install

```bash
oxn install-skill                    # install all Skills
oxn install-skill --skill oxn-cli --force   # install a specific Skill
```

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
    "message": "work.oxn has drifted: hash mismatch",
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
| `OXN_TASK_OXN_MISSING` | task.oxn missing | `oxn work add-task` |
| `OXN_TASK_NOT_FOUND` | Task not found | First `oxn work run` |
| `OXN_BLUEPRINT_NOT_IN_WORK` | Blueprint not declared in work.oxn | Edit work.oxn |
| `OXN_DOMAIN_NOT_IN_WORK` | Domain not declared in work.oxn | Edit work.oxn |
| `OXN_DSL_PARSE_FAILED` | .oxn syntax error | See error message and fix |
| `OXN_WORK_ALREADY_EXISTS` | Duplicate run | Use `status` to inspect |
| `OXN_WORK_NOT_FOUND` | Work not found | Confirm the work name |
| `IAP_ALIGN_LOCK_NOT_FOUND` | `.work.planLock` missing | First `oxn work lock` |
| `IAP_ALIGN_LOCK_HASH_MISMATCH` | Asset drift after lock | Inspect the drift source, or unlock → re-lock |
| `IAP_ALIGN_WORK_REMOVED` | work.oxn missing | YIELD_TO_HUMAN |

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
