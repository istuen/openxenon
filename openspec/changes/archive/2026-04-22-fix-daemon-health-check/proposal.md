## Why

OpenXenon CLI 的 `daemon start` 命令启动守护进程后，health check 超时失败。此外，需要全面测试所有 CLI 指令确保正常工作。

## What Changes

- 修复 daemon health check 超时问题
- 测试所有 CLI 指令确保正常可用

## Capabilities

### New Capabilities
- `cli-full-test`: 全面测试所有 CLI 指令

### Modified Capabilities
- `daemon-health-check`: 修复 health check 超时问题

## Impact

- 修改 `src/daemon/health-check.ts`
- 可能需要调整 daemon 启动逻辑
