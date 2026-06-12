## Why

API 端点 `/api/v1/proofs/list` 返回空数组，因为实现仅扫描文件系统目录，遗漏了内置 proofs。CLI 命令 `proof-list` 使用正确的函数 `listAllProofs` 返回完整列表，但 API 使用了不完整的 `scanProjectProofs` 函数。

## What Changes

- 修改 `src/api/handlers/proofs-list.ts` 使用 `listAllProofs` 替代 `scanProjectProofs`
- API 返回结果将包含 built-in、project、global 三类 proofs

## Capabilities

### New Capabilities

无新增能力。

### Modified Capabilities

- `proofs-list-api`: API 端点行为变更，返回包含内置 proofs 的完整列表

## Impact

- `src/api/handlers/proofs-list.ts` - 修改导入和实现
- API 响应结构变化：增加 `category` 和 `layer` 字段
