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

## oxn task

Task management commands.

### oxn task submit

Submit Blueprint to create task.

```bash
oxn task submit --blueprint <file>
```

**Parameters**:

| Parameter | Required | Description |
|-----------|----------|-------------|
| `--blueprint <file>` | Yes | Blueprint YAML file path |

**Output**:

```
Task created: task_abc123
Blueprint compiled to frozen.yaml
```

### oxn task next

Get next Stage to execute.

```bash
oxn task next --task-id <id>
```

**Output**:

```
Stage: create-user-model
Target: Create User model in src/models/ directory
Action: Use Prisma ORM to create User model with id, name, email fields
```

> Note: Return content only includes target + action, hiding spec + probes.

### oxn task verify

Submit Stage verification.

```bash
oxn task verify --task-id <id> --stage-id <id>
```

**Parameters**:

| Parameter | Required | Description |
|-----------|----------|-------------|
| `--task-id <id>` | Yes | Task ID |
| `--stage-id <id>` | Yes | Stage ID |

**Output**:

```
Stage: create-user-model
Status: PASSED
Probes:
  ✓ fs_exists: src/models/user.ts
  ✓ fs_match: @prisma/client
```

### oxn task status

Get task status.

```bash
oxn task status --task-id <id>
```

**Output**:

```
Task: task_abc123
Status: IN_PROGRESS
Stages:
  ✓ create-user-model (PASSED)
  ○ run-tests (PENDING)
```

### oxn task render

Generate task execution HTML report.

```bash
oxn task render --task-id <id>
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