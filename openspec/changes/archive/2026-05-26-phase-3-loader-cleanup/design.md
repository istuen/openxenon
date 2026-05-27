## Context

当前 `infra/loader.ts` 承担了 L2 的业务职责：

1. **scanBuiltin()**: 硬编码了 `BUILTIN_PROBES`、`BUILTIN_PARTS` 加载逻辑
2. **promoteStandard()**: 实现了 draft → canonical 的资产状态迁移

Infra 应该是"纯 IO 层"，只提供文件扫描和读写能力。这些业务逻辑必须上移至 L2 Arsenal。

## Goals / Non-Goals

**Goals:**
- 移除 `infra/loader.ts` 中的 `scanBuiltin()` 和 `promoteStandard()`
- 业务逻辑迁移至 `arsenals/loader.ts` 和 `arsenals/promoter.ts`
- Infra 只保留通用 IO 函数

**Non-Goals:**
- 不改变现有 IO 函数 (scanFlatStructure, loadStandardByPath 等) 的接口
- 不改变资产文件的物理存储结构

## Decisions

### Decision 1: scanBuiltin 迁移至 Arsenal

**选择**: 将内置资产加载逻辑迁移至 `arsenals/loader.ts`

**理由**:
- BUILTIN_* 是 Arsenal 的业务概念，L1 不该知道
- L2 负责组合项目资产、全局资产、内置资产

**迁移方案**:
```typescript
// arsenals/loader.ts 新增
export function loadBuiltinAssets(type: AssetType): StandardAsset[] {
  if (type === 'probes') {
    return Object.entries(BUILTIN_PROBES).map(([name, def]) => ({
      name, type: 'probes' as AssetType, state: 'canonical' as AssetState,
      path: `builtin:${name}`, content: JSON.stringify(def)
    }))
  }
  // parts 类似
}

// scanArsenalsDirectory 改为组合
export function scanArsenalsDirectory(scope, type) {
  let assets = scanProjectAssets(type)
  if (scope === 'builtin' || assets.length === 0) {
    assets.push(...loadBuiltinAssets(type))
  }
  return assets
}
```

### Decision 2: promoteStandard 迁移至 Arsenal

**选择**: 将资产晋升逻辑迁移至 `arsenals/promoter.ts`

**理由**:
- "draft → canonical" 是资产管理业务逻辑，不是物理 IO
- L1 不该知道资产状态语义

**迁移方案**:
```typescript
// arsenals/promoter.ts (新建)
import { scanFlatStructure } from '../infra/loader'
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from '../infra/filesystem'

export function promoteToCanonical(fromPath: string): StandardAsset {
  // 1. 读取 fromPath
  // 2. 确定目标路径 (arsenals/name/canonical.oxn)
  // 3. 创建目录
  // 4. 写入 canonical
  // 5. 删除 draft
  // 6. 返回新 asset
}
```

### Decision 3: Interface 职责重新划分

**选择**: 明确 Infra 和 Arsenal 的接口边界

**理由**:
- 清晰的接口边界便于测试和维护
- 避免职责混淆

**Interface 设计**:
```
Infra (L1):
  scanFlatStructure(boundary, type, extensions) → StandardAsset[]
  scanForgesDirectory(scope, boundary, type) → StandardAsset[]
  loadStandardByPath(assetPath) → StandardAsset | null
  resolveAssetPath(scope, boundary, name, type, state) → string | null

Arsenal (L2):
  loadArsenalsByState(state, scope?) → StandardAsset[]
  loadBuiltinAssets(type) → StandardAsset[]
  promoteToCanonical(fromPath) → StandardAsset
  generateCompiledArtifact(assetPath, boundary) → string | null
```

## Risks / Trade-offs

[风险]: CLI `arsenal-promote.ts` 需要修改 import
→ 缓解: 只需改 import 语句，不改调用逻辑

[风险]: 内置资产加载逻辑需要迁移
→ 缓解: 逻辑相同，只是移动位置

[风险]: promote 逻辑依赖多个辅助函数
→ 缓解: 这些函数 (mkdir, writeFile) 来自 Infra，L2 可以调用

## Migration Plan

1. 在 `arsenals/loader.ts` 实现 `loadBuiltinAssets()`
2. 创建 `arsenals/promoter.ts`，实现 `promoteToCanonical()`
3. 修改 `infra/loader.ts`，移除 `scanBuiltin()` 和 `promoteStandard()`
4. 修改 `src/cli/arsenal-promote.ts`，使用 `arsenals/promoter.ts`
5. 验证所有调用点更新完成

**回滚策略**: 如果出现问题，可以快速回滚，因为只涉及函数迁移和 import 变更。