## MODIFIED Requirements

### Requirement: Project physical boundary structure

The system SHALL create a project physical boundary at `<project>/.openxenon/` that contains:
- `space.oxn`: Project SQLite database (previously project.oxn)
- `drafts/`: Draft input directory (engineer-editable blueprints)
- `active/`: Active projection directory (oxn export generated, read-only)
- `archive/`: Archive projection directory (oxn export generated, read-only)
- `proofs/`: Project-level proof library directory
- `tasks/`: Step manifest pipeline directory

#### Scenario: Initialize project boundary
- **WHEN** user runs `xn init` in a project
- **THEN** system creates `.openxenon/` directory with all required subdirectories

#### Scenario: Directory responsibilities isolation
- **WHEN** project boundary is initialized
- **THEN** drafts/ is the only writable directory for external input

### Requirement: Drafts directory

The `.openxenon/drafts/` directory SHALL be the single entry point for external writes.

File naming convention: `{blueprint_id}-{timestamp}.yaml` or `{blueprint_id}-{timestamp}.json`

#### Scenario: Draft file creation
- **WHEN** engineer creates or extracts a draft
- **THEN** system saves file to drafts/ with proper naming

#### Scenario: Draft backup on apply
- **WHEN** `oxn draft apply` succeeds
- **THEN** system copies the draft file to drafts/ as backup (does not delete original)

### Requirement: Active directory

The `.openxenon/active/` directory SHALL contain read-only projections of currently running Task/Blueprint structures.

File naming convention: `{task_id}.md`

#### Scenario: Active projection generation
- **WHEN** user runs `oxn export active`
- **THEN** system generates Markdown with Mermaid DAG and YAML blocks to active/

#### Scenario: Active projection update
- **WHEN** active Blueprint changes (status transition)
- **THEN** subsequent export overwrites the existing file

### Requirement: Archive directory

The `.openxenon/archive/` directory SHALL contain read-only projections of completed/terminated/abandoned Tasks.

File naming convention: `{task_id}.md`

#### Scenario: Archive projection generation
- **WHEN** user runs `oxn export archive` or Task reaches terminal status
- **THEN** system generates complete Markdown document to archive/

#### Scenario: Archive retention
- **WHEN** a Task reaches COMPLETED or TERMINATED status
- **THEN** archive file is retained indefinitely for audit trail
