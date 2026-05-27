## Context

当前架构存在两处违规依赖：

**问题 1: `infra/loader.ts` 反向依赖 Arsenal**
```typescript
// src/infra/loader.ts:359
const { BUILTIN_PROBES, BUILTIN_PARTS } = require('../arsenals/builtin')
```
Infra（L1 物理层）不应依赖 Arsenal（L2 领域层）的业务数据。

**问题 2: `work/part-resolver.ts` 直接使用 BUILTIN_***
```typescript
// src/work/part-resolver.ts:3
import { BUILTIN_PARTS } from '../arsenals/builtin'
```
Work 层直接接触内置数据，违反了"Work 通过 ArsenalResolver 寻址"的原则。

## Goals / Non-Goals

**Goals:**
- 消除 Infra → Arsenal 的反向依赖
- 实现 `preloadCompileDependencies` 的依赖注入模式
- 建立 BuiltinArsenal 实现，确保内存版 Arsenal 与磁盘版 Arsenal 行为一致
- 建立 ArsenalResolver，实现优先级查找（Project > Global > Builtin）
- 重构 Work 层，通过 ArsenalResolver 获取资产

**Non-Goals:**
- 不修改 Kernel 层
- 不修改 BUILTIN_* 的定义内容（保持现状，只是移动引用位置）
- 不实现完整的 FileBasedArsenal（那是其他变更的范围）

## Decisions

### Decision 1: BuiltinArsenal 实现为纯内存版本

**选择：**
BuiltinArsenal 封装 `arsenals/builtin.ts` 中的 `BUILTIN_*` 常量，实现统一的 Arsenal 接口，但不依赖 Infra。

```typescript
// src/arsenals/builtin-arsenal.ts
import { BUILTIN_PARTS, BUILTIN_PROBES } from './builtin'
import type { StandardAsset } from '../infra/loader'

class BuiltinArsenal implements Arsenal {
  get(type: AssetType, name: string): StandardAsset | null {
    if (type === 'parts') {
      const def = BUILTIN_PARTS[name]
      if (!def) return null
      return { name, type: 'parts', state: 'canonical', path: `builtin:${name}`, content: JSON.stringify(def) }
    }
    if (type === 'probes') {
      const def = BUILTIN_PROBES[name]
      if (!def) return null
      return { name, type: 'probes', state: 'canonical', path: `builtin:${name}`, content: JSON.stringify(def) }
    }
    return null
  }

  list(type: AssetType): StandardAsset[] { ... }

  create(): void { throw new Error('Builtin arsenal is read-only') }
  update(): void { throw new Error('Builtin arsenal is read-only') }
  delete(): void { throw new Error('Builtin arsenal is read-only') }
  rename(): void { throw new Error('Builtin arsenal is read-only') }
}
```

**替代方案考虑：**
- 将 BUILTIN_* 移到 Infra 层：违反 Infra 纯净原则（Infra 不应包含业务数据）
- 使用 require 绕过类型检查：在其他模块已证明是错误路径
- 结论：BuiltinArsenal 封装在 Arsenal 层，不依赖 Infra

### Decision 2: preloadCompileDependencies 改为依赖注入

**选择：**
`preloadCompileDependencies` 接收 `builtinParts` 和 `builtinProbes` 作为参数，由调用者（L3 Runtime）注入。

```typescript
// src/infra/loader.ts
export function preloadCompileDependencies(
  projectBoundary: string,
  builtinParts: BuiltinParts,
  builtinProbes: BuiltinProbes
): CompileDependencies {
  // 直接使用注入的参数，不 require 任何 Arsenal 模块
}
```

**调用点（L3 Runtime）：**
```typescript
// src/cli/arsenal-promote.ts
import { BUILTIN_PARTS, BUILTIN_PROBES } from '../arsenals/builtin'
const deps = preloadCompileDependencies(boundary, BUILTIN_PARTS, BUILTIN_PROBES)
```

**替代方案考虑：**
- 在 Infra 层定义 BUILTIN_*：违反架构原则
- 使用全局函数获取：导致隐藏依赖，难以测试
- 结论：依赖注入是最清晰的方案

### Decision 3: ArsenalResolver 实现优先级链

**选择：**
ArsenalResolver 接收一个 Arsenal 实例数组，数组顺序即查找优先级：

```typescript
// src/arsenals/arsenal-resolver.ts
class ArsenalResolver {
  constructor(private scopes: Arsenal[]) {}

  resolve(type: AssetType, name: string): StandardAsset | null {
    for (const scope of this.scopes) {
      const asset = scope.get(type, name)
      if (asset) return asset
    }
    return null
  }
}

// 使用
const resolver = new ArsenalResolver([
  new ProjectArsenal(infra, projectPath),
  new GlobalArsenal(infra, globalPath),
  new BuiltinArsenal()
])
```

### Decision 4: Work 层通过 ArsenalResolver 获取 Part

**选择：**
Work 层（如 `part-resolver.ts`）通过 ArsenalResolver 获取 Part，不再直接 import BUILTIN_*。

```typescript
// src/work/part-resolver.ts
export function resolvePartRef(ref: string, resolver: ArsenalResolver): PartResolution {
  // 通过 resolver 查找，不直接接触 BUILTIN_*
  const asset = resolver.resolve('parts', probeName)
  // ...
}
```

**替代方案考虑：**
- 保留 `resolveBuiltinPart` 函数并传入 BUILTIN_*：增加调用方复杂度
- 使用全局函数 `getBuiltinParts()`：隐藏依赖，难以测试
- 结论：ArsenalResolver 是最干净的方案

## Risks / Trade-offs

[Risk: 迁移期间调用方需要更新]
→ Mitigation: 提供内联默认值作为过渡，如 `preloadCompileDependencies(boundary, BUILTIN_PARTS, BUILTIN_PROBES)`

[Risk: 新增 ArsenalResolver 增加代码量]
→ Mitigation: BuiltinArsenal 和 ArsenalResolver 都非常小巧（< 100 行），不会显著增加复杂度

[Risk: FileBasedArsenal 尚未实现]
→ Mitigation: 本变更只创建接口和 BuiltinArsenal，FileBasedArsenal 是后续变更范围

## Migration Plan

1. 创建 `src/arsenals/builtin-arsenal.ts`（BuiltinArsenal 实现）
2. 创建 `src/arsenals/arsenal-resolver.ts`（ArsenalResolver 实现）
3. 修改 `src/infra/loader.ts`，`preloadCompileDependencies` 改为接收参数
4. 更新所有调用 `preloadCompileDependencies` 的点（CLI 层）
5. 修改 `src/work/part-resolver.ts`，通过参数接收 ArsenalResolver
6. 验证无违规依赖

## Open Questions

1. ArsenalResolver 和 BuiltinArsenal 是否需要作为独立 npm 包发布？目前作为 src/arsenals/ 内部模块。
2. 是否需要为 FileBasedArsenal 创建占位实现？目前只在设计文档中说明，后续变更实现。