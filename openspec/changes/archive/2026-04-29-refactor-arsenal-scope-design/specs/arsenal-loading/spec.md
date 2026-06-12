## ADDED Requirements

### Requirement: Scope parameter for arsenal scanning

The system SHALL support a `scope` parameter in `scanArsenalsDirectory` function to control which Arsenal directories to scan:
- `project`: Only scan project-level Arsenal (`<project>/.openxenon/arsenals/`)
- `global`: Only scan global Arsenal (`~/.openxenon/arsenals/`)
- `fallback` (default): Scan project first, if empty then scan global

#### Scenario: Scan with project scope
- **WHEN** `scanArsenalsDirectory('probes', 'draft', 'project')` is called
- **THEN** system returns only project-level probe assets

#### Scenario: Scan with global scope
- **WHEN** `scanArsenalsDirectory('probes', 'draft', 'global')` is called
- **THEN** system returns only global-level probe assets

#### Scenario: Scan with fallback scope (project has assets)
- **WHEN** `scanArsenalsDirectory('probes', 'draft', 'fallback')` is called and project has assets
- **THEN** system returns only project-level probe assets (no fallback to global)

#### Scenario: Scan with fallback scope (project is empty)
- **WHEN** `scanArsenalsDirectory('probes', 'draft', 'fallback')` is called and project is empty
- **THEN** system returns global-level probe assets

### Requirement: CLI --global flag for arsenal commands

The system SHALL support `--global` / `-g` flag on all arsenal commands:
- `oxn arsenal inspect --global`: List global draft assets only
- `oxn arsenal list --global`: List global assets only
- Without flag: Use `fallback` scope (project first, global fallback)

#### Scenario: List global assets with --global flag
- **WHEN** user runs `oxn arsenal list --global`
- **THEN** system displays only global Arsenal assets

#### Scenario: List project assets without --global flag (project has assets)
- **WHEN** user runs `oxn arsenal list` and project has assets
- **THEN** system displays only project Arsenal assets

#### Scenario: Fallback to global when project is empty
- **WHEN** user runs `oxn arsenal list` and project has no assets
- **THEN** system displays global Arsenal assets