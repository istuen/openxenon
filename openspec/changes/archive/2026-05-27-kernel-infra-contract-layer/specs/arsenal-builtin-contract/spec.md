# Arsenal Builtin Contract Specification

## ADDED Requirements

### Requirement: BUILTIN_* 必须定义在 Arsenal 层

`BUILTIN_*`（`BUILTIN_PARTS`、`BUILTIN_PROBES`）必须定义在 `src/arsenals/builtin.ts` 中，作为 Builtin Arsenal 的数据源。

Infra 层不得包含任何 BUILTIN_* 常量或导入 arsenals/builtin.ts。

#### Scenario: Infra 层不包含内置资产定义
- **WHEN** 检查 `src/infra/` 目录下的所有文件
- **THEN** 无任何文件 import 或 require `../arsenals/builtin` 或 `arsenals/builtin`

#### Scenario: BUILTIN_* 作为 Arsenal 内置域的数据源
- **WHEN** 需要获取内置 Part 或 Probe
- **THEN** 通过 `BuiltinArsenal.get(type, name)` 获取

### Requirement: Infra 层必须保持纯净

Infra 层（`src/infra/` 目录）只负责物理操作，不得包含任何业务数据或业务逻辑。

**允许的依赖方向：**
```
Infra → (无依赖)
```

**禁止的依赖方向：**
```
Infra → Arsenal (❌)
Infra → Kernel (部分允许，仅通过 contracts 接口)
Infra → BUILTIN_* (❌)
```

#### Scenario: Infra 层文件操作
- **WHEN** `infra/filesystem.ts` 的函数被调用
- **THEN** 只执行 read/write/scan 等物理操作

#### Scenario: Infra 层探针处理
- **WHEN** `infra/probes/` 的 Handler 被调用
- **THEN** 只执行 fs 操作，不包含业务判断逻辑

### Requirement: preloadCompileDependencies 必须使用依赖注入

`preloadCompileDependencies` 所需的 BUILTIN_* 必须作为参数传入，不得在函数内部直接 require。

```typescript
// 正确模式
function preloadCompileDependencies(
  projectBoundary: string,
  builtinParts: BuiltinParts,
  builtinProbes: BuiltinProbes
): CompileDependencies { ... }

// 错误模式
function preloadCompileDependencies(projectBoundary: string) {
  const { BUILTIN_PROBES, BUILTIN_PARTS } = require('../arsenals/builtin')  // ❌
}
```

#### Scenario: L3 Runtime 注入 BUILTIN_*
- **WHEN** L3 Runtime（如 CLI）调用 `preloadCompileDependencies`
- **THEN** 传入 `BUILTIN_PARTS` 和 `BUILTIN_PROBES` 作为参数

### Requirement: Work 层不得直接接触 BUILTIN_*

Work 层获取 Part/Probe 定义时，必须通过 ArsenalResolver，不应直接 import 或引用 BUILTIN_*。

#### Scenario: Work 通过寻址接口获取资产
- **WHEN** Work 需要执行一个 Part（如 `git-commit`）
- **THEN** 调用 `arsenalResolver.resolve('parts', 'git-commit')`
- **AND** 不知道该资产来自 Project / Global / Builtin

#### Scenario: Work 不直接使用 resolveBuiltinPart
- **WHEN** 检查 `src/work/` 目录
- **THEN** 无任何文件 import `BUILTIN_PARTS` 或 `BUILTIN_PROBES` from `arsenals/builtin`

### Requirement: ArsenalResolver 必须按优先级查找

ArsenalResolver 必须按以下优先级查找资产：

1. **Project Arsenal** - 最高优先级，项目级资产
2. **Global Arsenal** - 中优先级，全局资产
3. **Builtin Arsenal** - 最低优先级，内置资产（兜底）

这允许项目级资产覆盖内置资产。

#### Scenario: 项目级资产覆盖内置资产
- **WHEN** 项目中存在 `git-commit` Part（`.openxenon/arsenals/parts/git-commit/`）
- **AND** Builtin Arsenal 也有 `git-commit` 定义
- **THEN** `arsenalResolver.resolve('parts', 'git-commit')` 返回项目级定义

#### Scenario: 无项目级资产时使用内置资产
- **WHEN** 项目中不存在 `develop-feature` Part
- **AND** Builtin Arsenal 有 `develop-feature` 定义
- **THEN** `arsenalResolver.resolve('parts', 'develop-feature')` 返回内置定义

### Requirement: Builtin Arsenal 必须实现 Arsenal 接口

`BuiltinArsenal` 必须实现统一的 `Arsenal` 接口：

```typescript
interface Arsenal {
  get(type: AssetType, name: string): StandardAsset | null
  list(type: AssetType): StandardAsset[]
  create(name: string, content: string): void  // Builtin 实现应抛出异常（只读）
  update(name: string, content: string): void
  delete(name: string): void
  rename(oldName: string, newName: string): void
}
```

#### Scenario: Builtin Arsenal 的 create 操作
- **WHEN** 调用 `builtinArsenal.create('new-part', content)`
- **THEN** 抛出 `Error('Builtin arsenal is read-only')`

#### Scenario: Builtin Arsenal 的 get 操作
- **WHEN** 调用 `builtinArsenal.get('parts', 'git-commit')`
- **THEN** 返回对应 StandardAsset 或 null