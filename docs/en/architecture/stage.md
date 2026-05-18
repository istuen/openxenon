# Stage

Stage is the minimum execution unit of Blueprint, defining a complete execution and verification closure.

## Four-Field Structure

Stage contains four flat fields, divided into two groups by visibility:

| Field | Visibility | Meaning |
|-------|------------|---------|
| `target` | Visible to AI | Execution scope constraint |
| `action` | Visible to AI | Execution instruction to AI |
| `spec` | Hidden from AI | Engineer's structured intent constraint |
| `probes` | Hidden from AI | Probe set for verifying stage completion |

## Structure Example

```yaml
id: create-user-model
name: Create User Model
target:
  description: "Create User model in src/models/ directory"
  scope: "src/models/"
action:
  description: "Use Prisma ORM to create User model with id, name, email fields"
spec:
  description: "Must use Prisma Client, field types correct, include indexes"
  constraints:
    - "Use Prisma schema definition"
    - "email field must have unique index"
probes:
  - ref: fs_exists
    parameters:
      pattern: "src/models/user.ts"
  - ref: fs_match
    parameters:
      pattern: "src/models/user.ts"
      contains: "@prisma/client"
```

## Information Hiding Design

**Why are spec and probes hidden from AI?**

1. **Prevent targeted optimization**: AI shouldn't know verification standards, avoid "test-hacking"
2. **Maintain objective evaluation**: Verification logic exclusively held by Core, AI cannot interfere
3. **Engineer control**: Verification standards are engineer's "trump card", shouldn't be exposed to executor

**Interaction Flow**:

```
AI calls taskNext
    │
    ▼
Core returns target + action (hides spec + probes)
    │
    ▼
AI executes operations, builds Artifact
    │
    ▼
AI calls taskVerify
    │
    ▼
Core extracts probes, verifies Artifact
    │
    ▼
Core returns verdict result
```

## Probe Combination

A Stage can contain multiple Probes, forming a complete verification closure:

```yaml
probes:
  - ref: fs_exists
    parameters:
      pattern: "dist/index.js"

  - ref: shell_exec
    parameters:
      command: "node dist/index.js --version"
      expectExitCode: 0
```

All Probes must pass for Stage to be judged as PASSED.

## Asset Value

- **Standard precipitation**: Stages can be reused across Blueprints
- **Composable**: Probe combinations form flexible verification logic
- **Accumulating**: Good Stages can be precipitated as team standards