## Why

用户需要分别执行 `xn daemon stop` 和 `xn daemon start` 来重启 daemon，操作繁琐。提供一个 `restart` 命令可以简化这个流程，特别是在开发或调试时频繁重启 daemon 的场景。

## What Changes

- 新增 `xn daemon restart` 命令，依次执行停止和启动操作
- 重启时显示停止和启动的状态信息
- 支持强制重启（即使当前未运行也尝试启动）

## Capabilities

### New Capabilities

无

### Modified Capabilities

- `daemon-process`: 新增 restart 命令的要求

## Impact

- 修改 `src/commands/daemon.ts` 添加 restart 子命令
- 修改 `openspec/specs/daemon-process/spec.md` 添加 restart 命令规范
