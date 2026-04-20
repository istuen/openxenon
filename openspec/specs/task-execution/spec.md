## ADDED Requirements

### Requirement: Task start command

The system SHALL provide `POST /api/v1/task/start` endpoint that:
- Accepts task ID in request body
- Updates task status from 'pending' to 'running'
- Returns task status

#### Scenario: Start pending task
- **WHEN** POST request to `/api/v1/task/start` with valid pending task ID
- **THEN** system updates task status to 'running' and returns `{"taskId": "...", "status": "running"}`

#### Scenario: Start already running task
- **WHEN** POST request with task ID that is already running
- **THEN** system returns current status without error

#### Scenario: Start non-existent task
- **WHEN** POST request with non-existent task ID
- **THEN** system returns 404 error

### Requirement: Get next step

The system SHALL provide `GET /api/v1/task/next` endpoint that:
- Accepts task ID as query parameter
- Returns the next step with status 'pending'
- Returns null if all steps are complete or task is not running

#### Scenario: Get next pending step
- **WHEN** GET request to `/api/v1/task/next?taskId=<id>` for running task with pending steps
- **THEN** system returns `{"stepId": "...", "name": "...", "status": "pending", "spec": "...", "proof": "..."}`

#### Scenario: All steps complete
- **WHEN** GET request for task with all steps passed
- **THEN** system returns `{"stepId": null, "message": "All steps complete"}`

#### Scenario: Task not running
- **WHEN** GET request for task with status 'pending'
- **THEN** system returns `{"stepId": null, "message": "Task not started"}`

### Requirement: Step start command

The system SHALL provide `POST /api/v1/step/start` endpoint that:
- Accepts step ID or (taskId + stepName) in request body
- Updates step status from 'pending' to 'running'
- Records startedAt timestamp
- Returns step status

#### Scenario: Start pending step
- **WHEN** POST request to `/api/v1/step/start` with valid step ID
- **THEN** system updates step status to 'running' and returns `{"stepId": "...", "status": "running"}`

#### Scenario: Start step by name
- **WHEN** POST request with taskId and stepName instead of stepId
- **THEN** system locates step and updates status

#### Scenario: Start non-existent step
- **WHEN** POST request with non-existent step ID
- **THEN** system returns 404 error

### Requirement: Step verify with name lookup

The system SHALL enhance `POST /api/v1/step/verify` to support step name lookup:
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

### Requirement: Target state storage

The system SHALL store target_state for each step.

#### Scenario: Store target_state on task submit
- **WHEN** playbook with target_state in step is submitted
- **THEN** system stores target_state in steps table

#### Scenario: Retrieve target_state
- **WHEN** step is queried
- **THEN** system returns target_state field if present
