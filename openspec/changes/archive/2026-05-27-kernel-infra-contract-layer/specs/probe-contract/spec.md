# Probe Contract Specification

## ADDED Requirements

### Requirement: ProbeObservation 接口必须在 kernel/contracts 中定义

`ProbeObservation` 接口作为 Infra 层（观察者）与 Kernel 层（评判者）之间的唯一契约，必须定义在 `src/kernel/contracts/probe.ts` 中。该接口包含以下字段：

- `probeType: string` - 探针类型
- `output?: string` - 命令输出
- `error?: string` - 错误信息
- `executedAt: number` - 执行时间戳
- `exitCode?: number | null` - 退出码

Infra 层和 Kernel 层都必须引用此契约，不得自行定义重复接口。

#### Scenario: Infra 层使用契约定义返回观察结果
- **WHEN** Infra 的 `ProbeHandler` 执行完毕返回结果
- **THEN** 返回值的类型必须兼容 `kernel/contracts/probe.ts` 中的 `ProbeObservation` 接口

#### Scenario: Kernel 层使用契约定义处理输入
- **WHEN** Kernel 的 `ProbeStrategy` 接收观察结果
- **THEN** 输入参数的类型必须兼容 `kernel/contracts/probe.ts` 中的 `ProbeObservation` 接口

### Requirement: ProbeStrategy 与 ProbeHandler 必须配对

每个 `ProbeHandler`（在 `infra/probes/` 中实现）必须与对应的 `ProbeStrategy`（在 `kernel/probes/evaluator.ts` 中实现）配对。配对关系如下：

| Handler | Strategy | Observation Type |
|---------|----------|------------------|
| fs_exists | fs_exists | 文件存在时 output 包含文件路径 |
| fs_not_exists | fs_not_exists | 文件不存在时 output 为空 |
| fs_match | fs_match | 文件匹配时 error 为 undefined |
| shell_exec | shell_exec | 命令执行后 exitCode 有效 |
| exec_exit_zero | exec_exit_zero | 退出码为 0 |
| exec_output_match | exec_output_match | 输出匹配指定模式 |

#### Scenario: Handler 产生 Observation 被对应 Strategy 正确评判
- **WHEN** `fs_exists` Handler 返回 `output: '/path/file.txt'`
- **THEN** `fs_exists` Strategy 必须返回 `passed: true`

#### Scenario: Handler 产生 Observation 被错误 Strategy 处理
- **WHEN** `fs_exists` Handler 返回 `output: '/path/file.txt'`
- **THEN** 如果使用 `shell_exec` Strategy，评判结果未定义（不应发生）

### Requirement: ProbeStrategy 必须是纯函数

`ProbeStrategy` 类型定义为一个纯函数：

```typescript
type ProbeStrategy = (observation: ProbeObservation, params: Record<string, unknown>) => ProbeVerdict
```

该函数必须满足以下条件：
- 不产生任何副作用（不读取文件、不执行命令、不修改状态）
- 相同输入必须产生相同输出
- 不依赖外部状态（无全局变量引用）

#### Scenario: Strategy 函数不产生副作用
- **WHEN** 多次调用同一 Strategy 且输入相同
- **THEN** 每次调用都不修改任何外部状态

#### Scenario: Strategy 函数输出可预测
- **WHEN** 给定 `observation: { probeType: 'fs_exists', output: '/path/file.txt' }` 和 `params: { pattern: '/path/file.txt' }`
- **THEN** Strategy 返回 `passed: true`

### Requirement: ProbeHandler 签名必须兼容契约

`ProbeHandler` 类型定义为：

```typescript
type ProbeHandler = (params: Record<string, unknown>, context: ProbeContext) => Promise<ProbeObservation>
```

Infra 层必须实现此签名，且返回的 `ProbeObservation` 必须符合 `kernel/contracts/probe.ts` 中的定义。

#### Scenario: Handler 返回符合契约的观察结果
- **WHEN** `executeFsExists` 执行完毕
- **THEN** 返回的 `ProbeObservation` 包含 `probeType`, `output`, `executedAt` 字段

### Requirement: 探索模块的类型转换必须在 Kernel 层

探索模块中，Raw 类型到 Kernel 类型的转换必须在 Kernel 层进行。Infra 层负责采集 Raw 数据，Kernel 层负责转换为纯数据对象。

#### Scenario: Infra 采集 Raw 数据
- **WHEN** `infra/explore/collector.ts` 的 `collectRawContext` 执行
- **THEN** 返回 `RawExplorationContext` 类型

#### Scenario: Kernel 执行类型转换
- **WHEN** `kernel/explore/converters.ts` 的 `toExplorationContext` 执行
- **THEN** 将 `RawExplorationContext` 转换为 `ExplorationContext`
