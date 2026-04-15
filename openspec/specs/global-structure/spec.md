## ADDED Requirements

### Requirement: Global directory structure

The system SHALL create a global physical boundary at `~/.xenonix/` that contains:
- `core.db`: Global metadata database
- `proofs/`: Global proof library directory
- `daemon.sock`: Core process communication socket

#### Scenario: Initialize global boundary on first run
- **WHEN** user runs `xn daemon start` for the first time
- **THEN** system creates `~/.xenonix/` directory with all required subdirectories and files

#### Scenario: Detect existing global boundary
- **WHEN** user runs `xn daemon start` when global boundary already exists
- **THEN** system verifies existing structure and reuses it without overwriting data

### Requirement: Global metadata database

The system SHALL maintain a SQLite database at `~/.xenonix/core.db` that stores:
- Registered project paths
- Project metadata (name, status, last heartbeat)
- Timestamps for registration and updates

#### Scenario: Create core.db on first initialization
- **WHEN** global boundary is created
- **THEN** system creates `core.db` with `projects` table schema

#### Scenario: Query registered projects
- **WHEN** Core needs to list all registered projects
- **THEN** system returns all project records from `core.db`

### Requirement: Global proof library

The system SHALL maintain a proof library at `~/.xenonix/proofs/` that contains:
- `common/`: Universal validation scripts
- `templates/`: Playbook templates for AI reference

#### Scenario: Scan global proofs
- **WHEN** AI assistant requests available proofs via `/api/v1/proofs/list`
- **THEN** system scans and returns all proofs from `~/.xenonix/proofs/`

#### Scenario: Add new global proof
- **WHEN** developer adds a new proof script to `~/.xenonix/proofs/common/`
- **THEN** system automatically discovers it in subsequent scans

### Requirement: Daemon socket communication

The system SHALL create a Unix domain socket at `~/.xenonix/daemon.sock` for local IPC.

#### Scenario: Start daemon with socket
- **WHEN** user runs `xn daemon start`
- **THEN** system creates `daemon.sock` and starts listening for connections

#### Scenario: Stop daemon removes socket
- **WHEN** user runs `xn daemon stop`
- **THEN** system closes socket and removes `daemon.sock` file
