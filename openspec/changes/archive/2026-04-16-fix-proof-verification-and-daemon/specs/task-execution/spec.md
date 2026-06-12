## MODIFIED Requirements

### Requirement: Step verify with name lookup

The system SHALL provide `POST /api/v1/step/verify` endpoint that:
- Accepts stepId OR (taskId + stepName) in request body
- Accepts optional proofPath parameter
- Looks up step by ID or by task+name combination
- Automatically finds and executes proof if proofPath not provided
- Executes proof and returns result

#### Scenario: Verify step with proofPath
- **WHEN** POST request with stepId and proofPath
- **THEN** system executes proof and returns result

#### Scenario: Verify step without proofPath
- **WHEN** POST request with stepId but no proofPath
- **THEN** system looks up step.proof, finds corresponding proof, executes and returns result

#### Scenario: Verify step by name
- **WHEN** POST request with taskId and stepName
- **THEN** system looks up step and executes proof

#### Scenario: Step not found by name
- **WHEN** POST request with taskId and non-existent stepName
- **THEN** system returns 404 error

#### Scenario: Proof not found
- **WHEN** POST request for step with non-existent proof name
- **THEN** system returns 404 error with list of available proofs

## ADDED Requirements

### Requirement: Target state storage

The system SHALL store target_state for each step.

#### Scenario: Store target_state on task submit
- **WHEN** playbook with target_state in step is submitted
- **THEN** system stores target_state in steps table

#### Scenario: Retrieve target_state
- **WHEN** step is queried
- **THEN** system returns target_state field if present
