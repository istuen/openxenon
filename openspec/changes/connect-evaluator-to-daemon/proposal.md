## Why

当前 `daemon/engine/executor.ts` 在执行 probe 后，直接在本地做判断：

```typescript
// daemon/engine/executor.ts (当前 - 绕过 Kernel)
const allPassed = probeResults.every(r => r.result === 'PASSED')
```

这违反了**三权分立**架构——评判权属于 Kernel，Daemon 只应做编排。

**问题**：
- Daemon 绕过了 Kernel 的纯函数 evaluator
- 探针结果的评判逻辑分散在多处
- 违反"三权分立"宪法

## What Changes

1. **修改** `daemon/engine/executor.ts` - 在获取 probe 结果后调用 `kernel/evaluator`
2. **使用** `evaluateProbe()` 和 `reduceProbeResults()` 进行评判
3. **统一** ProbeResult 接口（来自 infra/probes）

## Impact

- 完整的三权分立：能力(Infra) → 评判(Kernel) → 编排(Daemon)
- probe 评判逻辑集中在 kernel/evaluator
- Daemon 只负责编排，不做逻辑判断

## High Risk

- 需要统一 ProbeResult 接口（executor.ts 删除后）
- evaluator.evaluateProbe 接收的 actualResult 必须与 infra/probes 返回的结果格式一致
