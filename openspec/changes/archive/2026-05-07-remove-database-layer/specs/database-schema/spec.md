## REMOVED Requirements

本文档描述对 `openspec/specs/database-schema/spec.md` 中需求的废弃。

### Requirement: Projects table schema

**Reason**: projects 表已迁移到 JSON 文件（`~/.openxenon/projects.json`），不再需要数据库 schema 定义。

**Migration**: 已有数据需迁移到 JSON 格式。参见 `openspec/changes/remove-database-layer/design.md` 中的 Migration Plan。

---

### Requirement: Tasks table schema

**Reason**: 全局 tasks 表已在原 schema 中标记为 DEPRECATED（`TASKS_SCHEMA_DEPRECATED`）。任务状态现在由文件系统管理（`.openxenon/tasks/<task_id>/task-trace.yaml`）。

**Migration**: 无需迁移。已废弃的 tasks 表不再被任何代码引用。

---

### Requirement: Steps table schema

**Reason**: Steps 信息现在存储在 blueprint.yaml 中，不再需要独立的数据库表。

**Migration**: 无需迁移。steps 表未被新代码使用。

---

### Requirement: Escape logs table schema

**Reason**: Escape 检测现在通过内存 Map（`ManifestWatcher`）和文件系统（`task-trace.yaml`）实现，不再需要独立的数据库表。

**Migration**: 无需迁移。escape_logs 表未被新代码使用。

---

### Requirement: Proof logs table schema

**Reason**: Proof 执行结果现在追加到 `task-trace.yaml`（PROBE_RESULT 事件），不再需要独立的数据库表。

**Migration**: 无需迁移。proof_logs 表未被新代码使用。

---

### Requirement: Database indexes

**Reason**: 索引是针对 SQLite 表的优化。迁移到 JSON 文件后不再适用。

**Migration**: JSON 文件操作无索引需求。如未来性能不足，可考虑使用 SQLite WAL 模式或文件系统缓存，但这超出了 v0.1.0 范围。
