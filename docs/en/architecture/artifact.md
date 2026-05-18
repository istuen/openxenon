# Artifact

Artifact is the execution result built by AI Assistant, and the object verified by Core.

## Definition

Artifact is the physical entity produced after AI Assistant executes operations according to `target` and `action`, including:

- Files (created, modified)
- Directory structure
- Command execution results
- Other observable changes

## Position in Interaction Flow

```
AI calls taskNext
    │
    ▼
Core returns target + action
    │
    ▼
AI executes operations
    │
    ▼
AI builds Artifact ←── Artifact produced here
    │
    ▼
AI calls taskVerify
    │
    ▼
Core observes Artifact with Probes
    │
    ▼
Core returns verdict result
```

## Relationship Between Artifact and Probe

Probe is the "sensor" that observes Artifact:

| Probe Type | Observation Object | Evaluation Logic |
|------------|-------------------|------------------|
| `fs_exists` | Filesystem | Whether specified file exists in Artifact |
| `fs_match` | File content | Whether Artifact file content matches |
| `shell_exec` | Process state | Whether Artifact runs correctly |

## Example

**Stage Definition**:

```yaml
target:
  description: "Create user model file"
action:
  description: "Use Prisma to create User model"
probes:
  - ref: fs_exists
    parameters:
      pattern: "src/models/user.ts"
```

**Artifact produced after AI execution**:

```
src/
└── models/
    └── user.ts    ← Artifact
```

**Probe Observation**:

```bash
# Infra execution
glob("src/models/user.ts")  # → ["src/models/user.ts"]

# Kernel evaluation
found.length > 0  # → PASSED
```

## Artifact Tracing

All Artifact building processes are recorded in task-trace.yaml:

```yaml
- type: STAGE_START
  stageId: create-user-model
  timestamp: 1704067200

- type: PROBE_RESULT
  probeType: fs_exists
  pattern: "src/models/user.ts"
  result: PASSED
  timestamp: 1704067210

- type: STAGE_COMPLETE
  stageId: create-user-model
  status: PASSED
  timestamp: 1704067215
```

## Asset Value

- **Traceable**: Each Artifact has complete building record
- **Reviewable**: Can trace Artifact building process on failure
- **Verifiable**: Artifact is objective physical entity, cannot be fabricated