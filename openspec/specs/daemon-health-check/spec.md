## ADDED Requirements

### Requirement: Post-startup health check

The system SHALL perform a health check after daemon startup to confirm API service availability.

#### Scenario: Health check success
- **WHEN** health check is performed after daemon startup
- **THEN** system polls `/api/v1/health` endpoint until success or timeout

#### Scenario: Health check timeout
- **WHEN** health check does not receive response within timeout period
- **THEN** system cleans up PID file and returns startup failure

### Requirement: Health check endpoint

The system SHALL provide `/api/v1/health` health check endpoint.

#### Scenario: Return health status
- **WHEN** GET `/api/v1/health` request is received
- **THEN** returns 200 status code and `{ "status": "ok" }` response

### Requirement: Startup delay reporting

The system SHALL report health check duration after successful startup.

#### Scenario: Report duration
- **WHEN** health check passes
- **THEN** log outputs "Daemon health check passed in Xms"
