## ADDED Requirements

### Requirement: BuiltinArsenal 必须实现 Arsenal 接口

BuiltinArsenal 必须实现统一的 Arsenal 接口，确保与 FileBasedArsenal 行为一致。

```typescript
interface Arsenal {
  get(type: AssetType, name: string): StandardAsset | null
  list(type: AssetType): StandardAsset[]
  create(name: string, content: string): void
  update(name: string, content: string): void
  delete(name: string): void
  rename(oldName: string, newName: string): void
}
```

#### Scenario: BuiltinArsenal 的 get 操作返回内置 Part
- **WHEN** 调用 `builtinArsenal.get('parts', 'git-commit')`
- **THEN** 返回包含 name、type、state、path 为 `builtin:git-commit`、content 为 JSON 字符串的 StandardAsset

#### Scenario: BuiltinArsenal 的 get 操作返回内置 Probe
- **WHEN** 调用 `builtinArsenal.get('probes', 'fs_exists')`
- **THEN** 返回包含 name、type、state、path 为 `builtin:fs_exists`、content 为 JSON 字符串的 StandardAsset

#### Scenario: BuiltinArsenal 的 get 操作返回 null（不存在的名称）
- **WHEN** 调用 `builtinArsenal.get('parts', 'non-existent-part')`
- **THEN** 返回 null

#### Scenario: BuiltinArsenal 的 list 操作返回所有内置 Parts
- **WHEN** 调用 `builtinArsenal.list('parts')`
- **THEN** 返回包含所有 BUILTIN_PARTS 键的 StandardAsset 数组

#### Scenario: BuiltinArsenal 的 list 操作返回所有内置 Probes
- **WHEN** 调用 `builtinArsenal.list('probes')`
- **THEN** 返回包含所有 BUILTIN_PROBES 键的 StandardAsset 数组

#### Scenario: BuiltinArsenal 的 create 操作抛出异常
- **WHEN** 调用 `builtinArsenal.create('new-part', '{}')`
- **THEN** 抛出 Error，消息包含 'read-only' 或 'Builtin'

#### Scenario: BuiltinArsenal 的 update 操作抛出异常
- **WHEN** 调用 `builtinArsenal.update('git-commit', '{}')`
- **THEN** 抛出 Error，消息包含 'read-only' 或 'Builtin'

#### Scenario: BuiltinArsenal 的 delete 操作抛出异常
- **WHEN** 调用 `builtinArsenal.delete('git-commit')`
- **THEN** 抛出 Error，消息包含 'read-only' 或 'Builtin'

#### Scenario: BuiltinArsenal 的 rename 操作抛出异常
- **WHEN** 调用 `builtinArsenal.rename('git-commit', 'new-name')`
- **THEN** 抛出 Error，消息包含 'read-only' 或 'Builtin'

### Requirement: BuiltinArsenal 不依赖 Infra 层

BuiltinArsenal 的实现不得导入任何 `src/infra/` 模块。

#### Scenario: BuiltinArsenal 模块不包含对 Infra 的引用
- **WHEN** 检查 `src/arsenals/builtin-arsenal.ts` 源代码
- **THEN** 无任何 import 语句指向 `../infra/` 或 `../../infra/`

### Requirement: BuiltinArsenal 使用 BUILTIN_* 作为数据源

BuiltinArsenal 内部使用 `arsenals/builtin.ts` 中定义的 `BUILTIN_PARTS` 和 `BUILTIN_PROBES`。

#### Scenario: BuiltinArsenal 从 BUILTIN_PARTS 获取数据
- **WHEN** BuiltinArsenal 初始化
- **THEN** 内部引用 `BUILTIN_PARTS` 和 `BUILTIN_PROBES`