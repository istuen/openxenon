## Why

`oxn forge probe -s` 命令无法保存 YAML 格式的 Probe 定义，因为 `createDraftProbe` 使用 `JSON.parse()` 解析输入，而非 YAML。用户在 CLI 中传入 YAML 时收到 "Invalid probe structure" 错误。

## What Changes

- 修改 `src/cli/draft.ts` 中 `createDraftProbe` 函数，支持 YAML 解析（优先尝试 JSON，失败后尝试 YAML）
- 统一 Probe 类型命名：代码中 schema 定义为 `fs_content_match`/`exec_exit_zero`，但文档使用 `fs_match`/`shell_exec`
- 确保 `oxn forge probe -s '<yaml>'` 能正常工作

## Capabilities

### New Capabilities
（无新能力引入）

### Modified Capabilities
- `probe`：解析逻辑从仅支持 JSON 扩展为同时支持 YAML

## Impact

- `src/cli/draft.ts`：`createDraftProbe` 函数修改
- Probe 类型命名待统一（代码与文档不一致）
