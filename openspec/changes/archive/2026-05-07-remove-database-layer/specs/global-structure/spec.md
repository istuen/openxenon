## MODIFIED Requirements

本文档描述对 `openspec/specs/global-structure/spec.md` 中需求的修改。

### Requirement: Global directory structure

**FROM**:
> The system SHALL create a global physical boundary at `~/.xenonix/` that contains:
> - `core.db`: Global metadata database
> - `proofs/`: Global proof library directory
> - `daemon.sock`: Core process communication socket

**TO**:
The system SHALL create a global physical boundary at `~/.openxenon/` that contains:
- `projects.json`: Project registry（替代原 core.db 中的 projects 表）
- `daemon-config.json`: Daemon configuration（替代原 core.oxn 中的 daemon_config 表）
- `proofs/`: Global proof library directory
- `daemon.sock`: Core process communication socket

**Reason**: 移除数据库依赖，改用 JSON 文件

---

### Requirement: Global metadata database

**FROM**:
> The system SHALL maintain a SQLite database at `~/.xenonix/core.db` that stores:
> - Registered project paths
> - Project metadata (name, status, last heartbeat)
> - Timestamps for registration and updates

**TO**:
The system SHALL maintain a JSON file at `~/.openxenon/projects.json` that stores project registry with:
- Project ID, path, name, status
- Last heartbeat timestamp
- Creation and update timestamps

**Reason**: 从 SQLite 迁移到 JSON 文件

---

### Requirement: Global proof library

**保持不变**:
> The system SHALL maintain a proof library at `~/.openxenon/proofs/` that contains:
> - `common/`: Universal validation scripts
> - `templates/`: Playbook templates for AI reference

---

### Requirement: Daemon socket communication

**保持不变**:
> The system SHALL create a Unix domain socket at `~/.openxenon/daemon.sock` for local IPC.
