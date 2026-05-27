## Why

0.1 版本 CLI 在 Daemon 挂了时直接崩溃，输出堆栈给 AI。AI 不知道是"我干错了"还是"系统有 bug"，只能卡死。

根本原因：CLI 的错误输出是堆栈文本，不是 AI 可解析的 JSON。

## What Changes

- `kernel/enums.ts` 新增 `OxnErrorCode` 和 `ErrorCategory` 枚举（纯符号，零耦合）
- `cli/entry.ts` 加 try-catch 铁幕，永远输出 JSON，永不炸
- `daemon/ipc/server.ts` 响应格式统一为 `{ ok, data }` / `{ ok, error }`
- CLI 和 Daemon 用同一套错误格式，Socket 上不传 HTTP 语义

## Capabilities

### New Capabilities

- `error-format`: 统一的 AI 可读错误格式

## Impact

- `src/kernel/enums.ts`: 新增 OxnErrorCode, ErrorCategory
- `src/cli/entry.ts`: 新增 formatError(), 改写 main()
- `src/daemon/ipc/server.ts`: 统一响应格式包装