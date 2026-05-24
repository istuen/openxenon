# 3. Complete Lifecycle

## 0.1 Actual Workflow

0.1 is CLI-direct mode, not dependent on Daemon. Here is the complete task execution cycle:

```
1. oxn init              # Initialize project fence
       │
       ▼
2. oxn work new <work-id> --type task --blueprint <bp-name>  # Create Work
       │
       ▼
3. oxn work resume <work-id>  # Get next Part
       │
       ▼
4. AI executes Part work    # Write code, run commands
       │
       ▼
5. oxn work complete <work-id>  # Complete when all Parts pass
       │
       ▼
6. Repeat 3-5 until all Parts pass
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

# Create Work using Blueprint
oxn work new my-work --type task --blueprint new-task-flow
# Get next part
oxn work resume my-work
# AI executes work...
oxn work complete my-work
# Repeat resume + complete until done
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