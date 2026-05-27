## ADDED Requirements

### Requirement: ProbeEvaluator 接收注入的策略映射

`ProbeEvaluator` **SHALL** 通过构造函数接收 `strategies` 参数，类型为 `Record<string, ProbeStrategy>`。

#### Scenario: 注入后 evaluateProbe 正常工作
- **WHEN** 创建 `new ProbeEvaluator({ strategies: { shell_exec: fn } })`
- **WHEN** 调用 `evaluator.evaluateProbe({ type: 'shell_exec', params: {} }, observation)`
- **THEN** 返回 `ProbeVerdict` 结果

#### Scenario: 未知策略返回错误 verdict
- **WHEN** 注入的 strategies 不包含某个类型
- **WHEN** 调用 `evaluateProbe` 使用该未知类型
- **THEN** 返回 `{ passed: false, message: 'Unknown probe type: ...' }`

### Requirement: Kernel 定义 ProbeStrategy 接口

`ProbeStrategy` **SHALL** 作为 Kernel 导出的类型，定义策略函数的签名。

#### Scenario: ProbeStrategy 类型为 (observation, params) => ProbeVerdict
- **WHEN** 检查 `ProbeStrategy` 类型
- **THEN** 类型为 `(obs: ProbeObservation, params: Record<string, unknown>) => ProbeVerdict`

### Requirement: 默认策略映射存在

`ProbeEvaluator` **SHALL** 提供静态默认策略映射，供组合根复用。

#### Scenario: 默认映射包含所有内置类型
- **WHEN** 访问 `ProbeEvaluator.defaultStrategies`
- **THEN** 包含 `fs_exists`, `fs_not_exists`, `fs_match`, `shell_exec` 等

### Requirement: CLI/Daemon 负责注入

组合根 **SHALL** 负责将 Infra 层的策略实现注入给 Kernel。

#### Scenario: CLI 组合根注入策略
- **WHEN** CLI 初始化时
- **THEN** 创建 `ProbeEvaluator` 并注入 Infra 的策略实现