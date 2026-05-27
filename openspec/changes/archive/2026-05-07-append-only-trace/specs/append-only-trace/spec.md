## ADDED Requirements

### Requirement: Append-only trace event format

task-trace.yaml 文件必须采用 JSONL（换行符分隔的 JSON）格式，每行是一个独立的事件对象。文件路径保持为 `.openxenon/tasks/<task_id>/task-trace.yaml`。

#### Scenario: 文件不存在时创建空白文件
- **WHEN** Daemon 首次为 task 创建 trace 文件
- **THEN** 系统创建空白文件（零字节），等待第一个事件追加

#### Scenario: 追加 TASK_START 事件
- **WHEN** task 开始执行时
- **THEN** 系统追加一行 `{"type":"TASK_START","taskId":"...","taskName":"...","timestamp":<unix_ms>}\n`

#### Scenario: 追加 TASK_STATUS 事件
- **WHEN** task 状态变更为 COMPLETED/FAILED/ESCAPED 时
- **THEN** 系统追加一行 `{"type":"TASK_STATUS","taskId":"...","status":"...","timestamp":<unix_ms>}\n`

#### Scenario: 追加 STAGE_START 事件
- **WHEN** stage 开始执行时
- **THEN** 系统追加一行 `{"type":"STAGE_START","taskId":"...","stageId":"...","stageName":"...","timestamp":<unix_ms>}\n`

#### Scenario: 追加 STAGE_COMPLETE 事件
- **WHEN** stage 执行完成时
- **THEN** 系统追加一行 `{"type":"STAGE_COMPLETE","taskId":"...","stageId":"...","status":"PASSED|FAILED","timestamp":<unix_ms>}\n`

#### Scenario: 追加 PROBE_RESULT 事件
- **WHEN** probe 执行完成时
- **THEN** 系统追加一行 `{"type":"PROBE_RESULT","taskId":"...","stageId":"...","probeType":"...","result":"PASSED|FAILED","output?":"...","error?":"...","timestamp":<unix_ms>}\n`

---

### Requirement: Append 操作原子性

所有写入必须使用 `appendFileSync`，禁止使用 `writeFileSync` 覆写整个文件。

#### Scenario: 多进程并发追加
- **WHEN** AI 进程和 Daemon 进程同时向同一 task-trace.yaml 追加事件时
- **THEN** 每条事件记录完整独立，不会出现两条记录交叉混合的情况

#### Scenario: 追加操作不被中断
- **WHEN** 追加事件时系统时钟正常
- **THEN** 每条事件的时间戳来自 Daemon 进程的 `Date.now()`，反映实际追加时刻

---

### Requirement: Reader 状态重建

读取 task-trace.yaml 时必须从第一行顺序扫描到最后一行的所有事件，以最后出现的状态作为当前状态（last-state-wins）。

#### Scenario: 从空白文件重建状态
- **WHEN** task-trace.yaml 存在但为空（零字节）
- **THEN** 读取返回 null，表示无有效 trace

#### Scenario: 从 TASK_START 事件重建基础状态
- **WHEN** trace 文件第一行是 TASK_START 事件
- **THEN** 读取获得 taskId, taskName, startedAt, status='RUNNING'

#### Scenario: STAGE_COMPLETE 覆盖 STAGE_START 状态
- **WHEN** trace 文件包含同一 stageId 的 STAGE_START 和 STAGE_COMPLETE 事件
- **THEN** 最终状态为 STAGE_COMPLETE 的 status（PASSED 或 FAILED）

#### Scenario: 多次状态变更取最新
- **WHEN** 同一 stage 发生多次 STAGE_COMPLETE 事件
- **THEN** 最后出现的事件决定最终状态

#### Scenario: PROBE_RESULT 追加到对应 stage
- **WHEN** 追加 PROBE_RESULT 事件且 stageId 为 "s1"
- **THEN** 该 probe 结果追加到 stage "s1" 的 probes 数组末尾

---

### Requirement: 时间戳来源约束

时间戳必须由 Daemon 进程在追加事件时注入，不允许 AI 在任何 JSON/YAML 文件中生成时间戳。

#### Scenario: 时间戳由 Daemon 注入
- **WHEN** Daemon 执行 appendTraceEvent 函数
- **THEN** timestamp 字段使用 `Date.now()` 的返回值，不接受外部传入时间戳

