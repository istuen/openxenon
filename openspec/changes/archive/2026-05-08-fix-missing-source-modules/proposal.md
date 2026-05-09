## Why

`pnpm build` 失败，报错 ~20 个 "Could not resolve" 错误。根本原因：

1. **CLI 入口路径错误**：`src/cli.ts` 从 `./commands/*` 导入，但实际命令在 `./cli/*`
2. **缺失的模块**：`src/cli/api/*` 从 `../../core/*` 和 `../../lib/*` 导入，但这两个目录不存在

构建不可用，导致无法验证其他 change 的实现。

## What Changes

### 立即修复

1. **修复 `src/cli.ts` 导入路径**：将 `./commands/*` → `./cli/*`
2. **删除或补全 `src/cli/api/`**：分析其依赖关系
   - 若 API 逻辑已迁移到 `src/cli/` 邻接模块，删除 `src/cli/api/`
   - 若存在实际业务需求，创建 `src/core/` 和 `src/lib/` 存根

### 待分析

- `src/arsenals/init.ts` 导入 `./arsenals-paths` → 检查路径
- `src/arsenals/loader.ts` 导入 `./project` 和 `./arsenals-paths` → 检查路径

## Capabilities

### Modified Capabilities
- `build-system`：修复后 `pnpm build` 应成功

## Impact

### 修改的文件
- `src/cli.ts`（已修复导入路径）

### 待处理
- 删除或补全 `src/cli/api/` 目录（~12 个文件）
- 检查 `src/arsenals/` 路径问题

### 高风险
- 删除 `src/cli/api/` 可能导致功能丢失，需确认是否有业务逻辑需要保留