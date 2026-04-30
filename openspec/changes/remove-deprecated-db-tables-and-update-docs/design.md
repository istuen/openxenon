## Context

### 当前状态

文件系统优先任务执行架构已完成（commit 3d017e2），任务状态存储在文件系统：
- `.openxenon/tasks/{task_id}/blueprint.yaml` - 任务蓝图
- `.openxenon/tasks/{task_id}/step-manifest.json` - 步骤清单
- `.openxenon/tasks/{task_id}/task-trace.yaml` - 执行轨迹

但 `project.oxn` 和 `core.oxn` 中仍保留 deprecated 的 task 相关表：
- `src/db/schema/project.ts` 中的 CREATE_TASKS_TABLE、CREATE_BLUEPRINTS_TABLE、CREATE_STAGES_TABLE 等
- `src/db/operations/tasks.ts` 中的 createTask、getTaskById、updateTaskStatus 等函数
- API handlers 中仍引用 DB 操作

### 技术约束

- **技术栈**：TypeScript + Bun
- **运行环境**：macOS (darwin)
- **数据库**：Bun SQLite（仍用于 projects 和 config 表）

## Goals / Non-Goals

**Goals:**
- 删除 project.oxn 中所有 task 相关表（tasks、blueprints、stages、escape_logs、proof_logs）
- 删除 core.oxn 中的 tasks 表
- 更新所有依赖 task DB 的代码改用文件系统
- 更新架构文档反映当前实现

**Non-Goals:**
- 不删除 projects、config 等非 task 相关表
- 不修改 arsenal 相关功能
- 不修改 migrate 命令（保持向后兼容）

## Decisions

### Decision 1：数据库表删除范围

**选择**：删除以下表
- `project.oxn`: tasks、blueprints、stages、escape_logs、proof_logs
- `core.oxn`: tasks

**保留**：
- `project.oxn`: config
- `core.oxn`: projects、daemon_config

### Decision 2：代码更新策略

**选择**：逐模块更新，测试优先

1. 更新 `src/lib/task-trace.ts` - 确保任务状态读写完整
2. 更新 `src/commands/api/task-*.ts` - 所有 task CLI 命令
3. 更新 `src/api/handlers/` - task-submit、task-start、task-stop、task-next 等
4. 删除 `src/db/schema/project.ts` 中的 task 相关 schema
5. 删除 `src/db/schema/core.ts` 中的 task 相关 schema
6. 删除 `src/db/operations/tasks.ts`
7. 更新测试文件

### Decision 3：测试更新策略

**选择**：更新测试使用文件系统替代 DB

测试文件中需要更新：
- `tests/mvp-01.test.ts`
- `tests/db/operations.test.ts`
- `tests/api/task-execution.test.ts`

这些测试需要：
- 创建 task-trace.yaml 文件替代 DB 写入
- 读取 task-trace.yaml 替代 DB 查询

## 架构变更

### Before

```
CLI → project.oxn (tasks table) → Daemon
                    ↑
CLI ← task-trace.yaml ← Daemon (部分完成)
```

### After

```
CLI → 文件系统 (task-trace.yaml) → Daemon
```

所有任务状态读写都通过文件系统完成。

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| src/db/schema/project.ts | 修改 | 删除 task 相关 schema |
| src/db/schema/core.ts | 修改 | 删除 task 相关 schema |
| src/db/init.ts | 修改 | 移除 task 表初始化 |
| src/db/operations/tasks.ts | 删除 | 所有 task DB 操作 |
| src/db/operations/index.ts | 修改 | 移除 task operations export |
| src/api/handlers/task-submit.ts | 修改 | 使用文件系统 |
| src/api/handlers/task-start.ts | 修改 | 使用文件系统 |
| src/api/handlers/task-stop.ts | 修改 | 使用文件系统 |
| src/api/handlers/task-next.ts | 修改 | 使用文件系统 |
| src/commands/api/task-*.ts | 修改 | 使用文件系统 |
| tests/mvp-01.test.ts | 修改 | 使用文件系统 |
| tests/db/operations.test.ts | 修改 | 使用文件系统 |
| tests/api/task-execution.test.ts | 修改 | 使用文件系统 |
| docs/architecture.md | 修改 | 更新架构图 |
| docs/database.md | 修改 | 更新数据库说明 |

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| 测试覆盖不足 | 手动测试关键流程 |
| 外部工具依赖 task DB | 保留 migrate 命令用于迁移 |
| API 兼容性问题 | 保持 API 路径不变，只改内部实现 |