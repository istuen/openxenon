## MODIFIED Requirements

### Requirement: API endpoint - proofs list

The system SHALL provide `GET /api/v1/proofs/list` endpoint that:
- Lists built-in proofs from registry
- Scans global proofs at `~/.xenonix/custom-proofs/`
- Scans project proofs at `<project>/.xenonix/proofs/`
- Returns merged list with project proofs taking priority over global
- Includes category field (`built-in`, `project`, `global`)
- Includes layer field for built-in proofs (L1-L4)

#### Scenario: List proofs with built-in
- **WHEN** GET request to `/api/v1/proofs/list` with `X-Project-Path`
- **THEN** system returns `{"proofs": [{"id": "...", "name": "...", "category": "built-in"|"project"|"global", "layer": "...", "path": "..."}]}`

#### Scenario: List includes built-in proofs
- **WHEN** GET request to `/api/v1/proofs/list`
- **THEN** system returns proofs with `category: "built-in"` including layer information

#### Scenario: Project proof overrides global
- **WHEN** project has proof with same ID as global proof
- **THEN** system returns project proof, not global proof
