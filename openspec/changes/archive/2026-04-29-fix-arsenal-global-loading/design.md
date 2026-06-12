## Context

`scanArsenalsDirectory` 函数当前只扫描项目级目录：
```typescript
const projectBoundary = getProjectBoundaryPath(process.cwd())
const pluralPath = join(projectBoundary, 'arsenals', type, state)
```

全局 Arsenal 目录 `~/.openxenon/arsenals/` 从未被扫描。

## Goals / Non-Goals

**Goals:**
- 同时扫描全局 `~/.openxenon/arsenals/` 和项目级 `.openxenon/arsenals/`
- 保持向后兼容，不破坏现有项目级资产加载

**Non-Goals:**
- 不改变资产的文件格式
- 不修改 `StandardAsset` 接口

## Decisions

**修改 `scanArsenalsDirectory` 函数**：
1. 添加全局目录路径扫描
2. 合并全局和项目级的扫描结果

```typescript
function scanArsenalsDirectory(type: AssetType, state: AssetState): StandardAsset[] {
  const projectBoundary = getProjectBoundaryPath(process.cwd())

  // 项目级目录
  const projectPluralPath = join(projectBoundary, 'arsenals', type, state)
  const projectAssets = existsSync(projectPluralPath) ? scanDirectory(projectPluralPath, type, state) : []

  // 全局目录 (ARSENALS_ROOT from global.ts)
  const globalPath = join(ARSENALS_ROOT, type, state)
  const globalAssets = existsSync(globalPath) ? scanDirectory(globalPath, type, state) : []

  return [...projectAssets, ...globalAssets]
}
```

## Risks / Trade-offs

- [风险] 重复资产名 → [缓解] 调用方需要处理或去重
- [风险] 全局目录不存在 → [缓解] `existsSync` 检查后跳过

## Open Questions

- 无