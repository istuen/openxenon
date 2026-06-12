## Why

当前 arsenals 资产目录采用扁平结构（`arsenals/<type>/draft/<name>.yaml`），随着资产数量增长，管理和组织变得困难。需要引入目录分组机制，让同一种资产的不同版本（draft/canonical）归属到同一目录下，提升可维护性和扩展性。

## What Changes

- 调整 arsenals 目录结构，从扁平转为分层
- 资产文件统一命名为 `draft.yaml`（草稿）和 `canonical.yaml`（正式）
- 保持向后兼容，支持旧的扁平路径读取

## Capabilities

### New Capabilities

- `arsenals-directory-structure`: 定义新的 arsenals 目录组织规范，包括资产目录结构、文件命名约定、版本状态管理

## Impact

- `.openxenon/arsenals/` 目录结构
- 资产读写 API
- `oxn arsenal` 相关命令