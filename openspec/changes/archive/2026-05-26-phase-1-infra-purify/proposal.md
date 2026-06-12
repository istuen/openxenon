## Why

当前 L1 Infra 层存在严重的架构越界问题：Infra 直接依赖 Arsenal (L2) 的业务路径和 Kernel (L0) 的业务类型。这违反了 L0-L3 分层宪法中"依赖永远向内"的核心原则。必须净化 Infra，使其成为真正的"物理做功层"，不携带任何业务知识。

## What Changes

### 路径常量迁移
- 将 `infra/paths.ts` 中的 `GLOBAL_ARSENALS_*`、`GLOBAL_FORGES_*` 等 8 条业务路径常量迁移至 `arsenals/paths.ts`
- `infra/paths.ts` 保留仅框架级常量：`BOUNDARY_DIR`、`GLOBAL_BOUNDARY`、`getProjectBoundary()`、`resolveBoundary()`

### Loader 内置资产逻辑移除
- 将 `infra/loader.ts` 中的 `scanBuiltin()` 函数移除
- 将内置资产（BUILTIN_PROBES、BUILTIN_PARTS）加载逻辑迁移至 `arsenals/loader.ts`
- `infra/loader.ts` 保留通用 `scanFlatStructure()` 和 `scanForgesDirectory()`

### 业务类型依赖移除
- `infra/compile-cache.ts` 移除对 `FrozenBlueprint` 类型的直接依赖
- `infra/explore/collector.ts` 移除对 `ExplorationContext` 等业务类型的直接依赖
- 类型转换逻辑上移至 L2/L3

### 依赖方向修正
- `arsenals/loader.ts` 反向依赖 `infra/loader.ts`（原为反方向）
- Arsenal (L2) 负责调用 Infra (L1) 的纯 IO 函数，而非 Infra 去了解 Arsenal 的结构

## Capabilities

### New Capabilities
- `infra-purify`: 净化 Infra 层，使其成为零业务依赖的物理做功层

### Modified Capabilities
- （无）

## Impact

### 受影响文件
- `src/infra/paths.ts` — 移除业务路径常量
- `src/infra/loader.ts` — 移除 scanBuiltin，移除内置资产逻辑
- `src/infra/compile-cache.ts` — 移除 FrozenBlueprint 类型依赖
- `src/infra/explore/collector.ts` — 移除业务类型依赖
- `src/arsenals/paths.ts` — 接收业务路径常量
- `src/arsenals/loader.ts` — 接收内置资产加载逻辑

### 依赖变更
- 消除: `infra → arsenals` (L1 → L2 反向依赖)
- 消除: `infra → kernel/schemas/frozen-schema` (L1 → L0 业务类型)
- 消除: `infra → kernel/explore/types` (L1 → L0 业务类型)