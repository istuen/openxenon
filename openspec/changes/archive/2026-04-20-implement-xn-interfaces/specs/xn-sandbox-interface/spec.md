## ADDED Requirements

### Requirement: XnSandbox interface

The system SHALL define `XnSandbox` interface for process execution:

- `spawn(command, args, options)`: Execute external command
- Returns `{ exitCode, stdout, stderr, wasTimeout }`

#### Scenario: Execute proof with timeout
- **WHEN** sandbox.spawn() is called with timeout option (e.g., 30000ms)
- **THEN** process is killed after timeout and wasTimeout returns true

#### Scenario: Execute successful command
- **WHEN** sandbox.spawn() executes command that exits with code 0
- **THEN** exitCode returns 0 and stdout contains output

#### Scenario: Execute failed command
- **WHEN** sandbox.spawn() executes command that exits with non-zero code
- **THEN** exitCode returns non-zero and stderr contains error