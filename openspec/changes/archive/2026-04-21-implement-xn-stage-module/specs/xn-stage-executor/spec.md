## ADDED Requirements

### Requirement: XnStageExecutor

The system SHALL provide XnStageExecutor for single stage execution:

- `loadStage(xnStageId)`: Load stage from XnBlueprint
- `execute(xnStage)`: Execute a single XnStage
- `applyAction(xnAction)`: Apply XnAction instructions to LLM prompt

#### Scenario: Execute stage successfully
- **WHEN** executor.execute() is called with valid XnStage
- **THEN** stage status updates to 'running', then 'passed' after XnProof validation

#### Scenario: Execute stage failed
- **WHEN** executor.execute() is called and XnProof validation fails
- **THEN** stage status updates to 'failed', error recorded

#### Scenario: Apply action instructions
- **WHEN** XnStage has xnAction property
- **THEN** action instructions are appended to LLM prompt