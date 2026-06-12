## Why

`oxn arsenal inspect` 无法显示全局 `~/.openxenon/arsenals/` 目录下的 draft 资产。当前代码只扫描项目级 `.openxenon/arsenals/` 目录，忽略了全局 Arsenal 目录。

## What Changes

- 修改 `scanArsenalsDirectory` 函数，同时扫描全局和项目级 Arsenal 目录
- 全局目录：`~/.openxenon/arsenals/<type>/<state>/`
- 项目目录：`<project>/.openxenon/arsenals/<type>/<state>/`

## Capabilities

### Modified Capabilities
- `arsenal-loading`: 扩展加载器支持全局 Arsenal 目录扫描

## Impact

- 受影响代码：`src/core/arsenals-loader.ts`