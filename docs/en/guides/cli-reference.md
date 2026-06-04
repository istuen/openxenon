# CLI Command Reference

This document provides a complete reference for the OpenXenon CLI.

> v0.1 introduces several new commands: `oxn domain`, `oxn work task`, `oxn work migrate`, `oxn get-context`.

## Global Options

| Option | Description |
|--------|-------------|
| `-v, --verbose` | Enable verbose output |
| `-j, --json` | Output in JSON format |
| `--yaml` | Output in YAML format |
| `--html` | Output in HTML format |
| `--md` | Output in Markdown format |

## Command Scope

CLI commands are divided into **project-level** and **global**:

| Scope | Prefix | Description |
|-------|--------|-------------|
| Project-level | `oxn <command>` | Operates on assets in the current project's `.openxenon/` |
| Global | `oxn global <command>` | Operates on the global Arsenal (`~/.openxenon/`) shared across projects |

**Typical use cases**:
- `oxn arsenal list` - list project standard assets
- `oxn global arsenal list` - list global reusable assets

> Global commands are for engineers only; AI agents should use project-level commands.

## oxn init

Initialize a project, creating the `.openxenon` boundary in the current directory.

```bash
oxn init
```

**Output**:
```
✓ Created .openxenon/
✓ Created .openxenon/config.json
✓ Project initialized
```

## oxn forge

Forge Draft standard assets.

### View meta-Forge constraints

```bash
oxn forge
oxn forge probe
oxn forge part
oxn forge blueprint
```

### Save a Draft asset

```bash
oxn forge <type> --save '<yaml>' --name <name>
```

**Parameters**:

| Parameter | Required | Description |
|-----------|----------|-------------|
| `<type>` | yes | Asset type: probe, part, blueprint |
| `--save` | yes | YAML content |
| `--name` | yes | Asset name |
| `--global` | no | Save to global Arsenal (0.2) |

## oxn arsenal

Standard asset management commands.

### oxn arsenal list

List standard assets.

```bash
oxn arsenal list [DRAFT|CANONICAL]
```

### oxn arsenal inspect

View asset contents.

```bash
oxn arsenal inspect <type>/<name>
```

### oxn arsenal promote

Promote a DRAFT asset to FORMAL.

```bash
oxn arsenal promote <type>/<name>
```

### oxn arsenal render

Preview Blueprint DAG topology.

```bash
oxn arsenal render <blueprint-name>
```

## oxn blueprint

Blueprint management (CLI generator).

### oxn blueprint new

Generate a new Blueprint skeleton.

```bash
oxn blueprint new --name <name> [--slots slot1,slot2]
```

### oxn blueprint validate

Validate a Blueprint file's syntax.

```bash
oxn blueprint validate <name>
```

## oxn domain 🌟 NEW in v0.1

DDD bounded context management. Creates, validates, and lists Domain files in `.openxenon/domains/`.

### oxn domain new

Generate a new Domain skeleton.

```bash
oxn domain new --name <DomainName>
```

**Parameters**:

| Parameter | Required | Description |
|-----------|----------|-------------|
| `--name` | yes | Domain name (PascalCase, e.g. `MemberContext`) |
| `-f, --force` | no | Overwrite existing file |

**Example**:

```bash
oxn domain new --name MemberContext
# Created domain MemberContext at .openxenon/domains/member-context.oxn
```

### oxn domain validate

Parse and validate a Domain file.

```bash
oxn domain validate --name <DomainName>
oxn domain validate --name X --file-path .openxenon/domains/x.oxn
```

**Example output**:

```
Domain MemberContext ✓ valid
  Language: 2 nouns, 2 verbs, 3 banned
  Rules: 2
  Context Map: 1 imports
```

### oxn domain list

List all registered domains.

```bash
oxn domain list
oxn domain list --json
```

**Example output**:

```
Registered domains:
  - MemberContext (member-context.oxn)
      Member bounded context: registration, auth, levels
  - OrderContext (order-context.oxn)
      Order bounded context
  - MarketingContext (marketing-context.oxn)
      Marketing bounded context
```

## oxn work task 🌟 NEW in v0.1

Task lifecycle management within a workspace. Creates task.oxn under `.openxenon/works/<work>/tasks/<task>/`.

### oxn work task new

Create a new task.oxn in the given work, bound to a Blueprint + injecting N Domain.

```bash
oxn work task new --work <W> --task <T> --blueprint <B> [--inject D1,D2]
```

**Parameters**:

