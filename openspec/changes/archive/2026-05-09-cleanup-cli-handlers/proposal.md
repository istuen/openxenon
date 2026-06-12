## Why

当前 `src/cli/handlers/` 中的 handler 被 Daemon 导入使用（物理倒灌）。修正后，CLI handlers 应该只被 CLI 自身使用，且通过 Unix Socket 与 Daemon 通信。

**目标**：
- CLI handlers 通过 Unix Socket 发送纯 JSON 给 Daemon
- Daemon 不直接调用 CLI handlers
- CLI 不再依赖 Daemon 的任何代码

## What Changes

1. 修改 `src/cli/handlers/*.ts` 中的函数，改为发送 JSON 到 Unix Socket
2. 移除 CLI 中对 Daemon 模块的直接导入
3. 确认 `src/daemon/ipc/receiver.ts` 正确接收和处理这些请求

## Impact

- CLI 和 Daemon 完全物理隔离
- 所有通信通过纯 JSON over Unix Socket

## High Risk

- 需要验证 Socket 通信协议兼容
