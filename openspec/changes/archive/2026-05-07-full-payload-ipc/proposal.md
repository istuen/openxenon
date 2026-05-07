## Why

当前 CLI 与 Daemon 的 IPC 通信存在不一致：部分 endpoint（如 `task-trace.ts`）传递了 `projectPath`，但 `step-start.ts` 和 `step-verify.ts` 只传递 `{taskId, stepId}`，迫使 handler 从 socket 连接中推断项目路径，或依赖隐式的 `process.cwd()`。

根据物理架构宪法第三条（IPC 传递 Payload，禁止传递 ID），CLI 与 Daemon 之间必须是无状态的 —— Daemon 收到即可执行，不持有任何上下文。所有执行所需信息必须通过 payload 传递。

## What Changes

- **统一传递 `projectPath`**：`step-start.ts`、`step-verify.ts` 调用 `socketRequest()` 时必须传递第5个参数 `process.cwd()`
- **移除 `_db: Database` 参数**：所有 handler 函数的第二个参数 `_db` 废弃（因为 database layer 即将被移除）
- **Blueprint 读取方式调整**：Handler 改为从 `body.blueprintPayload` 读取 blueprint，而非每次从文件系统读取 `blueprint.yaml`
- **移除 handler 对 `task-trace.yaml` 的直接依赖读取**：改由 CLI 传递 trace 相关状态（如果需要）

| Endpoint | 当前 Payload | 目标 Payload |
|----------|-------------|-------------|
| `POST /api/v1/step/start` | `{taskId, stepId}` | `{taskId, stepId, projectPath}` |
| `POST /api/v1/step/verify` | `{taskId, stepId}` | `{taskId, stepId, projectPath}` |
| `GET /api/v1/task/trace` | query param `taskId` | body `{taskId, projectPath}` |

## Capabilities

### New Capabilities

- `stateless-ipc`: Daemon 的所有 handler 均为无状态设计。每次请求携带执行所需的完整上下文，Daemon 不维护请求间的任何状态。

### Modified Capabilities

- 无（此变更不新增或修改 spec 级别的需求，只是实现层面的规范化）

## Impact

- **修改 3 个 CLI 命令文件**：`step-start.ts`、`step-verify.ts`、`task-trace.ts`
- **修改 3 个 Handler 文件**：移除 `_db` 参数，调整 payload 解析逻辑
- **与 `remove-database-layer` 协同**：一旦 db 层删除，`_db` 参数自然消失
- **与 `append-only-trace` 协同**：Handler 对 task-trace 的读取需要适配新的 append-only 格式
