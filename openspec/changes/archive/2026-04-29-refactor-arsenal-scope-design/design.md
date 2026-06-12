## Context

当前 `arsenals-loader.ts` 的 `scanArsenalsDirectory` 函数同时扫描项目级和全局级目录，没有区分优先级：

```typescript
// 当前实现（简化）
function scanArsenalsDirectory(type, state) {
  const projectAssets = [...project扫描结果]
  const globalAssets = [...global扫描结果]
  return [...projectAssets, ...globalAssets]  // 简单合并，无优先级
}
```

这导致：
- `oxn arsenal inspect` 显示混合列表，用户无法区分
- 没有 `--global` 标志来显式指定作用域
- `oxn standard show` 需要实现的 fallback 逻辑未支持

## Goals / Non-Goals

**Goals:**
- 实现 CLI 作用域设计：默认项目级 + `--global` 穿透
- `scanArsenalsDirectory` 支持三种 scope 模式
- 实现 `oxn standard show` 命令（项目优先，fallback 全局）
- `oxn-forge` 支持 `--global` 创建全局资产

**Non-Goals:**
- 不修改资产文件格式
- 不改变 `StandardAsset` 接口
- 不实现 `oxn global **` 子命令模式

## Decisions

### Decision 1: Scope 枚举设计

```typescript
type Scope = 'project' | 'global' | 'fallback'

function scanArsenalsDirectory(
  type: AssetType,
  state: AssetState,
  scope: Scope = 'fallback'
): StandardAsset[]
```

**选择理由：** 函数签名兼容性好，调用方可通过 flag 控制行为。

**替代方案考虑：**
- 装饰器模式： wrapping `scanArsenalsDirectory` → `withScope(scope, fn)`
  - 过度设计，增加调用复杂度

### Decision 2: CLI 标志位设计

使用 citty 的 `boolean` 类型 args：

```typescript
args: {
  global: {
    type: 'boolean',
    short: 'g',
    description: '操作全局 Arsenal（默认项目级）'
  }
}
```

**选择理由：** citty 原生支持，行为与其他 CLI 工具一致。

### Decision 3: `oxn standard show` 的 fallback 逻辑

```typescript
export function loadStandardByName(name: string, type: AssetType): StandardAsset | null {
  // 1. 查项目级
  const projectPath = getProjectArsenalStatePath(type, 'canonical')
  const projectAsset = loadStandardFromDirectory(projectPath, name)
  if (projectAsset) return projectAsset

  // 2. Fallback 全局
  const globalPath = getGlobalArsenalStatePath(type, 'canonical')
  const globalAsset = loadStandardFromDirectory(globalPath, name)
  if (globalAsset) return globalAsset

  // 3. 都未命中
  return null
}
```

### Decision 4: `oxn-forge --global` 实现

修改 `createDraftFromYaml` 增加可选参数：

```typescript
export function createDraftFromYaml(
  yamlContent: string,
  name?: string,
  scope: 'project' | 'global' = 'project'
): DraftAssetResult
```

## Risks / Trade-offs

- [风险] 向后兼容：现有 CLI 调用不带 `--global` 会改变行为
  - [缓解] 默认 `fallback` 模式，保持项目级优先同时兼容现有逻辑
  - 旧行为：同时显示项目+全局
  - 新行为（无 `--global`）：优先显示项目，项目空则显示全局

- [风险] macOS APFS 大小写不敏感
  - [缓解] 已有 `directoryExists` 函数检测真实目录名

## Open Questions

- 无