## ADDED Requirements

### Requirement: Task Submit Command
`oxn task submit --blueprint <path>` SHALL 提交 Blueprint YAML 文件给 Daemon，创建任务并返回 taskId。

### Requirement: Task Next Command
`oxn task next --task-id <id>` SHALL 获取当前任务的下一个待执行 Stage，返回 stageId、status、proofs。

### Requirement: Task Verify Command
`oxn task verify --task-id <id> --stage-id <sid>` SHALL 提交 Stage 验证，Daemon 执行 Probe 并返回 verdict。

### Requirement: Task Status Command
`oxn task status --task-id <id>` SHALL 获取任务当前状态。

### Requirement: Task Loop Closure
Task 循环 SHALL 实现完整链路：
1. AI 执行 `oxn task submit --blueprint <path>` 创建任务
2. AI 执行 `oxn task next --task-id <id>` 获取 Stage
3. AI 执行工作
4. AI 执行 `oxn task verify --task-id <id> --stage-id <sid>` 验证
5. 循环直到所有 Stage PASSED

### Requirement: Task Resume from Interruption
中断恢复时，AI 再次调用 `oxn task next --task-id <id>`，Daemon SHALL 返回当前进度（已完成的 Stage 跳过），不需要重新提交 Blueprint。

#### Scenario: Submit Blueprint Successfully
- **WHEN** AI 执行 `oxn task submit --blueprint .openxenon/tasks/my-task/blueprint.yaml`
- **THEN** Daemon 校验 Blueprint DAG 无环后创建任务
- **AND** 返回 `{ ok: true, data: { taskId: "t-xxx" } }`

#### Scenario: Get Next Stage
- **WHEN** AI 执行 `oxn task next --task-id t-xxx`
- **THEN** Daemon 返回 `{ ok: true, data: { stageId: "stage-1", status: "READY", proofs: [...] } }`

#### Scenario: Verify Stage PASSED
- **WHEN** AI 执行 `oxn task verify --task-id t-xxx --stage-id stage-1`
- **THEN** Daemon 执行 Probe 验证后返回 `{ ok: true, data: { verdict: "PASSED" } }`

#### Scenario: Verify Stage FAILED
- **WHEN** AI 执行 `oxn task verify --task-id t-xxx --stage-id stage-1` 但验证失败
- **THEN** Daemon 返回 `{ ok: true, data: { verdict: "FAILED", probeResults: [...] } }`
- **AND** AI 修正工作后重新 verify

#### Scenario: Resume After Interruption
- **WHEN** 中断后 AI 重新调用 `oxn task next --task-id t-xxx`
- **THEN** Daemon 返回下一个 READY 的 Stage（已完成的不再返回）
