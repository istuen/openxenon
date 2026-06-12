## ADDED Requirements

### Requirement: Projects table schema

The system SHALL create a `projects` table in `core.db` with columns:
- `id` TEXT PRIMARY KEY: Project UUID
- `path` TEXT UNIQUE NOT NULL: Project absolute path
- `name` TEXT: Project name
- `status` TEXT DEFAULT 'active': Project status
- `last_heartbeat` INTEGER: Last heartbeat timestamp
- `created_at` INTEGER: Creation timestamp
- `updated_at` INTEGER: Update timestamp

#### Scenario: Create projects table
- **WHEN** `core.db` is initialized
- **THEN** system creates `projects` table with defined schema

#### Scenario: Insert new project
- **WHEN** user runs `xn init` in a new project
- **THEN** system inserts a new record into `projects` table

#### Scenario: Enforce unique project paths
- **WHEN** attempt to insert duplicate project path
- **THEN** system rejects insertion with constraint error

### Requirement: Tasks table schema

The system SHALL create a `tasks` table in `project.db` with columns:
- `id` TEXT PRIMARY KEY: Task ID
- `name` TEXT NOT NULL: Task name
- `playbook` TEXT NOT NULL: Playbook JSON
- `status` TEXT DEFAULT 'pending': Task status
- `created_at` INTEGER: Creation timestamp
- `updated_at` INTEGER: Update timestamp

#### Scenario: Create tasks table
- **WHEN** `project.db` is initialized
- **THEN** system creates `tasks` table with defined schema

#### Scenario: Store Playbook as JSON
- **WHEN** AI submits a Playbook
- **THEN** system serializes Playbook to JSON and stores in `playbook` column

### Requirement: Steps table schema

The system SHALL create a `steps` table in `project.db` with columns:
- `id` TEXT PRIMARY KEY: Step ID
- `task_id` TEXT NOT NULL: Parent task ID
- `name` TEXT NOT NULL: Step name
- `spec` TEXT NOT NULL: Execution spec
- `proof` TEXT NOT NULL: Proof ID
- `status` TEXT DEFAULT 'pending': Step status
- `started_at` INTEGER: Start timestamp
- `completed_at` INTEGER: Completion timestamp
- `last_heartbeat` INTEGER: Last heartbeat timestamp
- `manifest_snapshot` TEXT: step-manifest.json snapshot

#### Scenario: Create steps table
- **WHEN** `project.db` is initialized
- **THEN** system creates `steps` table with defined schema and foreign key reference to `tasks`

#### Scenario: Query steps by task
- **WHEN** Core needs to get all steps for a task
- **THEN** system efficiently queries using `task_id` index

### Requirement: Escape logs table schema

The system SHALL create an `escape_logs` table in `project.db` with columns:
- `id` INTEGER PRIMARY KEY AUTOINCREMENT: Log ID
- `task_id` TEXT NOT NULL: Task ID
- `step_id` TEXT NOT NULL: Step ID
- `detected_at` INTEGER NOT NULL: Detection timestamp
- `manifest_before` TEXT: Manifest snapshot before change
- `manifest_after` TEXT: Manifest snapshot after change

#### Scenario: Create escape_logs table
- **WHEN** `project.db` is initialized
- **THEN** system creates `escape_logs` table with defined schema

#### Scenario: Record escape detection
- **WHEN** Core detects AI escape
- **THEN** system inserts a record into `escape_logs` table

### Requirement: Proof logs table schema

The system SHALL create a `proof_logs` table in `project.db` with columns:
- `id` INTEGER PRIMARY KEY AUTOINCREMENT: Log ID
- `step_id` TEXT NOT NULL: Step ID
- `proof_name` TEXT NOT NULL: Proof name
- `result` TEXT NOT NULL: Verification result (success/failure)
- `output` TEXT: Verification output
- `executed_at` INTEGER NOT NULL: Execution timestamp

#### Scenario: Create proof_logs table
- **WHEN** `project.db` is initialized
- **THEN** system creates `proof_logs` table with defined schema

#### Scenario: Record proof execution
- **WHEN** Core executes a proof
- **THEN** system inserts execution result into `proof_logs` table

### Requirement: Database indexes

The system SHALL create indexes on:
- `steps(task_id)`: Optimize step queries by task
- `escape_logs(task_id)`: Optimize escape log queries
- `proof_logs(step_id)`: Optimize proof log queries

#### Scenario: Create database indexes
- **WHEN** `project.db` is initialized
- **THEN** system creates all defined indexes

#### Scenario: Index-based query optimization
- **WHEN** Core queries steps by task_id
- **THEN** SQLite uses index for efficient lookup
