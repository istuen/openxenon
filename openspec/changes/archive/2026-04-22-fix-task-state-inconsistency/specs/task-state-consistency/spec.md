## MODIFIED Requirements

### Requirement: Task status values

All task status values SHALL use uppercase format to match database CHECK constraint.

#### Scenario: Stop task with FAILED status
- **WHEN** user stops a running task via `oxn task stop`
- **THEN** system updates task status to 'FAILED' (uppercase) and returns success

#### Scenario: Start pending task
- **WHEN** user starts a pending task via `oxn task start`
- **THEN** system updates task status to 'RUNNING' (uppercase)

## ADDED Requirements

### Requirement: Task directory creation

The system SHALL create a task directory at `.openxenon/tasks/<task-id>/` when a task is started.

#### Scenario: Create task directory on start
- **WHEN** `oxn task start` is called for a pending task
- **THEN** system creates `.openxenon/tasks/<task-id>/` directory
- **AND** creates `step-manifest.json` in that directory

### Requirement: Project context resolution via process.cwd()

The Core engine SHALL resolve project context using `process.cwd()` directly.

#### Scenario: Core uses process.cwd() for project path
- **WHEN** Core receives an API request
- **THEN** Core uses `process.cwd()` to determine the project path
- **AND** looks for `.openxenon/project.oxn` in that directory

#### Scenario: Project not found at process.cwd()
- **WHEN** Core uses `process.cwd()` but no project.oxn exists
- **THEN** Core returns "Invalid project" error
