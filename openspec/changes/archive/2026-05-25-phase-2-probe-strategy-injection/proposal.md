## Why

当前 `kernel/probes/evaluator.ts` 内部硬编码了 `probeStrategies` map，这意味着 Kernel 直接绑定了具体的 probe 执行逻辑。根据"依赖注入"原则，Kernel 应该只定义 `ProbeStrategy` 接口，由 Infra 层实现具体策略，CLI/Daemon 组合根负责注入。

## What Changes

- 将 `kernel/probes/evaluator.ts` 内的硬编码 strategy map 改为注入方式
- Kernel 导出 `ProbeStrategy` 类型和 `ProbeEvaluator` 类（接收注入的 strategies）
- Infra 层实现具体策略函数（`shellExecStrategy`, `fsExistsStrategy` 等）
- CLI/Daemon 组合根负责绑定注入

## Capabilities

### New Capabilities
- `probe-strategy-injection`: 支持通过依赖注入方式为 Kernel 提供 probe 策略

### Modified Capabilities
- `probe-type-schema`: ProbeTypeSchema 下沉到 Kernel 后，Infra 实现具体的 strategy 函数

## Impact

### 受影响的文件

**Kernel 层（需改造）：**
- `kernel/probes/evaluator.ts` - 改为注入模式

**Infra 层（新增实现）：**
- `infra/probes/` - 已存在具体策略实现

**组合根（需新增注入逻辑）：**
- CLI 入口
- Daemon 入口