## Why

OXN DSL 需要一套 example 文件作为语法结构展示，同时作为内置验证语料确保：
1. Langium 语法变更时，example 能验证 Grammar 层正确性
2. example 生成的 frozen.json 能被 Kernel 正确执行

本质上是 **OXN 的标准文档** — 所有 OXN 实现必须与 example 兼容。

## What Changes

### 新增 BUILTIN_BLUEPRINTS

在 `src/arsenals/builtin.ts` 中新增 `BUILTIN_BLUEPRINTS`，包含 `oxn-example` blueprint：

```typescript
export const BUILTIN_BLUEPRINTS = {
  'oxn-example': {
    id: 'oxn-example',
    name: 'OXN Example Blueprint',
    _version: 1,
    description: '内置示例 Blueprint，包含 develop slot 和两个 part',
    slots: { develop: { name: 'develop', description: '开发阶段插槽' } },
    parts: [
      { id: 'test', name: 'test', deps: ['develop'], probes: [...] },
      { id: 'git-commit', name: 'git-commit', deps: ['test'], probes: [...] }
    ]
  }
}
```

### 新增 Example 文件

```
src/oxn-dsl/examples/
├── probe-example.oxn      → probe 定义
├── part-example.oxn       → part 定义，引用 @oxn/probes/*
├── blueprint-example.oxn  → blueprint 定义，引用 @oxn/*
└── work-example.oxn        → work 定义，引用 @oxn/blueprints/oxn-example
```

### 新增 CLI 命令

```bash
oxn validate --standard
```

遍历 `examples/*.oxn`，逐个跑全链路验证：
1. Langium Parse → AST
2. generateOxnAssembly → OxnAssemblyIR
3. OxnKernelAdapter.adaptStrict → frozen.json
4. validateFrozenBlueprint → 通过

### 扩展 preloadCompileDependencies

在 `src/infra/loader.ts` 中扩展 `preloadCompileDependencies`，增加对 `BUILTIN_BLUEPRINTS` 的预加载。

## Capabilities

### New Capabilities

- `oxn-example-validation`: OXN 语法标准验证能力
  - 通过 example 文件验证 Grammar → Assembly → Frozen 全链路
  - 确保 `@oxn/*` 命名空间引用可正确解析
  - 验证 frozen.json 符合 Kernel 执行要求

### Modified Capabilities

（无）

## Impact

- **新增**: `src/arsenals/builtin.ts` — `BUILTIN_BLUEPRINTS`
- **新增**: `src/oxn-dsl/examples/*.oxn` — 四 example 文件
- **新增**: `src/cli/oxn-validate.ts` — validate 命令
- **修改**: `src/infra/loader.ts` — 扩展 preloadCompileDependencies
- **修改**: `src/kernel/lib/part-resolver.ts` — 支持 blueprints 解析