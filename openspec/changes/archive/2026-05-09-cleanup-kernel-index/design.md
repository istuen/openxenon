## 当前 kernel/index.ts 问题

```typescript
// src/kernel/index.ts (当前)
export { fs } from '../infra/fs'           // ← 违规! I/O 模块
export { socket } from '../infra/socket'    // ← 违规! I/O 模块
export { process } from '../infra/process'  // ← 违规! I/O 模块
export { StagingManager } from '../infra/staging/staging-manager'  // ← 可能是 I/O
export { executeProbe } from './probes/executor'  // ← 已删除

export { validateDagTopology, topologicalSort }  // ✓ 纯函数
export { readTaskTraceFromContent, reduceTraceEvents }  // ✓ 纯函数
export { evaluateProbe, reduceProbeResults }  // ✓ 纯函数
```

## 修正后

```typescript
// src/kernel/index.ts (修正后)

// 纯函数
export { validateDagTopology, topologicalSort }
export { readTaskTraceFromContent, reduceTraceEvents }
export { evaluateProbe, reduceProbeResults }
export { buildTraceEvent, createProbeResult, createStageState }

// 类型
export type { ProbeVerdict, ProbeDefinition, ProbeResult } from './probes/evaluator'
export type { TaskTraceState, StageState, TraceEvent } from './lib/task-trace'
// ... 其他类型
```

## 移除的导出

| 导出 | 来源 | 移除原因 |
|------|------|----------|
| `fs` | `infra/fs` | I/O 模块，Kernel 不应暴露 |
| `socket` | `infra/socket` | I/O 模块 |
| `process` | `infra/process` | I/O 模块 |
| `StagingManager` | `infra/staging` | 可能包含 I/O |
| `executeProbe` | `probes/executor` | executor 已删除 |

## 验证

```bash
# 确认没有调用方使用 kernel.fs
grep -r "kernel\.fs\|from.*kernel.*fs" src/
```
