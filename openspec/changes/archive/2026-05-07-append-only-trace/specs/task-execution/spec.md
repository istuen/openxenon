## MODIFIED Requirements

本文档描述对 `openspec/specs/task-execution/spec.md` 中需求的修改。

### Requirement: Task start command

**FROM**:
> The system SHALL provide `POST /api/v1/task/start` endpoint that:
> - Accepts task ID in request body
> - Updates task status from 'pending' to 'running'
> - Returns task status

**TO**:
The system SHALL provide `POST /api/v1/task/start` endpoint that:
- 接受 projectRoot 和完整 blueprintPayload（不接受孤立的 taskId）
- 追加 `TASK_START` 事件到 task-trace.yaml（append-only 模式）
- 返回任务启动确认

**Reason**: 从数据库状态更新改为文件系统追加事件模式

---

### Requirement: Step start command

**FROM**:
> The system SHALL provide `POST /api/v1/step/start` endpoint that:
> - Accepts step ID or (taskId + stepName) in request body
> - Updates step status from 'pending' to 'running'
> - Records startedAt timestamp
> - Returns step status

**TO**:
The system SHALL provide `POST /api/v1/step/start` endpoint that:
- 接受 projectRoot 和 stepId（从 blueprintPayload 解析）
- 追加 `STAGE_START` 事件到 task-trace.yaml
- 不接收外部传入的时间戳（时间戳由 Daemon 注入）

**Reason**: 消除竞态条件，时间戳来源统一

---

### Requirement: Step verify with name lookup

**FROM**:
> The system SHALL enhance `POST /api/v1/step/verify` to support step name lookup...

**TO**:
The system SHALL provide `POST /api/v1/step/verify` endpoint that:
- 接受 projectRoot 和 stepId（不接受孤立的 taskId）
- 执行 proof 后追加 `PROBE_RESULT` 事件
- 所有 probe 通过时追加 `STAGE_COMPLETE` 事件

**Reason**: 与 append-only 事件日志模式对齐
