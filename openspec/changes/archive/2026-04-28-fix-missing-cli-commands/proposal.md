## Why

`pnpm build` 失败，因为 `src/cli.ts` 引用了 4 个不存在的命令模块：`daemon`、`draft`、`export`、`gc`。这导致 CLI 无法编译成可执行文件。需要创建这些缺失的命令模块以恢复构建。

## What Changes

- 新增 `src/commands/daemon.ts` - 守护进程管理命令 (`oxn daemon start|stop|status`)
- 新增 `src/commands/draft.ts` - Draft 模式命令 (`oxn draft`)
- 新增 `src/commands/export.ts` - 任务导出命令 (`oxn export <task-id>`)
- 新增 `src/commands/gc.ts` - 垃圾回收命令 (`oxn gc`)
- 修复 `src/cli.ts` 第 21 行 `standards:` 别名为 `arsenal:`（与已重命名的命令文件保持一致）

## Capabilities

### New Capabilities

- `daemon-command`: 守护进程生命周期管理，支持 start/stop/status 三个子命令
- `draft-command`: Draft 模式入口，用于在隔离沙箱中探索变体
- `export-command`: 导出任务的 task-trace.yaml 到指定路径
- `gc-command`: 清理已完成任务的旧资产和临时文件

### Modified Capabilities

- 无

## Impact

- `src/cli.ts` - 添加新的子命令引用
- `src/commands/` - 新增 4 个命令文件
- 构建系统 - 修复后 `pnpm build` 应能成功生成 `dist/oxn`
