## Why

当前存在两套独立的 IPC 路由系统：
- `src/daemon/ipc/router.ts` - handlers 注册到这里
- `src/daemon/api/router.ts` - socket server 从这里查找

结果：handlers 注册到 `ipc/router`，但 `api/socket-server` 从 `api/router` 查找，导致所有 IPC 调用返回 `404 NotFound`。

根据 architecture.md 第 5.4 节，Daemon 只通过 Unix Socket 收发纯 JSON，不应存在 `api/` 目录。`api/` 是旧架构残留，是物理倒灌的温床。

## What Changes

- 删除 `src/daemon/api/` 目录（斩首）
- 统一到 `src/daemon/ipc/` 作为唯一的 IPC 层
- `ipc/server.ts` 作为唯一的 Socket Server
- `ipc/router.ts` 作为唯一的路由表
- `ipc/handlers/` 下的所有 handler 注册到 `ipc/router`

## Capabilities

### New Capabilities

- `ipc-consolidation`: 统一的 IPC 路由系统

### Modified Capabilities

- `daemon-ipc`: 合并后统一使用 ipc/router

## Impact

- 删除 `src/daemon/api/` 目录及所有文件
- 修改 `src/server.ts` 引入正确的 ipc/server
- 确认所有 handler import 正确的 router