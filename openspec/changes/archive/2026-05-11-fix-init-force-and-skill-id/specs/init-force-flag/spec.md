## ADDED Requirements

### Requirement: Init Force Flag
`oxn init -f` SHALL 实现强制覆盖，删除并重建 `.openxenon/` 目录。

### Requirement: Force Recreates Project Boundary
When `-f/--force` flag is provided and a project boundary already exists, the system SHALL delete the existing `.openxenon/` directory and recreate it from scratch.

### Requirement: Force Reinitializes All Components
When `-f/--force` flag is provided, the system SHALL:
1. Delete existing `.openxenon/` directory
2. Recreate `.openxenon/proofs/` and `.openxenon/tasks/` subdirectories
3. Copy meta files from arsenals/forges
4. Compile all Skills with force=true

### Requirement: Force Works on Fresh Project
When `-f/--force` flag is provided but no project boundary exists, the system SHALL behave identically to `oxn init` without force.

#### Scenario: Force on Existing Project
- **WHEN** user runs `oxn init -f` in a project with existing `.openxenon/`
- **THEN** the system deletes `.openxenon/` directory
- **AND** recreates all subdirectories and files
- **AND** recompiles all Skills

#### Scenario: Force on Fresh Project
- **WHEN** user runs `oxn init -f` in a project without `.openxenon/`
- **THEN** the system behaves as `oxn init` without force
- **AND** creates fresh `.openxenon/` directory
