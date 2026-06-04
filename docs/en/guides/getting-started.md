# Getting Started

> Starting with v0.1, OpenXenon introduces a DDD dual-layer architecture.
> This document covers both the **traditional asset workflow** and the **v0.1 Domain/Task workflow**.

This document helps you run through OpenXenon's core flow in 5 minutes.

## Requirements

- **Bun**: >= 1.0.0
- **pnpm**: >= 8.0.0

## Install and Build

```bash
# Clone the repo
git clone https://forgejo.isteed.dev/issac/openxenon.git
cd openxenon

# Install dependencies
pnpm install

# Build
pnpm build
```

## Initialize the Project

```bash
# Initialize the project boundary
./dist/oxn init

# View built-in assets
./dist/oxn arsenal list
```

## v0.1 Flow: Domain + Task Demo

> 5 steps to demonstrate the DDD dual-layer architecture's core capabilities —
> Domain definition + Work orchestration + Task injection + Context isolation.

### 1. Define a DDD Domain

```bash
# Generate Domain skeleton
./dist/oxn domain new --name MemberContext
# Output: Created domain MemberContext at .openxenon/domains/member-context.oxn

# Edit .openxenon/domains/member-context.oxn, fill in the language
cat > .openxenon/domains/member-context.oxn <<'EOF'
domain "MemberContext" {
  description = "Member bounded context"
  language {
    noun "Member" desc "Registered member entity"
    verb "Register" desc "Submit registration form"
    ban = ["User", "Customer"]
  }
  domain_rules {
    rule "PasswordNeverPlaintext" desc "Passwords must never be stored in plaintext"
  }
}
EOF

# Validate
./dist/oxn domain validate --name MemberContext
# Domain MemberContext ✓ valid
```

### 2. Prepare a Blueprint

```bash
mkdir -p .openxenon/blueprints
cat > .openxenon/blueprints/dev-workflow.oxn <<'EOF'
blueprint "dev-workflow" {
  version = 1
  description = "Development workflow"
  slot "develop" { }
  slot "test" { deps = ["develop"] }
}
EOF
```

### 3. Author work.oxn (the orchestrator)

```bash
mkdir -p .openxenon/works/onboarding
cat > .openxenon/works/onboarding/work.oxn <<'EOF'
work "Onboarding" {
  context {
    goal = "Complete new-member registration"
    constraints = []
    loop_policy { max_iterations = 3 }
  }
  use_domain "MemberContext"
  use_blueprint "dev-workflow"
  task "Register" align "MemberContext.Register" {
    deps = []
  }
}
EOF
```

### 4. Create a Task (bound 1 Blueprint + inject 1 Domain)

```bash
./dist/oxn work task new \
  --work onboarding \
  --task register \
  --blueprint dev-workflow \
  --inject MemberContext
# Output: Created task register in work Onboarding at .openxenon/works/onboarding/tasks/register/task.oxn
```

### 5. Get the AI Context (**full isolation**)

```bash
./dist/oxn get-context --work onboarding --task register
# Output includes:
#   - Injected Domains (isolated): MemberContext
#   - Allowed Language: Nouns (must use): Member
#   - This task can only see domains in its inject list; other domains in the work are invisible.
```

---

## Traditional Flow: Assets + Work Demo

> v0.0.x compatible path. Continue using this if you don't need DDD isolation.

### 1. Build a Probe asset

```bash
# View Probe meta-Forge constraints
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

# Promote to Formal
./dist/oxn arsenal promote probes/check-file
```

### 2. Author a Blueprint

Create `my-task.oxn`:

```oxn
blueprint "my-task" {
  version = 1
  description = "My first task"
  slot "create-file" { }
  slot "verify-file" { deps = ["create-file"] }
}
```

### 3. Create a Work

```bash
# v0.0.x path (type-locked)
./dist/oxn work new my-work --type task --blueprint my-task

# v0.1 path (if work.oxn already exists, directly run)
./dist/oxn leader new --name my-work --blueprint-file .openxenon/blueprints/my-task.oxn
```

### 4. Simulate the AI assistant execution flow

```bash
# Start work state machine
./dist/oxn leader run --work-file .openxenon/works/my-work/work.oxn

# Advance part
./dist/oxn leader submit --work-name my-work
```

### 5. View results

```bash
# View Work status
./dist/oxn leader status --work-name my-work

# Open the Studio (Hall)
./dist/oxn hall
```

---

## v0.1 Migration Tool (Upgrade Existing Projects)

If your project already has legacy work spaces (`work/task/<name>.oxn` or single-layer state.json), run:

```bash
# Preview
./dist/oxn work migrate --dry-run

# Actual migration
./dist/oxn work migrate
```

The migration will:
- Transform `work/task/<name>.oxn` into `works/<name>/work.oxn`
- Rewrite `task "X" use "..."` to `task "X" blueprint "..."`
- Split single-layer `state.json` into workspace-level + single-task-level

## Next Steps

- [Core Concepts](../architecture/concepts.md) - Deep dive into Domain/Blueprint/Task/Work
- [DDD Dual-Layer Architecture](../architecture/ddd-dual-layer.md) - v0.1 architecture details
- [CLI Reference](./cli-reference.md) - Full command documentation
- [Architecture Design](../architecture/) - System design rationale
