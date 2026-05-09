## Why

`src/kernel/index.ts` 当前是**架构混乱的集中体现**：

```typescript
// kernel/index.ts (当前 - 混乱)
export { fs } from '../infra/fs'           // ← Kernel 导出 I/O!
export { socket } from '../infra/socket'    // ← Kernel 导出 I/O!
export { process } from '../infra/process' // ← Kernel 导出 I/O!
export { executeProbe } from './probes/executor'  // ← 导出违规的 executor
```

**问题**：
- Kernel 不应该导出 I/O 模块——这会误导工程师，让他们以为可以在 Kernel 层使用 fs/socket/process
- executor 已经被删除（由 `remove-kernel-executor` change 处理），index.ts 还需要清理
- 违反"兰姆达真空"原则——即使只是 re-export，Kernel 也不应该暴露 I/O 模块

## What Changes

1. **移除** `src/kernel/index.ts` 中对 `fs`, `socket`, `process` 的导出
2. **保留** 纯函数和类型的导出：
   - `validateDagTopology`, `topologicalSort`
   - `readTaskTraceFromContent`, `reduceTraceEvents`
   - `evaluateProbe`, `reduceProbeResults`（来自 evaluator）
   - 类型定义

## Impact

- Kernel 只暴露纯函数和类型
- 工程师无法通过 `kernel.fs` 误用 I/O
- 符合"兰姆达真空"架构

## High Risk

- 低风险 - 移除的是 re-export，不是实际使用
- 需要确认没有调用方依赖 `kernel.fs` 等