#### Scenario: AI 不生成时间戳
- **WHEN** AI 写入 step-manifest.json 或其他文件
- **THEN** 不包含 timestamp 字段（时间戳唯一合法来源是 Daemon 内存时钟或操作系统 fs.stat）

---

### Requirement: 旧格式迁移

对于已存在的旧格式 task-trace.yaml（全量 JSON 结构），系统必须在首次读取时自动迁移为新格式。

#### Scenario: 检测旧格式文件
- **WHEN** 读取 task-trace.yaml 时发现第一行以 `{` 开头且是完整 JSON 对象
- **THEN** 系统识别为旧格式，触发迁移流程

#### Scenario: 旧格式迁移为追加事件
- **WHEN** 识别到旧格式 TaskTraceYaml
- **THEN** 系统将其转换为一组 STAGE_START、STAGE_COMPLETE、PROBE_RESULT 事件，并追加到文件末尾

#### Scenario: 迁移后文件变为新格式
- **WHEN** 迁移完成后
- **THEN** task-trace.yaml 后续所有操作均使用新格式的追加模式

---

## MODIFIED Requirements

### Requirement: Task start command

**原文**（来自 `openspec/specs/task-execution/spec.md`）：
> The system SHALL provide `POST /api/v1/task/start` endpoint that:
> - Accepts task ID in request body
> - Updates task status from 'pending' to 'running'
> - Returns task status

**修改为**：
The system SHALL provide `POST /api/v1/task/start` endpoint that:
- 接受完整的 DaemonPayload（包含 projectRoot, blueprintPayload, policy）
- 不接受孤立的 taskId（必须通过 projectRoot 从文件系统解析）
- 追加 `TASK_START` 事件到 task-trace.yaml
- 返回任务启动确认

#### Scenario: 启动任务（完整 payload）
- **WHEN** POST /api/v1/task/start 携带 projectRoot 和完整 blueprintPayload
- **THEN** 系统追加 `{"type":"TASK_START",...}` 事件，返回启动成功

#### Scenario: 启动任务（缺少 projectRoot）
- **WHEN** POST /api/v1/task/start 只携带 taskId（无 projectRoot）
- **THEN** 系统返回 400 错误，拒绝不完整的 payload

---

### Requirement: Step start command

**原文**：
> The system SHALL provide `POST /api/v1/step/start` endpoint that:
> - Accepts step ID or (taskId + stepName) in request body
> - Updates step status from 'pending' to 'running'
> - Records startedAt timestamp
> - Returns step status

**修改为**：
The system SHALL provide `POST /api/v1/step/start` endpoint that:
- 接受 projectRoot 和 stepId（从 blueprintPayload 中解析 stage 信息）
- 追加 `STAGE_START` 事件到 task-trace.yaml（不接收 AI 传入的时间戳）

#### Scenario: Step 启动（完整 payload）
- **WHEN** POST /api/v1/step/start 携带 projectRoot 和 stepId
- **THEN** 系统追加 `{"type":"STAGE_START",...}` 事件到 task-trace.yaml

#### Scenario: Step 启动（无效 stepId）
- **WHEN** POST /api/v1/step/start 携带的 stepId 在 blueprint 中不存在
- **THEN** 系统返回 404 错误

---

### Requirement: Step verify with name lookup

**原文**：
> The system SHALL enhance `POST /api/v1/step/verify` to support step name lookup...

**修改为**：
The system SHALL provide `POST /api/v1/step/verify` endpoint that:
- 接受 projectRoot 和 stepId（从 blueprintPayload 中解析 proof 信息）
- 执行 proof 后，追加 `PROBE_RESULT` 事件到 task-trace.yaml
- 如果所有 probe 通过，追加 `STAGE_COMPLETE` 事件

#### Scenario: Step 验证成功
- **WHEN** POST /api/v1/step/verify 携带有效 projectRoot 和 stepId，且所有 proof 通过
- **THEN** 系统追加 `{"type":"PROBE_RESULT",...}` 和 `{"type":"STAGE_COMPLETE",...}` 事件

#### Scenario: Step 验证失败
- **WHEN** POST /api/v1/step/verify 携带有效 projectRoot 和 stepId，且有 proof 失败
- **THEN** 系统追加 `{"type":"PROBE_RESULT",...}` 事件（status=FAILED），并追加 `STAGE_COMPLETE` 事件（status=FAILED）
