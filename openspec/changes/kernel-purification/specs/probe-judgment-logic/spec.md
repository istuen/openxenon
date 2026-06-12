## ADDED Requirements

### Requirement: Work 层实现探针评判逻辑

Work SHALL 实现探针评判逻辑，基于物理观测值和期望规则返回判定结果。

#### Scenario: fs_exists 判定
- **WHEN** 观测值 `output: 'file1.txt\nfile2.txt'` 且期望 `files.length > 0`
- **THEN** 评判结果为 `PASSED`

#### Scenario: fs_not_exists 判定
- **WHEN** 观测值 `output: ''` 且期望无文件存在
- **THEN** 评判结果为 `PASSED`

#### Scenario: shell_exec 判定
- **WHEN** `exitCode === 0`
- **THEN** 评判结果为 `PASSED`

#### Scenario: exec_output_match 判定
- **WHEN** 输出匹配 `minLength` 和可选的 `pattern`
- **THEN** 评判结果为 `PASSED`

### Requirement: Work 支持 AND/OR 策略聚合

Work SHALL 支持对多个探针结果进行 AND/OR 聚合判定。

#### Scenario: AND 策略全部通过
- **WHEN** 所有观测值都 PASSED 且策略为 `AND`
- **THEN** 最终结果为 `PASSED`

#### Scenario: AND 策略部分失败
- **WHEN** 任一观测值 FAILED 且策略为 `AND`
- **THEN** 最终结果为 `FAILED`

#### Scenario: OR 策略至少一个通过
- **WHEN** 任一观测值 PASSED 且策略为 `OR`
- **THEN** 最终结果为 `PASSED`

#### Scenario: OR 策略全部失败
- **WHEN** 所有观测值都 FAILED 且策略为 `OR`
- **THEN** 最终结果为 `FAILED`

### Requirement: Work 处理未知探针类型

Work SHALL 处理未知探针类型，返回 `passed: false` 并包含错误消息。

#### Scenario: 未知探针类型
- **WHEN** 探针类型 `unknown_type` 无对应策略
- **THEN** 返回 `{ passed: false, message: 'Unknown probe type: unknown_type' }`

### Requirement: Work 支持可扩展策略

Work SHALL 支持通过构造函数注入自定义探针策略。

#### Scenario: 自定义策略注入
- **WHEN** 创建 `ProbeEvaluator` 时传入 `{ my_probe: (obs, params) => ... }`
- **THEN** `my_probe` 策略可用