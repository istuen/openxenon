## Why

`oxn arsenal promote` 命令的文档示例使用了错误的格式（`<asset-path>`），实际 CLI 接受的是 `<type>/<name>` 格式（如 `probes/readme-exists`），导致用户执行失败。

## What Changes

- 修正 `docs/manual/04-cli-ref.md` 中 `oxn arsenal promote` 的使用示例
- 修正 `docs/manual/README.md` 核心命令表中的格式
- 修正 `docs/manual/05-arsenal.md` 中的转正命令示例
- 修正 `docs/manual/03-lifecycle.md` 中的流程命令
- 修正 `docs/history-1.md` 中的历史示例（如有）

## Capabilities

### New Capabilities
（无新能力）

### Modified Capabilities
（无规格变更，仅文档修正）

## Impact

- docs/manual/04-cli-ref.md
- docs/manual/README.md
- docs/manual/05-arsenal.md
- docs/manual/03-lifecycle.md
- docs/history-1.md（如有）
