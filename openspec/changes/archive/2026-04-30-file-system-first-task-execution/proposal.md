## Why

当前 OpenXenon 的任务执行架构存在致命缺陷：CLI 往 `project.oxn`（SQLite）写入任务状态，Daemon 从 `core.oxn`（SQLite）读取状态。这导致"数据库同步"问题频发——文件明明存在，但 Daemon 报错 "Blueprint not found"。

这违背了 OpenXenon 的核心哲学：**物理文件即真理，状态必须是对物理行为的追踪**。引入关系型数据库管理高频执行状态，是典型的"传统后端思维惯性"。

## What Changes

1. **彻底移除 SQLite 作为任务执行的主数据库**
   - 删除 `project.oxn` 中 Task/Stage 状态表的全部职责
   - 冻结 `core.oxn` 的任务相关功能，仅保留未来跨项目索引的可能

2. **文件系统成为 Single Source of Truth**
   - 任务状态由 `.openxenon/tasks/{task_id}/` 目录和其中的 YAML/JSON 文件表达
   - `blueprint.yaml`：AI 编写的执行蓝图
   - `step-manifest.json`：AI 实时更新的意图和尝试次数
   - `task-trace.yaml`：Daemon 写入的执行案卷

3. **重构 Daemon 为无状态探针执行器**
   - Daemon 不再查询任何数据库
   - CLI 发送完整 Payload（包含项目绝对路径 + blueprint 内容）给 Daemon
   - Daemon 直接根据 Payload 执行探针，写入结果到文件系统

4. **简化 CLI 与 Daemon 的通信协议**
   - 旧：CLI 写 DB → Daemon 读 DB → Daemon 根据 ID 找文件
   - 新：CLI 发 Payload（含 blueprint JSON）→ Daemon 执行 → 写文件 → 通知 CLI

## Capabilities

### New Capabilities

- `file-system-first-execution`：文件系统优先的任务执行能力。这是核心架构变更，包含：
  - 基于 YAML/JSON 文件的任务状态表达
  - CLI 直接操作文件系统而非数据库
  - Daemon 接收完整 Payload 并直接操作文件系统
  - 状态判断逻辑从"查数据库"改为"读文件"

## Impact

- **删除**：`project.oxn` 中的 `tasks`、`blueprints`、`stages` 表定义及相关 ORM 代码
- **删除或冻结**：`core.oxn` 中的 `tasks` 表，仅保留 `daemon_config` 和未来可能的索引表
- **重构**：`src/server.ts` 中的任务处理逻辑，改为解析 Payload 而非查询数据库
- **重构**：`src/cli/commands/task/*.ts` 中的命令，改为直接操作文件系统
- **新增**：`openspec/changes/file-system-first-task-execution/` 下的完整变更文档