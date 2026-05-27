## ADDED Requirements

### Requirement: taskNext 返回值隐私隔离

`taskNext` SHALL 只返回 `target` 和 `action` 字段，隐藏 `spec` 和 `probes`。

#### Scenario: 返回 target 和 action
- **WHEN** AI 调用 `taskNext --task-id <id>`
- **THEN** 系统返回 `{ taskId, stageId, target: { description, glob? }, action: { instruction?, command? } }`

#### Scenario: 不返回 spec 和 probes
- **WHEN** `taskNext` 返回响应
- **THEN** 响应中不包含 `spec`、`probes`、`proof` 字段

#### Scenario: 无下一个 Stage
- **WHEN** 所有 Stage 已完成或任务已完成
- **THEN** 返回 `{ stageId: null, status: "COMPLETED", message }`

### Requirement: 验证失败阻断推进

当 `taskVerify` 返回失败时，系统 SHALL 拒绝执行 `taskNext`，要求人工介入。

#### Scenario: 验证失败后拒绝 next
- **WHEN** Stage 验证失败后调用 `taskNext`
- **THEN** 系统抛出错误 `"Stage \"<name>\" verification failed. Abort or retry."`

#### Scenario: 验证成功后允许 next
- **WHEN** Stage 验证成功后调用 `taskNext`
- **THEN** 系统返回下一个待执行 Stage

### Requirement: Verify 从 frozen.yaml 读取 probes

`taskVerify` SHALL 从 `frozen.yaml` 读取该 Stage 的 probes，在真实文件系统上执行校验。

#### Scenario: 从 frozen 读取并执行 probes
- **WHEN** AI 调用 `taskVerify --task-id <id> --stage-id <stageId>`
- **THEN** 系统从 `blueprint.frozen.yaml` 读取该 Stage 的 `probes` 数组
- **AND** 系统逐一执行每个 probe
- **AND** 系统返回聚合结果

#### Scenario: 全部 probe 通过
- **WHEN** Stage 所有 probes 执行结果为 PASSED
- **THEN** 系统更新该 Stage 状态为 PASSED
- **AND** 系统返回 `{ passed: true, results: [...] }`

#### Scenario: 任一 probe 失败
- **WHEN** Stage 任一 probe 执行结果为 FAILED
- **THEN** 系统更新该 Stage 状态为 FAILED
- **AND** 系统返回 `{ passed: false, results: [...] }`
