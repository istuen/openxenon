## Why

CLI 命令存在未实现的 stub 和功能重复，影响用户体验并增加维护负担。需要清理这些废弃命令，保持 CLI 简洁。

## What Changes

1. **删除 `draft` 命令** - 完全未实现的 stub
2. **删除 `force-pass` 命令** - 完全未实现的 stub
3. **删除 `rollback` 命令** - 完全未实现的 stub
4. **删除 `inspect` 命令** - 完全未实现的 stub
5. **删除 `trace` 命令** - 完全未实现的 stub
6. **删除 `api` 命令聚合** - `task` 子命令已覆盖所有功能
7. **删除 `proof-list` 命令** - 功能与 `oxn arsenal list` 重复

**BREAKING**: 用户使用的脚本如果依赖这些命令将会失效

## Capabilities

### Modified Capabilities
- `cli-entry`: 更新 CLI 命令列表，移除废弃命令

## Impact

- 删除 `src/commands/` 下的 7 个文件
- 更新 `src/commands/index.ts` 导出
- 清理相关测试文件