| Parameter | Required | Description |
|-----------|----------|-------------|
| `--work` | yes | Work name |
| `--task` | yes | Task name |
| `--blueprint` | yes | Blueprint name (must be in work.oxn's use_blueprint list) |
| `--inject` | no | Domain list to inject (must be in work.oxn's use_domain list) |
| `-f, --force` | no | Overwrite existing file |

**Example**:

```bash
oxn work task new --work onboarding --task register-member \
  --blueprint dev-workflow --inject MemberContext
```

### oxn work task list

List all tasks under a work.

```bash
oxn work task list --work <W>
```

### oxn work task status

View a task's status.

```bash
oxn work task status --work <W> --task <T>
```

## oxn work migrate 🌟 NEW in v0.1

v0.1 hard-migration tool. Converts legacy `.openxenon/work/task/<name>.oxn` to the new `works/<name>/work.oxn` format, and splits single-layer state.json into two-layer.

```bash
oxn work migrate [--dry-run] [--work-name X] [-f]
```

**Example**:

```bash
# Preview
oxn work migrate --dry-run
# [DRY-RUN] Detected 1 potential actions:
#   [pending] legacy-work: migrate work.oxn (dry-run)

# Actual migration
oxn work migrate
# Migration completed. 1 actions done, 0 skipped, 0 errors.
```

## oxn get-context 🌟 NEW in v0.1

Returns the AI-visible task working context. **Full isolation** — only the task's own inject domains are returned.

```bash
oxn get-context --work <W> --task <T> [--emit-md <path>]
oxn get-context --work <W>                       # work-level (no isolation)
```

**Parameters**:

| Parameter | Required | Description |
|-----------|----------|-------------|
| `--work` | yes | Work name |
| `--task` | no | Task name (omitted returns work-level context) |
| `--state-path` | no | Optional state.json path (for currentFocus) |
| `--emit-md` | no | Write summary to the given .md path |

**Example output**:

```
# Context for onboarding / register-member

Blueprint: dev-workflow
Current part: develop
Status: pending

## Injected Domains (isolated)
### MemberContext
Member bounded context: registration, auth, levels
Nouns: Member, Account

## Allowed Language
Nouns (must use): Member, Account

## This task can only see domains in its inject list; other domains in the work are invisible.
```

## oxn work

Work management commands (workspace-level).

### oxn work new

Create a new Work.

```bash
oxn work new <work-id> --type task --blueprint <blueprint-name>
```

### oxn work resume

Get the next Part to execute.

```bash
oxn work resume <work-id>
```

### oxn work complete

Mark Work as complete.

```bash
oxn work complete <work-id>
```

### oxn work list

List all Works.

```bash
oxn work list
```

### oxn work validate

Validate a work file's syntax.

```bash
oxn work validate <path-to-work.oxn>
```

## oxn leader (v0.1 compatible)

The leader subcommand drives the unified state machine. The work file format changed in v0.1, so legacy `ref` syntax is rejected.

### oxn leader new

Generate work.oxn from a blueprint.

```bash
oxn leader new --name <work-name> --blueprint-file <path>
```

### oxn leader run

Start the work state machine.

```bash
oxn leader run --work-file <path-to-work.oxn>
```

### oxn leader submit

Advance one part (optionally run aligned probes).

```bash
oxn leader submit --work-name <name> [--run-probes]
```

### oxn leader status

Read current state.

```bash
oxn leader status --work-name <name>
```

## oxn task (legacy)

> **v0.1 status**: legacy `oxn task` is retained for compatibility (points to `.openxenon/tasks/<id>/`).
> New workflow uses `oxn work task` (points to `works/<work>/tasks/<task>/`).

### oxn task submit (legacy)

```bash
oxn task submit --blueprint <file>
```

### oxn task next (legacy)

```bash
oxn task next --task-id <id>
```

### oxn task verify (legacy)

```bash
oxn task verify --task-id <id> --stage-id <id>
```

### oxn task status (legacy)

```bash
oxn task status --task-id <id>
```

## oxn export

Export task-trace.yaml.

```bash
oxn export
```

## oxn gc

Clean up old assets from completed tasks.

```bash
oxn gc
```

## oxn daemon

Manage the Daemon process (0.2 target).

```bash
oxn daemon start   # Start daemon
oxn daemon stop    # Stop daemon
oxn daemon status  # View status
```

> In v0.1 all core commands are available via direct CLI, no Daemon required.

## oxn hall

Open the Studio (Hall) to view project state and todos.

```bash
oxn hall
oxn hall --open
```

**Parameters**:

| Option | Description |
|--------|-------------|
| `--open` | Open the Hall in the browser |

**Features**:
- Scans `.openxenon/` directory for tasks and forges
- Generates a static HTML page showing:
  - Task statistics (total, running, completed, failed)
  - Draft assets pending review
  - Task list (clickable for details)
- Each project has an isolated Hall view

**Detail popup shows**:
- Part DAG topology diagram
- Per-part execution status
- Probe results (PASSED/FAILED)
- Probe output and error messages
