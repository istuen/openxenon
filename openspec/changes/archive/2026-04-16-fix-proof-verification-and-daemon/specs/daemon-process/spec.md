## MODIFIED Requirements

### Requirement: Daemon start command

The system SHALL provide `xn daemon start` command that:
- Spawns a detached background process running the HTTP API server
- Writes the process PID to `~/.xenonix/daemon.pid`
- Creates log file at `~/.xenonix/daemon.log`
- Returns immediately after spawning the daemon
- Works from any working directory

#### Scenario: Start daemon from any directory
- **WHEN** user runs `xn daemon start` from any directory
- **THEN** system spawns background process and returns success message with PID

#### Scenario: Start daemon when already running
- **WHEN** user runs `xn daemon start` and daemon is already running
- **THEN** system displays error "Daemon already running with PID <pid>"

#### Scenario: Start daemon with port conflict
- **WHEN** user runs `xn daemon start` and port 8420 is already in use
- **THEN** system displays error "Port 8420 is already in use"
