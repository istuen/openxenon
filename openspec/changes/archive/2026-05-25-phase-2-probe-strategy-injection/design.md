## Context

### 当前状态

```typescript
// kernel/probes/evaluator.ts (当前实现)
const probeStrategies: Record<string, ProbeStrategy> = {
  fs_exists: (obs, params) => { ... },
  shell_exec: (obs, params) => { ... },
  ...
}
```

Kernel 内部硬编码了所有 probe 策略，违反了"依赖注入"原则。

### 核心问题

- Kernel 不应该"知道"具体 probe 执行逻辑
- 所有 strategy 在同文件定义，无法单独扩展
- 无法在测试时替换 mock 实现

## Goals / Non-Goals

**Goals:**
- 将 `probeStrategies` 从硬编码 map 改为注入方式
- Kernel 只定义 `ProbeStrategy` 接口，不关心实现
- Infra 层提供策略实现

**Non-Goals:**
- 不改变现有 `ProbeDefinition`, `ProbeObservation`, `ProbeVerdict` 类型
- 不改变 `evaluateProbe` 函数签名（对外接口一致）
- 不修改 Infra 层的具体策略实现（已经存在）

## Decisions

### Decision 1: 使用 class 封装注入配置

**选择:** 将 `ProbeEvaluator` 改为 class，构造函数接收注入配置

**理由:**
- TypeScript class 更适合带状态的注入场景
- 与现有 `ExpectationRunner` 的注入模式一致
- 便于后续扩展

### Decision 2: 保持函数式 API

**选择:** 同时保留静态方法 `evaluateProbe`

**理由:**
- 避免大规模破坏性变更
- CLI 层可以继续使用函数式调用

### Decision 3: 策略实现复用 Infra 已有代码

**选择:** Infra 层已有 `infra/probes/` 下的策略实现，复用而非重写

**理由:**
- `infra/probes/shell-exec.ts` 等文件已经实现了具体策略
- 避免重复代码

## Risks / Trade-offs

**风险:** 组合根需要显式注入所有策略

**缓解:** 提供默认策略映射，组合根可选择性覆盖

## Migration Plan

1. 修改 `kernel/probes/evaluator.ts`，新增 `ProbeEvaluator` class
2. 将硬编码 strategy 移至静态默认映射
3. CLI/Daemon 组合根注入 Infra 策略
4. 运行测试验证行为一致

## Open Questions

无