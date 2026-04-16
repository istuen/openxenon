## ADDED Requirements

### Requirement: HTTP server configuration

The system SHALL provide an HTTP server that:
- Listens on `127.0.0.1:8420`
- Uses Bun.serve for implementation
- Supports concurrent requests
- Returns JSON responses

#### Scenario: Server starts successfully
- **WHEN** daemon starts
- **THEN** HTTP server binds to 127.0.0.1:8420 and begins accepting requests

#### Scenario: Server handles concurrent requests
- **WHEN** multiple HTTP requests arrive simultaneously
- **THEN** server processes all requests concurrently without blocking

#### Scenario: Server returns JSON responses
- **WHEN** server sends a response
- **THEN** response Content-Type header is `application/json`

### Requirement: Project context handling

The system SHALL handle project context via HTTP Header:
- Read `X-Project-Path` header from each request
- Load project database from `<project-path>/.xenonix/project.db`
- Return error if project not found or not initialized

#### Scenario: Valid project path
- **WHEN** request includes `X-Project-Path: /valid/project/path`
- **THEN** system loads project.db from that path and processes request

#### Scenario: Missing project path header
- **WHEN** request does not include `X-Project-Path` header
- **THEN** system returns 400 error: `{"error": "MissingProjectPath", "message": "X-Project-Path header is required"}`

#### Scenario: Invalid project path
- **WHEN** request includes `X-Project-Path: /nonexistent/path`
- **THEN** system returns 404 error: `{"error": "ProjectNotFound", "message": "Project not initialized at /nonexistent/path"}`

### Requirement: API endpoint - workspace init

The system SHALL provide `POST /api/v1/workspace/init` endpoint that:
- Creates `.xenonix/` directory structure
- Initializes `project.db`
- Registers project to global `core.db`
- Returns project ID and status

#### Scenario: Initialize new project
- **WHEN** POST request to `/api/v1/workspace/init` with `X-Project-Path`
- **THEN** system creates project structure and returns `{"projectId": "...", "status": "active"}`

#### Scenario: Initialize already existing project
- **WHEN** POST request to `/api/v1/workspace/init` for already initialized project
- **THEN** system returns 409 error: `{"error": "ProjectAlreadyExists", "message": "Project already initialized"}`

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

### Requirement: API endpoint - step verify

The system SHALL provide `POST /api/v1/step/verify` endpoint that:
- Accepts step ID and proof path in request body
- Executes proof script using Bun.spawn
- Updates step status in `project.db`
- Returns verification result

#### Scenario: Verify step successfully
- **WHEN** POST request to `/api/v1/step/verify` with valid step ID and proof path
- **THEN** system executes proof and returns `{"success": true, "output": "..."}`

#### Scenario: Verify step failure
- **WHEN** proof execution fails
- **THEN** system returns `{"success": false, "error": "..."}`

#### Scenario: Verify non-existent step
- **WHEN** POST request with non-existent step ID
- **THEN** system returns 404 error: `{"error": "StepNotFound", "message": "..."}`

### Requirement: Step lookup by name

The system SHALL provide step lookup by task ID and step name.

#### Scenario: Find step by task and name
- **WHEN** query with taskId "abc-123" and stepName "check-composer"
- **THEN** system returns step with matching taskId and name

### Requirement: API endpoint - task status

The system SHALL provide `GET /api/v1/task/status` endpoint that:
- Accepts task ID as query parameter
- Reads task and steps status from `project.db`
- Returns complete task state machine

#### Scenario: Get task status
- **WHEN** GET request to `/api/v1/task/status?taskId=<id>`
- **THEN** system returns `{"task": {...}, "steps": [...]}`

#### Scenario: Get non-existent task
- **WHEN** GET request with non-existent task ID
- **THEN** system returns 404 error: `{"error": "TaskNotFound", "message": "..."}`

### Requirement: API endpoint - task stop

The system SHALL provide `POST /api/v1/task/stop` endpoint that:
- Accepts task ID in request body
- Updates task status to 'failed' in `project.db`
- Stops any running proof execution
- Returns confirmation

#### Scenario: Stop running task
- **WHEN** POST request to `/api/v1/task/stop` with running task ID
- **THEN** system stops task and returns `{"status": "stopped", "taskId": "..."}`

### Requirement: API endpoint - task trace

The system SHALL provide `GET /api/v1/task/trace` endpoint that:
- Accepts task ID as query parameter
- Reads verification logs from `project.db`
- Generates `task-trace.yaml` file
- Returns trace content or file path

#### Scenario: Generate task trace
- **WHEN** GET request to `/api/v1/task/trace?taskId=<id>`
- **THEN** system generates and returns trace YAML content

### Requirement: Error response format

The system SHALL return consistent error responses:
- HTTP status code matches error type
- JSON body with `error`, `message`, `statusCode` fields
- Human-readable error messages

#### Scenario: 400 Bad Request
- **WHEN** request is missing required fields
- **THEN** system returns 400 with `{"error": "BadRequest", "message": "...", "statusCode": 400}`

#### Scenario: 404 Not Found
- **WHEN** requested resource does not exist
- **THEN** system returns 404 with `{"error": "NotFound", "message": "...", "statusCode": 404}`

#### Scenario: 500 Internal Server Error
- **WHEN** unexpected error occurs
- **THEN** system returns 500 with `{"error": "InternalServerError", "message": "...", "statusCode": 500}`

### Requirement: Request validation

The system SHALL validate all incoming requests:
- Check required headers (X-Project-Path)
- Check required body fields for POST requests
- Validate JSON format
- Validate data types

#### Scenario: Invalid JSON body
- **WHEN** POST request with malformed JSON body
- **THEN** system returns 400 with `{"error": "InvalidJSON", "message": "..."}`

#### Scenario: Missing required field
- **WHEN** POST request missing required field
- **THEN** system returns 400 with `{"error": "MissingField", "message": "Field 'taskId' is required"}`
