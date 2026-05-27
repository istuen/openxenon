## ADDED Requirements

### Requirement: Work 层管理任务状态机

Work SHALL 管理任务实例的生命周期，包括 Pending → Running → Complete/Failed 状态转换。

#### Scenario: 任务启动
- **WHEN** Work 实例化任务
- **THEN** 状态初始化为 `PENDING`

#### Scenario: 任务开始执行
- **WHEN** 任务开始执行第一个 Part
- **THEN** 状态转为 `RUNNING`

#### Scenario: 任务执行完成
- **WHEN** 所有 Part 都成功完成
- **THEN** 状态转为 `COMPLETED`

#### Scenario: 任务执行失败
- **WHEN** 任一 Part 执行失败且不可恢复
- **THEN** 状态转为 `FAILED`

### Requirement: Work 记录任务追踪事件

Work SHALL 记录 `TASK_START`、`PART_START`、`PART_COMPLETE`、`PROBE_RESULT` 等事件，并存储在任务目录的 trace 文件中。

#### Scenario: 记录 PART_START 事件
- **WHEN** Part 开始执行
- **THEN** 写入 `TraceEvent { type: 'PART_START', partId: 'xxx', timestamp: ... }`

#### Scenario: 记录 PROBE_RESULT 事件
- **WHEN** 探针执行完成
- **THEN** 写入 `TraceEvent { type: 'PROBE_RESULT', probeId: 'xxx', result: 'PASSED' }`

### Requirement: Work 提供状态查询接口

Work SHALL 提供 `getTaskStatus()`、`getPartState()`、`getNextPendingPart()` 等查询接口。

#### Scenario: 查询任务状态
- **WHEN** 调用 `getTaskStatus(taskId)`
- **THEN** 返回当前状态 `RUNNING` 或 `COMPLETED` 或 `NOT_FOUND`

#### Scenario: 查询下一个待执行 Part
- **WHEN** 调用 `getNextPendingPart()`
- **THEN** 返回拓扑排序中下一个 `status === PENDING` 的 Part ID

### Requirement: Work 支持旧格式迁移

Work SHALL 支持从旧的 `TaskTraceYaml` 格式迁移到新的 `TraceEvent[]` 格式。

#### Scenario: 迁移旧 JSON 格式
- **WHEN** 读取旧格式 `task-trace.json`
- **THEN** 转换为 `TraceEvent[]` 并返回 `TaskTraceState`

#### Scenario: 忽略格式错误
- **WHEN** 旧格式包含解析错误
- **THEN** 静默跳过错误行，继续处理后续数据