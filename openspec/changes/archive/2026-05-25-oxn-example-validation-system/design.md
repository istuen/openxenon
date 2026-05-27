## Context

当前 OXN DSL 缺乏标准语法示例和验证机制：

1. **Langium 语法变更风险** — `oxn.langium` 修改后无自动验证
2. **命名空间解析不一致** — `@oxn/*` 仅部分实现（probes/parts），blueprints 未实现
3. **无全链路验证** — `oxn compile` 仅生成 assembly.json，不生成 frozen.json

现有 `BUILTIN_PROBES` 和 `BUILTIN_PARTS` 已实现，但 `BUILTIN_BLUEPRINTS` 缺失。

## Goals / Non-Goals

**Goals:**
- 建立 OXN Example 标准验证系统
- 补全 `@oxn/*` 命名空间（probes/parts/blueprints）
- 提供 `oxn validate --standard` CLI 命令
- example 文件可作为 OXN 语法文档展示

**Non-Goals:**
- 不修改 Langium grammar 本身
- 不实现 `@glo/*` 和 `@prj/*` 命名空间（仅为 future extension 预留）
- 不提供运行时 Work 执行验证（Example 只验证 Grammar → IR）

## Decisions

### Decision 1: BUILTIN_BLUEPRINTS 结构

**选择**: 使用与 `BUILTIN_PARTS` 一致的对象结构

```typescript
export const BUILTIN_BLUEPRINTS: Record<string, Blueprint> = {
  'oxn-example': {
    id: 'oxn-example',
    name: 'OXN Example Blueprint',
    _version: 1,
    slots: { develop: { name: 'develop', description: '开发阶段插槽' } },
    parts: [
      { id: 'test', name: 'test', deps: ['develop'], probes: [...] },
      { id: 'git-commit', name: 'git-commit', deps: ['test'], probes: [...] }
    ]
  }
}
```

**替代方案考虑**:
- `parts` 数组格式（现有）: 直观，但引用时需遍历
- 扁平 Map: 查找 O(1)，但需要额外的 name→id 映射

**结论**: 使用数组格式，与现有 loader 逻辑兼容。

### Decision 2: Example 文件粒度

**选择**: 按类型分离 — probe / part / blueprint / work 各一个文件

**优点**:
- 单一职责，每个文件专注展示一种语法
- 便于单独验证和调试
- 未来可扩展为功能测试套件

### Decision 3: 验证链路

```
.oxn
  ↓ Langium Parse
AST
  ↓ generateOxnAssembly
OxnAssemblyBundle (entities[])
  ↓ build OxnAssemblyIR + slotBindings=[]
IR
  ↓ OxnKernelAdapter.adaptStrict
frozen.json
  ↓ validateFrozenBlueprint
Valid / Error
```

**关键点**: 
- `adaptStrict` 调用 `resolvePartRef`，需确保 `@oxn/*` 可解析
- slotBindings 为空数组即可（非 slot 的 part 会走 blueprint 自己的 parts）
- Blueprint 中的 slot 声明不需要 slotBinding 填充

### Decision 4: preloadCompileDependencies 扩展

在 `loader.ts` 的 `preloadCompileDependencies` 中增加:

```typescript
for (const [name, def] of Object.entries(BUILTIN_BLUEPRINTS)) {
  blueprints.set(`oxn/${name}`, def)
}
```

## Risks / Trade-offs

[Risk] `resolvePartRef` 在 adaptStrict 中调用 `getProjectBoundaryPath(process.cwd())`
→ [Mitigation] `oxn validate --standard` 需在项目根目录执行，或内部设置 `process.cwd()`

[Risk] `BUILTIN_BLUEPRINTS` 中引用的 `probes` 引用 `@oxn/probes/*`
→ [Mitigation] `BUILTIN_PROBES` 已存在，只需确保 key 匹配（shell_exec 而非 exec-exit-zero）

[Risk] Example 文件被用户修改导致验证失败
→ [Mitigation] Example 文件位于 `src/oxn-dsl/examples/`，由开发者维护，CI 强制验证

## Migration Plan

1. 新增 `BUILTIN_BLUEPRINTS` 到 `src/arsenals/builtin.ts`
2. 创建 `src/oxn-dsl/examples/` 下四个 example 文件
3. 扩展 `preloadCompileDependencies` 支持 blueprints
4. 新增 `oxn validate --standard` CLI 命令
5. 添加 CI 流程验证 example 文件

## Open Questions

1. `@oxn/blueprints/oxn-example` 在 work-example.oxn 中引用时，work 的 type 应该是什么？`task`？`plan`？
2. 是否需要在 CI 中强制运行 `oxn validate --standard`？还是作为可选验证？