## 1. 新增 BUILTIN_BLUEPRINTS

- [x] 1.1 在 `src/arsenals/builtin.ts` 中添加 `BUILTIN_BLUEPRINTS` 导出
- [x] 1.2 定义 `oxn-example` blueprint，包含 `develop` slot、两个 part，probes 引用 `@oxn/probes/shell_exec`
- [x] 1.3 导出 `BuiltinBlueprintName` 类型

## 2. 扩展 preloadCompileDependencies

- [x] 2.1 在 `src/infra/loader.ts` 的 `preloadCompileDependencies` 中添加 blueprints Map
- [x] 2.2 遍历 `BUILTIN_BLUEPRINTS` 存入 `blueprints.set('oxn/${name}', def)`
- [x] 2.3 验证 loader 能正确返回 blueprints

## 3. 创建 Example 文件

- [x] 3.1 创建 `src/oxn-dsl/examples/probe-example.oxn`，展示 probe 声明
- [x] 3.2 创建 `src/oxn-dsl/examples/part-example.oxn`，展示 part 声明并引用 `@oxn/probes/shell_exec`
- [x] 3.3 创建 `src/oxn-dsl/examples/blueprint-example.oxn`，展示 blueprint 含 slot/part/expectation
- [x] 3.4 创建 `src/oxn-dsl/examples/work-example.oxn`，展示 work 引用 `@oxn/blueprints/oxn-example`
- [x] 3.5 确保所有 example 文件引用 `@oxn/*` 内置资源

## 4. 新增 oxn validate --standard CLI 命令

- [x] 4.1 创建 `src/cli/oxn-validate.ts`
- [x] 4.2 实现 `--standard` 选项，遍历 `examples/*.oxn`
- [x] 4.3 实现全链路验证：Langium Parse → generateOxnAssembly → adaptStrict → validateFrozenBlueprint
- [x] 4.4 在 `src/cli/index.ts` 中注册 `validate` 子命令
- [x] 4.5 输出清晰的验证结果（每个文件的通过/失败状态）

## 5. 验证

- [x] 5.1 运行 `oxn validate --standard`，确认所有 example 通过
- [x] 5.2 手动引入语法错误到某个 example，验证命令能检测出失败
- [x] 5.3 确认命令输出格式清晰，可读性好