## Why

当前 `infra/loader.ts` 承担了过多业务职责：
1. `scanBuiltin()` 硬编码了 `BUILTIN_PROBES`、`BUILTIN_PARTS` 的加载逻辑 — 这是 Arsenal (L2) 的业务知识
2. `promoteStandard()` 实现了 draft → canonical 的状态迁移 — 这是资产管理的业务逻辑

Infra 层应该是"纯 IO 层"，只提供文件扫描和读写能力，不应包含任何业务逻辑。业务职责必须上移至 L2。

## What Changes

### 移除 scanBuiltin
- `infra/loader.ts` 移除 `scanBuiltin()` 函数
- 内置资产加载逻辑迁移至 `arsenals/loader.ts` 的 `loadBuiltinAssets()`
- `scanArsenalsDirectory()` 改为接收路径参数，不再内置 builtin 逻辑

### 移除 promoteStandard
- `infra/loader.ts` 移除 `promoteStandard()` 函数
- 资产晋升逻辑迁移至 `arsenals/promoter.ts`
- CLI `arsenal-promote.ts` 改用 `arsenals/promoter.ts`

### 接口职责重新划分
```
Infra (L1) - 纯 IO:
  scanFlatStructure(boundary, type, extensions): StandardAsset[]
  scanForgesDirectory(scope, boundary, type): StandardAsset[]
  loadStandardByPath(assetPath): StandardAsset | null
  resolveAssetPath(scope, boundary, name, type, state): string | null

Arsenal (L2) - 业务逻辑:
  loadArsenalsByState(state, scope?): StandardAsset[]
  loadArsenalsByTypeAndState(type, state, scope?): StandardAsset[]
  loadBuiltinAssets(type): StandardAsset[]
  promoteToCanonical(fromPath): StandardAsset
  generateCompiledArtifact(assetPath, boundary): string | null
```

## Capabilities

### New Capabilities
- `loader-separation`: Infra 只提供通用 IO，Arsenal 承担业务逻辑

### Modified Capabilities
- （无）

## Impact

### 受影响文件
- `src/infra/loader.ts` — 移除 scanBuiltin、promoteStandard
- `src/arsenals/loader.ts` — 新增 loadBuiltinAssets、promoteToCanonical 包装
- `src/arsenals/promoter.ts` — (新建) 资产晋升逻辑
- `src/cli/arsenal-promote.ts` — 改用 arsenals/promoter

### 依赖变更
- 消除: `infra → arsenals/builtin` (L1 → L2 内置资产)
- 消除: `infra → arsenals/paths` (L1 → L2 业务路径)