## Why

当前 OpenXenon 使用 HTTP API 与 CLI 通信，但 README 规范要求使用 Unix Socket。HTTP 存在性能开销和网络端口暴露问题。

## What Changes

- HTTP 服务器 → Unix Socket 通信
- CLI 命令新增 `oxn api` 入口
- 通过 Socket 调用 API 而非 HTTP

## Capabilities

### New Capabilities
- `socket-communication`: Unix Socket 通信方式

### Modified Capabilities
- `api-server`: HTTP → Socket

## Impact

- `src/api/server.ts` - 重写为 Socket 服务
- `src/commands/api.ts` - 新增 CLI 入口
- `src/runtimes/interfaces/transport.interface.ts` - 已有 Socket 接口