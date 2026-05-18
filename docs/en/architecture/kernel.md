# Kernel (Pure Function Layer)

Kernel is OpenXenon's pure logic evaluation layer.

## Definition

Kernel is a pure function layer, zero side effects, only performs logical evaluation.

## Design Constraints

| Constraint | Description |
|------------|-------------|
| **Zero side effects** | No I/O operations |
| **Pure functions** | Same input always produces same output |
| **Stateless** | No runtime state maintenance |
| **Testable** | Independent unit testing |

## Core Responsibilities

### Probe Evaluation

```typescript
function evaluateProbe(
  definition: ProbeDefinition,
  observation: ProbeObservation
): ProbeVerdict {
  // Pure function evaluation
  // Doesn't understand "file", "command" semantics
  // Only compares symbols
}
```

### DAG Reduction

```typescript
function reduceDAG(
  dag: DAGGraph,
  stageId: string,
  verdict: StageVerdict
): DAGGraph {
  // Pure graph theory derivation
  // Unlocks downstream nodes
  // Returns new immutable DAG object
}
```

### Stage Reduction

```typescript
function reduceStageVerdict(
  probeResults: ProbeResult[],
  policy: 'AND' | 'OR'
): StageVerdict {
  if (policy === 'AND') {
    return probeResults.every(r => r.passed) ? 'PASSED' : 'FAILED'
  }
  if (policy === 'OR') {
    return probeResults.some(r => r.passed) ? 'PASSED' : 'FAILED'
  }
}
```

## Why Must It Be Pure Functions?

### 1. Testability

Pure functions can be independently unit tested without mocking filesystem:

```typescript
// Test probe evaluation
const result = evaluateProbe(
  { type: 'fs_exists', pattern: 'test.txt' },
  { files: ['test.txt'] }
)
expect(result.passed).toBe(true)
```

### 2. Reproducibility

Same input always produces same output, verdict results are predictable:

```typescript
// Execute at any time, any environment
evaluateProbe(def, obs)  // → same result
```

### 3. No Side Effects

Kernel doesn't touch filesystem, cannot accidentally modify files:

```typescript
// Kernel absolutely cannot have these operations
fs.readFileSync()    // ❌
process.exec()       // ❌
socket.send()        // ❌
```

## Operations Absolutely Forbidden in Kernel

| Operation | Reason |
|-----------|--------|
| Filesystem read/write | Produces side effects |
| Process execution | Produces side effects |
| Network requests | Produces side effects |
| State maintenance | Breaks pure function property |
| EventEmitter | Breaks passive invocation pattern |

## Invocation Chain

```
Daemon/Core Engine
    │
    ├──▶ Infra performs physical observation
    │         │
    │         ▼
    │    observation: ProbeObservation
    │
    └──▶ Kernel pure function evaluation
              │
              ▼
         verdict: ProbeVerdict
```

**Key Constraints**:

- Kernel **must never** actively call Infra
- Kernel **must never** have EventEmitter
- All calls must be: Core → Infra → Kernel → return result