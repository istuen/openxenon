## ADDED Requirements

### Requirement: Arsenal list displays stages assets

`oxn arsenal list` SHALL display all stages assets from the project Arsenal, including those in `stages/<name>/canonical.yaml` format.

#### Scenario: List all assets including stages

- **WHEN** user executes `oxn arsenal list` without filters
- **THEN** system SHALL display all stages assets alongside probes, proofs, and blueprints

### Requirement: Arsenal list supports type filter

`oxn arsenal list` SHALL support `--type <type>` parameter where type is one of: `probe`, `proof`, `stage`, `blueprint`.

#### Scenario: Filter by type probe

- **WHEN** user executes `oxn arsenal list --type probe`
- **THEN** system SHALL display only probes assets

#### Scenario: Filter by type stage

- **WHEN** user executes `oxn arsenal list --type stage`
- **THEN** system SHALL display only stages assets

#### Scenario: Filter by type blueprint

- **WHEN** user executes `oxn arsenal list --type blueprint`
- **THEN** system SHALL display only blueprints assets

### Requirement: Arsenal list supports scope filter

`oxn arsenal list` SHALL support `--scope <scope>` parameter where scope is one of: `project`, `global`, `builtin`, `fallback`.

#### Scenario: Filter by scope project

- **WHEN** user executes `oxn arsenal list --scope project`
- **THEN** system SHALL display only project-level assets

#### Scenario: Filter by scope builtin

- **WHEN** user executes `oxn arsenal list --scope builtin`
- **THEN** system SHALL display only builtin assets (probes and proofs)

### Requirement: Arsenal list combines type and scope filters

`oxn arsenal list` SHALL support combining `--type` and `--scope` parameters.

#### Scenario: Filter by type probe and scope builtin

- **WHEN** user executes `oxn arsenal list --type probe --scope builtin`
- **THEN** system SHALL display only builtin probes