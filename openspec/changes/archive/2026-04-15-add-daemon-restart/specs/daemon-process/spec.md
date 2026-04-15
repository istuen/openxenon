## ADDED Requirements

### Requirement: Daemon restart command

The system SHALL provide `xn daemon restart` command that:
- Stops the running daemon (if any)
- Starts a new daemon process
- Reports the result of both operations

#### Scenario: Restart daemon when running
- **WHEN** user runs `xn daemon restart` and daemon is running
- **THEN** system stops the daemon, starts a new one, and displays success with new PID

#### Scenario: Restart daemon when not running
- **WHEN** user runs `xn daemon restart` and daemon is not running
- **THEN** system starts the daemon and displays success with new PID

#### Scenario: Restart daemon with stop failure
- **WHEN** user runs `xn daemon restart` and stop fails (except "not running")
- **THEN** system displays error and does not start new daemon

#### Scenario: Restart daemon with start failure
- **WHEN** user runs `xn daemon restart` and stop succeeds but start fails
- **THEN** system displays error and daemon remains stopped
