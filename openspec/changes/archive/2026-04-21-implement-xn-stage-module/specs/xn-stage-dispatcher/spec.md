## ADDED Requirements

### Requirement: XnStageDispatcher

The system SHALL provide XnStageDispatcher for managing multiple stages:

- `dispatch(xnBlueprint)`: Execute stages in order
- `nextStage()`: Get next stage to execute
- `hasNext()`: Check if more stages remain

#### Scenario: Dispatch blueprint
- **WHEN** dispatcher.dispatch(xnBlueprint) is called
- **THEN** stages execute sequentially, each must pass before next begins

#### Scenario: All stages passed
- **WHEN** final stage status is 'passed'
- **THEN** blueprint status updates to 'completed'

#### Scenario: Stage failed - stop immediately
- **WHEN** stage status becomes 'failed'
- **THEN** dispatcher stops, remaining stages not executed