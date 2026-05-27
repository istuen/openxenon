## ADDED Requirements

### Requirement: Daemon start command

The system SHALL provide `xn daemon start` command that:
- Spawns a detached background process running the HTTP API server
- Writes the process PID to `~/.xenonix/daemon.pid`
- Creates log file at `~/.xenonix/daemon.log`
- Returns immediately after spawning the daemon

#### Scenario: Start daemon successfully
- **WHEN** user runs `xn daemon start`
- **THEN** system spawns background process and returns success message with PID

#### Scenario: Start daemon when already running
- **WHEN** user runs `xn daemon start` and daemon is already running
- **THEN** system displays error "Daemon already running with PID <pid>"

#### Scenario: Start daemon with port conflict
- **WHEN** user runs `xn daemon start` and port 8420 is already in use
- **THEN** system displays error "Port 8420 is already in use"

### Requirement: Daemon stop command

The system SHALL provide `xn daemon stop` command that:
- Reads PID from `~/.xenonix/daemon.pid`
- Sends SIGTERM to the daemon process
- Removes the PID file
- Confirms daemon stopped

#### Scenario: Stop daemon successfully
- **WHEN** user runs `xn daemon stop` and daemon is running
- **THEN** system sends SIGTERM, removes PID file, and displays "Daemon stopped"

#### Scenario: Stop daemon when not running
- **WHEN** user runs `xn daemon stop` and daemon is not running
- **THEN** system displays error "Daemon is not running"

#### Scenario: Stop daemon with stale PID file
- **WHEN** user runs `xn daemon stop` and PID file exists but process is dead
- **THEN** system removes stale PID file and displays "Daemon is not running (cleaned stale PID file)"

### Requirement: Daemon status command

The system SHALL provide `xn daemon status` command that:
- Checks if daemon is running
- Displays PID if running
- Displays last log entries

#### Scenario: Check status when running
- **WHEN** user runs `xn daemon status` and daemon is running
- **THEN** system displays "Daemon is running (PID: <pid>)" and recent log entries

#### Scenario: Check status when not running
- **WHEN** user runs `xn daemon status` and daemon is not running
- **THEN** system displays "Daemon is not running"

### Requirement: Daemon process lifecycle

The system SHALL manage the daemon process lifecycle:
- Daemon runs as a detached background process
- Daemon listens on `127.0.0.1:8420`
- Daemon logs all requests and errors to `~/.xenonix/daemon.log`
- Daemon gracefully handles SIGTERM signal

#### Scenario: Daemon handles SIGTERM
- **WHEN** daemon receives SIGTERM signal
- **THEN** daemon stops accepting new requests and exits cleanly

#### Scenario: Daemon auto-restart on crash
- **WHEN** daemon crashes unexpectedly
- **THEN** system does NOT auto-restart (user must manually restart)

### Requirement: PID file management

The system SHALL manage PID file at `~/.xenonix/daemon.pid`:
- Write PID when daemon starts
- Remove PID file when daemon stops
- Detect and clean stale PID files

#### Scenario: Detect stale PID file
- **WHEN** PID file exists but process with that PID is not running
- **THEN** system treats daemon as not running and cleans up PID file

### Requirement: Logging system

The system SHALL provide logging for the daemon:
- Log to `~/.xenonix/daemon.log` file
- Log to console (stdout/stderr)
- Include timestamp for each log entry
- Log format: `[ISO-timestamp] LEVEL: message`

#### Scenario: Log HTTP requests
- **WHEN** daemon receives an HTTP request
- **THEN** daemon logs the request method, path, and timestamp

#### Scenario: Log errors
- **WHEN** daemon encounters an error
- **THEN** daemon logs error details with ERROR level

#### Scenario: Log file rotation
- **WHEN** log file exceeds size limit (e.g., 10MB)
- **THEN** system rotates log file (future enhancement, not required for initial implementation)
