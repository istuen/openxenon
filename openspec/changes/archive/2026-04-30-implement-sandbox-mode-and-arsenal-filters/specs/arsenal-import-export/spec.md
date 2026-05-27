## ADDED Requirements

### Requirement: Arsenal export command

The system SHALL provide `oxn arsenal export` to export project Arsenal to an external directory.

#### Scenario: Export canonical assets (default)
- **WHEN** engineer runs `oxn arsenal export /path/to/target`
- **THEN** system copies project `arsenals/*/canonical.*` to `/path/to/target/arsenals/`
- **AND** preserves directory structure

#### Scenario: Export with --draft flag
- **WHEN** engineer runs `oxn arsenal export /path/to/target --draft`
- **THEN** system copies only `arsenals/*/draft.*` files

#### Scenario: Export with --all flag
- **WHEN** engineer runs `oxn arsenal export /path/to/target --all`
- **THEN** system copies draft, canonical, and archive files

#### Scenario: Export with --archive flag
- **WHEN** engineer runs `oxn arsenal export /path/to/target --archive`
- **THEN** system copies only `arsenals/*/archive/*` files

### Requirement: Arsenal import command

The system SHALL provide `oxn arsenal import` to import assets from external directory to project.

#### Scenario: Import canonical assets (default)
- **WHEN** engineer runs `oxn arsenal import /path/to/source`
- **THEN** system copies `/path/to/source/arsenals/*/canonical.*` to project `arsenals/`
- **AND** skips files that already exist in project

#### Scenario: Import with --force覆盖
- **WHEN** engineer runs `oxn arsenal import /path/to/source --force`
- **THEN** system overwrites existing canonical files in project
- **AND** system does NOT prompt for confirmation

#### Scenario: Import skips existing by default
- **WHEN** engineer runs `oxn arsenal import /path/to/source`
- **AND** project already has `arsenals/stages/create-user/canonical.md`
- **THEN** system skips importing create-user
- **AND** reports skipped count in summary

### Requirement: Arsenal promote command

The system SHALL promote assets within project Arsenal hierarchy.

#### Scenario: Promote from Task to Project
- **WHEN** engineer runs `oxn arsenal promote <asset-path>`
- **THEN** system moves/copies asset from tasks/<task_id>/blueprints/ to .openxenon/arsenals/

#### Scenario: Promote to global
- **WHEN** engineer runs `oxn arsenal promote <asset-path> --global`
- **THEN** system copies asset to `~/.openxenon/arsenals/`
- **AND** archives existing global canonical if present

### Requirement: Import export filter flags

The system SHALL support `--draft`, `--canonical`, `--all`, `--archive` flags for both import and export.

| Flag | Effect |
|------|--------|
| (none) | canonical only (default) |
| `--draft` | draft only |
| `--canonical` | canonical only |
| `--all` | draft + canonical + archive |
| `--archive` | archive only |