## Why

CLI 命令 `oxn arsenal inspect` 调用 `loadStandardsByState('DRAFT')` 时，使用了 `standards-paths.ts` 中定义的 `STANDARDS_ROOT = '~/.openxenon/standards'`，而用户创建的资产实际位于 `~/.openxenon/arsenals/`。这导致无法找到任何资产。

同时，根据 `.openxenon/` 下其他目录的命名规范（proofs、tasks），资产目录应为 `arsenals`（复数）。

## What Changes

- 重命名 `standards-paths.ts` 中的路径常量：`standards` → `arsenals`
- 更新相关导入和引用
- 确保 Arsenal 资产目录结构正确：`arsenals/probes/DRAFT/`

## Capabilities

### Modified Capabilities

- `arsenal-paths`: 将标准资产根目录从 `standards` 重命名为 `arsenals`

## Impact

- `src/core/standards-paths.ts` - 重命名 `STANDARDS_ROOT` 等常量
- `src/core/standards-loader.ts` - 更新导入
- `src/core/standards-init.ts` - 更新导入
- `src/api/standards-draft.ts` - 更新导入
- `src/commands/arsenal-list.ts` - 更新导入
- `src/commands/arsenal-inspect.ts` - 更新导入
- `src/commands/arsenal-promote.ts` - 更新导入