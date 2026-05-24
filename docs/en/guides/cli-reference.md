# CLI Command Reference

This document provides complete command reference for OpenXenon CLI.

## Global Options

| Option | Description |
|--------|-------------|
| `-v, --verbose` | Enable verbose output |
| `-j, --json` | Output in JSON format |

## Command Scope

CLI commands have two scopes: **project-level** and **global**:

| Scope | Prefix | Description |
|-------|--------|-------------|
| Project-level | `oxn <command>` | Operate assets under current project's `.openxenon/` |
| Global | `oxn global <command>` | Operate global Arsenal (`~/.openxenon/`), shared across all projects |

**Typical Scenarios**:

- `oxn arsenal list` - View standard assets in current project
- `oxn global arsenal list` - View globally reusable standard assets

> Global commands are for engineers only; AI agents should use project-level commands.

## oxn init

Initialize project, create `.openxenon` fence in current directory.

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

### View Meta Forge Constraints

```bash
# View all meta Forge constraints
oxn forge

# View Probe meta Forge constraints
oxn forge probe

# View Stage meta Forge constraints
oxn forge stage

# View Blueprint meta Forge constraints
oxn forge blueprint
```

### Save Draft Asset

```bash
oxn forge <type> --save '<yaml>' --name <name>
```

**Parameters**:

| Parameter | Required | Description |
|-----------|----------|-------------|
| `<type>` | Yes | Asset type: probe, stage, blueprint |
| `--save <yaml>` | Yes | YAML content |
| `--name <name>` | Yes | Asset name |
| `--global` | No | Save to global Arsenal (0.2) |

**Example**:

```bash
oxn forge probe --save '
type: fs_exists
description: "Check if file exists"
parameters:
  - name: pattern
    type: string
    required: true
' --name check-file
```

## oxn arsenal

Standard asset management commands.

### oxn arsenal list

List standard assets.

```bash
oxn arsenal list [DRAFT|CANONICAL]
```

**Output Example**:

```
## PROBES
  [CANONICAL] fs_exists
  [CANONICAL] fs_match
  [DRAFT] check-file

## STAGES
  [CANONICAL] build

Total: 4 assets
```

### oxn arsenal inspect

View asset content.

```bash
oxn arsenal inspect <type>/<name>
```

**Example**:

```bash
oxn arsenal inspect probes/check-file
```

### oxn arsenal promote

Promote DRAFT asset to CANONICAL.

```bash
oxn arsenal promote <type>/<name>
```

**Example**:

```bash
oxn arsenal promote probes/check-file
```

**Output**:

```
✓ Asset promoted
  Name: check-file
  Type: probes
  New State: CANONICAL
```

### oxn arsenal render

Preview Blueprint DAG topology.

```bash
oxn arsenal render <blueprint-name>
```

## oxn work

Work management commands (NEW, replaces task commands).

### oxn work new

Create a new Work using a Blueprint.

```bash
oxn work new <work-id> --type task --blueprint <blueprint-name>
```

**Parameters**:

| Parameter | Required | Description |
|-----------|----------|-------------|
| `<work-id>` | Yes | Work ID (kebab-case) |
| `--type <type>` | Yes | Work type: task, plan, explore, or custom |
| `--blueprint <name>` | No | Blueprint name to reference |
| `--name <name>` | No | Display name |

**Output**:

```
Work created: my-work
Type: task
Path: .openxenon/work/task/my-work.oxn
```

### oxn work resume

Get next Part to execute.

```bash
oxn work resume <work-id>
```

**Output**:

```
Part: develop
Target: Implement feature in src/
Action: Write code according to specification
```

### oxn work complete

Mark Work as complete.

```bash
oxn work complete <work-id>
```

**Output**:

```
Work: my-work
Status: COMPLETED
Parts passed: 3/3
```

### oxn work list

List all Works.

```bash
oxn work list
```

### oxn work validate

Validate Work file syntax.

```bash
oxn work validate <path-to-work.oxn>
```

## oxn task (DEPRECATED)

Task management commands (deprecated, use `oxn work` instead).

> Migration: Use `oxn work new ... --type task` instead of `oxn task submit --blueprint`

### oxn task submit (DEPRECATED)

```bash
oxn task submit --blueprint <file>
```

### oxn task next (DEPRECATED)

```bash
oxn task next --task-id <id>
```

### oxn task verify (DEPRECATED)

```bash
oxn task verify --task-id <id> --stage-id <id>
```

### oxn task status (DEPRECATED)

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

Manage Daemon process (0.2 goal).

```bash
oxn daemon start   # Start daemon
oxn daemon stop    # Stop daemon
oxn daemon status  # View status
```

> 0.1 phase: all core commands available via CLI direct connection, not dependent on Daemon.

## oxn hall

Open Hall (研讨厅), view project status and todos.

```bash
oxn hall
oxn hall --open
```

**Parameters**:

| Option | Description |
|--------|-------------|
| `--open` | Open Hall in browser |

**Output**:

```
Hall path: /path/to/project/.openxenon/hall/index.html

Use --open to open in browser
```

**Features**:

- Scans tasks and forges under project `.openxenon/`
- Generates static HTML page displaying:
  - Task statistics (total, running, completed, failed)
  - List of Draft assets pending review
  - Task list (clickable for details)
- Each project has independent Hall view, physically isolated

**Detail Popup Displays**:

- Stage DAG topology
- Each Stage's execution status
- Probe execution results (PASSED/FAILED)
- Probe output and error messages