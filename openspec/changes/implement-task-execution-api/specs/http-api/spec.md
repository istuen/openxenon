## MODIFIED Requirements

### Requirement: API endpoint - task submit

The system SHALL provide `POST /api/v1/task/submit` endpoint that:
- Accepts Playbook JSON in request body
- Creates task record in `project.db`
- Creates step records for each step in Playbook
- Creates task directory at `.xenonix/tasks/<task-id>/`
- Initializes `step-manifest.json`
- Returns task ID

#### Scenario: Submit valid playbook
- **WHEN** POST request to `/api/v1/task/submit` with valid Playbook JSON
- **THEN** system creates task, creates all step records, and returns `{"taskId": "...", "status": "pending", "stepsCount": N}`

#### Scenario: Submit invalid playbook
- **WHEN** POST request with invalid JSON or missing required fields
- **THEN** system returns 400 error: `{"error": "InvalidPlaybook", "message": "..."}`

#### Scenario: Steps persisted with sequential IDs
- **WHEN** playbook with 3 steps is submitted
- **THEN** system creates steps with IDs `{taskId}-1`, `{taskId}-2`, `{taskId}-3`

## ADDED Requirements

### Requirement: Step lookup by name

The system SHALL provide step lookup by task ID and step name.

#### Scenario: Find step by task and name
- **WHEN** query with taskId "abc-123" and stepName "check-composer"
- **THEN** system returns step with matching taskId and name
