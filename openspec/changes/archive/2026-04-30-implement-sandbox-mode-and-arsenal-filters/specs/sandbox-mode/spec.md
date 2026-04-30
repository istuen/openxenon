## ADDED Requirements

### Requirement: Sandbox project initialization

The system SHALL support initializing a project in sandbox mode via `oxn init --sandbox`.

#### Scenario: Initialize sandbox project
- **WHEN** engineer runs `oxn init --sandbox`
- **THEN** system creates `.openxenon/space.oxn` SQLite database
- **AND** system creates `config` table with `('mode', 'SANDBOX')`

#### Scenario: Initialize production project (default)
- **WHEN** engineer runs `oxn init`
- **THEN** system creates `.openxenon/space.oxn` SQLite database
- **AND** system creates `config` table with `('mode', 'PRODUCTION')`

### Requirement: Config table structure

The system SHALL use a key-value config table in space.oxn.

```sql
CREATE TABLE config (key TEXT PRIMARY KEY, value TEXT);
```

#### Scenario: Query current mode
- **WHEN** Core needs to check project mode
- **THEN** system queries `SELECT value FROM config WHERE key = 'mode'`
- **AND** returns 'SANDBOX' or 'PRODUCTION'

#### Scenario: Extendable config
- **WHEN** new config options are needed
- **THEN** system inserts new rows into config table
- **AND** existing code continues to work

### Requirement: Sandbox execution policy

The system SHALL use different execution policies based on config.mode.

#### Scenario: Sandbox mode probe failure
- **WHEN** probe fails in sandbox project (mode: "SANDBOX")
- **THEN** system logs warning
- **AND** preserves probe working directory (no deletion)
- **AND** does NOT trigger escape detection (SILENT)

#### Scenario: Production mode probe failure
- **WHEN** probe fails in production project (mode: "PRODUCTION")
- **THEN** system terminates task
- **AND** deletes probe working directory
- **AND** triggers escape detection if applicable

### Requirement: Sandbox allows draft assets

The system SHALL allow referencing draft assets in sandbox mode.

#### Scenario: Sandbox can use draft assets
- **WHEN** sandbox project (mode: "SANDBOX")
- **THEN** AI can reference `arsenals/stages/my-stage/draft.md`
- **AND** system does not warn about draft usage

#### Scenario: Production cannot use draft assets
- **WHEN** production project (mode: "PRODUCTION")
- **THEN** AI referencing draft assets triggers warning
- **AND** system prefers canonical versions

### Requirement: Sandbox physical behavior

The system SHALL define clear physical boundaries for sandbox execution.

#### Scenario: AI writes directly to working directory in sandbox
- **WHEN** AI executes Task in sandbox project
- **THEN** AI writes directly to project working directory
- **AND** NO staging/buffer directory is used
- **AND** entire project directory acts as physical sandbox