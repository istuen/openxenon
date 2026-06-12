## ADDED Requirements

### Requirement: oxn standard show command

The system SHALL provide `oxn standard show <name>` command to display standard asset content:
- First searches project-level Arsenal for the asset
- If not found in project, falls back to global Arsenal
- If not found in either, displays error message

#### Scenario: Show standard from project Arsenal
- **WHEN** user runs `oxn standard show my-stage` and project has `my-stage` in canonical
- **THEN** system displays content from project Arsenal

#### Scenario: Show standard fallback to global Arsenal
- **WHEN** user runs `oxn standard show my-stage` and project does NOT have it but global does
- **THEN** system displays content from global Arsenal

#### Scenario: Show standard not found anywhere
- **WHEN** user runs `oxn standard show non-existent` and it exists nowhere
- **THEN** system displays error: "Standard 'non-existent' not found in project or global Arsenal"

### Requirement: oxn standard list command

The system SHALL provide `oxn standard list` command to list all canonical standards:
- Lists project-level canonical standards
- If project is empty, lists global canonical standards

#### Scenario: List project standards
- **WHEN** user runs `oxn standard list` and project has canonical assets
- **THEN** system displays project canonical assets

#### Scenario: List global standards (project empty)
- **WHEN** user runs `oxn standard list` and project has no canonical assets
- **THEN** system displays global canonical assets

### Requirement: oxn standard promote command

The system SHALL provide `oxn standard promote <name>` command:
- Without `--global`: Promotes project-level draft to canonical
- With `--global`: Promotes project-level draft to global Arsenal

#### Scenario: Promote project standard to canonical
- **WHEN** user runs `oxn standard promote my-stage`
- **THEN** system promotes project draft to project canonical

#### Scenario: Promote project standard to global
- **WHEN** user runs `oxn standard promote my-stage --global`
- **THEN** system promotes project draft to global Arsenal