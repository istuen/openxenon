## Why

Daemon 进程存在稳定性问题：PID 文件残留导致 `isDaemonRunning()` 误判。当前 daemon 启动后进程意外退出，但 PID 文件未被清理，导致后续检测认为 daemon "已运行" 而拒绝重新启动。此外，最近添加的 `daemon_address` 数据库写入逻辑可能存在异常导致进程崩溃。

## What Changes

- 修复 PID 文件残留检测逻辑，正确识别僵尸进程
- 增强 daemon 启动时的错误处理，确保异常时清理 PID 文件
- 添加 daemon 启动时的健康检查，确认进程真正运行后才返回成功
- 修复 `daemon_address` 数据库操作的潜在异常

## Capabilities

### New Capabilities

- `daemon-health-check`: Daemon 启动后的健康检查机制，确认服务真正可用

### Modified Capabilities

- `daemon-process-management`: 修改进程检测逻辑，正确处理僵尸 PID 文件

## Impact

- 修改 `src/daemon/process.ts` - isDaemonRunning() 逻辑增强
- 修改 `src/server.ts` - 错误处理和健康检查
- 修改 `src/db/operations/daemon-config.ts` - 异常处理
