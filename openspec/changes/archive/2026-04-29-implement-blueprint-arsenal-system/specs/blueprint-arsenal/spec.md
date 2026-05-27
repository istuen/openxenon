## ADDED Requirements

### Requirement: Blueprint Arsenal Asset Type

The system SHALL add `blueprints` as a valid AssetType in the Arsenal system.

#### Scenario: List Blueprint assets
- **WHEN** user runs `oxn arsenal list --type blueprints`
- **THEN** system returns all Blueprint assets from `arsenals/blueprints/` directory

#### Scenario: Blueprint asset paths
- **WHEN** system loads Blueprint assets
- **THEN** it scans `arsenals/blueprints/<name>/{canonical.json,draft.json}` files
- **AND** recognizes `archive/` subdirectory for historical versions

### Requirement: Blueprint File Structure

The system SHALL define Blueprint as a pure topology routing table with the following JSON structure:

```json
{
  "id": "string",
  "status": "CANONICAL | DRAFT",
  "topology": ["defaults/stage-a", "custom/stage-b"],
  "edges": [
    { "from": "defaults/stage-a", "to": "custom/stage-b" }
  ]
}
```

#### Scenario: Valid Blueprint structure
- **WHEN** Blueprint JSON is parsed
- **THEN** it MUST contain `id`, `status`, `topology`, and `edges` fields
- **AND** `topology` MUST be an array of stage reference strings
- **AND** `edges` MUST be an array of `{from, to}` objects

#### Scenario: Stage reference format
- **WHEN** Blueprint references a Stage
- **THEN** the reference MUST use format `defaults/<name>` or `custom/<name>`
- **AND** `defaults/<name>` resolves to `arsenals/stages/<name>/canonical.md`
- **AND** `custom/<name>` resolves to `arsenals/stages/<name>/canonical.md`

### Requirement: Blueprint Copy on Task Creation

The system SHALL copy Blueprint from Arsenal to Task directory when a Task is created.

#### Scenario: Copy Blueprint to Task directory
- **WHEN** Task is created with Blueprint template
- **THEN** system copies `arsenals/blueprints/<name>/canonical.json` to `tasks/<task_id>/blueprints/bp_001.json`
- **AND** the copy status is set to `DRAFT`

#### Scenario: Blueprint source tracking
- **WHEN** Blueprint is copied to Task directory
- **THEN** the copy MUST contain a `source` field referencing the original Blueprint ID

### Requirement: Task Blueprint Modification

The system SHALL allow Blueprint副本 to be modified within Task directory without affecting the Arsenal original.

#### Scenario: Modify Task Blueprint
- **WHEN** AI modifies Blueprint during Task execution
- **THEN** changes are written to Task directory副本 only
- **AND** Arsenal original remains unchanged

### Requirement: Blueprint Promotion to Arsenal

The system SHALL support promoting Task Blueprint副本 back to Arsenal after Task completion.

#### Scenario: Promote Blueprint to Arsenal
- **WHEN** Task completes and engineer confirms promotion
- **THEN** Blueprint副本 is copied to `arsenals/blueprints/<name>/draft.json`
- **AND** existing `canonical.json` is moved to `archive/` with timestamp

#### Scenario: Skip Blueprint promotion
- **WHEN** Task completes and engineer declines promotion
- **THEN** Blueprint副本 remains in Task directory as part of task trace
- **AND** no changes to Arsenal