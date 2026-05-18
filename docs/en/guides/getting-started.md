# Getting Started

This guide helps you run through OpenXenon's core flow in 5 minutes.

## Requirements

- **Bun**: >= 1.0.0
- **pnpm**: >= 8.0.0

## Installation and Build

```bash
# Clone repository
git clone https://forgejo.isteed.dev/issac/openxenon.git
cd openxenon

# Install dependencies
pnpm install

# Build
pnpm build
```

## Initialize Project

```bash
# Initialize project fence
./dist/oxn init

# View built-in assets
./dist/oxn arsenal list
```

## First Task

### 1. Build Probe Asset

```bash
# View Probe meta Forge constraints
./dist/oxn forge probe

# Save a simple Probe
./dist/oxn forge probe --save '
type: fs_exists
description: "Check if file exists"
parameters:
  - name: pattern
    type: string
    required: true
' --name check-file

# Promote to Canonical
./dist/oxn arsenal promote probes/check-file
```

### 2. Write Blueprint

Create `my-task.yaml`:

```yaml
name: My First Task
stages:
  - id: create-file
    name: Create File
    target:
      description: "Create test.txt in project root"
    action:
      description: "Create a text file containing Hello World"
    spec:
      description: "File must exist and content must be correct"
    probes:
      - ref: check-file
        parameters:
          pattern: "test.txt"
```

### 3. Submit Task

```bash
# Submit Blueprint, Core compiles to generate Frozen snapshot
./dist/oxn task submit --blueprint my-task.yaml

# Record the returned task-id
```

### 4. Simulate AI Assistant Execution Flow

```bash
# Simulate AI Assistant getting instructions (only returns target + action, experience information hiding)
./dist/oxn task next --task-id <task-id>

# Manually create test.txt file (simulate AI Assistant building Artifact)
echo "Hello World" > test.txt

# Simulate AI Assistant submitting Core verification
./dist/oxn task verify --task-id <task-id> --stage-id create-file
```

### 5. View Results

```bash
# View task status
./dist/oxn task status --task-id <task-id>

# Export execution trace
./dist/oxn export
```

## Next Steps

- [Core Concepts](../architecture/concepts.md) - Deep understanding of Blueprint/Stage/Probe/Artifact
- [CLI Reference](./cli-reference.md) - Complete command documentation
- [Architecture](../architecture/intro.md) - System design principles