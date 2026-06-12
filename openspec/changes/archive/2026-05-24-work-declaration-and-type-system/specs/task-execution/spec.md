## MODIFIED Requirements

### Requirement: Task start command

The system SHALL provide `POST /api/v1/task/start` endpoint that:
- Accepts task ID in request body
- Updates task status from 'pending' to 'running'
- Returns task status

**Changes:** `task` 相关 API 变更为 `work`，endpoint 路径调整。

#### Scenario: Start pending task
- **WHEN** POST request to `/api/v1/work/start` with valid pending task ID
- **THEN** system updates task status to 'running' and returns `{"workId": "...", "status": "running"}`

#### Scenario: Start already running task
- **WHEN** POST request with task ID that is already running
- **THEN** system returns current status without error

#### Scenario: Start non-existent task
- **WHEN** POST request with non-existent task ID
- **THEN** system returns 404 error

## REMOVED Requirements

### Requirement: Legacy TaskDeclaration

**Reason**: TaskDeclaration 已由 WorkDeclaration 替代，`task` keyword 不再作为顶级声明。

**Migration**: 使用 `work "name" type "task" ref "..."` 替代原有的 `task "name" use "..."` 语法。