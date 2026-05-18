# OpenXenon Features

This document lists currently implemented features of OpenXenon.

---

## 1. Core Concepts

### 1.1 Asset Types

| Type | Description | Storage Location |
|------|-------------|------------------|
| **Probe** | Atomic check such as `fs_exists`, `shell_exec` | `.openxenon/arsenals/probes/` |
| **Stage** | Work node with target/spec/probes | `.openxenon/arsenals/stages/` |
| **Blueprint** | Task blueprint combining multiple Stages | `.openxenon/arsenals/blueprints/` |

### 1.2 Asset States

| State | Description |
|-------|-------------|
| **DRAFT** | Draft state, needs review before promotion |
| **CANONICAL** | Official state, can be referenced by tasks |

### 1.3 Task States

| State | Description |
|-------|-------------|
| **PENDING** | Waiting to execute |
| **RUNNING** | Executing |
| **COMPLETED** | All passed |
| **FAILED** | Failed |

---

## 2. CLI Commands

### 2.1 Project Initialization

```bash
oxn init
```
Creates `.openxenon` project fence in current directory.

### 2.2 Arsenal Asset Management

```bash
# List all assets
oxn arsenal list

# Inspect specific asset
oxn arsenal inspect <type>/<name>
# Example: oxn arsenal inspect probes/fs_exists

# Promote Draft asset to Canonical
oxn arsenal promote <type>/<name>
# Example: oxn arsenal promote probes/my-probe
```

### 2.3 Forge Asset Generation

```bash
# Generate Probe definition
oxn forge probe

# Generate Stage definition
oxn forge stage

# Save Draft asset
oxn forge <type> --save '<yaml>' --name <name>
```

### 2.4 Task Management

```bash
# Create new task
oxn task new <task-id> --name <display-name>

# Submit Blueprint
oxn task submit --blueprint <path> --task-id <id>

# Get next Stage to execute
oxn task next --task-id <id>

# Verify Stage
oxn task verify --task-id <id> --stage-id <stage-id>

# View task status
oxn task status --task-id <id>
```

### 2.5 Explore Mode

```bash
# Create new exploration
oxn explore new --name <exploration-name>

# Scan materials
oxn explore scan --name <exploration-name> --path <file-or-directory>

# Add Q&A record
oxn explore qa --name <exploration-name> --add "Q:question|A:answer"

# Generate report
oxn explore report --name <exploration-name>

# List all explorations
oxn explore list
```

---

## 3. Probe Types

### 3.1 Built-in Probes

| Type | Description | Parameters |
|------|-------------|------------|
| `fs_exists` | Check if files matching glob pattern exist | `pattern`: glob pattern |
| `fs_not_exists` | Check if files matching glob pattern don't exist | `pattern`: glob pattern |
| `fs_match` | Check if file content matches regex | `path`: file path, `pattern`: regex |
| `exec_exit_zero` | Check if command exit code is 0 | `command`: shell command |

### 3.2 Custom Probes

Users can generate custom Probes via Forge and save to Arsenal.

---

## 4. Blueprint Format

### 4.1 Basic Structure

```yaml
name: <blueprint-name>
stages:
  - id: <stage-unique-id>
    name: <display-name>
    deps: [<dependent-stage-id>]
    target:
      description: <target-description>
    spec:
      description: <spec-description>
    probes:
      - type: <probe-type>
        params:
          <probe-parameters>
```

### 4.2 Blueprint Referencing Arsenal Assets

Blueprint can reference Probes from Arsenal:

```yaml
stages:
  - id: check-files
    probes:
      - ref: fs_exists          # Reference Probe from Arsenal
        params:
          pattern: "src/**/*.ts"
```

### 4.3 DAG Dependencies

```yaml
stages:
  - id: stage-a
  - id: stage-b
    deps: [stage-a]    # stage-b depends on stage-a
```

---

## 5. Task Execution Flow

```
oxn task new → oxn task submit → oxn task next → Execute work → oxn task verify
                                      ↓                    ↓
                              (repeat until)          (repeat until)
                                      ↓                    ↓
                                  complete                some fail
```

### 5.1 Complete Example

```bash
# 1. Create task
oxn task new my-task --name "Build Project"

# 2. Write Blueprint and submit
oxn task submit --blueprint my-task.yaml --task-id my-task

# 3. Get first Stage
oxn task next --task-id my-task

# 4. Execute and verify
oxn task verify --task-id my-task --stage-id build

# 5. Repeat until complete
oxn task next --task-id my-task
oxn task verify --task-id my-task --stage-id test
```

---

## 6. Task Trace

During task execution, `task-trace.yaml` is generated, recording each Stage and Probe execution result.

### 6.1 Trace Event Types

| Event | Description |
|-------|-------------|
| `TASK_START` | Task started |
| `STAGE_START` | Stage started |
| `STAGE_COMPLETE` | Stage completed |
| `PROBE_RESULT` | Probe execution result |
| `TASK_STATUS` | Task status change |

### 6.2 Enhanced Fields

Current `PROBE_RESULT` event includes the following fields:

| Field | Description |
|-------|-------------|
| `probeType` | Probe type |
| `params` | Parameters actually used |
| `result` | PASSED / FAILED |
| `actual` | Structured actual observation value |
| `failureMessage` | Sanitized failure message |
| `duration` | Execution time (ms) |
| `output` | Raw output (preserved) |
| `error` | Error message (preserved) |

---

## 7. Skills

AI Assistant can interact with OpenXenon via the following Skills:

| Skill | Description |
|-------|-------------|
| `/oxn-init` | Initialize project fence |
| `/oxn-task` | Initiate and manage tasks |
| `/oxn-forge` | Generate Draft standard assets |
| `/oxn-arsenal` | View and manage Arsenal assets |
| `/oxn-explore` | Explore project and tasks |
| `/oxn-trace` | View task execution trace |
| `/oxn-status` | View project status |
| `/oxn-resume` | Resume interrupted tasks |
| `/oxn-stop` | Stop task execution |

---

## 8. Architecture Principles

### 8.1 Kernel Zero Side Effects

Functions in Kernel layer (`src/kernel/`) must be pure functions, cannot directly access filesystem or network.

### 8.2 Functional Over OOP

Use TypeScript type aliases and Record function tables, don't use class or interface.

### 8.3 Cognitive Closure Over Automation

Closure is in the engineer's brain, not an automated flow. 0.1 phase requires manual engineer intervention.

---

## 9. Completed 0.1 Implementation Steps

According to OpenXenon 0.1 implementation guide, the following steps are completed:

| Step | Description | Status |
|------|-------------|--------|
| 1 | Kernel constitutional repair | ✅ |
| 2 | Probe ref implementation | ✅ |
| 3 | Trace Schema enhancement | ✅ |
| 4 | BlueprintCompiler pure function split | ✅ |
| 5 | CLI command tree refactoring | ✅ |

---

## 10. FAQ

### Q: How to add a new Probe type?

1. Add new strategy function to `probeStrategies` object in `src/kernel/probes/evaluator.ts`
2. Ensure function signature: `type ProbeStrategy = (observation, params) => ProbeVerdict`

### Q: How to create a custom Stage?

1. Use `oxn forge stage` to get meta Forge constraints
2. Generate YAML and save as Draft
3. After review, use `oxn arsenal promote` to canonicalize

### Q: What is the priority for `ref` references in Blueprint?

1. Project-level Arsenal
2. Global-level Arsenal
3. Built-in Arsenal (`oxn/` prefix)

---

*Last updated: 2026-05-17*