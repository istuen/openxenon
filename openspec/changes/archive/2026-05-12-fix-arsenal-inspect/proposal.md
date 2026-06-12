## Why

`oxn arsenal inspect` 命令不支持 `<type>/<name>` 格式，只接受纯名称。而 `oxn arsenal promote` 支持该格式。导致用户使用统一的 `<type>/<name>` 格式时，`inspect` 找不到资产。

## What Changes

- 修改 `src/cli/arsenal-inspect.ts` 中的 `findAssetByName` 函数，支持 `<type>/<name>` 格式解析
- 复用 `arsenal-promote.ts` 中的 `parseAssetName` 函数（或复制类似逻辑）

## Capabilities

### New Capabilities
（无新能力）

### Modified Capabilities
- `arsenal-inspect` 命令：支持 `<type>/<name>` 格式

## Impact

- `src/cli/arsenal-inspect.ts`
