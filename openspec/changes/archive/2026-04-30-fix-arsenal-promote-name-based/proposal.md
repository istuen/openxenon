## Why

`oxn arsenal promote` 命令目前要求传入完整路径，但新目录结构下资产位于目录中（如 `blueprints/build-init-daemon/draft.yaml`），导致传入目录名时出现 EISDIR 错误。应改为基于名称的操作。

## What Changes

- 将 `oxn arsenal promote` 的参数从 "path" 改为 "name"
- 使用 `loadStandardByName` 替代 `loadStandardByPath`
- 自动解析 `blueprints/build-init-daemon` → 查找对应的 draft/canonical 文件

## Impact

- `oxn arsenal promote` 命令参数语义改变