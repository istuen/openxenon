## ADDED Requirements

### Requirement: Project directory structure

The system SHALL create a project physical boundary at `<project>/.xenonix/` that contains:
- `project.db`: Project state database (WAL mode)
- `proofs/`: Project-specific proof library (optional)
- `tasks/`: Task execution directory

#### Scenario: Initialize project boundary
- **WHEN** user runs `xn init` in a project directory
- **THEN** system creates `.xenonix/` directory with required subdirectories and files

#### Scenario: Register project to global core
- **WHEN** project boundary is created
- **THEN** system registers project path in `~/.xenonix/core.db`

#### Scenario: Detect existing project boundary
- **WHEN** user runs `xn init` in a directory that already has `.xenonix/`
- **THEN** system returns error indicating project is already initialized

### Requirement: Project state database

The system SHALL maintain a SQLite database at `<project>/.xenonix/project.db` with WAL mode enabled.

#### Scenario: Create project.db on initialization
- **WHEN** project boundary is created
- **THEN** system creates `project.db` with WAL mode and required tables

#### Scenario: Enable WAL mode
- **WHEN** `project.db` is created
- **THEN** system executes `PRAGMA journal_mode=WAL` to enable WAL mode

#### Scenario: Concurrent read/write access
- **WHEN** Core reads and AI writes to `project.db` simultaneously
- **THEN** system handles concurrent access without locking conflicts

### Requirement: Task directory structure

The system SHALL create task-specific directories at `<project>/.xenonix/tasks/<task_id>/` containing:
- `step-manifest.json`: Step progress file (AI writable)
- `task-trace.yaml`: Final task trace (Core generated)

#### Scenario: Create task directory on task start
- **WHEN** AI submits a new Playbook via `/api/v1/task/submit`
- **THEN** system creates `<task_id>/` directory under `tasks/`

#### Scenario: Initialize step-manifest.json
- **WHEN** task directory is created
- **THEN** system creates empty `step-manifest.json` file

### Requirement: Project proof library

The system SHALL support project-specific proofs at `<project>/.xenonix/proofs/` that override global proofs.

#### Scenario: Scan project proofs
- **WHEN** AI requests proofs list
- **THEN** system scans both global and project proof directories

#### Scenario: Project proof priority
- **WHEN** a proof exists in both global and project directories
- **THEN** system uses project proof first, global proof as fallback
