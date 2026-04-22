# flat-schema-migration Specification

## Purpose
TBD - created by archiving change migrate-to-flat-schema. Update Purpose after archive.
## Requirements
### Requirement: Project database uses three-table flat schema

The system SHALL create project database with three related tables: `tasks`, `blueprints`, and `stages`.

#### Scenario: Initialize project database with three-table schema
- **WHEN** `initProjectDb()` is called
- **THEN** system creates `tasks` table with columns: id, name, status, active_blueprint_id
- **AND** system creates `blueprints` table with columns: id, task_id, name, status, created_at
- **AND** system creates `stages` table with columns: id, blueprint_id, deps, target, spec, action, proof, status, created_at, completed_at

#### Scenario: Foreign key relationships enforced
- **WHEN** `blueprints` table has a record
- **THEN** `blueprints.task_id` references `tasks.id`
- **AND** `stages.blueprint_id` references `blueprints.id`

#### Scenario: Stages have JSON deps array
- **WHEN** a stage is created
- **THEN** `stages.deps` stores JSON array of dependency stage IDs
- **AND** `stages.target` stores target state description
- **AND** `stages.proof` stores proof probe name

### Requirement: Detect old schema and migrate automatically

The system SHALL detect when project database uses old flat schema (tasks.playbook JSON blob) and migrate to new three-table schema.

#### Scenario: Detect old schema by playbook column
- **WHEN** `loadProjectContext()` opens project database
- **THEN** system checks if `tasks.playbook` column exists
- **IF** playbook column exists
- **THEN** system triggers automatic migration to new schema

#### Scenario: Migrate playbook JSON to blueprints and stages
- **WHEN** old schema is detected and migration runs
- **THEN** system creates a `blueprints` record for each task
- **AND** system creates `stages` records from playbook.stages array
- **AND** system updates `tasks.active_blueprint_id` to point to created blueprint
- **AND** system drops `tasks.playbook` column after migration

#### Scenario: Migration creates indexes
- **WHEN** migration creates new tables
- **THEN** system creates indexes on: blueprints(task_id), stages(blueprint_id), stages(status)

### Requirement: Migration preserves existing task data

The system SHALL migrate all existing task data without data loss.

#### Scenario: Migrate task with multiple stages
- **WHEN** old task has playbook with 3 stages
- **THEN** after migration: 1 blueprint and 3 stages created
- **AND** all stage names, specs, proofs preserved

#### Scenario: Migration handles empty playbook
- **WHEN** old task has empty playbook or null playbook
- **THEN** system creates blueprint with empty stages array
- **AND** migration completes without error

### Requirement: Provide migration dry-run mode

The system SHALL provide `oxn migrate --dry-run` to preview migration without making changes.

#### Scenario: Dry-run shows migration plan
- **WHEN** user runs `oxn migrate --dry-run`
- **THEN** system displays: number of tasks to migrate, number of blueprints to create, number of stages to create
- **AND** no database changes are made

### Requirement: Migration uses transaction for atomicity

The system SHALL execute migration within a transaction to ensure atomicity.

#### Scenario: Migration failure rolls back
- **WHEN** migration encounters an error mid-process
- **THEN** system rolls back all changes
- **AND** database remains in original schema state

