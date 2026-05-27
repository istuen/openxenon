## MODIFIED Requirements

### Requirement: Get next step

系统 SHALL 提供 `GET /api/v1/task/next` 端点，接受 task ID 作为查询参数，返回下一个待执行的 Stage，只包含 `target` 和 `action`。

#### Scenario: Get next pending step
- **WHEN** GET request to `/api/v1/task/next?taskId=<id>` for running task with pending stages
- **THEN** 系统返回 `{ taskId: "...", stageId: "...", target: { description: "...", glob?: "..." }, action: { instruction?: "...", command?: "..." } }`

#### Scenario: Stage with target and action
- **WHEN** frozen blueprint 中 Stage 包含 `target` 和 `action` 字段
- **THEN** `taskNext` 返回这些字段给 AI

#### Scenario: 不返回 spec 和 probes 给 AI
- **WHEN** `taskNext` 返回响应
- **THEN** 响应中不包含 `spec`、`probes`、`proof` 字段（这些是 Core 的私有裁决数据）

#### Scenario: All stages complete
- **WHEN** GET request for task with all stages passed
- **THEN** 系统返回 `{ stageId: null, status: "COMPLETED", message: "All stages completed" }`

#### Scenario: Task not running
- **WHEN** GET request for task with status 'pending'
- **THEN** 系统返回 `{ stageId: null, message: "Task not started" }`

#### Scenario: Verification failed, reject next
- **WHEN** GET request for task where current stage verification failed
- **THEN** 系统抛出错误 `"Stage \"<name>\" verification failed. Abort or retry."`
