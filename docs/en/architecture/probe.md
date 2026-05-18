# Probe

Probe is the minimum verification unit, performs physical observation and returns verdict result.

## Definition

Probe is atomic check logic that obtains facts through physical observation (filesystem, process), evaluated by Kernel pure function.

## Three-Phase Execution

```
┌─────────────────────────────────────────────────────────────┐
│                    Probe Three Phases                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Contract Layer] YAML Definition                           │
│  ├─ type: fs_exists                                        │
│  ├─ description: "Check if file exists"                     │
│  └─ parameters: [{ name: pattern, type: string }]          │
│                                                              │
│  [Capability Layer] Infra Execution                         │
│  ├─ Touch filesystem/process                                │
│  └─ Return physical facts (e.g., file list)                │
│                                                              │
│  [Evaluation Layer] Kernel Evaluation                        │
│  ├─ Pure function computation                               │
│  └─ Return ProbeVerdict { passed, message }                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Built-in Probe Types

| Type | Capability Layer Implementation | Evaluation Layer Logic |
|------|-------------------------------|----------------------|
| `fs_exists` | `glob()` filesystem scan | `found.length > 0` |
| `fs_not_exists` | `glob()` filesystem scan | `found.length === 0` |
| `fs_match` | `readFile()` + `RegExp.test()` | `pattern.test(content)` |
| `shell_exec` | `spawn()` execute command | `exitCode === 0` |

## Structure Example

```yaml
type: fs_exists
description: "Check if file exists"
parameters:
  - name: pattern
    type: string
    required: true
    description: "glob pattern to match file paths"
```

## Execution Flow

```
Core calls taskVerify
    │
    ▼
Extract Stage.probes
    │
    ▼
For each Probe:
    ├─ Infra performs physical observation
    ├─ Kernel pure function evaluation
    └─ Record ProbeVerdict
    │
    ▼
All Probes pass → Stage PASSED
Any Probe fails → Stage FAILED
```

## Design Principles

### Single Responsibility

Each Probe only performs single type of check:

```yaml
# ✅ Correct: Single check
type: fs_exists
parameters:
  pattern: "dist/index.js"

# ❌ Wrong: Mixed check
type: fs_exists_and_match
parameters:
  pattern: "dist/index.js"
  contains: "export"
```

### Composition

Complex verification achieved through multiple Probe composition:

```yaml
probes:
  - ref: fs_exists
    parameters:
      pattern: "dist/index.js"

  - ref: fs_match
    parameters:
      pattern: "dist/index.js"
      contains: "export default"

  - ref: shell_exec
    parameters:
      command: "node dist/index.js"
```

## Asset Value

- **Judgment precipitation**: Engineer's verification experience can be encoded as Probe
- **Composable**: Multiple Probes combine to form complex verification logic
- **Reusable**: Probes can be reused across Stages, across Blueprints