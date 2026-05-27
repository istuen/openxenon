## Why

当前 Arsenal 晋升逻辑中存在冗余的状态字段检查。`arsenal-promote.ts:68-72` 和 `arsenals-loader.ts:175-177` 都检查 `asset.state !== 'draft'`，但 `state` 字段本身是从文件路径派生出来的（`arsenals-loader.ts:146-150`）。

根据物理架构宪法第五条（文件 mv 即状态机晋升），资产的状态应该由文件系统位置天然表达，而不是一个逻辑字段。`mv` 命令本身就是状态变更的证明。

## What Changes

- **移除晋升时的 `state` 字段检查**：改用路径检查（检查文件是否在 `/draft/` 目录下）
- **简化晋升验证逻辑**：只检查文件路径，不检查内存中的 state 字段
- **`StandardAsset.state` 字段保留但标注为"派生字段"**：仅用于展示，不再用于业务逻辑校验

| 文件 | 当前代码 | 修改后 |
|------|---------|--------|
| `arsenal-promote.ts:68-72` | `if (asset.state !== 'draft')` | `if (!asset.path.includes('/draft/'))` |
| `arsenals-loader.ts:175-177` | `if (asset.state !== 'draft')` | `if (!fromPath.includes('/draft/'))` |

## Capabilities

### New Capabilities

- `pure-filesystem-state`: Arsenal 资产状态完全由文件系统路径表达。晋升操作用于验证源路径是否包含 `/draft/`，不依赖任何内存状态字段。

### Modified Capabilities

- 无（此变更不新增或修改 spec 级别的需求，只是移除冗余的状态检查）

## Impact

- **修改 2 个文件**：`arsenal-promote.ts`、`arsenals-loader.ts`
- **影响范围极小**：仅删除两处状态字段检查
- **无破坏性**：不改变任何文件路径或目录结构
