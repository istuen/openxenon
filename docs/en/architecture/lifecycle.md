# 3. Complete Lifecycle

## 0.1 Actual Workflow

0.1 is CLI-direct mode, not dependent on Daemon. Here is the complete task execution cycle:

```
1. oxn init              # Initialize project fence
       │
       ▼
2. oxn forge probe      # Get meta Forge constraints
       │
       ▼
3. AI generates Draft YAML    # Generate asset according to constraints
       │
       ▼
4. oxn forge probe --save # Save Draft asset
       │
       ▼
5. oxn arsenal promote   # Draft → CANONICAL
       │
       ▼
6. oxn task submit --blueprint <file>  # Submit task
       │
       ▼
7. oxn task next --task-id <id>  # Get next Stage
       │
       ▼
8. AI executes Stage work    # Write code, run commands
       │
       ▼
9. oxn task verify --task-id <id> --stage-id <id>  # Verify
       │
       ▼
10. Repeat 7-9 until all Stages pass
```

## Typical Command Sequence

```bash
# Initialize
oxn init

# View available assets
oxn arsenal list

# Forge new Probe
oxn forge probe
# AI generates YAML according to constraints
oxn forge probe --save 'type: fs_exists
description: "Check file exists"
parameters:
  - name: pattern
    type: string
    required: true' --name check-pkg-json

# Submit task
oxn task submit --blueprint my-task.yaml
# Get task ID, assume abc123
oxn task next --task-id abc123
# AI executes work...
oxn task verify --task-id abc123 --stage-id build
# Repeat next + verify until complete
```

## 0.2 Goal: Daemon Long-Running Mode

The following is 0.2 target architecture, not yet implemented:

- Daemon long-running process holds DAG state
- Automatic timeout detection
- Task queue and concurrency control
- After `oxn daemon start`, can search global assets via `oxn arsenal search`

0.1 phase: all core functions (forge, task submit/verify, arsenal) are available via CLI direct connection, not dependent on Daemon.

## Project Directory Structure

```
<project>/
├── .openxenon/           # Project fence
│   ├── config.json       # Project config
│   ├── arsenals/         # Project-level assets
│   │   ├── probes/
│   │   └── stages/
│   └── tasks/
│       └── <task_id>/
│           ├── blueprint.yaml      # Task blueprint
│           ├── step-manifest.json  # AI manifest (written by AI)
│           └── task-trace.yaml    # Execution record (append-only)
└── src/                  # Business code
```

Global directory (`~/.openxenon/`) in 0.1 is only used for Daemon-related files; CLI direct mode doesn't depend on it.

## Next Chapter

The next chapter introduces [CLI Command Reference](./cli-reference.md).