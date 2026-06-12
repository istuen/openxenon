## MODIFIED Requirements

### Requirement: Tasks table schema

The system SHALL create a `tasks` table in `space.oxn` with columns:
- `id TEXT PRIMARY KEY`: Task ID
- `name TEXT NOT NULL`: Task name
- `status TEXT NOT NULL DEFAULT 'PENDING'`: Task status (PENDING/RUNNING/COMPLETED/ESCAPED/TERMINATED)
- `active_blueprint_id TEXT`: Active Blueprint ID reference
- `created_at INTEGER NOT NULL`: Creation timestamp
- `updated_at INTEGER NOT NULL`: Update timestamp

#### Scenario: Create tasks table
- **WHEN** `space.oxn` is initialized
- **THEN** system creates `tasks` table with defined schema

#### Scenario: Store task with active blueprint reference
- **WHEN** a Blueprint is promoted to CANONICAL
- **THEN** system updates `tasks.active_blueprint_id` to point to the Blueprint

### Requirement: Blueprints table schema

The system SHALL create a `blueprints` table in `space.oxn` with columns:
- `id TEXT PRIMARY KEY`: Blueprint ID
- `task_id TEXT NOT NULL`: Parent Task ID, foreign key references tasks(id)
- `name TEXT NOT NULL`: Blueprint name
- `status TEXT NOT NULL DEFAULT 'DRAFT'`: Blueprint status (DRAFT/CANONICAL/SAMPLE/ABANDONED)
- `created_at INTEGER NOT NULL`: Creation timestamp

#### Scenario: Create blueprints table
- **WHEN** `space.oxn` is initialized
- **THEN** system creates `blueprints` table with defined schema and foreign key to tasks

#### Scenario: Branch evolution support
- **WHEN** AI triggers evolution flow
- **THEN** system inserts a new Blueprint record (not UPDATE) with status DRAFT

### Requirement: Stages table schema

The system SHALL create a `stages` table in `space.oxn` with columns:
- `id TEXT PRIMARY KEY`: Stage ID
- `blueprint_id TEXT NOT NULL`: Parent Blueprint ID, foreign key references blueprints(id)
- `name TEXT NOT NULL`: Stage name
- `deps TEXT NOT NULL DEFAULT '[]'`: Dependency array as JSON
- `target TEXT NOT NULL`: Target state description
- `spec TEXT NOT NULL`: Execution spec boundary
- `action TEXT`: Action hint (optional)
- `proof TEXT NOT NULL`: Proof name or JSON array
- `status TEXT NOT NULL DEFAULT 'PENDING'`: Stage status (PENDING/RUNNING/PASSED/FAILED)
- `created_at INTEGER NOT NULL`: Creation timestamp
- `completed_at INTEGER`: Completion timestamp

#### Scenario: Create stages table
- **WHEN** `space.oxn` is initialized
- **THEN** system creates `stages` table with defined schema and foreign key to blueprints

#### Scenario: Immutable stage modification
- **WHEN** AI needs to modify a Stage's proof
- **THEN** system inserts a new Stage record (not UPDATE) with new ID

### Requirement: Migration metadata table

The system SHALL create a `_oxn_migrations` table in `space.oxn` with columns:
- `version TEXT PRIMARY KEY`: Migration version
- `applied_at INTEGER DEFAULT (unixepoch())`: Application timestamp

#### Scenario: Create migration metadata table
- **WHEN** XnMigrator first operates on database
- **THEN** system creates `_oxn_migrations` table

#### Scenario: Record migration execution
- **WHEN** a migration unit's up() succeeds
- **THEN** system inserts the version into `_oxn_migrations`
