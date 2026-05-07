## ADDED Requirements

### Requirement: Global directory structure

The system SHALL create a global physical boundary at `~/.openxenon/` that contains:
- `projects.json`: Project registry
- `daemon-config.json`: Daemon configuration
- `proofs/`: Global proof library directory
- `daemon.sock`: Core process communication socket

#### Scenario: Initialize global boundary on first run
- **WHEN** user runs `xn daemon start` for the first time
- **THEN** system creates `~/.openxenon/` directory with all required subdirectories and files

#### Scenario: Detect existing global boundary
- **WHEN** user runs `xn daemon start` when global boundary already exists
- **THEN** system verifies existing structure and reuses it without overwriting data

### Requirement: Global projects registry

The system SHALL maintain a JSON file at `~/.openxenon/projects.json` that stores project registry with:
- Project ID, path, name, status
- Last heartbeat timestamp
- Creation and update timestamps

#### Scenario: Register new project
- **WHEN** user runs `xn init` in a new project directory
- **THEN** system appends project record to `projects.json`

#### Scenario: Query registered projects
- **WHEN** Core needs to list all registered projects
- **THEN** system reads and returns all project records from `projects.json`

### Requirement: Daemon configuration

The system SHALL maintain a JSON file at `~/.openxenon/daemon-config.json` that stores:
- Daemon address (Unix socket path)
- Last started timestamp

#### Scenario: Save daemon address
- **WHEN** daemon starts successfully
- **THEN** system writes address to `daemon-config.json`

#### Scenario: Clear daemon address
- **WHEN** daemon stops
- **THEN** system sets address to null in `daemon-config.json`

### Requirement: Global proof library

The system SHALL maintain a proof library at `~/.openxenon/proofs/` that contains:
- `common/`: Universal validation scripts
- `templates/`: Playbook templates for AI reference

#### Scenario: Scan global proofs
- **WHEN** AI assistant requests available proofs via `/api/v1/proofs/list`
- **THEN** system scans and returns all proofs from `~/.openxenon/proofs/`

#### Scenario: Add new global proof
- **WHEN** developer adds a new proof script to `~/.openxenon/proofs/common/`
- **THEN** system automatically discovers it in subsequent scans

### Requirement: Daemon socket communication

The system SHALL create a Unix domain socket at `~/.openxenon/daemon.sock` for local IPC.

#### Scenario: Start daemon with socket
- **WHEN** user runs `xn daemon start`
- **THEN** system creates `daemon.sock` and starts listening for connections

#### Scenario: Stop daemon removes socket
- **WHEN** user runs `xn daemon stop`
- **THEN** system closes socket and removes `daemon.sock` file

---

## REMOVED Requirements

### Requirement: Global metadata database (SQLite)

**Reason**: SQLite database (`core.db`, `projects` table) has been replaced by JSON file (`projects.json`)

**Migration**: No migration needed - database layer is deprecated and removed in v0.1.0
