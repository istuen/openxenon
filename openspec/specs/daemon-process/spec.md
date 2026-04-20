## ADDED Requirements

### Requirement: Daemon start command

The system SHALL provide `xn daemon start` command that:
- Spawns a detached background process running the HTTP API server
- Writes the process PID to `~/.xenonix/daemon.pid`
- Creates log file at `~/.xenonix/daemon.log`
- Returns immediately after spawning the daemon
- Works from any working directory (via fallback path detection)

#### Scenario: Start daemon from any directory
- **WHEN** user runs `xn daemon start` from any directory
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

### Requirement: Zombie PID detection

The system SHALL detect when PID file exists but the process is not running.

#### Scenario: Detect zombie PID
- **WHEN** PID file exists but process with that PID is not running
- **THEN** `isDaemonRunning()` returns `{ pid: <pid>, isRunning: false }`

#### Scenario: Clean zombie PID file
- **WHEN** zombie PID is detected
- **THEN** `startDaemon()` cleans up PID file before proceeding with startup

### Requirement: PID cleanup on exception

The system SHALL clean up PID file when the process exits abnormally.

#### Scenario: Uncaught exception
- **WHEN** daemon process throws an uncaught exception
- **THEN** PID file is cleaned up before exit

#### Scenario: Unhandled promise rejection
- **WHEN** daemon process has an unhandled promise rejection
- **THEN** PID file is cleaned up before exit

### Requirement: Database operation error handling

The system SHALL handle daemon_address database operation failures gracefully.

#### Scenario: Write failure
- **WHEN** `saveDaemonAddress()` execution fails
- **THEN** error is logged but daemon continues running

#### Scenario: Clear failure
- **WHEN** `clearDaemonAddress()` execution fails
- **THEN** error is logged but exit flow continues

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
